"use client";

import React, { useState } from "react";
import type { Ability } from "@/lib/types";
import { getAbilityIcon } from "@/lib/game-ui";

interface AbilityBarProps {
  abilities: Ability[];
  isPlayerTurn: boolean;
  onAbilityClick: (index: number) => void;
}

export function AbilityBar({ abilities, isPlayerTurn, onAbilityClick }: AbilityBarProps) {
  const [activePopover, setActivePopover] = useState<number | null>(null);

  return (
    <div className="ability-bar">
      {abilities.map((ability, index) => (
        <div
          key={index}
          className={`ability-btn-wrapper ${activePopover === index ? "show-popover" : ""}`}
        >
          <button
            type="button"
            className={`ability-btn type-${ability.type}`}
            disabled={!ability.canUse || !isPlayerTurn}
            onClick={() => onAbilityClick(index)}
            onMouseEnter={() => setActivePopover(index)}
            onMouseLeave={() => setActivePopover(null)}
            onFocus={() => setActivePopover(index)}
            onBlur={() => setActivePopover(null)}
            aria-label={`${ability.name}: ${ability.description}`}
          >
            {ability.currentCooldown !== undefined && ability.currentCooldown > 0 && (
              <div className="ability-cooldown-overlay">
                <span className="cooldown-number">{ability.currentCooldown}</span>
              </div>
            )}
            <span className="ability-icon">{getAbilityIcon(ability.id)}</span>
            <span>{ability.name}</span>
          </button>
          <div className="ability-popover" role="tooltip">
            {ability.description}
          </div>
        </div>
      ))}
    </div>
  );
}
