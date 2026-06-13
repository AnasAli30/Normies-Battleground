"use client";

import React from "react";

interface TimingQTEProps {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  onResolve: () => void;
}

export function TimingQTE({ overlayRef, cursorRef, onResolve }: TimingQTEProps) {
  return (
    <div className="timing-bar-overlay" ref={overlayRef} onClick={onResolve}>
      <div className="timing-bar-title">Lock timing to attack</div>
      <div className="timing-bar-container">
        <div className="timing-zone timing-miss-left" />
        <div className="timing-zone timing-ok-left" />
        <div className="timing-zone timing-perfect-left" />
        <div className="timing-zone timing-perfect" />
        <div className="timing-zone timing-perfect-right" />
        <div className="timing-zone timing-ok-right" />
        <div className="timing-zone timing-miss-right" />
        <div className="timing-cursor" ref={cursorRef} />
      </div>
      <div className="timing-hint">
        Press <span className="key-hint">SPACE</span> or{" "}
        <span className="key-hint">CLICK</span>
        <span className="timing-hint-touch"> / TAP</span> to strike!
      </div>
    </div>
  );
}
