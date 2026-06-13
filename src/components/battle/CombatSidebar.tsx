"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faShieldHalved,
  faWind,
  faCrosshairs,
  faDiamond,
} from "@fortawesome/free-solid-svg-icons";
import type { CombatLogEntry, Fighter } from "@/lib/types";
import { getBuffedStat, isPlayerLog, isOpponentLog } from "@/lib/game-ui";

interface CombatSidebarProps {
  side: "player" | "opponent";
  fighter: Fighter | null;
  hp: number;
  maxHp: number;
  pixelsCount: number;
  dodgeCharges?: number;
  maxDodgeCharges?: number;
  buffs: { stat: string; multiplier: number }[];
  logs: CombatLogEntry[];
  playerName: string;
  opponentName: string;
  logConsoleId: string;
}

export function CombatSidebar({
  side,
  fighter,
  hp,
  maxHp,
  pixelsCount,
  dodgeCharges,
  maxDodgeCharges,
  buffs,
  logs,
  playerName,
  opponentName,
  logConsoleId,
}: CombatSidebarProps) {
  const isPlayer = side === "player";
  const filterLog = isPlayer ? isPlayerLog : isOpponentLog;
  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const pixelPct = maxHp > 0 ? (pixelsCount / maxHp) * 100 : 0;

  const renderStat = (key: "atk" | "def" | "spd" | "crit", icon: typeof faBolt, suffix = "") => {
    if (!fighter) return "-";
    const { boost } = getBuffedStat(fighter.stats[key], key, buffs);
    const val = fighter.stats[key];
    return (
      <>
        <span className="base-stat-val">{val}{suffix}</span>
        {boost > 0 && <span className="stat-boost-val green"> +{boost}{suffix}</span>}
        {boost < 0 && <span className="stat-boost-val red"> {boost}{suffix}</span>}
      </>
    );
  };

  return (
    <aside className={`battle-sidebar ${!isPlayer ? "opponent-sidebar" : ""}`}>
      <div className="sidebar-portrait">
        {fighter && <img src={fighter.imageUrl} alt={fighter.name} />}
      </div>
      <div className="sidebar-name">{fighter?.name}</div>
      <div className="sidebar-hp-container">
        <div className="sidebar-hp-label">
          <span>HP</span>
          <span>{hp} / {maxHp}</span>
        </div>
        <div className="sidebar-hp-bar">
          <div
            className={`sidebar-hp-trail ${isPlayer ? "player-hp-trail" : "opponent-hp-trail"}`}
            style={{ width: `${hpPct}%` }}
          />
          <div
            className={`sidebar-hp-fill ${isPlayer ? "player-hp" : "opponent-hp"}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>
      <div className="sidebar-pixel-count">
        <span>Pixels:</span>
        <div className="pixel-count-bar">
          <div className="pixel-count-fill" style={{ width: `${pixelPct}%` }} />
        </div>
        <span>{pixelsCount}</span>
      </div>

      {isPlayer && maxDodgeCharges !== undefined && dodgeCharges !== undefined && (
        <div className="sidebar-dodge-charges">
          <span>Dodge energy:</span>
          <span style={{ display: "inline-flex", gap: "3px" }}>
            {Array.from({ length: maxDodgeCharges }).map((_, idx) => (
              <span
                key={idx}
                className={`dodge-diamond ${idx < dodgeCharges ? "filled" : "empty"}`}
              >
                <FontAwesomeIcon icon={faDiamond} />
              </span>
            ))}
          </span>
        </div>
      )}

      <div className="sidebar-terminal">
        <div className="terminal-header">
          <span className="terminal-dot red" />
          <span className="terminal-dot yellow" />
          <span className="terminal-dot green" />
          <span className="terminal-title">Combat Feed</span>
        </div>
        <div className="terminal-content" id={logConsoleId}>
          {logs
            .filter((log) => filterLog(log.message, playerName, opponentName))
            .map((log, i) => (
              <div className={`log-entry ${log.type}`} key={i}>
                {log.message}
              </div>
            ))}
        </div>
      </div>

      <div className="sidebar-stats-mini">
        <div className="mini-stat">
          <span><FontAwesomeIcon icon={faBolt} style={{ marginRight: "4px" }} /> ATK:</span>
          <span>{renderStat("atk", faBolt)}</span>
        </div>
        <div className="mini-stat">
          <span><FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "4px" }} /> DEF:</span>
          <span>{renderStat("def", faShieldHalved)}</span>
        </div>
        <div className="mini-stat">
          <span><FontAwesomeIcon icon={faWind} style={{ marginRight: "4px" }} /> SPD:</span>
          <span>{renderStat("spd", faWind)}</span>
        </div>
        <div className="mini-stat">
          <span><FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "4px" }} /> CRT:</span>
          <span>{renderStat("crit", faCrosshairs, "%")}</span>
        </div>
      </div>
    </aside>
  );
}
