"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGamepad,
  faHeart,
  faBurst,
  faShieldHalved,
  faBolt,
  faCrosshairs,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type HelpTab = "quick" | "combat" | "abilities" | "pvp";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const [tab, setTab] = useState<HelpTab>("quick");

  const tabs: { id: HelpTab; label: string }[] = [
    { id: "quick", label: "Quick Start" },
    { id: "combat", label: "Combat" },
    { id: "abilities", label: "Abilities" },
    { id: "pvp", label: "PVP" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title={
        <>
          <FontAwesomeIcon icon={faGamepad} style={{ marginRight: "8px" }} />
          Normies Battleground Manual
        </>
      }
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it — let&apos;s fight!
        </Button>
      }
    >
      <div className="help-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`help-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quick" && (
        <div className="quick-start-steps">
          <div className="quick-start-step">
            <span className="quick-start-num">1</span>
            <div>
              <strong>Choose your mode</strong>
              <p className="help-section-p">Pick PVE to fight AI, or PVP to battle real players online.</p>
            </div>
          </div>
          <div className="quick-start-step">
            <span className="quick-start-num">2</span>
            <div>
              <strong>Load fighters</strong>
              <p className="help-section-p">Enter Normie IDs (0–9999) for player and opponent, then tap Commence Protocol.</p>
            </div>
          </div>
          <div className="quick-start-step">
            <span className="quick-start-num">3</span>
            <div>
              <strong>Master timing & dodge</strong>
              <p className="help-section-p">Strike on the timing bar for bonus damage. Earn dodge charges, then react fast when attacked.</p>
            </div>
          </div>
          <div className="quick-start-step">
            <span className="quick-start-num">4</span>
            <div>
              <strong>Climb the leaderboard</strong>
              <p className="help-section-p">Win matches to boost your local scoreboard and PVP ELO ranking.</p>
            </div>
          </div>
        </div>
      )}

      {tab === "combat" && (
        <>
          <section className="help-section">
            <h3 className="help-section-title">
              <FontAwesomeIcon icon={faHeart} style={{ marginRight: "6px" }} /> Pixel-HP Sync
            </h3>
            <p className="help-section-p">
              HP is bound 1:1 to active canvas pixels. Damage blasts pixels off; healing restores them.
            </p>
          </section>
          <section className="help-section">
            <h3 className="help-section-title">
              <FontAwesomeIcon icon={faBurst} style={{ marginRight: "6px" }} /> Timing Bar
            </h3>
            <div className="help-grid">
              <div className="help-card">
                <div className="help-card-title">Critical</div>
                <div className="help-card-desc">200% damage + dodge charge</div>
              </div>
              <div className="help-card">
                <div className="help-card-title">Perfect</div>
                <div className="help-card-desc">150% damage + dodge charge</div>
              </div>
              <div className="help-card">
                <div className="help-card-title">OK</div>
                <div className="help-card-desc">100% standard damage</div>
              </div>
              <div className="help-card">
                <div className="help-card-title">Miss</div>
                <div className="help-card-desc">50% damage, combo reset</div>
              </div>
            </div>
          </section>
          <section className="help-section">
            <h3 className="help-section-title">
              <FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "6px" }} /> Dodge System
            </h3>
            <ul className="help-bullets">
              <li className="help-bullet-item">Start with 1 dodge charge (max 3)</li>
              <li className="help-bullet-item">Perfect/Critical hits grant +1 charge</li>
              <li className="help-bullet-item">500ms reaction window — press the shown key or tap on mobile</li>
              <li className="help-bullet-item">Perfect dodge = 0 damage + auto counter-strike</li>
            </ul>
          </section>
        </>
      )}

      {tab === "abilities" && (
        <section className="help-section">
          <h3 className="help-section-title">
            <FontAwesomeIcon icon={faBolt} style={{ marginRight: "6px" }} /> Class Ultimates
          </h3>
          <div className="help-grid">
            <div className="help-card">
              <div className="help-card-title">Human — Rally Cry</div>
              <div className="help-card-desc">+30% ATK for 2 turns</div>
            </div>
            <div className="help-card">
              <div className="help-card-title">Cat — Nine Lives</div>
              <div className="help-card-desc">Heal 25% HP + restore pixels</div>
            </div>
            <div className="help-card">
              <div className="help-card-title">Alien — Cosmic Blast</div>
              <div className="help-card-desc">Ignores 50% enemy DEF</div>
            </div>
            <div className="help-card">
              <div className="help-card-title">Agent — Firewall</div>
              <div className="help-card-desc">+50% DEF for 3 turns</div>
            </div>
          </div>
          <p className="help-section-p" style={{ marginTop: "12px" }}>
            Eye traits unlock bonus abilities like Laser Beam, Shield Bash, Psychic Wave, and more.
          </p>
        </section>
      )}

      {tab === "pvp" && (
        <section className="help-section">
          <h3 className="help-section-title">
            <FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "6px" }} /> Online Battles
          </h3>
          <ul className="help-bullets">
            <li className="help-bullet-item"><strong>Find Match</strong> — queue for a random opponent</li>
            <li className="help-bullet-item"><strong>Create Room</strong> — get a code to share with a friend</li>
            <li className="help-bullet-item"><strong>Join Room</strong> — enter a friend&apos;s room code</li>
            <li className="help-bullet-item">
              <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "4px" }} />
              Wins improve your ELO on the global leaderboard
            </li>
          </ul>
        </section>
      )}
    </Modal>
  );
}
