/**
 * REST API endpoints for leaderboard and match history.
 * Mounted alongside the Socket.IO server on the same HTTP server.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { getTopLeaderboard, getNormieStats, getMatchHistory } from './db';

/**
 * Simple REST router for the PVP server.
 * Returns true if the request was handled, false otherwise.
 */
export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  // GET /api/leaderboard
  if (path === '/api/leaderboard' && req.method === 'GET') {
    try {
      const limitStr = url.searchParams.get('limit');
      const limit = limitStr ? parseInt(limitStr, 10) : 50;
      const leaderboard = await getTopLeaderboard(limit);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: leaderboard }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    }
    return true;
  }

  // GET /api/stats/:normieId
  const statsMatch = path.match(/^\/api\/stats\/(\d+)$/);
  if (statsMatch && req.method === 'GET') {
    try {
      const normieId = parseInt(statsMatch[1], 10);
      const stats = await getNormieStats(normieId);

      if (stats) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: stats }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: { normieId, wins: 0, losses: 0, streak: 0, elo: 1000 },
        }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    }
    return true;
  }

  // GET /api/match-history/:normieId
  const historyMatch = path.match(/^\/api\/match-history\/(\d+)$/);
  if (historyMatch && req.method === 'GET') {
    try {
      const normieId = parseInt(historyMatch[1], 10);
      const limitStr = url.searchParams.get('limit');
      const limit = limitStr ? parseInt(limitStr, 10) : 20;
      const history = await getMatchHistory(normieId, limit);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: history }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    }
    return true;
  }

  // GET /api/health
  if (path === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return true;
  }

  return false; // Not handled — let Socket.IO handle it
}
