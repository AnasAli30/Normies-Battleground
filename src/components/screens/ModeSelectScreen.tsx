"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGamepad,
  faRobot,
  faCrosshairs,
  faBolt,
  faShieldHalved,
  faStar,
  faFire,
  faTrophy,
  faCrown,
} from "@fortawesome/free-solid-svg-icons";

interface ModeSelectScreenProps {
  onSelectPve: () => void;
  onSelectPvp: () => void;
}

export function ModeSelectScreen({ onSelectPve, onSelectPvp }: ModeSelectScreenProps) {
  return (
    <section className="screen active mode-select-screen">
      <div className="mode-select-container">
        <h1 className="mode-select-title">
          <FontAwesomeIcon icon={faGamepad} style={{ marginRight: "12px" }} />
          Choose Your Battleground
        </h1>
        <p className="mode-select-subtitle">Select how you want to fight</p>

        <div className="mode-cards">
          <button type="button" className="mode-card pve-card" onClick={onSelectPve}>
            <div className="mode-card-icon">
              <FontAwesomeIcon icon={faRobot} />
            </div>
            <h2 className="mode-card-title">PVE</h2>
            <p className="mode-card-desc">Fight AI opponents</p>
            <div className="mode-card-features">
              <span><FontAwesomeIcon icon={faBolt} style={{ marginRight: "4px" }} /> Timing QTE</span>
              <span><FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "4px" }} /> Dodge System</span>
              <span><FontAwesomeIcon icon={faStar} style={{ marginRight: "4px" }} /> Offline Mode</span>
            </div>
            <div className="mode-card-badge">Single Player</div>
          </button>

          <div className="mode-vs-divider">
            <span>VS</span>
          </div>

          <button type="button" className="mode-card pvp-card" onClick={onSelectPvp}>
            <div className="mode-card-icon">
              <FontAwesomeIcon icon={faCrosshairs} />
            </div>
            <h2 className="mode-card-title">PVP</h2>
            <p className="mode-card-desc">Fight real players online</p>
            <div className="mode-card-features">
              <span><FontAwesomeIcon icon={faFire} style={{ marginRight: "4px" }} /> Real-time</span>
              <span><FontAwesomeIcon icon={faTrophy} style={{ marginRight: "4px" }} /> ELO Ranked</span>
              <span><FontAwesomeIcon icon={faCrown} style={{ marginRight: "4px" }} /> Leaderboard</span>
            </div>
            <div className="mode-card-badge online">Multiplayer</div>
          </button>
        </div>

        <p className="mode-select-hint">Load any Normie ID from 0–9999 to start fighting</p>
      </div>
    </section>
  );
}
