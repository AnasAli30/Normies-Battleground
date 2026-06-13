"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBurst,
  faSkull,
  faFire,
  faStar,
  faWind,
  faTrophy,
  faCrown,
  faMedal,
  faGamepad,
} from "@fortawesome/free-solid-svg-icons";
import type { Fighter, LeaderboardEntry } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface ResultsScreenProps {
  winner: "player" | "opponent" | null;
  playerFighter: Fighter | null;
  opponentFighter: Fighter | null;
  turnsCount: number;
  maxComboCount: number;
  perfectsCount: number;
  dodgesCount: number;
  damageDealtCount: number;
  damageTakenCount: number;
  leaderboard: LeaderboardEntry[];
  onRematch: () => void;
  onNewCombat: () => void;
}

export function ResultsScreen({
  winner,
  playerFighter,
  opponentFighter,
  turnsCount,
  maxComboCount,
  perfectsCount,
  dodgesCount,
  damageDealtCount,
  damageTakenCount,
  leaderboard,
  onRematch,
  onNewCombat,
}: ResultsScreenProps) {
  const isVictory = winner === "player";

  return (
    <section className="screen active results-screen safe-area-pad">
      <div className="results-container">
        <div className="results-banner">
          <h1 className={`results-banner-title ${isVictory ? "victory" : "defeat"}`}>
            {isVictory ? (
              <>
                <FontAwesomeIcon icon={faBurst} style={{ marginRight: "8px" }} />
                Protocol Success
                <FontAwesomeIcon icon={faBurst} style={{ marginLeft: "8px" }} />
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSkull} style={{ marginRight: "8px" }} />
                Character Terminated
                <FontAwesomeIcon icon={faSkull} style={{ marginLeft: "8px" }} />
              </>
            )}
          </h1>
          <p className="results-banner-sub">
            {isVictory
              ? `${playerFighter?.name} wiped out ${opponentFighter?.name}!`
              : `${opponentFighter?.name} destroyed ${playerFighter?.name}...`}
          </p>
        </div>

        <div className="results-stats-grid">
          <div className="result-stat-card">
            <div className="result-stat-label">Turns resolved</div>
            <div className="result-stat-value" style={{ color: "var(--accent-secondary)" }}>{turnsCount}</div>
          </div>
          <div className="result-stat-card">
            <div className="result-stat-label">Max combo</div>
            <div className="result-stat-value" style={{ color: "var(--accent-gold)" }}>
              <FontAwesomeIcon icon={faFire} style={{ marginRight: "6px" }} /> {maxComboCount}×
            </div>
          </div>
          <div className="result-stat-card">
            <div className="result-stat-label">Perfect timings</div>
            <div className="result-stat-value" style={{ color: "var(--accent-green)" }}>
              <FontAwesomeIcon icon={faStar} style={{ marginRight: "6px" }} /> {perfectsCount}
            </div>
          </div>
          <div className="result-stat-card">
            <div className="result-stat-label">Dodges executed</div>
            <div className="result-stat-value" style={{ color: "var(--accent-secondary)" }}>
              <FontAwesomeIcon icon={faWind} style={{ marginRight: "6px" }} /> {dodgesCount}
            </div>
          </div>
          <div className="result-stat-card">
            <div className="result-stat-label">Damage dealt</div>
            <div className="result-stat-value" style={{ color: "var(--accent-primary)" }}>{damageDealtCount}</div>
          </div>
          <div className="result-stat-card">
            <div className="result-stat-label">Damage taken</div>
            <div className="result-stat-value" style={{ color: "var(--accent-red)" }}>{damageTakenCount}</div>
          </div>
        </div>

        <div className="leaderboard-panel">
          <h3 className="panel-title" style={{ marginBottom: "15px" }}>
            <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "8px" }} /> Local Scoreboard
          </h3>
          {leaderboard.length > 0 ? (
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
                  {leaderboard.map((entry, idx) => {
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
            <div className="leaderboard-empty">No combat rankings recorded.</div>
          )}
        </div>

        <div className="results-actions">
          <Button variant="primary" onClick={onRematch} style={{ padding: "14px 28px" }}>
            <FontAwesomeIcon icon={faBurst} style={{ marginRight: "8px" }} /> Initiate Rematch
          </Button>
          <Button onClick={onNewCombat} style={{ padding: "14px 28px" }}>
            <FontAwesomeIcon icon={faGamepad} style={{ marginRight: "8px" }} /> New Combat
          </Button>
        </div>
      </div>
    </section>
  );
}
