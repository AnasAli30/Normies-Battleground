import { LeaderboardEntry } from './types';

const STORAGE_KEY = 'normies_battleground_leaderboard';

function loadData(): Record<number, LeaderboardEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveData(data: Record<number, LeaderboardEntry>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Record a battle result
 */
export function recordResult(winnerId: number, loserId: number) {
  const data = loadData();

  // Winner
  if (!data[winnerId]) {
    data[winnerId] = { id: winnerId, wins: 0, losses: 0, streak: 0 };
  }
  data[winnerId].wins++;
  data[winnerId].streak++;

  // Loser
  if (!data[loserId]) {
    data[loserId] = { id: loserId, wins: 0, losses: 0, streak: 0 };
  }
  data[loserId].losses++;
  data[loserId].streak = 0;

  saveData(data);
}

/**
 * Get leaderboard sorted by wins
 */
export function getLeaderboard(limit = 20): LeaderboardEntry[] {
  const data = loadData();
  return Object.values(data)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .slice(0, limit);
}

/**
 * Get stats for a specific Normie
 */
export function getStats(normieId: number): LeaderboardEntry {
  const data = loadData();
  return data[normieId] || { id: normieId, wins: 0, losses: 0, streak: 0 };
}
