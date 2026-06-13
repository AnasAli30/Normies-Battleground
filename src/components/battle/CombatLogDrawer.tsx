"use client";

import React, { useState } from "react";
import type { CombatLogEntry } from "@/lib/types";
import { isPlayerLog, isOpponentLog } from "@/lib/game-ui";

interface CombatLogDrawerProps {
  logs: CombatLogEntry[];
  playerName: string;
  opponentName: string;
}

export function CombatLogDrawer({ logs, playerName, opponentName }: CombatLogDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const recent = logs.slice(-8);

  return (
    <div className={`combat-log-drawer ${expanded ? "expanded" : ""}`} aria-live="polite">
      <button
        type="button"
        className="combat-log-drawer-toggle"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide combat log" : `Combat log (${recent.length} recent)`}
      </button>
      {expanded && (
        <div className="combat-log-drawer-content">
          {recent.length === 0 ? (
            <div className="log-entry system">Waiting for combat...</div>
          ) : (
            recent.map((log, i) => {
              const side = isPlayerLog(log.message, playerName, opponentName)
                ? "player"
                : isOpponentLog(log.message, playerName, opponentName)
                  ? "opponent"
                  : "system";
              return (
                <div className={`log-entry ${log.type} log-side-${side}`} key={`${i}-${log.message.slice(0, 20)}`}>
                  {log.message}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
