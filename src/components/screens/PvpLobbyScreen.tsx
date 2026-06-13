"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCrosshairs,
  faShieldHalved,
  faDice,
  faHeart,
  faBurst,
  faWind,
  faKey,
  faDoorOpen,
  faLink,
  faCopy,
  faChartSimple,
  faBolt,
  faTrophy,
  faFire,
  faGamepad,
} from "@fortawesome/free-solid-svg-icons";
import type { Fighter } from "@/lib/types";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface PvpLobbyScreenProps {
  playerId: string;
  playerFighter: Fighter | null;
  playerLoading: boolean;
  pvpLobbyMode: "find" | "create" | "join";
  pvpSearching: boolean;
  pvpWaitingForOpponent: boolean;
  pvpQueueCount: number;
  pvpRoomCode: string | null;
  pvpJoinCode: string;
  onPlayerIdChange: (id: string) => void;
  onLoadPlayer: () => void;
  onRandomPlayer: () => void;
  onLobbyModeChange: (mode: "find" | "create" | "join") => void;
  onFindMatch: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onJoinCodeChange: (code: string) => void;
  onCancelSearch: () => void;
  onCopyRoomCode: () => void;
  onBack: () => void;
}

export function PvpLobbyScreen({
  playerId,
  playerFighter,
  playerLoading,
  pvpLobbyMode,
  pvpSearching,
  pvpWaitingForOpponent,
  pvpQueueCount,
  pvpRoomCode,
  pvpJoinCode,
  onPlayerIdChange,
  onLoadPlayer,
  onRandomPlayer,
  onLobbyModeChange,
  onFindMatch,
  onCreateRoom,
  onJoinRoom,
  onJoinCodeChange,
  onCancelSearch,
  onCopyRoomCode,
  onBack,
}: PvpLobbyScreenProps) {
  const showTabs = playerFighter && !pvpSearching && !pvpWaitingForOpponent;

  return (
    <ScreenShell className="pvp-lobby-screen" backLabel="Back to mode select" onBack={onBack}>
      <div className="pvp-lobby-container">
        <h1 className="pvp-lobby-title">
          <FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "10px" }} />
          PVP Arena Lobby
        </h1>

        <div className="pvp-lobby-grid">
          <Card className="pvp-lobby-fighter-select">
            <h2 className="panel-title">
              <FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "6px" }} />
              Select Your Fighter
            </h2>
            <div className="cyber-input-group">
              <Input
                type="number"
                placeholder="Normie ID (0-9999)"
                value={playerId}
                onChange={(e) => onPlayerIdChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onLoadPlayer()}
              />
              <Button variant="primary" onClick={onLoadPlayer} disabled={playerLoading}>
                {playerLoading ? "..." : "Load"}
              </Button>
              <Button onClick={onRandomPlayer} title="Random fighter" aria-label="Random fighter">
                <FontAwesomeIcon icon={faDice} />
              </Button>
            </div>

            {playerFighter && (
              <div className="pvp-fighter-preview">
                <div className="fighter-image-container">
                  <img src={playerFighter.imageUrl} alt={playerFighter.name} />
                </div>
                <div className="pvp-fighter-info">
                  <div className="fighter-name">{playerFighter.name}</div>
                  <div className="fighter-class">
                    {playerFighter.class} • {playerFighter.type} • Lv.{playerFighter.level}
                  </div>
                  <div className="pvp-stats-mini">
                    <span><FontAwesomeIcon icon={faHeart} style={{ color: "var(--accent-red)" }} /> {playerFighter.stats.hp}</span>
                    <span><FontAwesomeIcon icon={faBurst} style={{ color: "var(--accent-gold)" }} /> {playerFighter.stats.atk}</span>
                    <span><FontAwesomeIcon icon={faShieldHalved} style={{ color: "var(--accent-secondary)" }} /> {playerFighter.stats.def}</span>
                    <span><FontAwesomeIcon icon={faWind} style={{ color: "var(--accent-primary)" }} /> {playerFighter.stats.spd}</span>
                  </div>
                </div>
              </div>
            )}

            {!playerFighter && (
              <p className="pvp-fighter-hint">Load your Normie before matchmaking</p>
            )}

            {showTabs && (
              <div className="pvp-mode-tabs">
                {(["find", "create", "join"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`pvp-tab ${pvpLobbyMode === mode ? "active" : ""}`}
                    onClick={() => onLobbyModeChange(mode)}
                  >
                    <FontAwesomeIcon
                      icon={mode === "find" ? faCrosshairs : mode === "create" ? faKey : faDoorOpen}
                      style={{ marginRight: "6px" }}
                    />
                    {mode === "find" ? "Find Match" : mode === "create" ? "Create Room" : "Join Room"}
                  </button>
                ))}
              </div>
            )}

            {playerFighter && pvpLobbyMode === "find" && showTabs && (
              <Button variant="primary" fullWidth className="pvp-find-match-btn" onClick={onFindMatch}>
                <FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "8px" }} />
                Find Random Opponent
              </Button>
            )}

            {playerFighter && pvpLobbyMode === "create" && showTabs && (
              <Button variant="primary" fullWidth className="pvp-find-match-btn" onClick={onCreateRoom}>
                <FontAwesomeIcon icon={faKey} style={{ marginRight: "8px" }} />
                Create Private Room
              </Button>
            )}

            {playerFighter && pvpLobbyMode === "join" && showTabs && (
              <div className="pvp-join-room-section">
                <div className="cyber-input-group" style={{ marginBottom: "12px" }}>
                  <Input
                    type="text"
                    placeholder="Enter room code"
                    value={pvpJoinCode}
                    onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && onJoinRoom()}
                    maxLength={6}
                    style={{ textAlign: "center", letterSpacing: "4px", textTransform: "uppercase" }}
                  />
                </div>
                <Button
                  variant="primary"
                  fullWidth
                  className="pvp-find-match-btn"
                  onClick={onJoinRoom}
                  disabled={pvpJoinCode.trim().length < 4}
                >
                  <FontAwesomeIcon icon={faDoorOpen} style={{ marginRight: "8px" }} />
                  Join Room
                </Button>
              </div>
            )}

            {pvpSearching && (
              <div className="pvp-searching">
                <div className="pvp-searching-spinner">
                  <div className="loading-core" />
                </div>
                <p className="pvp-searching-text">Searching for opponent...</p>
                <p className="pvp-queue-count">
                  {pvpQueueCount} player{pvpQueueCount !== 1 ? "s" : ""} in queue
                </p>
                <Button onClick={onCancelSearch}>Cancel</Button>
              </div>
            )}

            {pvpWaitingForOpponent && (
              <div className="pvp-searching">
                <div className="pvp-searching-spinner">
                  <div className="loading-core" />
                </div>
                <p className="pvp-searching-text">Waiting for opponent to join...</p>
                {pvpRoomCode && (
                  <div className="pvp-room-code-display">
                    <span className="pvp-room-code-label">
                      <FontAwesomeIcon icon={faLink} style={{ marginRight: "6px" }} />
                      Room Code
                    </span>
                    <div className="pvp-room-code-value">
                      <span>{pvpRoomCode}</span>
                      <button type="button" className="pvp-copy-btn" onClick={onCopyRoomCode} aria-label="Copy room code">
                        <FontAwesomeIcon icon={faCopy} />
                      </button>
                    </div>
                    <p className="pvp-room-code-hint">Share this code with your friend</p>
                  </div>
                )}
                <Button onClick={onCancelSearch} style={{ marginTop: "12px" }}>
                  Cancel
                </Button>
              </div>
            )}
          </Card>

          <div className="pvp-lobby-info">
            <Card className="pvp-info-card">
              <h3>
                <FontAwesomeIcon icon={faChartSimple} style={{ marginRight: "6px" }} /> How PVP Works
              </h3>
              <ul className="pvp-info-list">
                <li><FontAwesomeIcon icon={faBolt} style={{ marginRight: "6px", color: "var(--accent-gold)" }} /> Load your Normie fighter</li>
                <li><FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "6px", color: "var(--accent-red)" }} /> <strong>Find Match</strong> — random opponent</li>
                <li><FontAwesomeIcon icon={faKey} style={{ marginRight: "6px", color: "#a855f7" }} /> <strong>Create Room</strong> — share a code</li>
                <li><FontAwesomeIcon icon={faDoorOpen} style={{ marginRight: "6px", color: "#10b981" }} /> <strong>Join Room</strong> — enter a code</li>
                <li><FontAwesomeIcon icon={faTrophy} style={{ marginRight: "6px", color: "var(--accent-gold)" }} /> Win to climb the ELO leaderboard</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
