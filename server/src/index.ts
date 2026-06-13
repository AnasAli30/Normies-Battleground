/**
 * Normies Battleground — PVP WebSocket Server
 * Entry point: HTTP server + Socket.IO + MongoDB + REST API
 */

import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './db';
import { Matchmaker } from './matchmaking';
import { RoomManager } from './room-manager';
import { handleApiRequest } from './leaderboard-api';
import { EVENTS, PvpFighterData, PvpAction } from './types';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/normies_battleground';

async function main() {
  // Connect to MongoDB
  await connectDB(MONGODB_URI);

  // Create HTTP server with REST API handler
  const httpServer = http.createServer(async (req, res) => {
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: CORS_ORIGIN.split(',').map(s => s.trim()),
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Initialize services
  const roomManager = new RoomManager();
  const matchmaker = new Matchmaker(io, roomManager);

  // Track connected players
  let connectedPlayers = 0;

  io.on('connection', (socket) => {
    connectedPlayers++;
    console.log(`🔌 Player connected: ${socket.id} (${connectedPlayers} online)`);

    // ── Join Queue ─────────────────────────────────────────────
    socket.on(EVENTS.JOIN_QUEUE, (data: { fighter: PvpFighterData }) => {
      if (!data.fighter || !data.fighter.id || !data.fighter.stats) {
        socket.emit(EVENTS.ERROR, { message: 'Invalid fighter data.' });
        return;
      }
      matchmaker.joinQueue(socket, data.fighter);
    });

    // ── Leave Queue ────────────────────────────────────────────
    socket.on(EVENTS.LEAVE_QUEUE, () => {
      matchmaker.leaveQueue(socket.id);
    });

    // ── Create Private Room ───────────────────────────────────
    socket.on(EVENTS.CREATE_ROOM, (data: { fighter: PvpFighterData }) => {
      if (!data.fighter || !data.fighter.id || !data.fighter.stats) {
        socket.emit(EVENTS.ERROR, { message: 'Invalid fighter data.' });
        return;
      }
      // Leave queue if in it
      matchmaker.leaveQueue(socket.id);
      
      const roomCode = roomManager.createPrivateLobby(socket, data.fighter);
      if (!roomCode) {
        socket.emit(EVENTS.ERROR, { message: 'You are already in a match.' });
        return;
      }
      socket.emit(EVENTS.ROOM_CREATED, { roomCode });
      console.log(`🔑 Room code ${roomCode} sent to ${data.fighter.name}`);
    });

    // ── Join Private Room ─────────────────────────────────────
    socket.on(EVENTS.JOIN_ROOM, async (data: { fighter: PvpFighterData; roomCode: string }) => {
      if (!data.fighter || !data.fighter.id || !data.fighter.stats || !data.roomCode) {
        socket.emit(EVENTS.ERROR, { message: 'Invalid data.' });
        return;
      }
      // Leave queue if in it
      matchmaker.leaveQueue(socket.id);

      const result = await roomManager.joinPrivateLobby(io, socket, data.fighter, data.roomCode);
      if (!result.success) {
        socket.emit(EVENTS.ERROR, { message: result.error || 'Failed to join room.' });
      }
    });

    // ── Player Action (ability, timing, dodge) ─────────────────
    socket.on(EVENTS.PLAYER_ACTION, (action: PvpAction) => {
      if (!action || !action.type) {
        socket.emit(EVENTS.ERROR, { message: 'Invalid action.' });
        return;
      }
      roomManager.handleAction(io, socket.id, action);
    });

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', async () => {
      connectedPlayers--;
      console.log(`🔌 Player disconnected: ${socket.id} (${connectedPlayers} online)`);

      // Clean up matchmaking queue
      matchmaker.handleDisconnect(socket.id);

      // Handle in-progress match
      await roomManager.handleDisconnect(io, socket.id);
    });
  });

  // Start listening
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ⚔️  NORMIES BATTLEGROUND — PVP SERVER');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  🌐 WebSocket:  ws://localhost:${PORT}`);
    console.log(`  📡 REST API:   http://localhost:${PORT}/api`);
    console.log(`  🎯 CORS:       ${CORS_ORIGIN}`);
    console.log(`  🗄️  MongoDB:    ${MONGODB_URI}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  });
}

main().catch((err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});
