"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBurst,
  faCircleQuestion,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import type { Fighter } from "@/lib/types";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { Button } from "@/components/ui/Button";
import { FighterPanel } from "@/components/fighter/FighterPanel";
import { WalletScanner } from "@/components/fighter/WalletScanner";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faDice, faGhost, faRobot } from "@fortawesome/free-solid-svg-icons";

interface FighterSelectScreenProps {
  playerId: string;
  opponentId: string;
  playerFighter: Fighter | null;
  opponentFighter: Fighter | null;
  playerLoading: boolean;
  opponentLoading: boolean;
  playerTab: "stats" | "evolution" | "agent";
  opponentTab: "stats" | "evolution" | "agent";
  playerVersions: unknown[];
  opponentVersions: unknown[];
  playerDiff: { addedCount?: number; removedCount?: number; netChange?: number } | null;
  opponentDiff: { addedCount?: number; removedCount?: number; netChange?: number } | null;
  walletAddress: string;
  walletTokens: number[];
  walletLoading: boolean;
  walletSearched: boolean;
  isApiOnline: boolean;
  totalAgents: number;
  globalStats: { totalBurnedTokens?: number; totalTransforms?: number } | null;
  canvasStatus: { paused?: boolean } | null;
  onBack: () => void;
  onPlayerIdChange: (id: string) => void;
  onOpponentIdChange: (id: string) => void;
  onLoadPlayer: () => void;
  onLoadOpponent: () => void;
  onPlayerTabChange: (tab: "stats" | "evolution" | "agent") => void;
  onOpponentTabChange: (tab: "stats" | "evolution" | "agent") => void;
  onWalletAddressChange: (addr: string) => void;
  onWalletSearch: () => void;
  onWalletTokenSelect: (tokenId: number) => void;
  onRandomOpponent: () => void;
  onSummonGhost: () => void;
  onOpenAgentGallery: () => void;
  onStartBattle: () => void;
  onOpenLeaderboard: () => void;
  onOpenHelp: () => void;
}

export function FighterSelectScreen(props: FighterSelectScreenProps) {
  const canStart = props.playerFighter && props.opponentFighter;

  return (
    <ScreenShell className="select-screen" backLabel="Back to mode select" onBack={props.onBack}>
      <div className="select-grid">
        <FighterPanel
          side="player"
          fighterId={props.playerId}
          fighter={props.playerFighter}
          loading={props.playerLoading}
          activeTab={props.playerTab}
          versions={props.playerVersions}
          diff={props.playerDiff}
          onIdChange={props.onPlayerIdChange}
          onLoad={props.onLoadPlayer}
          onTabChange={props.onPlayerTabChange}
          extraActions={
            <WalletScanner
              walletAddress={props.walletAddress}
              walletTokens={props.walletTokens}
              walletLoading={props.walletLoading}
              walletSearched={props.walletSearched}
              onAddressChange={props.onWalletAddressChange}
              onSearch={props.onWalletSearch}
              onSelectToken={props.onWalletTokenSelect}
            />
          }
        />

        <div className="select-column center-select-panel">
          <h1 className="center-title">Normies Battleground</h1>
          <div className="matchmaker-console">
            <div className="console-header">
              <span className="console-prefix">&gt;</span>
              <span className="console-title">Matchmaker Service</span>
              <span className={`api-health-badge ${props.isApiOnline ? "online" : "offline"}`}>
                <span className="health-dot" />
                API: {props.isApiOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="stats-dashboard">
              <div className="dashboard-grid">
                <div className="dash-item">
                  <span className="dash-label">On-chain agents</span>
                  <span className="dash-val">{props.totalAgents}</span>
                </div>
                <div className="dash-item">
                  <span className="dash-label">Burned tokens</span>
                  <span className="dash-val">{props.globalStats?.totalBurnedTokens ?? 118}</span>
                </div>
                <div className="dash-item">
                  <span className="dash-label">Total transforms</span>
                  <span className="dash-val">{props.globalStats?.totalTransforms ?? 87}</span>
                </div>
                <div className="dash-item">
                  <span className="dash-label">Canvas status</span>
                  <span
                    className="dash-val"
                    style={{
                      color: props.canvasStatus?.paused ? "var(--accent-red)" : "var(--accent-green)",
                    }}
                  >
                    {props.canvasStatus?.paused ? "Paused" : "Active"}
                  </span>
                </div>
              </div>
            </div>
            <div className="console-log-lines">
              <p>&gt; Load a player and opponent to begin.</p>
              <p>&gt; On-chain traits scale fighter stats.</p>
              <p>&gt; Perfect timing earns dodge charges.</p>
            </div>
          </div>

          <button
            type="button"
            className="btn-commence"
            onClick={props.onStartBattle}
            disabled={!canStart}
          >
            <FontAwesomeIcon icon={faBurst} style={{ marginRight: "6px" }} /> Commence Protocol
          </button>

          <Button onClick={props.onOpenLeaderboard} style={{ width: "180px", marginTop: "10px" }}>
            <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "6px" }} /> Leaderboard
          </Button>
          <Button onClick={props.onOpenHelp} style={{ width: "180px", marginTop: "10px" }}>
            <FontAwesomeIcon icon={faCircleQuestion} style={{ marginRight: "6px" }} /> Game Manual
          </Button>
        </div>

        <FighterPanel
          side="opponent"
          fighterId={props.opponentId}
          fighter={props.opponentFighter}
          loading={props.opponentLoading}
          activeTab={props.opponentTab}
          versions={props.opponentVersions}
          diff={props.opponentDiff}
          onIdChange={props.onOpponentIdChange}
          onLoad={props.onLoadOpponent}
          onTabChange={props.onOpponentTabChange}
          extraActions={
            <div className="opponent-actions-grid">
              <Button onClick={props.onRandomOpponent} disabled={props.opponentLoading}>
                <FA icon={faDice} style={{ marginRight: "4px" }} /> Random
              </Button>
              <Button onClick={props.onSummonGhost} disabled={props.opponentLoading}>
                <FA icon={faGhost} style={{ marginRight: "4px" }} /> Ghost
              </Button>
              <Button onClick={props.onOpenAgentGallery} disabled={props.opponentLoading} fullWidth>
                <FA icon={faRobot} style={{ marginRight: "4px" }} /> Agent Registry
              </Button>
            </div>
          }
        />
      </div>

      {canStart && (
        <div className="select-sticky-cta">
          <button type="button" className="btn-commence" onClick={props.onStartBattle}>
            <FontAwesomeIcon icon={faBurst} style={{ marginRight: "6px" }} /> Commence Protocol
          </button>
        </div>
      )}
    </ScreenShell>
  );
}
