"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleQuestion,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";

interface AppHeaderProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHelp: () => void;
}

export function AppHeader({ isMuted, onToggleMute, onOpenHelp }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="logo-container">
        <div className="logo-grid" aria-hidden="true">
          <div className="logo-pixel" />
          <div className="logo-pixel" />
          <div className="logo-pixel" />
          <div className="logo-pixel" />
        </div>
        <span className="logo-text">
          <span className="logo-text-full">NORMIES BATTLEGROUND</span>
          <span className="logo-text-short">NORMIES</span>
        </span>
      </div>
      <div className="audio-controls">
        <button
          type="button"
          className="btn-audio-mute btn-icon-only"
          onClick={onOpenHelp}
          aria-label="Open help"
        >
          <FontAwesomeIcon icon={faCircleQuestion} />
          <span className="btn-label-desktop">Help</span>
        </button>
        <button
          type="button"
          className="btn-audio-mute btn-icon-only"
          onClick={onToggleMute}
          aria-label={isMuted ? "Unmute sound" : "Mute sound"}
        >
          <FontAwesomeIcon icon={isMuted ? faVolumeXmark : faVolumeHigh} />
          <span className="btn-label-desktop">{isMuted ? "Unmute" : "Mute"}</span>
        </button>
      </div>
    </header>
  );
}
