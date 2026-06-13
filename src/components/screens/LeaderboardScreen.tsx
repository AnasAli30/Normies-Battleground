"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faCrown,
  faMedal,
  faFire,
  faGamepad,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import type { LeaderboardEntry } from "@/lib/types";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { Button } from "@/components/ui/Button";

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[];
  onPlayAgain: () => void;
  onModeSelect: () => void;
}

export function LeaderboardScreen({ entries, onPlayAgain, onModeSelect }: LeaderboardScreenProps) {
  return (
    <ScreenShell className="leaderboard-screen">
      <div className="results-container">
        <h1 className="center-title" style={{ textAlign: "center" }}>
          <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "10px" }} /> Normies Championship
        </h1>

        <div className="leaderboard-panel">
          <h3 className="panel-title" style={{ marginBottom: "15px" }}>Leaderboard Stats</h3>
          {entries.length > 0 ? (
            <div className="scroll-x-table">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Normie</th>
                    <th>Wins</th>
                    <th>Losses</th>
                    <th>Win %</th>
                    <th>Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const ratio =
                      entry.wins + entry.losses > 0
                        ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
                        : 0;
                    return (
                      <tr key={idx}>
                        <td>
                          {idx === 0 ? (
                            <FontAwesomeIcon icon={faCrown} style={{ color: "var(--accent-gold)" }} />
                          ) : idx === 1 ? (
                            <FontAwesomeIcon icon={faMedal} style={{ color: "#c0c0c0" }} />
                          ) : idx === 2 ? (
                            <FontAwesomeIcon icon={faMedal} style={{ color: "#cd7f32" }} />
                          ) : (
                            `#${idx + 1}`
                          )}
                        </td>
                        <td>Normie #{entry.id}</td>
                        <td className="leaderboard-wins">{entry.wins}</td>
                        <td className="leaderboard-losses">{entry.losses}</td>
                        <td>{ratio}%</td>
                        <td>
                          {entry.streak > 0 ? (
                            <>
                              <FontAwesomeIcon icon={faFire} style={{ color: "var(--accent-gold)", marginRight: "4px" }} />
                              {entry.streak}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="leaderboard-empty">No rankings recorded. Start fighting to record scores!</div>
          )}
        </div>

        <div className="results-actions">
          <Button onClick={onPlayAgain}>
            <FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "6px" }} /> Play Again
          </Button>
          <Button variant="ghost" onClick={onModeSelect}>
            <FontAwesomeIcon icon={faGamepad} style={{ marginRight: "6px" }} /> Mode Select
          </Button>
        </div>
      </div>
    </ScreenShell>
  );
}
