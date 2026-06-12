import mongoose, { Schema, Document } from 'mongoose';

// ─── Leaderboard Model ─────────────────────────────────────────────
export interface ILeaderboard extends Document {
  normieId: number;
  wins: number;
  losses: number;
  streak: number;
  elo: number;
  lastPlayed: Date;
}

const LeaderboardSchema = new Schema<ILeaderboard>({
  normieId: { type: Number, required: true, unique: true, index: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  elo: { type: Number, default: 1000 },
  lastPlayed: { type: Date, default: Date.now },
});

export const Leaderboard = mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);

// ─── Match History Model ────────────────────────────────────────────
export interface IMatchHistory extends Document {
  roomId: string;
  player1Id: number;
  player2Id: number;
  winnerId: number;
  loserId: number;
  turns: number;
  player1Damage: number;
  player2Damage: number;
  duration: number;
  createdAt: Date;
}

const MatchHistorySchema = new Schema<IMatchHistory>({
  roomId: { type: String, required: true, index: true },
  player1Id: { type: Number, required: true, index: true },
  player2Id: { type: Number, required: true, index: true },
  winnerId: { type: Number, required: true },
  loserId: { type: Number, required: true },
  turns: { type: Number, default: 0 },
  player1Damage: { type: Number, default: 0 },
  player2Damage: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const MatchHistory = mongoose.model<IMatchHistory>('MatchHistory', MatchHistorySchema);

// ─── Active Room Model (TTL-based auto-cleanup) ─────────────────────
export interface IActiveRoom extends Document {
  roomId: string;
  player1SocketId: string;
  player2SocketId: string;
  player1FighterId: number;
  player2FighterId: number;
  state: 'waiting' | 'in_progress' | 'finished';
  createdAt: Date;
}

const ActiveRoomSchema = new Schema<IActiveRoom>({
  roomId: { type: String, required: true, unique: true, index: true },
  player1SocketId: { type: String, required: true },
  player2SocketId: { type: String, required: true },
  player1FighterId: { type: Number, required: true },
  player2FighterId: { type: Number, required: true },
  state: { type: String, enum: ['waiting', 'in_progress', 'finished'], default: 'in_progress' },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // Auto-delete after 1 hour
});

export const ActiveRoom = mongoose.model<IActiveRoom>('ActiveRoom', ActiveRoomSchema);

// ─── Database Connection ────────────────────────────────────────────
export async function connectDB(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// ─── Leaderboard Helpers ────────────────────────────────────────────

/**
 * Calculate new ELO rating after a match
 */
function calculateElo(winnerElo: number, loserElo: number): { newWinnerElo: number; newLoserElo: number } {
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  return {
    newWinnerElo: Math.round(winnerElo + K * (1 - expectedWinner)),
    newLoserElo: Math.max(100, Math.round(loserElo + K * (0 - expectedLoser))),
  };
}

/**
 * Record a PVP match result in the database
 */
export async function recordPvpResult(
  winnerId: number,
  loserId: number,
  roomId: string,
  turns: number,
  p1Damage: number,
  p2Damage: number,
  duration: number,
  player1Id: number,
  player2Id: number
): Promise<void> {
  // Get or create leaderboard entries
  let winner = await Leaderboard.findOne({ normieId: winnerId });
  let loser = await Leaderboard.findOne({ normieId: loserId });

  if (!winner) {
    winner = new Leaderboard({ normieId: winnerId, wins: 0, losses: 0, streak: 0, elo: 1000 });
  }
  if (!loser) {
    loser = new Leaderboard({ normieId: loserId, wins: 0, losses: 0, streak: 0, elo: 1000 });
  }

  // Calculate new ELO
  const { newWinnerElo, newLoserElo } = calculateElo(winner.elo, loser.elo);

  // Update winner
  winner.wins += 1;
  winner.streak += 1;
  winner.elo = newWinnerElo;
  winner.lastPlayed = new Date();
  await winner.save();

  // Update loser
  loser.losses += 1;
  loser.streak = 0;
  loser.elo = newLoserElo;
  loser.lastPlayed = new Date();
  await loser.save();

  // Save match history
  await MatchHistory.create({
    roomId,
    player1Id,
    player2Id,
    winnerId,
    loserId,
    turns,
    player1Damage: p1Damage,
    player2Damage: p2Damage,
    duration,
  });

  // Update room state
  await ActiveRoom.updateOne({ roomId }, { state: 'finished' });
}

/**
 * Get top leaderboard entries
 */
export async function getTopLeaderboard(limit = 50): Promise<ILeaderboard[]> {
  const result = await Leaderboard.find().sort({ elo: -1, wins: -1 }).limit(limit).lean();
  return result as unknown as ILeaderboard[];
}

/**
 * Get stats for a specific normie
 */
export async function getNormieStats(normieId: number): Promise<ILeaderboard | null> {
  const result = await Leaderboard.findOne({ normieId }).lean();
  return result as unknown as ILeaderboard;
}

/**
 * Get recent match history for a normie
 */
export async function getMatchHistory(normieId: number, limit = 20): Promise<IMatchHistory[]> {
  const result = await MatchHistory.find({
    $or: [{ player1Id: normieId }, { player2Id: normieId }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
    
  return result as unknown as IMatchHistory[];
}
