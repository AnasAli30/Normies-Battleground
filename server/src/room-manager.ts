/**
 * Room manager for PVP matches.
 * Handles room creation, action processing, disconnects, and DB persistence.
 */

import { Server, Socket } from 'socket.io';
import {
  EVENTS,
  PvpFighterData,
  PvpAction,
  PvpMatchFoundPayload,
  PvpBattleEndPayload,
} from './types';
import { ServerCombatEngine } from './server-combat';
import { recordPvpResult, ActiveRoom } from './db';

interface Room {
  roomId: string;
  player1SocketId: string;
  player2SocketId: string;
  player1Fighter: PvpFighterData;
  player2Fighter: PvpFighterData;
  engine: ServerCombatEngine;
  createdAt: number;
}

interface PrivateLobby {
  roomCode: string;
  hostSocketId: string;
  hostSocket: Socket;
  hostFighter: PvpFighterData;
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map(); // roomId → Room
  private playerRooms: Map<string, string> = new Map(); // socketId → roomId
  private privateLobbies: Map<string, PrivateLobby> = new Map(); // roomCode → PrivateLobby
  private playerLobbies: Map<string, string> = new Map(); // socketId → roomCode

  /**
   * Create a new PVP room and start the match
   */
  public async createRoom(
    io: Server,
    player1Socket: Socket,
    player2Socket: Socket,
    fighter1: PvpFighterData,
    fighter2: PvpFighterData
  ): Promise<void> {
    const roomId = generateRoomId();
    const engine = new ServerCombatEngine(roomId, fighter1, fighter2);

    const room: Room = {
      roomId,
      player1SocketId: player1Socket.id,
      player2SocketId: player2Socket.id,
      player1Fighter: fighter1,
      player2Fighter: fighter2,
      engine,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(player1Socket.id, roomId);
    this.playerRooms.set(player2Socket.id, roomId);

    // Join socket.io room
    player1Socket.join(roomId);
    player2Socket.join(roomId);

    // Persist to MongoDB
    try {
      await ActiveRoom.create({
        roomId,
        player1SocketId: player1Socket.id,
        player2SocketId: player2Socket.id,
        player1FighterId: fighter1.id,
        player2FighterId: fighter2.id,
        state: 'in_progress',
      });
    } catch (err) {
      console.error('Failed to persist room to DB:', err);
    }

    // Send match found to both players
    const initialState = engine.getStateUpdate();

    const p1Payload: PvpMatchFoundPayload = {
      roomId,
      yourSide: 'player1',
      opponent: fighter2,
      yourFighter: fighter1,
      initialState,
    };

    const p2Payload: PvpMatchFoundPayload = {
      roomId,
      yourSide: 'player2',
      opponent: fighter1,
      yourFighter: fighter2,
      initialState,
    };

    player1Socket.emit(EVENTS.MATCH_FOUND, p1Payload);
    player2Socket.emit(EVENTS.MATCH_FOUND, p2Payload);

    console.log(`🏟️ Room ${roomId} created: ${fighter1.name} vs ${fighter2.name}`);
  }

  /**
   * Process a player action
   */
  public handleAction(io: Server, socketId: string, action: PvpAction): void {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room || room.engine.isOver) return;

    const engine = room.engine;
    const isPlayer1 = socketId === room.player1SocketId;
    const isCurrentTurn = engine.isPlayer1Turn === isPlayer1;

    switch (action.type) {
      case 'ability': {
        if (!isCurrentTurn || engine.waitingForTiming || engine.waitingForDodge) return;

        const { valid, needsTiming } = engine.selectAbility(action.payload.abilityIndex!);
        if (!valid) return;

        if (needsTiming) {
          // Send timing prompt to the attacker
          const attackerSocket = isPlayer1 ? room.player1SocketId : room.player2SocketId;
          io.to(attackerSocket).emit(EVENTS.TIMING_PROMPT, {
            roomId,
            abilityIndex: action.payload.abilityIndex,
          });

          // Auto-miss after 3.5 seconds if no response
          engine.pendingTimingTimeout = setTimeout(() => {
            if (engine.waitingForTiming) {
              this._resolveTimingAndBroadcast(io, room, 'miss');
            }
          }, 3500);
        }
        break;
      }

      case 'timing_result': {
        if (!isCurrentTurn || !engine.waitingForTiming) return;

        // Clear timeout
        if (engine.pendingTimingTimeout) {
          clearTimeout(engine.pendingTimingTimeout);
          engine.pendingTimingTimeout = null;
        }

        const result = action.payload.timingResult || 'miss';
        this._resolveTimingAndBroadcast(io, room, result);
        break;
      }

      case 'dodge_result': {
        // Dodge is resolved by the DEFENDER (not the current turn player)
        const isDefender = engine.isPlayer1Turn !== isPlayer1;
        if (!isDefender || !engine.waitingForDodge) return;

        // Clear timeout
        if (engine.pendingDodgeTimeout) {
          clearTimeout(engine.pendingDodgeTimeout);
          engine.pendingDodgeTimeout = null;
        }

        const { stateUpdate, lastAction } = engine.resolveDodge(!!action.payload.dodged);

        // Broadcast state update
        io.to(roomId).emit(EVENTS.STATE_UPDATE, { ...stateUpdate, lastAction });

        // Check battle end
        if (engine.isOver) {
          this._endMatch(io, room);
        }
        break;
      }
    }
  }

  private _resolveTimingAndBroadcast(io: Server, room: Room, result: string): void {
    const engine = room.engine;
    const { needsDodge, stateUpdate, lastAction } = engine.resolveTimingAttack(
      result as 'miss' | 'ok' | 'perfect' | 'critical'
    );

    if (needsDodge) {
      // Send dodge prompt to the defender
      const defenderSocketId = engine.isPlayer1Turn
        ? room.player2SocketId
        : room.player1SocketId;

      io.to(defenderSocketId).emit(EVENTS.DODGE_PROMPT, {
        roomId: room.roomId,
        abilityName: lastAction?.abilityName,
        damage: lastAction?.damage,
      });

      // Also broadcast partial state update (so attacker sees their move happened)
      io.to(room.roomId).emit(EVENTS.STATE_UPDATE, { ...stateUpdate });

      // Auto-fail dodge after 2 seconds
      engine.pendingDodgeTimeout = setTimeout(() => {
        if (engine.waitingForDodge) {
          const { stateUpdate: dodgeUpdate, lastAction: dodgeAction } = engine.resolveDodge(false);
          io.to(room.roomId).emit(EVENTS.STATE_UPDATE, { ...dodgeUpdate, lastAction: dodgeAction });

          if (engine.isOver) {
            this._endMatch(io, room);
          }
        }
      }, 2000);
    } else {
      // No dodge needed — broadcast full state
      io.to(room.roomId).emit(EVENTS.STATE_UPDATE, { ...stateUpdate, lastAction });

      if (engine.isOver) {
        this._endMatch(io, room);
      }
    }
  }

  /**
   * Handle player disconnect during a match
   */
  public async handleDisconnect(io: Server, socketId: string): Promise<void> {
    // Clean up private lobby if host disconnects while waiting
    const lobbyCode = this.playerLobbies.get(socketId);
    if (lobbyCode) {
      this.privateLobbies.delete(lobbyCode);
      this.playerLobbies.delete(socketId);
      console.log(`🚪 Private lobby ${lobbyCode} closed (host disconnected)`);
    }

    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const engine = room.engine;
    if (engine.isOver) return;

    // Determine winner (the one who didn't disconnect)
    const isPlayer1 = socketId === room.player1SocketId;
    const winningSide = isPlayer1 ? 'player2' : 'player1';
    const remainingSocketId = isPlayer1 ? room.player2SocketId : room.player1SocketId;

    engine.forceEnd(winningSide);

    // Notify remaining player
    io.to(remainingSocketId).emit(EVENTS.OPPONENT_DISCONNECT, {
      roomId,
      message: 'Your opponent disconnected. You win!',
    });

    await this._endMatch(io, room);
  }

  /**
   * End a match and persist results
   */
  private async _endMatch(io: Server, room: Room): Promise<void> {
    const engine = room.engine;
    const summary = engine.getSummary();

    const endPayload: PvpBattleEndPayload = {
      roomId: room.roomId,
      winnerId: engine.winnerId!,
      loserId: engine.loserId!,
      winnerSide: engine.winnerId === room.player1Fighter.id ? 'player1' : 'player2',
      summary,
    };

    io.to(room.roomId).emit(EVENTS.BATTLE_END, endPayload);

    // Clear timeouts
    if (engine.pendingTimingTimeout) clearTimeout(engine.pendingTimingTimeout);
    if (engine.pendingDodgeTimeout) clearTimeout(engine.pendingDodgeTimeout);

    // Persist to database
    try {
      await recordPvpResult(
        engine.winnerId!,
        engine.loserId!,
        room.roomId,
        summary.turns,
        summary.player1Damage,
        summary.player2Damage,
        summary.duration,
        room.player1Fighter.id,
        room.player2Fighter.id
      );
    } catch (err) {
      console.error('Failed to persist match result:', err);
    }

    // Clean up
    this.rooms.delete(room.roomId);
    this.playerRooms.delete(room.player1SocketId);
    this.playerRooms.delete(room.player2SocketId);

    console.log(`🏁 Room ${room.roomId} ended. Winner: Normie #${engine.winnerId}`);
  }

  /**
   * Get the room a player is in
   */
  public getPlayerRoom(socketId: string): string | undefined {
    return this.playerRooms.get(socketId);
  }

  /**
   * Get active room count
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }

  // ─── Private Room Lobby ───────────────────────────────────────────

  /**
   * Create a private lobby and return the room code
   */
  public createPrivateLobby(socket: Socket, fighter: PvpFighterData): string {
    // Clean up any existing lobby for this player
    const existingCode = this.playerLobbies.get(socket.id);
    if (existingCode) {
      this.privateLobbies.delete(existingCode);
      this.playerLobbies.delete(socket.id);
    }

    // Also ensure they're not already in a room
    if (this.getPlayerRoom(socket.id)) {
      return '';
    }

    const roomCode = generateRoomCode();
    const lobby: PrivateLobby = {
      roomCode,
      hostSocketId: socket.id,
      hostSocket: socket,
      hostFighter: fighter,
      createdAt: Date.now(),
    };

    this.privateLobbies.set(roomCode, lobby);
    this.playerLobbies.set(socket.id, roomCode);

    console.log(`🔑 Private lobby ${roomCode} created by ${fighter.name} (${socket.id})`);
    return roomCode;
  }

  /**
   * Join an existing private lobby by code
   */
  public async joinPrivateLobby(
    io: Server,
    socket: Socket,
    fighter: PvpFighterData,
    roomCode: string
  ): Promise<{ success: boolean; error?: string }> {
    const code = roomCode.toUpperCase().trim();
    const lobby = this.privateLobbies.get(code);

    if (!lobby) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    if (lobby.hostSocketId === socket.id) {
      return { success: false, error: 'You cannot join your own room.' };
    }

    if (this.getPlayerRoom(socket.id)) {
      return { success: false, error: 'You are already in a match.' };
    }

    // Remove the lobby — it's being consumed
    this.privateLobbies.delete(code);
    this.playerLobbies.delete(lobby.hostSocketId);

    // Create the actual match room
    await this.createRoom(io, lobby.hostSocket, socket, lobby.hostFighter, fighter);

    console.log(`🔑 Player ${fighter.name} joined private lobby ${code}`);
    return { success: true };
  }

  /**
   * Cancel a private lobby
   */
  public cancelPrivateLobby(socketId: string): boolean {
    const code = this.playerLobbies.get(socketId);
    if (!code) return false;
    this.privateLobbies.delete(code);
    this.playerLobbies.delete(socketId);
    console.log(`🚪 Private lobby ${code} cancelled`);
    return true;
  }

  /**
   * Check if player is in a private lobby
   */
  public isPlayerInLobby(socketId: string): boolean {
    return this.playerLobbies.has(socketId);
  }
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ROOM-${result}`;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
