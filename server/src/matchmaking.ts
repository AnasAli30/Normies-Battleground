/**
 * Matchmaking queue for PVP.
 * Uses an in-memory queue for fast pairing, with MongoDB room persistence.
 */

import { Server, Socket } from 'socket.io';
import { EVENTS, PvpFighterData } from './types';
import { RoomManager } from './room-manager';

interface QueueEntry {
  socketId: string;
  socket: Socket;
  fighter: PvpFighterData;
  joinedAt: number;
}

export class Matchmaker {
  private queue: QueueEntry[] = [];
  private io: Server;
  private roomManager: RoomManager;

  constructor(io: Server, roomManager: RoomManager) {
    this.io = io;
    this.roomManager = roomManager;
  }

  /**
   * Add a player to the matchmaking queue
   */
  public joinQueue(socket: Socket, fighter: PvpFighterData): void {
    // Remove if already in queue
    this.removeFromQueue(socket.id);

    // Also ensure they're not already in a room
    if (this.roomManager.getPlayerRoom(socket.id)) {
      socket.emit(EVENTS.ERROR, { message: 'You are already in a match.' });
      return;
    }

    const entry: QueueEntry = {
      socketId: socket.id,
      socket,
      fighter,
      joinedAt: Date.now(),
    };

    this.queue.push(entry);
    socket.emit(EVENTS.QUEUE_JOINED, { position: this.queue.length });

    console.log(`📋 ${fighter.name} (${socket.id}) joined queue. Queue size: ${this.queue.length}`);

    // Broadcast queue status
    this.broadcastQueueStatus();

    // Try to match
    this.tryMatch();
  }

  /**
   * Remove a player from the queue
   */
  public leaveQueue(socketId: string): void {
    const removed = this.removeFromQueue(socketId);
    if (removed) {
      removed.socket.emit(EVENTS.QUEUE_LEFT, {});
      console.log(`📋 ${removed.fighter.name} (${socketId}) left queue. Queue size: ${this.queue.length}`);
      this.broadcastQueueStatus();
    }
  }

  /**
   * Handle player disconnect — clean up queue
   */
  public handleDisconnect(socketId: string): void {
    this.removeFromQueue(socketId);
    this.broadcastQueueStatus();
  }

  /**
   * Attempt to pair two players from the queue
   */
  private tryMatch(): void {
    if (this.queue.length < 2) return;

    const player1 = this.queue.shift()!;
    const player2 = this.queue.shift()!;

    console.log(`⚔️ Match found: ${player1.fighter.name} vs ${player2.fighter.name}`);

    // Create the room
    this.roomManager.createRoom(
      this.io,
      player1.socket,
      player2.socket,
      player1.fighter,
      player2.fighter
    );

    this.broadcastQueueStatus();
  }

  private removeFromQueue(socketId: string): QueueEntry | null {
    const index = this.queue.findIndex(e => e.socketId === socketId);
    if (index !== -1) {
      return this.queue.splice(index, 1)[0];
    }
    return null;
  }

  private broadcastQueueStatus(): void {
    this.io.emit(EVENTS.QUEUE_STATUS, { playersInQueue: this.queue.length });
  }

  public getQueueSize(): number {
    return this.queue.length;
  }
}
