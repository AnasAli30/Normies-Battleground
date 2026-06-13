/**
 * Server-local copy of shared types.
 * Mirrors src/lib/shared-types.ts for the server's TypeScript compilation.
 */

// ─── Socket Event Names ─────────────────────────────────────────────
export const EVENTS = {
  JOIN_QUEUE: 'pvp:join_queue',
  LEAVE_QUEUE: 'pvp:leave_queue',
  PLAYER_ACTION: 'pvp:player_action',
  CREATE_ROOM: 'pvp:create_room',
  JOIN_ROOM: 'pvp:join_room',
  QUEUE_JOINED: 'pvp:queue_joined',
  QUEUE_LEFT: 'pvp:queue_left',
  MATCH_FOUND: 'pvp:match_found',
  STATE_UPDATE: 'pvp:state_update',
  TIMING_PROMPT: 'pvp:timing_prompt',
  DODGE_PROMPT: 'pvp:dodge_prompt',
  BATTLE_END: 'pvp:battle_end',
  OPPONENT_DISCONNECT: 'pvp:opponent_disconnect',
  ERROR: 'pvp:error',
  QUEUE_STATUS: 'pvp:queue_status',
  ROOM_CREATED: 'pvp:room_created',
} as const;

export interface PvpFighterData {
  id: number;
  name: string;
  type: string;
  class: string;
  gender: string;
  age: string;
  traits: {
    hairStyle: string;
    facialFeature: string;
    eyes: string;
    expression: string;
    accessory: string;
  };
  level: number;
  actionPoints: number;
  customized: boolean;
  pixelCount: number;
  stats: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
    crit: number;
  };
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
}

export interface PvpAction {
  type: 'ability' | 'timing_result' | 'dodge_result';
  payload: {
    abilityIndex?: number;
    timingResult?: 'miss' | 'ok' | 'perfect' | 'critical';
    dodged?: boolean;
  };
}

export interface PvpAbilityInfo {
  id: string;
  name: string;
  icon: string;
  type: string;
  cooldown: number;
  currentCooldown: number;
  description: string;
  canUse: boolean;
}

export interface PvpBuffInfo {
  stat: string;
  multiplier: number;
  turns: number;
  remaining: number;
}

export interface PvpLogEntry {
  message: string;
  type: 'damage' | 'heal' | 'system' | 'critical' | 'normal';
  turn: number;
}

export interface PvpStateUpdate {
  roomId: string;
  turn: number;
  isPlayer1Turn: boolean;
  player1: {
    hp: number;
    maxHp: number;
    buffs: PvpBuffInfo[];
    dodgeCharges: number;
    combo: number;
    abilities: PvpAbilityInfo[];
  };
  player2: {
    hp: number;
    maxHp: number;
    buffs: PvpBuffInfo[];
    dodgeCharges: number;
    combo: number;
    abilities: PvpAbilityInfo[];
  };
  newLogs: PvpLogEntry[];
  lastAction?: {
    attackerSide: 'player1' | 'player2';
    abilityName: string;
    abilityType: string;
    damage: number;
    heal?: number;
    isCrit: boolean;
    dodged: boolean;
    impactSeed?: number;
  };
}

export interface PvpMatchFoundPayload {
  roomId: string;
  yourSide: 'player1' | 'player2';
  opponent: PvpFighterData;
  yourFighter: PvpFighterData;
  initialState: PvpStateUpdate;
}

export interface PvpBattleEndPayload {
  roomId: string;
  winnerId: number;
  loserId: number;
  winnerSide: 'player1' | 'player2';
  summary: {
    turns: number;
    player1Damage: number;
    player2Damage: number;
    player1HpRemaining: number;
    player2HpRemaining: number;
  };
}
