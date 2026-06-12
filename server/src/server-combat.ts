/**
 * Server-side combat engine for PVP.
 * Stripped of visual callbacks — only core game logic.
 * Mirrors the client-side CombatEngine but runs authoritatively on the server.
 */

import {
  PvpFighterData,
  PvpStateUpdate,
  PvpAbilityInfo,
  PvpBuffInfo,
  PvpLogEntry,
} from './types';

// ─── Ability Definitions (mirrored from client) ────────────────────
interface AbilityDef {
  id: string;
  name: string;
  icon: string;
  type: 'damage' | 'heal' | 'buff' | 'drain' | 'heavy' | 'ultimate';
  cooldown: number;
  description: string;
  calculate: (attacker: PvpFighterData, defender: PvpFighterData) => {
    damage: number;
    selfDamage?: number;
    heal?: number;
    buff?: { stat: string; multiplier: number; turns: number };
    isCrit?: boolean;
  };
}

const ABILITY_DEFS: Record<string, AbilityDef> = {
  basicAttack: {
    id: 'basicAttack', name: 'Pixel Strike', icon: '⚔️', type: 'damage', cooldown: 0,
    description: 'A basic attack using your pixels',
    calculate: (atk, def) => {
      const baseDmg = atk.stats.atk;
      const defense = def.stats.def * 0.3;
      return { damage: Math.max(5, Math.floor(baseDmg - defense + (Math.random() * 8 - 4))) };
    },
  },
  humanUlt: {
    id: 'humanUlt', name: 'Rally Cry', icon: '📢', type: 'buff', cooldown: 4,
    description: 'Boost ATK by 30% for 2 turns',
    calculate: () => ({ damage: 0, buff: { stat: 'atk', multiplier: 1.3, turns: 2 } }),
  },
  catUlt: {
    id: 'catUlt', name: 'Nine Lives', icon: '🐱', type: 'heal', cooldown: 5,
    description: 'Restore 25% of max HP',
    calculate: (atk) => ({ damage: 0, heal: Math.floor(atk.stats.maxHp * 0.25) }),
  },
  alienUlt: {
    id: 'alienUlt', name: 'Cosmic Blast', icon: '👽', type: 'damage', cooldown: 4,
    description: 'Massive energy blast ignoring 50% defense',
    calculate: (atk, def) => {
      const baseDmg = atk.stats.atk * 2.2;
      const defense = def.stats.def * 0.15;
      return { damage: Math.max(10, Math.floor(baseDmg - defense)) };
    },
  },
  agentUlt: {
    id: 'agentUlt', name: 'Firewall', icon: '🛡️', type: 'buff', cooldown: 5,
    description: 'Increase DEF by 50% for 3 turns',
    calculate: () => ({ damage: 0, buff: { stat: 'def', multiplier: 1.5, turns: 3 } }),
  },
  laserBeam: {
    id: 'laserBeam', name: 'Laser Beam', icon: '🔴', type: 'damage', cooldown: 3,
    description: 'VR-powered laser blast',
    calculate: (atk) => ({ damage: Math.floor(atk.stats.atk * 1.8) }),
  },
  shieldBash: {
    id: 'shieldBash', name: 'Shield Bash', icon: '🛡️', type: 'damage', cooldown: 2,
    description: 'Defensive strike using Big Shades',
    calculate: (atk) => ({ damage: Math.floor(atk.stats.def * 1.2) }),
  },
  psychicWave: {
    id: 'psychicWave', name: 'Psychic Wave', icon: '🌀', type: 'damage', cooldown: 3,
    description: '3D Glasses distort reality',
    calculate: (atk) => ({ damage: Math.floor(atk.stats.atk * 1.5 + atk.stats.spd * 0.5) }),
  },
  shadowStrike: {
    id: 'shadowStrike', name: 'Shadow Strike', icon: '🗡️', type: 'damage', cooldown: 2,
    description: 'Strike from the shadows with guaranteed crit',
    calculate: (atk) => ({ damage: Math.floor(atk.stats.atk * 1.6), isCrit: true }),
  },
  berserkerRage: {
    id: 'berserkerRage', name: 'Berserker Rage', icon: '💢', type: 'damage', cooldown: 3,
    description: 'Sacrifice HP for massive damage',
    calculate: (atk) => ({
      damage: Math.floor(atk.stats.atk * 2.5),
      selfDamage: Math.floor(atk.stats.maxHp * 0.1),
    }),
  },
  arcaneBlast: {
    id: 'arcaneBlast', name: 'Arcane Blast', icon: '✨', type: 'damage', cooldown: 2,
    description: 'Focused magical attack',
    calculate: (atk) => ({ damage: Math.floor(atk.stats.atk * 1.4) }),
  },
  quickShot: {
    id: 'quickShot', name: 'Quick Shot', icon: '🎯', type: 'damage', cooldown: 1,
    description: 'Fast ranged attack',
    calculate: (atk) => ({ damage: Math.floor(atk.stats.atk * 1.1 + atk.stats.spd * 0.3) }),
  },
  pixelDrain: {
    id: 'pixelDrain', name: 'Pixel Drain', icon: '🧲', type: 'drain', cooldown: 3,
    description: 'Steal pixels from opponent to heal',
    calculate: (atk) => {
      const dmg = Math.floor(atk.stats.atk * 1.0);
      return { damage: dmg, heal: Math.floor(dmg * 0.5) };
    },
  },
};

// ─── Ability Assignment (mirrored from client) ─────────────────────
const EYE_ABILITY_MAP: Record<string, string> = {
  laser: 'laserBeam', shield: 'shieldBash', psychic: 'psychicWave',
  stealth: 'shadowStrike', berserker: 'berserkerRage', magic: 'arcaneBlast',
  ranged: 'quickShot', balanced: 'pixelDrain', melee: 'pixelDrain',
};

const TYPE_ULT_MAP: Record<string, string> = {
  Human: 'humanUlt', Cat: 'catUlt', Alien: 'alienUlt', Agent: 'agentUlt',
};

interface ServerAbility extends AbilityDef {
  currentCooldown: number;
}

function getAbilitiesForFighter(fighter: PvpFighterData): ServerAbility[] {
  const abilities: ServerAbility[] = [];

  // Basic attack
  abilities.push({ ...ABILITY_DEFS.basicAttack, currentCooldown: 0 });

  // Eye-based ability
  const eyeAbility = EYE_ABILITY_MAP[fighter.abilityType] || 'quickShot';
  abilities.push({ ...ABILITY_DEFS[eyeAbility], currentCooldown: 0 });

  // Type ultimate
  const typeUlt = TYPE_ULT_MAP[fighter.type] || 'humanUlt';
  abilities.push({ ...ABILITY_DEFS[typeUlt], currentCooldown: 0 });

  // Pixel Drain bonus for customized
  if (fighter.customized && !abilities.find(a => a.id === 'pixelDrain')) {
    abilities.push({ ...ABILITY_DEFS.pixelDrain, currentCooldown: 0 });
  }

  return abilities;
}

// ─── Buff Type ──────────────────────────────────────────────────────
interface Buff {
  stat: string;
  multiplier: number;
  turns: number;
  remaining: number;
}

// ─── Player State ───────────────────────────────────────────────────
interface PlayerState {
  fighter: PvpFighterData;
  abilities: ServerAbility[];
  buffs: Buff[];
  dodgeCharges: number;
  maxDodgeCharges: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  dodgeCount: number;
  totalDamage: number;
}

// ─── Server Combat Engine ───────────────────────────────────────────
export class ServerCombatEngine {
  public roomId: string;
  public player1: PlayerState;
  public player2: PlayerState;
  public turn = 0;
  public isPlayer1Turn: boolean;
  public isOver = false;
  public winnerId: number | null = null;
  public loserId: number | null = null;
  public logs: PvpLogEntry[] = [];
  public pendingLogs: PvpLogEntry[] = [];

  // Pending action state
  public waitingForTiming = false;
  public waitingForDodge = false;
  public pendingAbilityIndex: number | null = null;
  public pendingTimingTimeout: NodeJS.Timeout | null = null;
  public pendingDodgeTimeout: NodeJS.Timeout | null = null;

  public startTime = Date.now();

  constructor(roomId: string, fighter1: PvpFighterData, fighter2: PvpFighterData) {
    this.roomId = roomId;

    this.player1 = {
      fighter: { ...fighter1 },
      abilities: getAbilitiesForFighter(fighter1),
      buffs: [],
      dodgeCharges: 1,
      maxDodgeCharges: 3,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      dodgeCount: 0,
      totalDamage: 0,
    };

    this.player2 = {
      fighter: { ...fighter2 },
      abilities: getAbilitiesForFighter(fighter2),
      buffs: [],
      dodgeCharges: 1,
      maxDodgeCharges: 3,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      dodgeCount: 0,
      totalDamage: 0,
    };

    // Faster fighter goes first
    this.isPlayer1Turn = fighter1.stats.spd >= fighter2.stats.spd;
  }

  private getAttacker(): PlayerState {
    return this.isPlayer1Turn ? this.player1 : this.player2;
  }

  private getDefender(): PlayerState {
    return this.isPlayer1Turn ? this.player2 : this.player1;
  }

  private log(message: string, type: PvpLogEntry['type'] = 'system'): void {
    const entry: PvpLogEntry = { message, type, turn: this.turn };
    this.logs.push(entry);
    this.pendingLogs.push(entry);
  }

  private applyBuffs(fighter: PvpFighterData, buffs: Buff[]): PvpFighterData {
    const buffed = { ...fighter, stats: { ...fighter.stats } };
    for (const buff of buffs) {
      const stat = buff.stat as keyof typeof buffed.stats;
      if (stat in buffed.stats) {
        buffed.stats[stat] = Math.floor(buffed.stats[stat] * buff.multiplier);
      }
    }
    return buffed;
  }

  private tickBuffs(): void {
    this.player1.buffs = this.player1.buffs.filter(b => {
      b.remaining--;
      return b.remaining > 0;
    });
    this.player2.buffs = this.player2.buffs.filter(b => {
      b.remaining--;
      return b.remaining > 0;
    });
  }

  /**
   * Step 1: Player selects an ability → server validates and starts timing phase
   */
  public selectAbility(abilityIndex: number): { valid: boolean; needsTiming: boolean } {
    if (this.isOver || this.waitingForTiming || this.waitingForDodge) {
      return { valid: false, needsTiming: false };
    }

    const attacker = this.getAttacker();
    const ability = attacker.abilities[abilityIndex];

    if (!ability || (ability.currentCooldown && ability.currentCooldown > 0)) {
      return { valid: false, needsTiming: false };
    }

    this.pendingAbilityIndex = abilityIndex;
    this.waitingForTiming = true;

    return { valid: true, needsTiming: true };
  }

  /**
   * Step 2: Player submits timing result → execute ability, check if dodge is needed
   */
  public resolveTimingAttack(result: 'miss' | 'ok' | 'perfect' | 'critical'): {
    needsDodge: boolean;
    stateUpdate: PvpStateUpdate;
    lastAction?: PvpStateUpdate['lastAction'];
  } {
    if (!this.waitingForTiming || this.pendingAbilityIndex === null) {
      return { needsDodge: false, stateUpdate: this.getStateUpdate() };
    }

    this.waitingForTiming = false;
    const attacker = this.getAttacker();
    const defender = this.getDefender();
    const ability = attacker.abilities[this.pendingAbilityIndex];

    const multipliers = { miss: 0.5, ok: 1.0, perfect: 1.5, critical: 2.0 };
    const timingMult = multipliers[result] || 1.0;

    // Update combo
    if (result === 'perfect' || result === 'critical') {
      attacker.combo++;
      attacker.perfectCount++;
      if (attacker.combo > attacker.maxCombo) attacker.maxCombo = attacker.combo;
      if (attacker.dodgeCharges < attacker.maxDodgeCharges) {
        attacker.dodgeCharges++;
        this.log(`⚡ PERFECT! Gained 1 Dodge Charge! (${attacker.dodgeCharges}/${attacker.maxDodgeCharges})`, 'system');
      }
    } else {
      attacker.combo = 0;
    }

    let comboBonus = 1.0;
    if (attacker.combo >= 5) comboBonus = 1.3;
    else if (attacker.combo >= 3) comboBonus = 1.2;
    else if (attacker.combo >= 2) comboBonus = 1.1;

    // Execute the ability
    const buffedAttacker = this.applyBuffs(attacker.fighter, attacker.buffs);
    const abilityResult = ability.calculate(buffedAttacker, defender.fighter);

    let finalDamage = 0;
    if (abilityResult.damage > 0) {
      finalDamage = Math.max(1, Math.floor(abilityResult.damage * timingMult * comboBonus));
      if (result === 'critical') {
        finalDamage = Math.floor(finalDamage * 1.2);
        abilityResult.isCrit = true;
      }
    }

    // Check crit
    if (finalDamage > 0 && !abilityResult.isCrit) {
      if (Math.random() * 100 < buffedAttacker.stats.crit) {
        finalDamage = Math.floor(finalDamage * 1.5);
        abilityResult.isCrit = true;
      }
    }

    // Apply damage
    let dodged = false;
    if (finalDamage > 0) {
      // Check if defender has dodge charges
      if (defender.dodgeCharges > 0) {
        defender.dodgeCharges--;
        this.waitingForDodge = true;
        // Store pending damage info for after dodge resolution
        this._pendingDamage = finalDamage;
        this._pendingAbilityResult = abilityResult;
        this._pendingAbility = ability;
        this._pendingTimingResult = result;

        ability.currentCooldown = ability.cooldown;
        this.pendingAbilityIndex = null;

        return {
          needsDodge: true,
          stateUpdate: this.getStateUpdate(),
          lastAction: {
            attackerSide: this.isPlayer1Turn ? 'player1' : 'player2',
            abilityName: ability.name,
            abilityType: ability.type,
            damage: finalDamage,
            heal: abilityResult.heal,
            isCrit: !!abilityResult.isCrit,
            dodged: false,
            impactSeed: Math.random(),
          },
        };
      } else {
        // No dodge charges — direct hit
        this.log(`⚠️ No Dodge Charges! Direct hit!`, 'system');
      }
    }

    // Apply the action directly (no dodge)
    this._applyAction(finalDamage, abilityResult, ability, result);
    ability.currentCooldown = ability.cooldown;
    this.pendingAbilityIndex = null;

    const lastAction: PvpStateUpdate['lastAction'] = {
      attackerSide: this.isPlayer1Turn ? 'player1' : 'player2',
      abilityName: ability.name,
      abilityType: ability.type,
      damage: finalDamage,
      heal: abilityResult.heal,
      isCrit: !!abilityResult.isCrit,
      dodged: false,
      impactSeed: Math.random(),
    };

    // Check battle end
    if (this._checkBattleEnd()) {
      return { needsDodge: false, stateUpdate: this.getStateUpdate(), lastAction };
    }

    // Switch turns
    this._endTurn();

    return { needsDodge: false, stateUpdate: this.getStateUpdate(), lastAction };
  }

  // Pending damage storage
  private _pendingDamage = 0;
  private _pendingAbilityResult: any = null;
  private _pendingAbility: ServerAbility | null = null;
  private _pendingTimingResult: string = 'ok';

  /**
   * Step 3: Defender resolves dodge
   */
  public resolveDodge(dodged: boolean): { stateUpdate: PvpStateUpdate; lastAction?: PvpStateUpdate['lastAction'] } {
    if (!this.waitingForDodge) {
      return { stateUpdate: this.getStateUpdate() };
    }

    this.waitingForDodge = false;

    const attacker = this.getAttacker();
    const defender = this.getDefender();
    const ability = this._pendingAbility;

    let actualDamage = this._pendingDamage;
    const abilityResult = this._pendingAbilityResult;

    if (dodged) {
      actualDamage = 0;
      defender.dodgeCount++;
      this.log(`💨 DODGED! 0 Damage Taken!`, 'system');

      // Counter attack on successful dodge
      const counterDmg = Math.max(5, Math.floor(defender.fighter.stats.atk * 0.5));
      const counterCrit = Math.random() * 100 < defender.fighter.stats.crit;
      const finalCounterDmg = counterCrit ? Math.floor(counterDmg * 1.5) : counterDmg;

      attacker.fighter.stats.hp = Math.max(0, attacker.fighter.stats.hp - finalCounterDmg);
      defender.totalDamage += finalCounterDmg;
      this.log(`💨 Counter Strike! ${finalCounterDmg} dmg${counterCrit ? ' 💥 CRIT!' : ''}`, 'damage');
    } else {
      attacker.combo = 0;
      // Apply the pending damage
      this._applyAction(actualDamage, abilityResult, ability!, this._pendingTimingResult);
    }

    // Clean up pending state
    this._pendingDamage = 0;
    this._pendingAbilityResult = null;
    this._pendingAbility = null;

    const lastAction: PvpStateUpdate['lastAction'] = {
      attackerSide: this.isPlayer1Turn ? 'player1' : 'player2',
      abilityName: ability?.name || 'Attack',
      abilityType: ability?.type || 'damage',
      damage: actualDamage,
      heal: abilityResult?.heal,
      isCrit: !!abilityResult?.isCrit,
      dodged,
      impactSeed: Math.random(),
    };

    if (this._checkBattleEnd()) {
      return { stateUpdate: this.getStateUpdate(), lastAction };
    }

    this._endTurn();

    return { stateUpdate: this.getStateUpdate(), lastAction };
  }

  private _applyAction(damage: number, result: any, ability: ServerAbility, timingResult: string): void {
    const attacker = this.getAttacker();
    const defender = this.getDefender();

    const timingText: Record<string, string> = {
      miss: '(WEAK)', ok: '', perfect: '(PERFECT!)', critical: '(CRITICAL PERFECT!!!)',
    };

    if (damage > 0) {
      defender.fighter.stats.hp = Math.max(0, defender.fighter.stats.hp - damage);
      attacker.totalDamage += damage;
      const critText = result.isCrit ? ' 💥 CRIT!' : '';
      const logType = result.isCrit ? 'critical' : 'damage';
      this.log(`${ability.icon} ${attacker.fighter.name} used ${ability.name}! ${damage} dmg ${timingText[timingResult] || ''}${critText}`, logType as PvpLogEntry['type']);
    }

    // Self damage
    if (result.selfDamage) {
      attacker.fighter.stats.hp = Math.max(1, attacker.fighter.stats.hp - result.selfDamage);
      this.log(`💔 Self-damage: ${result.selfDamage}`, 'damage');
    }

    // Healing
    if (result.heal) {
      const oldHp = attacker.fighter.stats.hp;
      attacker.fighter.stats.hp = Math.min(attacker.fighter.stats.maxHp, attacker.fighter.stats.hp + result.heal);
      const actualHealed = attacker.fighter.stats.hp - oldHp;
      if (actualHealed > 0) {
        this.log(`💚 Healed ${actualHealed} HP`, 'heal');
      }
    }

    // Buffs
    if (result.buff) {
      attacker.buffs.push({ ...result.buff, remaining: result.buff.turns });
      this.log(`✨ ${result.buff.stat.toUpperCase()} boosted!`, 'system');
    }
  }

  private _endTurn(): void {
    // Tick cooldowns for next attacker
    const nextAttacker = this.isPlayer1Turn ? this.player2 : this.player1;
    nextAttacker.abilities.forEach(a => {
      if (a.currentCooldown && a.currentCooldown > 0) a.currentCooldown--;
    });

    this.turn++;
    this.tickBuffs();
    this.isPlayer1Turn = !this.isPlayer1Turn;
  }

  private _checkBattleEnd(): boolean {
    if (this.player1.fighter.stats.hp <= 0) {
      this.isOver = true;
      this.winnerId = this.player2.fighter.id;
      this.loserId = this.player1.fighter.id;
      this.log(`☠️ ${this.player1.fighter.name} has been destroyed!`, 'system');
      return true;
    }
    if (this.player2.fighter.stats.hp <= 0) {
      this.isOver = true;
      this.winnerId = this.player1.fighter.id;
      this.loserId = this.player2.fighter.id;
      this.log(`🏆 ${this.player2.fighter.name} destroyed! Victory!`, 'system');
      return true;
    }
    return false;
  }

  /**
   * Force end the match (e.g., disconnect)
   */
  public forceEnd(winningSide: 'player1' | 'player2'): void {
    this.isOver = true;
    if (winningSide === 'player1') {
      this.winnerId = this.player1.fighter.id;
      this.loserId = this.player2.fighter.id;
    } else {
      this.winnerId = this.player2.fighter.id;
      this.loserId = this.player1.fighter.id;
    }
    this.log(`⚡ Match ended — opponent disconnected.`, 'system');
  }

  /**
   * Get the current state update for broadcasting
   */
  public getStateUpdate(): PvpStateUpdate {
    const update: PvpStateUpdate = {
      roomId: this.roomId,
      turn: this.turn,
      isPlayer1Turn: this.isPlayer1Turn,
      player1: {
        hp: this.player1.fighter.stats.hp,
        maxHp: this.player1.fighter.stats.maxHp,
        buffs: this.player1.buffs.map(b => ({ stat: b.stat, multiplier: b.multiplier, turns: b.turns, remaining: b.remaining })),
        dodgeCharges: this.player1.dodgeCharges,
        combo: this.player1.combo,
        abilities: this.player1.abilities.map(a => ({
          id: a.id, name: a.name, icon: a.icon, type: a.type,
          cooldown: a.cooldown, currentCooldown: a.currentCooldown,
          description: a.description, canUse: a.currentCooldown === 0,
        })),
      },
      player2: {
        hp: this.player2.fighter.stats.hp,
        maxHp: this.player2.fighter.stats.maxHp,
        buffs: this.player2.buffs.map(b => ({ stat: b.stat, multiplier: b.multiplier, turns: b.turns, remaining: b.remaining })),
        dodgeCharges: this.player2.dodgeCharges,
        combo: this.player2.combo,
        abilities: this.player2.abilities.map(a => ({
          id: a.id, name: a.name, icon: a.icon, type: a.type,
          cooldown: a.cooldown, currentCooldown: a.currentCooldown,
          description: a.description, canUse: a.currentCooldown === 0,
        })),
      },
      newLogs: [...this.pendingLogs],
    };

    // Clear pending logs after creating the update
    this.pendingLogs = [];

    return update;
  }

  public getSummary() {
    return {
      turns: this.turn,
      player1Damage: this.player1.totalDamage,
      player2Damage: this.player2.totalDamage,
      player1HpRemaining: this.player1.fighter.stats.hp,
      player2HpRemaining: this.player2.fighter.stats.hp,
      duration: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
