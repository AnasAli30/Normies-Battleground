export interface Stats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
}

export interface Traits {
  hairStyle: string;
  facialFeature: string;
  eyes: string;
  expression: string;
  accessory: string;
}

export interface Buff {
  stat: keyof Stats;
  multiplier: number;
  turns: number;
  remaining?: number;
}

export interface Fighter {
  id: number;
  name: string;
  type: string;
  class: string;
  gender: string;
  age: string;
  traits: Traits;
  level: number;
  actionPoints: number;
  customized: boolean;
  pixelCount: number;
  agentInfo: any;
  stats: Stats;
  imageUrl: string;
  pngUrl: string;
  abilityType: string;
  passive: {
    name: string;
    effect: string;
    critBonus: number;
    healBonus: number;
    dodgeBonus: number;
  };
  statusEffects: any[];
  isAlive: boolean;
  currentPixels?: string | null;
  isGhost?: boolean;
  owner?: string;
  agentPersona?: any;
}

export interface Ability {
  id: string;
  name: string;
  icon: string;
  type: 'damage' | 'heal' | 'buff' | 'drain' | 'heavy' | 'ultimate';
  cooldown: number;
  currentCooldown?: number;
  description: string;
  calculate: (attacker: Fighter, defender: Fighter) => {
    damage: number;
    selfDamage?: number;
    heal?: number;
    buff?: Buff;
    isCrit?: boolean;
  };
  canUse?: boolean;
}

export interface AbilityExecutionResult {
  abilityId: string;
  abilityName: string;
  abilityIcon: string;
  type: string;
  damage: number;
  selfDamage?: number;
  heal?: number;
  buff?: Buff;
  isCrit?: boolean;
}

export interface CombatLogEntry {
  message: string;
  type: 'damage' | 'heal' | 'system' | 'critical' | 'normal';
  turn: number;
}

export interface LeaderboardEntry {
  id: number;
  wins: number;
  losses: number;
  streak: number;
}
