"use client";

import React, { useMemo } from "react";
import { generateDodgeOptions } from "@/lib/game-ui";

interface DodgeQTEProps {
  dodgeKeyPrompt: string;
  dodgeTimerFillRef: React.RefObject<HTMLDivElement | null>;
  onDodgePress: (correct: boolean) => void;
}

export function DodgeQTE({ dodgeKeyPrompt, dodgeTimerFillRef, onDodgePress }: DodgeQTEProps) {
  const options = useMemo(
    () => generateDodgeOptions(dodgeKeyPrompt, 6),
    [dodgeKeyPrompt]
  );

  return (
    <div className="dodge-overlay">
      <div className="dodge-warning">Incoming projectile!</div>
      <div className="dodge-prompt dodge-keyboard-hint">
        <span>Press</span>
        <span className="dodge-key">{dodgeKeyPrompt}</span>
        <span>to dodge!</span>
      </div>
      <div className="dodge-touch-grid">
        {options.map((letter) => (
          <button
            key={letter}
            type="button"
            className={`dodge-touch-btn ${letter === dodgeKeyPrompt ? "correct-hint" : ""}`}
            onClick={() => onDodgePress(letter === dodgeKeyPrompt)}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="dodge-timer-bar">
        <div className="dodge-timer-fill" ref={dodgeTimerFillRef} />
      </div>
    </div>
  );
}
