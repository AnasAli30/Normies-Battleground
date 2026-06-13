"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faSkull,
  faStar,
  faGhost,
  faPalette,
  faScroll,
} from "@fortawesome/free-solid-svg-icons";
import type { Fighter } from "@/lib/types";
import { getStatPercent } from "@/lib/fighter";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type FighterTab = "stats" | "evolution" | "agent";

interface FighterPanelProps {
  side: "player" | "opponent";
  fighterId: string;
  fighter: Fighter | null;
  loading: boolean;
  activeTab: FighterTab;
  versions: unknown[];
  diff: { addedCount?: number; removedCount?: number; netChange?: number } | null;
  onIdChange: (id: string) => void;
  onLoad: () => void;
  onTabChange: (tab: FighterTab) => void;
  extraActions?: React.ReactNode;
}

export function FighterPanel({
  side,
  fighterId,
  fighter,
  loading,
  activeTab,
  versions,
  diff,
  onIdChange,
  onLoad,
  onTabChange,
  extraActions,
}: FighterPanelProps) {
  const isPlayer = side === "player";

  return (
    <div className="select-column">
      <Card variant={isPlayer ? "player" : "opponent"}>
        <h2 className="panel-title">
          <FontAwesomeIcon icon={isPlayer ? faShieldHalved : faSkull} style={{ marginRight: "6px" }} />
          {isPlayer ? "Player Normie" : "Opponent"}
        </h2>
        <div className="cyber-input-group">
          <Input
            type="number"
            placeholder="ID (0-9999)"
            value={fighterId}
            onChange={(e) => onIdChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLoad()}
          />
          <Button
            variant={isPlayer ? "primary" : "opponent"}
            onClick={onLoad}
            disabled={loading}
          >
            {loading ? "..." : "Load"}
          </Button>
        </div>

        {extraActions}

        <div className="preview-container">
          {fighter ? (
            <div className="fighter-card fighter-card-loaded">
              <div className="fighter-image-container">
                <img src={fighter.imageUrl} alt={fighter.name} />
              </div>
              <div className="fighter-name">
                {fighter.name}
                {fighter.level > 1 && (
                  <span style={{ color: "var(--accent-gold)" }}>
                    {" "}
                    <FontAwesomeIcon icon={faStar} style={{ fontSize: "10px", marginRight: "2px" }} /> Lv.
                    {fighter.level}
                  </span>
                )}
                {fighter.customized && (
                  <span style={{ color: "var(--accent-tertiary)" }}> Custom</span>
                )}
              </div>
              <div className="fighter-badges-row">
                <span className={`fighter-type-badge type-${fighter.type}`}>
                  {fighter.type} — {fighter.class}
                </span>
                {fighter.isGhost && (
                  <span className="fighter-type-badge ghost-badge">
                    <FontAwesomeIcon icon={faGhost} style={{ marginRight: "4px" }} /> Ghost
                  </span>
                )}
              </div>

              <Tabs
                tabs={[
                  { id: "stats" as FighterTab, label: "Stats" },
                  { id: "evolution" as FighterTab, label: "Details" },
                  ...(fighter.agentPersona ? [{ id: "agent" as FighterTab, label: "AI Agent" }] : []),
                ]}
                active={activeTab}
                onChange={onTabChange}
                className="fighter-card-tabs"
              />

              {activeTab === "stats" && (
                <>
                  <div className="stat-bars">
                    {Object.entries(fighter.stats)
                      .filter(([k]) => k !== "maxHp")
                      .map(([key, val]) => (
                        <div className="stat-row" key={key}>
                          <span className="stat-label">{key.toUpperCase()}</span>
                          <div className="stat-bar-bg">
                            <div
                              className={`stat-bar-fill stat-${key}`}
                              style={{ width: `${getStatPercent(key as "hp" | "atk" | "def" | "spd" | "crit", val)}%` }}
                            />
                          </div>
                          <span className="stat-value">{val}</span>
                        </div>
                      ))}
                  </div>
                  <div className="trait-tags">
                    {Object.values(fighter.traits).map((v, i) => (
                      <span className="trait-tag" key={i}>
                        {v}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "evolution" && (
                <div className="evolution-details">
                  <div className="owner-badge">
                    <span className="label">Owner:</span>
                    <span className="val" title={fighter.owner}>
                      {fighter.owner
                        ? `${fighter.owner.slice(0, 6)}...${fighter.owner.slice(-4)}`
                        : "Contract Store"}
                    </span>
                  </div>
                  <div className="canvas-stats-row">
                    <div className="c-stat">
                      <span>LV</span> <span>{fighter.level}</span>
                    </div>
                    <div className="c-stat">
                      <span>AP</span> <span>{fighter.actionPoints}</span>
                    </div>
                    <div className="c-stat">
                      <span>Custom</span> <span>{fighter.customized ? "Yes" : "No"}</span>
                    </div>
                  </div>
                  {diff && (
                    <div className="diff-summary">
                      <span className="diff-title">
                        <FontAwesomeIcon icon={faPalette} style={{ marginRight: "6px" }} /> Canvas diff:
                      </span>
                      <div className="diff-stats">
                        <span className="diff-added">+{diff.addedCount || 0} px</span>
                        <span className="diff-removed">-{diff.removedCount || 0} px</span>
                        <span className="diff-net">Net: {diff.netChange || 0}</span>
                      </div>
                    </div>
                  )}
                  <div className="versions-timeline">
                    <span className="timeline-title">
                      <FontAwesomeIcon icon={faScroll} style={{ marginRight: "6px" }} /> Versions (
                      {versions.length})
                    </span>
                    {versions.length > 0 ? (
                      <div className="versions-list">
                        {(versions as { version: number; changeCount: number; transformer?: string }[]).map(
                          (v, index) => (
                            <div className="version-item" key={index}>
                              <span className="v-num">v{v.version}</span>
                              <span className="v-changes">+{v.changeCount} px</span>
                              <span className="v-tx" title={v.transformer}>
                                {v.transformer ? `${v.transformer.slice(0, 6)}...` : ""}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="timeline-empty">No on-chain versions recorded.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "agent" && fighter.agentPersona && (
                <div className="agent-details">
                  <div className="agent-tagline">&ldquo;{fighter.agentPersona.tagline}&rdquo;</div>
                  <div className="agent-backstory">
                    <strong>Backstory:</strong> {fighter.agentPersona.backstory || "No backstory registered."}
                  </div>
                  <div className="agent-quirks">
                    <strong>Quirks:</strong>
                    <div className="quirks-list">
                      {(fighter.agentPersona.quirks || []).slice(0, 3).map((q: string, i: number) => (
                        <span className="quirk-badge" key={i}>
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="agent-greeting">
                    <strong>Greeting:</strong> &ldquo;{fighter.agentPersona.greeting}&rdquo;
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="placeholder-pixel-grid" />
              <p>Awaiting {isPlayer ? "player" : "opponent"}...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
