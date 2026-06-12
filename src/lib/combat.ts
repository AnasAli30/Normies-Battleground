import { Fighter, Ability, AbilityExecutionResult, CombatLogEntry, Buff } from './types';
import { getAbilitiesForFighter, executeAbility } from './abilities';
import { removeRandomPixels, removePixelCluster, countActivePixels, getRandomActivePixel, restorePixels, PixelCoord } from './pixels';

export interface CombatCallbacks {
  onLog?: (entry: CombatLogEntry) => void;
  onDamage?: (target: 'player' | 'opponent', damage: number, isCrit: boolean, removedCoords: PixelCoord[]) => void;
  onHeal?: (target: 'player' | 'opponent', amount: number) => void;
  onTurnChange?: (isPlayerTurn: boolean) => void;
  onBattleEnd?: (winner: 'player' | 'opponent', winnerFighter: Fighter, loserFighter: Fighter) => void;
  onBuff?: (target: 'player' | 'opponent', buff: Buff) => void;
  onStatsUpdate?: () => void;
  onTimingAttackStart?: (ability: Ability) => void;
  onDodgePrompt?: (ability: Ability) => void;
  onComboUpdate?: (combo: number) => void;
  onPixelDestruction?: (side: 'player' | 'opponent', newPixels: string, removedCoords: PixelCoord[]) => void;
  onFireAttack?: (attackerSide: 'player' | 'opponent', type: 'laser' | 'orb' | 'drain' | 'wave', impactCoords: PixelCoord | null, onImpact: () => void, abilityName?: string) => void;
}

export class CombatEngine {
  public player: Fighter;
  public opponent: Fighter;
  public playerAbilities: Ability[];
  public opponentAbilities: Ability[];
  public turn = 0;
  public isPlayerTurn: boolean;
  public isOver = false;
  public winner: 'player' | 'opponent' | null = null;
  public log: CombatLogEntry[] = [];
  public playerBuffs: Buff[] = [];
  public opponentBuffs: Buff[] = [];

  // Skill state
  public combo = 0;
  public maxCombo = 0;
  public perfectCount = 0;
  public dodgeCount = 0;
  public totalPlayerDamage = 0;
  public totalOpponentDamage = 0;
  public waitingForTiming = false;
  public waitingForDodge = false;
  private _pendingAbility: Ability | null = null;
  private _pendingAbilityIndex: number | null = null;
  private _pendingEnemyAbility: Ability | null = null;
  private _pendingEnemyResult: AbilityExecutionResult | null = null;

  // Dodge charges
  public playerDodgeCharges = 1;
  public maxDodgeCharges = 3;

  // Pixel data (mutable)
  public playerPixels: string | null = null;
  public opponentPixels: string | null = null;
  public playerOriginalPixels: string | null = null;
  public opponentOriginalPixels: string | null = null;
  public playerOriginalPixelCount = 0;
  public opponentOriginalPixelCount = 0;
  public playerInitialPixels = 0;
  public opponentInitialPixels = 0;

  // Callbacks
  public onLog: (entry: CombatLogEntry) => void;
  public onDamage: (target: 'player' | 'opponent', damage: number, isCrit: boolean, removedCoords: PixelCoord[]) => void;
  public onHeal: (target: 'player' | 'opponent', amount: number) => void;
  public onTurnChange: (isPlayerTurn: boolean) => void;
  public onBattleEnd: (winner: 'player' | 'opponent', winnerFighter: Fighter, loserFighter: Fighter) => void;
  public onBuff: (target: 'player' | 'opponent', buff: Buff) => void;
  public onStatsUpdate: () => void;
  public onTimingAttackStart: (ability: Ability) => void;
  public onDodgePrompt: (ability: Ability) => void;
  public onComboUpdate: (combo: number) => void;
  public onPixelDestruction: (side: 'player' | 'opponent', newPixels: string, removedCoords: PixelCoord[]) => void;
  public onFireAttack: (attackerSide: 'player' | 'opponent', type: 'laser' | 'orb' | 'drain' | 'wave', impactCoords: PixelCoord | null, onImpact: () => void, abilityName?: string) => void;

  constructor(playerFighter: Fighter, opponentFighter: Fighter, callbacks: CombatCallbacks = {}) {
    this.player = { ...playerFighter };
    this.opponent = { ...opponentFighter };
    this.playerAbilities = getAbilitiesForFighter(this.player);
    this.opponentAbilities = getAbilitiesForFighter(this.opponent);
    this.isPlayerTurn = this.player.stats.spd >= this.opponent.stats.spd;

    // Set callbacks with fallbacks
    this.onLog = callbacks.onLog || (() => {});
    this.onDamage = callbacks.onDamage || (() => {});
    this.onHeal = callbacks.onHeal || (() => {});
    this.onTurnChange = callbacks.onTurnChange || (() => {});
    this.onBattleEnd = callbacks.onBattleEnd || (() => {});
    this.onBuff = callbacks.onBuff || (() => {});
    this.onStatsUpdate = callbacks.onStatsUpdate || (() => {});
    this.onTimingAttackStart = callbacks.onTimingAttackStart || (() => {});
    this.onDodgePrompt = callbacks.onDodgePrompt || (() => {});
    this.onComboUpdate = callbacks.onComboUpdate || (() => {});
    this.onPixelDestruction = callbacks.onPixelDestruction || (() => {});
    this.onFireAttack = callbacks.onFireAttack || ((_side, _type, _coords, onImpact, _abilityName) => onImpact());
  }

  public setPixelData(playerPixels: string | null, opponentPixels: string | null): void {
    this.playerPixels = playerPixels;
    this.opponentPixels = opponentPixels;
    this.playerOriginalPixels = playerPixels;
    this.opponentOriginalPixels = opponentPixels;
    this.playerOriginalPixelCount = playerPixels ? countActivePixels(playerPixels) : this.player.pixelCount;
    this.opponentOriginalPixelCount = opponentPixels ? countActivePixels(opponentPixels) : this.opponent.pixelCount;
    this.playerInitialPixels = this.playerOriginalPixelCount;
    this.opponentInitialPixels = this.opponentOriginalPixelCount;

    // Unify HP and pixel count states
    this.player.stats.maxHp = this.playerOriginalPixelCount;
    this.player.stats.hp = this.playerOriginalPixelCount;
    this.opponent.stats.maxHp = this.opponentOriginalPixelCount;
    this.opponent.stats.hp = this.opponentOriginalPixelCount;
  }

  public getPlayerAbilities(): Ability[] {
    return this.playerAbilities.map(a => ({
      ...a,
      canUse: a.currentCooldown === 0 && !this.waitingForTiming && !this.waitingForDodge,
    })) as Ability[];
  }

  public playerAction(abilityIndex: number): void {
    if (this.isOver || !this.isPlayerTurn || this.waitingForTiming || this.waitingForDodge) return;

    const ability = this.playerAbilities[abilityIndex];
    if (!ability || (ability.currentCooldown && ability.currentCooldown > 0)) return;

    this._pendingAbility = ability;
    this._pendingAbilityIndex = abilityIndex;
    this.waitingForTiming = true;

    this.onTimingAttackStart(ability);
  }

  public resolveTimingAttack(result: 'miss' | 'ok' | 'perfect' | 'critical'): void {
    if (!this.waitingForTiming || !this._pendingAbility) return;

    this.waitingForTiming = false;
    const ability = this._pendingAbility;
    this._pendingAbility = null;

    const multipliers = {
      miss: 0.5,
      ok: 1.0,
      perfect: 1.5,
      critical: 2.0,
    };

    const timingMult = multipliers[result] || 1.0;

    // Update combo & rewards
    if (result === 'perfect' || result === 'critical') {
      this.combo++;
      this.perfectCount++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Reward Dodge Energy for high precision hits
      if (this.playerDodgeCharges < this.maxDodgeCharges) {
        this.playerDodgeCharges++;
        this._log(`⚡ PERFECT ATTACK! Gained 1 Dodge Charge! (${this.playerDodgeCharges}/${this.maxDodgeCharges})`, 'system');
      }
    } else {
      this.combo = 0;
    }

    let comboBonus = 1.0;
    if (this.combo >= 5) comboBonus = 1.3;
    else if (this.combo >= 3) comboBonus = 1.2;
    else if (this.combo >= 2) comboBonus = 1.1;

    this.onComboUpdate(this.combo);
    this._executePlayerAction(ability, timingMult * comboBonus, result);

    ability.currentCooldown = ability.cooldown;
  }

  private _executePlayerAction(ability: Ability, timingMult: number, timingResult: string): void {
    const buffedAttacker = this._applyBuffs(this.player, this.playerBuffs);
    const result = executeAbility(ability, buffedAttacker, this.opponent);

    if (result.damage > 0) {
      result.damage = Math.max(1, Math.floor(result.damage * timingMult));
      if (timingResult === 'critical') {
        result.damage = Math.floor(result.damage * 1.2);
        result.isCrit = true;
      }
    }

    const timingText = {
      miss: '(WEAK)',
      ok: '',
      perfect: '(PERFECT!)',
      critical: '(CRITICAL PERFECT!!!)',
    }[timingResult] || '';

    let impactPoint: PixelCoord | null = null;
    if (result.damage > 0 && this.opponentPixels) {
      impactPoint = getRandomActivePixel(this.opponentPixels);
    }
    
    let projType: 'laser' | 'orb' | 'drain' | 'wave' = 'laser';
    if (ability.type === 'heavy' || ability.type === 'ultimate') projType = 'orb';
    if (ability.type === 'drain') projType = 'drain';

    this.onFireAttack('player', projType, impactPoint, () => {
      if (result.damage > 0) {
        this.opponent.stats.hp = Math.max(0, this.opponent.stats.hp - result.damage);
        this.totalPlayerDamage += result.damage;

        const pixelsToRemove = result.damage;
        let removedCoords: PixelCoord[] = [];
        if (this.opponentPixels && impactPoint) {
          const destruction = removePixelCluster(this.opponentPixels, impactPoint.x, impactPoint.y, pixelsToRemove);
          this.opponentPixels = destruction.newPixels;
          removedCoords = destruction.removed;
          this.onPixelDestruction('opponent', this.opponentPixels!, removedCoords);
        }

        const logType = result.isCrit ? 'critical' : 'damage';
        const critText = result.isCrit ? ' 💥 CRIT!' : '';
        this._log(`${result.abilityIcon} ${this.player.name} used ${result.abilityName}! ${result.damage} dmg ${timingText}${critText}`, logType);
        this.onDamage('opponent', result.damage, !!result.isCrit, removedCoords);
      }

      // Self damage
      if (result.selfDamage) {
        this.player.stats.hp = Math.max(1, this.player.stats.hp - result.selfDamage);
        const selfDestruction = this.playerPixels
          ? removeRandomPixels(this.playerPixels, result.selfDamage)
          : { newPixels: this.playerPixels, removed: [] as PixelCoord[] };
        if (this.playerPixels) {
          this.playerPixels = selfDestruction.newPixels;
          if (selfDestruction.removed) {
            this.onPixelDestruction('player', this.playerPixels!, selfDestruction.removed);
          }
        }
        this._log(`💔 Self-damage: ${result.selfDamage}`, 'damage');
        this.onDamage('player', result.selfDamage, false, selfDestruction.removed || []);
      }

      // Healing & Pixel Restoration
      if (result.heal) {
        const oldHp = this.player.stats.hp;
        this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + result.heal);
        const actualHealed = this.player.stats.hp - oldHp;
        this._log(`💚 Healed ${actualHealed} HP`, 'heal');

        if (actualHealed > 0 && this.playerPixels && this.playerOriginalPixels) {
          const restoration = restorePixels(this.playerPixels, this.playerOriginalPixels, actualHealed);
          this.playerPixels = restoration.newPixels;
          this.onPixelDestruction('player', this.playerPixels!, []);
        }
        this.onHeal('player', actualHealed);
      }

      // Buffs
      if (result.buff) {
        this.playerBuffs.push({ ...result.buff, remaining: result.buff.turns });
        this._log(`✨ ${result.buff.stat.toUpperCase()} boosted!`, 'system');
        this.onBuff('player', result.buff);
      }

      this.onStatsUpdate();
      
      if (this._checkBattleEnd()) return;

      this.isPlayerTurn = false;
      this.onTurnChange(false);

      setTimeout(() => this._startEnemyTurn(), 800);
    }, result.abilityName);
  }

  public _startEnemyTurn(): void {
    if (this.isOver) return;

    this.opponentAbilities.forEach(a => {
      if (a.currentCooldown && a.currentCooldown > 0) a.currentCooldown--;
    });

    const available = this.opponentAbilities.filter(a => a.currentCooldown === 0 || !a.currentCooldown);
    let chosen: Ability;

    const specials = available.filter(a => a.id !== 'basicAttack');
    const hpPercent = this.opponent.stats.hp / this.opponent.stats.maxHp;

    if (specials.length > 0 && Math.random() > 0.3) {
      const healAbility = specials.find(a => a.type === 'heal' || a.type === 'drain');
      if (hpPercent < 0.35 && healAbility) {
        chosen = healAbility;
      } else {
        chosen = specials[Math.floor(Math.random() * specials.length)];
      }
    } else {
      chosen = available.find(a => a.id === 'basicAttack') || available[0];
    }

    if (!chosen) chosen = this.opponentAbilities[0];

    const result = executeAbility(chosen, this._applyBuffs(this.opponent, this.opponentBuffs), this.player);

    if (result.damage > 0) {
      if (this.playerDodgeCharges > 0) {
        this.playerDodgeCharges--; // Consume 1 charge to prompt dodge
        this.waitingForDodge = true;
        this._pendingEnemyAbility = chosen;
        this._pendingEnemyResult = result;
        this.onStatsUpdate(); // updates charges visual
        this.onDodgePrompt(chosen);
      } else {
        // No charges, take direct hit
        this._log(`⚠️ No Dodge Charges left! Direct Hit taken!`, 'system');
        this._pendingEnemyAbility = chosen;
        this._pendingEnemyResult = result;
        this._executeEnemyAction(chosen, 1.0, 'miss');
      }
    } else {
      this._executeEnemyAction(chosen, 1.0, 'miss');
      this._finishEnemyTurn();
    }
  }

  public resolveDodge(dodged: boolean): void {
    if (!this.waitingForDodge) return;

    this.waitingForDodge = false;
    const chosen = this._pendingEnemyAbility;
    this._pendingEnemyAbility = null;
    this._pendingEnemyResult = null;
    
    let dodgeTier = 'miss';
    let damageMultiplier = 1.0;
    
    if (dodged) {
      dodgeTier = 'perfect';
      damageMultiplier = 0.0;
      this.dodgeCount++;
      this._log(`💨 DODGED! 0 Damage Taken!`, 'system');
    } else {
      this.combo = 0;
      this.onComboUpdate(0);
    }

    if (chosen) {
      this._executeEnemyAction(chosen, damageMultiplier, dodgeTier);
    }
  }

  private _executeCounterAttack(onComplete?: () => void) {
    if (this.isOver) {
      if (onComplete) onComplete();
      return;
    }
    
    const playerAtk = this.player.stats.atk;
    const baseDamage = Math.max(5, Math.floor(playerAtk * 0.5));
    const isCrit = Math.random() * 100 < this.player.stats.crit;
    const finalDamage = isCrit ? Math.floor(baseDamage * 1.5) : baseDamage;

    const critText = isCrit ? ' 💥 CRIT!' : '';
    this._log(`💨 Counter Strike! Player hits back for ${finalDamage} dmg${critText}`, 'damage');

    let impactPoint: PixelCoord | null = null;
    if (this.opponentPixels) {
      impactPoint = getRandomActivePixel(this.opponentPixels);
    }

    this.onFireAttack('player', 'laser', impactPoint, () => {
      this.opponent.stats.hp = Math.max(0, this.opponent.stats.hp - finalDamage);
      this.totalPlayerDamage += finalDamage;

      let removedCoords: PixelCoord[] = [];
      if (this.opponentPixels && impactPoint) {
        const destruction = removePixelCluster(this.opponentPixels, impactPoint.x, impactPoint.y, finalDamage);
        this.opponentPixels = destruction.newPixels;
        removedCoords = destruction.removed;
        this.onPixelDestruction('opponent', this.opponentPixels!, removedCoords);
      }

      this.onDamage('opponent', finalDamage, isCrit, removedCoords);
      this.onStatsUpdate();
      this._checkBattleEnd();
      
      if (onComplete) onComplete();
    }, "Counter Strike");
  }

  private _executeEnemyAction(ability: Ability, damageMultiplier: number, dodgeTier: string) {
    const buffedAttacker = this._applyBuffs(this.opponent, this.opponentBuffs);
    const result = executeAbility(ability, buffedAttacker, this.player);
    
    let impactPoint: PixelCoord | null = null;
    if (result.damage > 0 && this.playerPixels) {
      impactPoint = getRandomActivePixel(this.playerPixels);
    }
    
    let projType: 'laser' | 'orb' | 'drain' | 'wave' = 'laser';
    if (ability.type === 'heavy' || ability.type === 'ultimate') projType = 'orb';
    if (ability.type === 'drain') projType = 'drain';

    this.onFireAttack('opponent', projType, impactPoint, () => {
      const actualDmg = result.damage > 0 ? Math.max(0, Math.floor(result.damage * damageMultiplier)) : 0;

      const afterEnemyAction = () => {
        // Enemy healing
        if (result.heal) {
          const oldHp = this.opponent.stats.hp;
          this.opponent.stats.hp = Math.min(this.opponent.stats.maxHp, this.opponent.stats.hp + result.heal);
          const actualHealed = this.opponent.stats.hp - oldHp;
          this._log(`💚 ${this.opponent.name} healed ${actualHealed} HP`, 'heal');

          if (actualHealed > 0 && this.opponentPixels && this.opponentOriginalPixels) {
            const restoration = restorePixels(this.opponentPixels, this.opponentOriginalPixels, actualHealed);
            this.opponentPixels = restoration.newPixels;
            this.onPixelDestruction('opponent', this.opponentPixels!, []);
          }
          this.onHeal('opponent', actualHealed);
        }

        if (result.buff) {
          this.opponentBuffs.push({ ...result.buff, remaining: result.buff.turns });
          this._log(`✨ ${this.opponent.name} buffed ${result.buff.stat.toUpperCase()}!`, 'system');
          this.onBuff('opponent', result.buff);
        }

        ability.currentCooldown = ability.cooldown;
        this.onStatsUpdate();
        
        if (this._checkBattleEnd()) return;
        this._finishEnemyTurn();
      };

      if (actualDmg > 0) {
        this.player.stats.hp = Math.max(0, this.player.stats.hp - actualDmg);
        this.totalOpponentDamage += actualDmg;

        // Destroy player pixels 1:1 with damage
        const pixelsToRemove = actualDmg;
        let removedCoords: PixelCoord[] = [];
        if (this.playerPixels && impactPoint) {
          const destruction = removePixelCluster(this.playerPixels, impactPoint.x, impactPoint.y, pixelsToRemove);
          this.playerPixels = destruction.newPixels;
          removedCoords = destruction.removed;
          this.onPixelDestruction('player', this.playerPixels!, removedCoords);
        }

        const logType = result.isCrit ? 'critical' : 'damage';
        this._log(`${result.abilityIcon} ${this.opponent.name} used ${result.abilityName}! ${actualDmg} dmg`, logType);
        this.onDamage('player', actualDmg, !!result.isCrit, removedCoords);
        
        afterEnemyAction();
      } else if (result.damage > 0 && dodgeTier === 'perfect') {
        // Successful dodge counters back!
        this._executeCounterAttack(() => {
          afterEnemyAction();
        });
      } else {
        afterEnemyAction();
      }
    }, result.abilityName);
  }

  private _finishEnemyTurn() {
    if (this.isOver) return;

    this.turn++;

    this.playerAbilities.forEach(a => {
      if (a.currentCooldown && a.currentCooldown > 0) a.currentCooldown--;
    });

    this._tickBuffs();

    this.isPlayerTurn = true;
    this.onTurnChange(true);
  }

  private _applyBuffs(fighter: Fighter, buffs: Buff[]): Fighter {
    const buffed = { ...fighter, stats: { ...fighter.stats } };
    for (const buff of buffs) {
      const stat = buff.stat;
      if (stat in buffed.stats) {
        buffed.stats[stat] = Math.floor(buffed.stats[stat] * buff.multiplier);
      }
    }
    return buffed;
  }

  private _tickBuffs() {
    this.playerBuffs = this.playerBuffs.filter(b => { 
      if (b.remaining !== undefined) {
        b.remaining--; 
        return b.remaining > 0; 
      }
      return false;
    });
    this.opponentBuffs = this.opponentBuffs.filter(b => { 
      if (b.remaining !== undefined) {
        b.remaining--; 
        return b.remaining > 0; 
      }
      return false;
    });
  }

  private _checkBattleEnd(): boolean {
    if (this.player.stats.hp <= 0) {
      this.isOver = true;
      this.winner = 'opponent';
      this._log(`☠️ ${this.player.name} has been destroyed!`, 'system');
      this.onBattleEnd('opponent', this.opponent, this.player);
      return true;
    }
    if (this.opponent.stats.hp <= 0) {
      this.isOver = true;
      this.winner = 'player';
      this._log(`🏆 ${this.opponent.name} destroyed! Victory!`, 'system');
      this.onBattleEnd('player', this.player, this.opponent);
      return true;
    }
    return false;
  }

  private _log(message: string, type: 'damage' | 'heal' | 'system' | 'critical' | 'normal' = 'system') {
    const entry: CombatLogEntry = { message, type, turn: this.turn };
    this.log.push(entry);
    this.onLog(entry);
  }

  public getSummary() {
    return {
      winner: this.winner,
      turns: this.turn,
      playerHpRemaining: this.player.stats.hp,
      opponentHpRemaining: this.opponent.stats.hp,
      playerMaxHp: this.player.stats.maxHp,
      opponentMaxHp: this.opponent.stats.maxHp,
      combo: this.maxCombo,
      perfects: this.perfectCount,
      dodges: this.dodgeCount,
      totalPlayerDamage: this.totalPlayerDamage,
      totalOpponentDamage: this.totalOpponentDamage,
    };
  }
}
