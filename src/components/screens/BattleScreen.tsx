"use client";

import React from "react";
import type { Ability, CombatLogEntry, Fighter } from "@/lib/types";
import { CombatSidebar } from "@/components/battle/CombatSidebar";
import { AbilityBar } from "@/components/battle/AbilityBar";
import { TimingQTE } from "@/components/battle/TimingQTE";
import { DodgeQTE } from "@/components/battle/DodgeQTE";
import { CombatLogDrawer } from "@/components/battle/CombatLogDrawer";

interface BattleScreenProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  playerFighter: Fighter | null;
  opponentFighter: Fighter | null;
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
  playerPixelsCount: number;
  opponentPixelsCount: number;
  playerDodgeCharges: number;
  maxDodgeCharges: number;
  combo: number;
  turnIndicator: string;
  isPlayerTurn: boolean;
  battleLogs: CombatLogEntry[];
  abilities: Ability[];
  playerBuffs: { stat: string; multiplier: number }[];
  opponentBuffs: { stat: string; multiplier: number }[];
  arenaShake: boolean;
  timingActiveState: boolean;
  timingResultVisible: boolean;
  timingResultState: string;
  dodgeActiveState: boolean;
  dodgeKeyPrompt: string;
  timingOverlayRef: React.RefObject<HTMLDivElement | null>;
  timingCursorRef: React.RefObject<HTMLDivElement | null>;
  dodgeTimerFillRef: React.RefObject<HTMLDivElement | null>;
  onResolveTiming: () => void;
  onDodgePress: (correct: boolean) => void;
  onAbilityClick: (index: number) => void;
}

export function BattleScreen({
  canvasRef,
  playerFighter,
  opponentFighter,
  playerHp,
  playerMaxHp,
  opponentHp,
  opponentMaxHp,
  playerPixelsCount,
  opponentPixelsCount,
  playerDodgeCharges,
  maxDodgeCharges,
  combo,
  turnIndicator,
  isPlayerTurn,
  battleLogs,
  abilities,
  playerBuffs,
  opponentBuffs,
  arenaShake,
  timingActiveState,
  timingResultVisible,
  timingResultState,
  dodgeActiveState,
  dodgeKeyPrompt,
  timingOverlayRef,
  timingCursorRef,
  dodgeTimerFillRef,
  onResolveTiming,
  onDodgePress,
  onAbilityClick,
}: BattleScreenProps) {
  const playerName = playerFighter?.name || "Player";
  const opponentName = opponentFighter?.name || "Opponent";

  return (
    <section className="screen active battle-screen">
      <div className="battle-layout">
        <CombatSidebar
          side="player"
          fighter={playerFighter}
          hp={playerHp}
          maxHp={playerMaxHp}
          pixelsCount={playerPixelsCount}
          dodgeCharges={playerDodgeCharges}
          maxDodgeCharges={maxDodgeCharges}
          buffs={playerBuffs}
          logs={battleLogs}
          playerName={playerName}
          opponentName={opponentName}
          logConsoleId="player-log-console"
        />

        <div className={`arena-central ${arenaShake ? "arena-shake" : ""}`}>
          <div className="arena-box">
            <div className="arena-header-indicator">
              <div className={`turn-indicator ${!isPlayerTurn ? "enemy-turn" : ""}`}>
                {turnIndicator}
              </div>
            </div>

            <canvas ref={canvasRef} className="arena-canvas" />

            {combo > 1 && (
              <div className="combo-counter">
                <div className="combo-count">{combo}×</div>
                <div className="combo-label">Combo</div>
              </div>
            )}

            {timingResultVisible && (
              <div className={`timing-result result-${timingResultState}`}>
                {timingResultState === "critical" ? "★ Critical ★" : `${timingResultState.toUpperCase()}!`}
              </div>
            )}

            {timingActiveState && (
              <TimingQTE
                overlayRef={timingOverlayRef}
                cursorRef={timingCursorRef}
                onResolve={onResolveTiming}
              />
            )}

            {dodgeActiveState && (
              <DodgeQTE
                dodgeKeyPrompt={dodgeKeyPrompt}
                dodgeTimerFillRef={dodgeTimerFillRef}
                onDodgePress={onDodgePress}
              />
            )}
          </div>

          <div className="battle-controls safe-area-pad">
            <AbilityBar
              abilities={abilities}
              isPlayerTurn={isPlayerTurn}
              onAbilityClick={onAbilityClick}
            />
          </div>
        </div>

        <CombatSidebar
          side="opponent"
          fighter={opponentFighter}
          hp={opponentHp}
          maxHp={opponentMaxHp}
          pixelsCount={opponentPixelsCount}
          buffs={opponentBuffs}
          logs={battleLogs}
          playerName={playerName}
          opponentName={opponentName}
          logConsoleId="opponent-log-console"
        />
      </div>

      <CombatLogDrawer
        logs={battleLogs}
        playerName={playerName}
        opponentName={opponentName}
      />
    </section>
  );
}
