import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faBullhorn,
  faCat,
  faRocket,
  faShieldHalved,
  faCrosshairs,
  faTornado,
  faGhost,
  faBurst,
  faWandMagicSparkles,
  faBullseye,
  faMagnet,
} from "@fortawesome/free-solid-svg-icons";

export function getAbilityIcon(abilityId: string) {
  switch (abilityId) {
    case "basicAttack":
      return React.createElement(FontAwesomeIcon, { icon: faBolt });
    case "humanUlt":
      return React.createElement(FontAwesomeIcon, { icon: faBullhorn });
    case "catUlt":
      return React.createElement(FontAwesomeIcon, { icon: faCat });
    case "alienUlt":
      return React.createElement(FontAwesomeIcon, { icon: faRocket });
    case "agentUlt":
      return React.createElement(FontAwesomeIcon, { icon: faShieldHalved });
    case "laserBeam":
      return React.createElement(FontAwesomeIcon, {
        icon: faCrosshairs,
        style: { color: "var(--accent-red)" },
      });
    case "shieldBash":
      return React.createElement(FontAwesomeIcon, { icon: faShieldHalved });
    case "psychicWave":
      return React.createElement(FontAwesomeIcon, {
        icon: faTornado,
        style: { color: "var(--accent-secondary)" },
      });
    case "shadowStrike":
      return React.createElement(FontAwesomeIcon, { icon: faGhost });
    case "berserkerRage":
      return React.createElement(FontAwesomeIcon, {
        icon: faBurst,
        style: { color: "var(--accent-red)" },
      });
    case "arcaneBlast":
      return React.createElement(FontAwesomeIcon, {
        icon: faWandMagicSparkles,
        style: { color: "var(--accent-gold)" },
      });
    case "quickShot":
      return React.createElement(FontAwesomeIcon, { icon: faBullseye });
    case "pixelDrain":
      return React.createElement(FontAwesomeIcon, { icon: faMagnet });
    default:
      return null;
  }
}

export function getBuffedStat(
  baseValue: number,
  statName: string,
  buffs: { stat: string; multiplier: number }[]
): { total: number; boost: number } {
  let value = baseValue;
  for (const buff of buffs) {
    if (buff.stat === statName) {
      value = Math.floor(value * buff.multiplier);
    }
  }
  return { total: value, boost: value - baseValue };
}

export function isPlayerLog(
  message: string,
  playerName: string,
  opponentName: string
): boolean {
  const msg = message.toLowerCase();
  const pName = playerName.toLowerCase();
  const oName = opponentName.toLowerCase();

  if (msg.includes("fight!") || msg.includes("strikes first") || msg.includes("perfect timing")) {
    return true;
  }
  if (msg.includes("healed") && !msg.includes(oName)) return true;
  if (msg.includes("boosted!") && !msg.includes(oName)) return true;
  if (msg.includes(pName) || msg.includes("player")) return true;
  if (msg.includes(oName) || msg.includes("opponent") || msg.includes("enemy")) return false;
  return true;
}

export function isOpponentLog(
  message: string,
  playerName: string,
  opponentName: string
): boolean {
  const msg = message.toLowerCase();
  const oName = opponentName.toLowerCase();

  if (msg.includes("fight!") || msg.includes("strikes first")) return true;
  if (msg.includes(oName) || msg.includes("opponent") || msg.includes("enemy")) return true;
  return false;
}

export function generateDodgeOptions(correctKey: string, count = 6): string[] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const options = new Set<string>([correctKey]);
  while (options.size < count) {
    options.add(letters[Math.floor(Math.random() * letters.length)]);
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
}

export type GameScreen =
  | "loading"
  | "mode-select"
  | "select"
  | "pvp-lobby"
  | "battle"
  | "results"
  | "leaderboard";
