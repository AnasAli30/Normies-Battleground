/**
 * Socket.IO client wrapper for PVP multiplayer.
 * Handles connection, matchmaking queue, and game actions.
 */

import { io, Socket } from 'socket.io-client';
import {
  EVENTS,
  PvpFighterData,
  PvpAction,
  PvpMatchFoundPayload,
  PvpStateUpdate,
  PvpBattleEndPayload,
} from './shared-types';

const SERVER_URL = process.env.NEXT_PUBLIC_PVP_SERVER_URL || 'http://localhost:3001';

let socket: Socket | null = null;

// ─── Connection ─────────────────────────────────────────────────────

export function connectToServer(): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Connected to PVP server:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected from PVP server:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ PVP server connection error:', err.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function isConnected(): boolean {
  return !!socket?.connected;
}

export function disconnectFromServer(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// ─── Queue Actions ──────────────────────────────────────────────────

export function joinQueue(fighter: PvpFighterData): void {
  if (!socket?.connected) {
    connectToServer();
  }
  socket?.emit(EVENTS.JOIN_QUEUE, { fighter });
}

export function leaveQueue(): void {
  socket?.emit(EVENTS.LEAVE_QUEUE);
}

export function createRoom(fighter: PvpFighterData): void {
  if (!socket?.connected) {
    connectToServer();
  }
  socket?.emit(EVENTS.CREATE_ROOM, { fighter });
}

export function joinRoom(fighter: PvpFighterData, roomCode: string): void {
  if (!socket?.connected) {
    connectToServer();
  }
  socket?.emit(EVENTS.JOIN_ROOM, { fighter, roomCode });
}

// ─── Game Actions ───────────────────────────────────────────────────

export function sendAction(action: PvpAction): void {
  socket?.emit(EVENTS.PLAYER_ACTION, action);
}

export function sendAbility(abilityIndex: number): void {
  sendAction({ type: 'ability', payload: { abilityIndex } });
}

export function sendTimingResult(result: 'miss' | 'ok' | 'perfect' | 'critical'): void {
  sendAction({ type: 'timing_result', payload: { timingResult: result } });
}

export function sendDodgeResult(dodged: boolean): void {
  sendAction({ type: 'dodge_result', payload: { dodged } });
}

// ─── Event Listeners ────────────────────────────────────────────────

export function onQueueJoined(callback: (data: { position: number }) => void): void {
  socket?.on(EVENTS.QUEUE_JOINED, callback);
}

export function onQueueLeft(callback: () => void): void {
  socket?.on(EVENTS.QUEUE_LEFT, callback);
}

export function onQueueStatus(callback: (data: { playersInQueue: number }) => void): void {
  socket?.on(EVENTS.QUEUE_STATUS, callback);
}

export function onMatchFound(callback: (data: PvpMatchFoundPayload) => void): void {
  socket?.on(EVENTS.MATCH_FOUND, callback);
}

export function onRoomCreated(callback: (data: { roomCode: string }) => void): void {
  socket?.on(EVENTS.ROOM_CREATED, callback);
}

export function onStateUpdate(callback: (data: PvpStateUpdate & { lastAction?: PvpStateUpdate['lastAction'] }) => void): void {
  socket?.on(EVENTS.STATE_UPDATE, callback);
}

export function onTimingPrompt(callback: (data: { roomId: string; abilityIndex: number }) => void): void {
  socket?.on(EVENTS.TIMING_PROMPT, callback);
}

export function onDodgePrompt(callback: (data: { roomId: string; abilityName: string; damage: number }) => void): void {
  socket?.on(EVENTS.DODGE_PROMPT, callback);
}

export function onBattleEnd(callback: (data: PvpBattleEndPayload) => void): void {
  socket?.on(EVENTS.BATTLE_END, callback);
}

export function onOpponentDisconnect(callback: (data: { roomId: string; message: string }) => void): void {
  socket?.on(EVENTS.OPPONENT_DISCONNECT, callback);
}

export function onError(callback: (data: { message: string }) => void): void {
  socket?.on(EVENTS.ERROR, callback);
}

// ─── Cleanup all listeners ──────────────────────────────────────────
export function removeAllPvpListeners(): void {
  if (!socket) return;

  const events = Object.values(EVENTS);
  events.forEach(event => {
    socket?.removeAllListeners(event);
  });
}

// ─── Leaderboard REST API ───────────────────────────────────────────

export async function fetchPvpLeaderboard(limit = 50): Promise<any[]> {
  try {
    const res = await fetch(`${SERVER_URL}/api/leaderboard?limit=${limit}`);
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    console.error('Failed to fetch PVP leaderboard');
    return [];
  }
}

export async function fetchPvpStats(normieId: number): Promise<any> {
  try {
    const res = await fetch(`${SERVER_URL}/api/stats/${normieId}`);
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    console.error('Failed to fetch PVP stats');
    return null;
  }
}

export async function fetchMatchHistory(normieId: number, limit = 20): Promise<any[]> {
  try {
    const res = await fetch(`${SERVER_URL}/api/match-history/${normieId}?limit=${limit}`);
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    console.error('Failed to fetch match history');
    return [];
  }
}
