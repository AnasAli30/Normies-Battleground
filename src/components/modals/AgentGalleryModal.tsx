"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface AgentGalleryModalProps {
  open: boolean;
  loading: boolean;
  agents: { tokenId: string; name?: string; type?: string }[];
  onClose: () => void;
  onSelectAgent: (tokenId: number) => void;
}

export function AgentGalleryModal({
  open,
  loading,
  agents,
  onClose,
  onSelectAgent,
}: AgentGalleryModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      className="agent-gallery-modal"
      title={
        <>
          <FontAwesomeIcon icon={faRobot} style={{ marginRight: "8px" }} />
          On-Chain Agent Registry
        </>
      }
    >
      <p style={{ fontSize: "var(--font-size-sm)", marginBottom: "15px", color: "var(--text-secondary)" }}>
        Browse ERC-8004 bound Normie Agents. Pick one to challenge in combat.
      </p>

      {loading ? (
        <div className="gallery-loader">
          <div className="loading-core" />
          <p>Querying agent registry...</p>
        </div>
      ) : (
        <div className="agents-grid">
          {agents.map((agent, idx) => (
            <div key={idx} className="agent-gallery-card">
              <div className="agent-avatar-container">
                <img
                  src={`https://api.normies.art/normie/${agent.tokenId}/image.svg`}
                  alt={agent.name || `Agent ${agent.tokenId}`}
                />
              </div>
              <div className="agent-card-info">
                <div className="agent-card-name">{agent.name || `Agent #${agent.tokenId}`}</div>
                <div className="agent-card-type">{agent.type} Agent</div>
                <div className="agent-card-owner">ID: #{agent.tokenId}</div>
              </div>
              <Button variant="primary" onClick={() => onSelectAgent(parseInt(agent.tokenId))}>
                Challenge
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
