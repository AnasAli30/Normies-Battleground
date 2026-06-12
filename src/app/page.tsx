"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Fighter, CombatLogEntry, LeaderboardEntry, Ability } from "../lib/types";
import { 
  loadFighterData, 
  getPixels, 
  getMockFighterData,
  getHolderNormies,
  getBurnedTokens,
  getAgentCount,
  getCanvasDiff,
  getVersionHistory,
  getGlobalStats,
  getCanvasStatus,
  getAgentsList,
  getApiHealth
} from "../lib/api";
import { createFighter, getStatPercent } from "../lib/fighter";
import { removePixelCluster, restorePixels, getActivePixelCoords, removeRandomPixels, countActivePixels } from "../lib/pixels";
import { CombatEngine } from "../lib/combat";
import { ArenaRenderer } from "../lib/arena";
import { audio } from "../lib/audio";
import { recordResult, getLeaderboard } from "../lib/leaderboard";
import {
  connectToServer,
  disconnectFromServer,
  joinQueue,
  leaveQueue,
  sendAbility,
  sendTimingResult,
  sendDodgeResult,
  onMatchFound,
  onStateUpdate,
  onTimingPrompt,
  onDodgePrompt,
  onBattleEnd as onPvpBattleEnd,
  onOpponentDisconnect,
  onError as onPvpError,
  onQueueJoined,
  onQueueStatus,
  removeAllPvpListeners,
  isConnected,
  fetchPvpLeaderboard,
} from "../lib/socket";
import type { PvpFighterData, PvpStateUpdate, PvpMatchFoundPayload, PvpBattleEndPayload } from "../lib/shared-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleQuestion,
  faVolumeXmark,
  faVolumeHigh,
  faShieldHalved,
  faStar,
  faGhost,
  faBurst,
  faTrophy,
  faSkull,
  faDice,
  faRobot,
  faBolt,
  faWind,
  faCrosshairs,
  faHeart,
  faCrown,
  faMedal,
  faFire,
  faBullhorn,
  faCat,
  faRocket,
  faTornado,
  faWandMagicSparkles,
  faBullseye,
  faMagnet,
  faTriangleExclamation,
  faGamepad,
  faBookOpen,
  faChartSimple,
  faDiamond,
  faPalette,
  faScroll
} from "@fortawesome/free-solid-svg-icons";

function getBuffedStat(baseValue: number, statName: string, buffs: any[]): { total: number; boost: number } {
  let value = baseValue;
  for (const buff of buffs) {
    if (buff.stat === statName) {
      value = Math.floor(value * buff.multiplier);
    }
  }
  return {
    total: value,
    boost: value - baseValue
  };
}

function getAbilityIcon(abilityId: string) {
  switch (abilityId) {
    case 'basicAttack':
      return <FontAwesomeIcon icon={faBolt} />;
    case 'humanUlt':
      return <FontAwesomeIcon icon={faBullhorn} />;
    case 'catUlt':
      return <FontAwesomeIcon icon={faCat} />;
    case 'alienUlt':
      return <FontAwesomeIcon icon={faRocket} />;
    case 'agentUlt':
      return <FontAwesomeIcon icon={faShieldHalved} />;
    case 'laserBeam':
      return <FontAwesomeIcon icon={faCrosshairs} style={{ color: "var(--accent-red)" }} />;
    case 'shieldBash':
      return <FontAwesomeIcon icon={faShieldHalved} />;
    case 'psychicWave':
      return <FontAwesomeIcon icon={faTornado} style={{ color: "var(--accent-secondary)" }} />;
    case 'shadowStrike':
      return <FontAwesomeIcon icon={faGhost} />;
    case 'berserkerRage':
      return <FontAwesomeIcon icon={faBurst} style={{ color: "var(--accent-red)" }} />;
    case 'arcaneBlast':
      return <FontAwesomeIcon icon={faWandMagicSparkles} style={{ color: "var(--accent-gold)" }} />;
    case 'quickShot':
      return <FontAwesomeIcon icon={faBullseye} />;
    case 'pixelDrain':
      return <FontAwesomeIcon icon={faMagnet} />;
    default:
      return null;
  }
}

function isPlayerLog(message: string, playerName: string, opponentName: string): boolean {
  const msg = message.toLowerCase();
  const pName = playerName.toLowerCase();
  const oName = opponentName.toLowerCase();

  // Start of fight or SPD strikes first should go to both
  if (msg.includes("fight!") || msg.includes("strikes first") || msg.includes("perfect timing")) {
    return true;
  }

  // Healed HP or boosted stat (without explicit owner) refers to player
  if (msg.includes("healed") && !msg.includes(oName)) {
    return true;
  }
  if (msg.includes("boosted!") && !msg.includes(oName)) {
    return true;
  }

  // Explicit mentions
  if (msg.includes(pName) || msg.includes("player")) {
    return true;
  }

  // If it mentions opponent but also player, we already matched above, but if it ONLY mentions opponent, return false
  if (msg.includes(oName) || msg.includes("opponent") || msg.includes("enemy")) {
    return false;
  }

  return true; // fallback
}

function isOpponentLog(message: string, playerName: string, opponentName: string): boolean {
  const msg = message.toLowerCase();
  const oName = opponentName.toLowerCase();

  // Start of fight or SPD strikes first should go to both
  if (msg.includes("fight!") || msg.includes("strikes first")) {
    return true;
  }

  // Opponent heals, opponent buff, opponent uses ability
  if (msg.includes(oName) || msg.includes("opponent") || msg.includes("enemy")) {
    return true;
  }

  return false;
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"loading" | "mode-select" | "select" | "pvp-lobby" | "battle" | "results" | "leaderboard">("loading");
  const [gameMode, setGameMode] = useState<"pve" | "pvp">("pve");
  const [isMuted, setIsMuted] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Fighter select state
  const [playerId, setPlayerId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [playerFighter, setPlayerFighter] = useState<Fighter | null>(null);
  const [opponentFighter, setOpponentFighter] = useState<Fighter | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [opponentLoading, setOpponentLoading] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);

  // Wallet portfolio states
  const [walletAddress, setWalletAddress] = useState("");
  const [walletTokens, setWalletTokens] = useState<number[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletSearched, setWalletSearched] = useState(false);

  // Global stats dashboard states
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [canvasStatus, setCanvasStatus] = useState<any>(null);
  const [totalAgents, setTotalAgents] = useState(0);
  const [isApiOnline, setIsApiOnline] = useState(true);

  // Expanded views inside select panel
  const [playerTab, setPlayerTab] = useState<"stats" | "evolution" | "agent">("stats");
  const [opponentTab, setOpponentTab] = useState<"stats" | "evolution" | "agent">("stats");

  // History & Diff details for loaded fighters
  const [playerVersions, setPlayerVersions] = useState<any[]>([]);
  const [opponentVersions, setOpponentVersions] = useState<any[]>([]);
  const [playerDiff, setPlayerDiff] = useState<any>(null);
  const [opponentDiff, setOpponentDiff] = useState<any>(null);

  // Agent gallery states
  const [showAgentGallery, setShowAgentGallery] = useState(false);
  const [galleryAgents, setGalleryAgents] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Battle live state (triggers React re-renders)
  const [playerHp, setPlayerHp] = useState(0);
  const [playerMaxHp, setPlayerMaxHp] = useState(0);
  const [opponentHp, setOpponentHp] = useState(0);
  const [opponentMaxHp, setOpponentMaxHp] = useState(0);
  const [playerPixelsCount, setPlayerPixelsCount] = useState(0);
  const [opponentPixelsCount, setOpponentPixelsCount] = useState(0);
  const [playerDodgeCharges, setPlayerDodgeCharges] = useState(1);
  const [maxDodgeCharges, setMaxDodgeCharges] = useState(3);
  const [combo, setCombo] = useState(0);
  const [turnIndicator, setTurnIndicator] = useState("YOUR TURN");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleLogs, setBattleLogs] = useState<CombatLogEntry[]>([]);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [playerBuffs, setPlayerBuffs] = useState<any[]>([]);
  const [opponentBuffs, setOpponentBuffs] = useState<any[]>([]);
  
  // End game state
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [turnsCount, setTurnsCount] = useState(0);
  const [maxComboCount, setMaxComboCount] = useState(0);
  const [perfectsCount, setPerfectsCount] = useState(0);
  const [dodgesCount, setDodgesCount] = useState(0);
  const [damageDealtCount, setDamageDealtCount] = useState(0);
  const [damageTakenCount, setDamageTakenCount] = useState(0);

  // QTE overlay states
  const [timingActiveState, setTimingActiveState] = useState(false);
  const [timingResultState, setTimingResultState] = useState("");
  const [timingResultVisible, setTimingResultVisible] = useState(false);
  const [dodgeActiveState, setDodgeActiveState] = useState(false);
  const [dodgeKeyPrompt, setDodgeKeyPrompt] = useState("");

  // PVP-specific states
  const [pvpSearching, setPvpSearching] = useState(false);
  const [pvpQueueCount, setPvpQueueCount] = useState(0);
  const [pvpRoomId, setPvpRoomId] = useState<string | null>(null);
  const [pvpSide, setPvpSide] = useState<"player1" | "player2">("player1");
  const pvpSideRef = useRef<"player1" | "player2">("player1");
  const [pvpOpponentDisconnected, setPvpOpponentDisconnected] = useState(false);
  const [pvpLeaderboard, setPvpLeaderboard] = useState<any[]>([]);

  const playerOriginalPixelsRef = useRef<string | null>(null);
  const opponentOriginalPixelsRef = useRef<string | null>(null);

  // Refs for animation loops & canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef<ArenaRenderer | null>(null);
  const combatRef = useRef<CombatEngine | null>(null);

  // Timing QTE refs
  const timingOverlayRef = useRef<HTMLDivElement>(null);
  const timingCursorRef = useRef<HTMLDivElement>(null);
  const timingPosition = useRef(0);
  const timingDirection = useRef(1);
  const timingSpeed = useRef(2.5);
  const timingActive = useRef(false);
  const timingAnimFrame = useRef<number | null>(null);
  const pendingAbilityRef = useRef<Ability | null>(null);

  // Dodge QTE refs
  const dodgeOverlayRef = useRef<HTMLDivElement>(null);
  const dodgeTimerFillRef = useRef<HTMLDivElement>(null);
  const dodgeActive = useRef(false);
  const dodgeKey = useRef("");
  const dodgeTimeout = useRef<NodeJS.Timeout | null>(null);
  const dodgeInterval = useRef<NodeJS.Timeout | null>(null);

  // Help modal keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowHelpModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 1. Loading sequence
  useEffect(() => {
    if (currentScreen === "loading") {
      let progress = 0;
      const texts = [
        "Connecting to Ethereum...",
        "Loading combat systems...",
        "Calibrating pixel weapons...",
        "Initializing skill mechanics...",
        "Ready to fight!"
      ];
      const bar = document.getElementById("loading-bar");
      const label = document.getElementById("loading-text");

      const interval = setInterval(() => {
        progress += 4;
        if (bar) bar.style.width = `${progress}%`;
        
        const idx = Math.min(Math.floor(progress / 20), texts.length - 1);
        if (label) label.textContent = texts[idx];

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setCurrentScreen("mode-select");
          }, 400);
        }
      }, 80);

      return () => clearInterval(interval);
    }
  }, [currentScreen]);

  // Handle Mute setting
  const toggleMute = () => {
    audio.enabled = isMuted;
    setIsMuted(!isMuted);
    audio.playSelect();
  };

  // Load global stats, API health, canvas status, and agent count on screen mount
  useEffect(() => {
    if (currentScreen === "select") {
      getApiHealth().then(online => setIsApiOnline(online));
      getGlobalStats().then(stats => setGlobalStats(stats));
      getCanvasStatus().then(status => setCanvasStatus(status));
      getAgentCount().then(count => setTotalAgents(count));
    }
  }, [currentScreen]);

  // 2. Fetch Fighter details
  const loadFighter = async (idStr: string, side: "player" | "opponent", isGhost = false) => {
    const id = parseInt(idStr);
    if (isNaN(id) || id < 0 || id > 9999) return;

    if (side === "player") {
      setPlayerLoading(true);
      setPlayerVersions([]);
      setPlayerDiff(null);
      setPlayerTab("stats");
    } else {
      setOpponentLoading(true);
      setOpponentVersions([]);
      setOpponentDiff(null);
      setOpponentTab("stats");
    }

    try {
      const data = await loadFighterData(id, isGhost);
      const fighter = createFighter(data);
      
      if (side === "player") {
        setPlayerFighter(fighter);
        if (!isGhost) {
          getVersionHistory(id).then(hist => setPlayerVersions(hist));
          getCanvasDiff(id).then(diff => setPlayerDiff(diff));
        }
      } else {
        setOpponentFighter(fighter);
        if (!isGhost) {
          getVersionHistory(id).then(hist => setOpponentVersions(hist));
          getCanvasDiff(id).then(diff => setOpponentDiff(diff));
        }
      }
      audio.playSelect();
    } catch (err) {
      console.error(err);
    } finally {
      if (side === "player") setPlayerLoading(false);
      else setOpponentLoading(false);
    }
  };

  const loadRandomOpponent = () => {
    const randomId = Math.floor(Math.random() * 10000);
    setOpponentId(randomId.toString());
    loadFighter(randomId.toString(), "opponent", false);
  };

  const summonGhostOpponent = async () => {
    setOpponentLoading(true);
    try {
      const burnedIds = await getBurnedTokens();
      if (burnedIds.length > 0) {
        const randomBurnedId = burnedIds[Math.floor(Math.random() * burnedIds.length)];
        setOpponentId(randomBurnedId.toString());
        await loadFighter(randomBurnedId.toString(), "opponent", true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOpponentLoading(false);
    }
  };

  const handleWalletSearch = async () => {
    if (!walletAddress.trim()) return;
    setWalletLoading(true);
    setWalletSearched(true);
    try {
      const ids = await getHolderNormies(walletAddress.trim());
      setWalletTokens(ids);
      audio.playSelect();
    } catch (e) {
      console.error(e);
      setWalletTokens([]);
    } finally {
      setWalletLoading(false);
    }
  };

  const openAgentGallery = async () => {
    setShowAgentGallery(true);
    setGalleryLoading(true);
    try {
      const data = await getAgentsList(24);
      setGalleryAgents(data.items || []);
      audio.playSelect();
    } catch (e) {
      console.error(e);
    } finally {
      setGalleryLoading(false);
    }
  };

  const selectAgentAsOpponent = async (tokenId: number) => {
    setShowAgentGallery(false);
    setOpponentId(tokenId.toString());
    await loadFighter(tokenId.toString(), "opponent", false);
  };

  // ── PVP Mode Handlers ─────────────────────────────────────────────
  const startPvpSearch = () => {
    if (!playerFighter) return;
    const socket = connectToServer();

    removeAllPvpListeners();

    // Convert Fighter to PvpFighterData
    const pvpFighter: PvpFighterData = {
      id: playerFighter.id,
      name: playerFighter.name,
      type: playerFighter.type,
      class: playerFighter.class,
      gender: playerFighter.gender,
      age: playerFighter.age,
      traits: playerFighter.traits,
      level: playerFighter.level,
      actionPoints: playerFighter.actionPoints,
      customized: playerFighter.customized,
      pixelCount: playerFighter.pixelCount,
      stats: { ...playerFighter.stats },
      imageUrl: playerFighter.imageUrl,
      pngUrl: playerFighter.pngUrl,
      abilityType: playerFighter.abilityType,
      passive: playerFighter.passive,
    };

    setPvpSearching(true);
    setPvpOpponentDisconnected(false);

    onQueueJoined(() => {
      console.log('Joined PVP queue');
    });

    onQueueStatus((data) => {
      setPvpQueueCount(data.playersInQueue);
    });

    onMatchFound((data: PvpMatchFoundPayload) => {
      console.log('Match found!', data);
      setPvpSearching(false);
      setPvpRoomId(data.roomId);
      setPvpSide(data.yourSide);
      pvpSideRef.current = data.yourSide;

      // Set opponent fighter from server data
      const oppData = data.opponent;
      const oppFighter: Fighter = {
        ...oppData,
        agentInfo: null,
        statusEffects: [],
        isAlive: true,
      };
      setOpponentFighter(oppFighter);

      // Initialize battle state from server
      const state = data.initialState;
      const myState = data.yourSide === 'player1' ? state.player1 : state.player2;
      const theirState = data.yourSide === 'player1' ? state.player2 : state.player1;

      setPlayerHp(myState.hp);
      setPlayerMaxHp(myState.maxHp);
      setOpponentHp(theirState.hp);
      setOpponentMaxHp(theirState.maxHp);
      setPlayerDodgeCharges(myState.dodgeCharges);
      setCombo(myState.combo);
      setPlayerBuffs(myState.buffs);
      setOpponentBuffs(theirState.buffs);

      const isMyTurn = (data.yourSide === 'player1' && state.isPlayer1Turn) ||
                       (data.yourSide === 'player2' && !state.isPlayer1Turn);
      setIsPlayerTurn(isMyTurn);
      setTurnIndicator(isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN");

      // Map abilities
      setAbilities(myState.abilities.map(a => ({
        ...a,
        currentCooldown: a.currentCooldown,
        calculate: () => ({ damage: 0 }),
      })) as unknown as Ability[]);

      audio.playSelect();
      setCurrentScreen("battle");
      setBattleLogs([]);
    });

    // PVP state updates during battle
    onStateUpdate((data) => {
      const side = pvpSideRef.current;
      const myState = side === 'player1' ? data.player1 : data.player2;
      const theirState = side === 'player1' ? data.player2 : data.player1;

      setPlayerHp(myState.hp);
      setPlayerMaxHp(myState.maxHp);
      setOpponentHp(theirState.hp);
      setOpponentMaxHp(theirState.maxHp);
      
      setPlayerPixelsCount(prev => prev === 0 ? myState.maxHp : prev);
      setOpponentPixelsCount(prev => prev === 0 ? theirState.maxHp : prev);

      setPlayerDodgeCharges(myState.dodgeCharges);
      setCombo(myState.combo);
      setPlayerBuffs(myState.buffs as any[]);
      setOpponentBuffs(theirState.buffs as any[]);

      const isMyTurn = (side === 'player1' && data.isPlayer1Turn) ||
                       (side === 'player2' && !data.isPlayer1Turn);
      setIsPlayerTurn(isMyTurn);
      setTurnIndicator(isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN");

      // Map abilities
      setAbilities(myState.abilities.map(a => ({
        ...a,
        currentCooldown: a.currentCooldown,
        calculate: () => ({ damage: 0 }),
      })) as unknown as Ability[]);

      // Add new logs
      if (data.newLogs && data.newLogs.length > 0) {
        setBattleLogs(prev => [...prev, ...data.newLogs.map(l => ({ ...l }))]);
        setTimeout(() => {
          const playerEl = document.getElementById("player-log-console");
          const opponentEl = document.getElementById("opponent-log-console");
          if (playerEl) playerEl.scrollTop = playerEl.scrollHeight;
          if (opponentEl) opponentEl.scrollTop = opponentEl.scrollHeight;
        }, 30);
      }

      // Handle visual effects for last action
      if (data.lastAction && arenaRef.current) {
        const side = pvpSideRef.current;
        const isMyAttack = (data.lastAction.attackerSide === 'player1' && side === 'player1') ||
                           (data.lastAction.attackerSide === 'player2' && side === 'player2');
        const visualSide = isMyAttack ? 'player' : 'opponent';
        const targetSide = isMyAttack ? 'opponent' : 'player';

        if (data.lastAction.damage > 0 && !data.lastAction.dodged) {
          const targetPixels = targetSide === 'player' ? arenaRef.current.playerPixels : arenaRef.current.opponentPixels;
          let impactPoint: any = null;
          
          if (targetPixels) {
            const activeCoords = getActivePixelCoords(targetPixels);
            if (activeCoords.length > 0) {
              const seed = data.lastAction.impactSeed ?? Math.random();
              impactPoint = activeCoords[Math.floor(seed * activeCoords.length)];
            }
          }

          let projType: 'laser' | 'orb' | 'drain' | 'wave' = 'laser';
          if (data.lastAction.abilityType === 'heavy' || data.lastAction.abilityType === 'ultimate') projType = 'orb';
          if (data.lastAction.abilityType === 'drain') projType = 'drain';

          arenaRef.current.fireAttack(visualSide, projType, impactPoint, () => {
            let removedCoords: any[] = [];
            if (targetPixels && impactPoint) {
              const destruction = removePixelCluster(targetPixels, impactPoint.x, impactPoint.y, data.lastAction!.damage);
              arenaRef.current!.updatePixels(targetSide, destruction.newPixels);
              removedCoords = destruction.removed;
            }

            arenaRef.current!.damageEffect(targetSide, data.lastAction!.damage, data.lastAction!.isCrit, removedCoords);
            audio.playPixelCrunch();
            if (data.lastAction!.isCrit) audio.playCrit();
            else audio.playHit();
            
            reconcilePixels();
          });
        }
        if (data.lastAction.dodged) {
          arenaRef.current.dodgeEffect(targetSide);
          audio.playDodge();
        }
        if (data.lastAction.heal) {
          const targetPixels = visualSide === 'player' ? arenaRef.current.playerPixels : arenaRef.current.opponentPixels;
          const originalPixels = visualSide === 'player' ? playerOriginalPixelsRef.current : opponentOriginalPixelsRef.current;
          
          if (targetPixels && originalPixels) {
            const restoration = restorePixels(targetPixels, originalPixels, data.lastAction.heal);
            arenaRef.current.updatePixels(visualSide, restoration.newPixels);
          }

          arenaRef.current.healEffect(visualSide, data.lastAction.heal);
          audio.playHeal();
        }
      }

      // Universal reconciliation step: Ensures canvas perfectly matches server HP after animations complete
      function reconcilePixels() {
        if (!arenaRef.current) return;
        const playerPixels = arenaRef.current.playerPixels;
        const opponentPixels = arenaRef.current.opponentPixels;
        
        if (playerPixels) {
          const currentP = countActivePixels(playerPixels);
          if (currentP > myState.hp) {
            const dest = removeRandomPixels(playerPixels, currentP - myState.hp);
            arenaRef.current.updatePixels('player', dest.newPixels);
            arenaRef.current.damageEffect('player', currentP - myState.hp, false, dest.removed);
          } else if (currentP < myState.hp && playerOriginalPixelsRef.current) {
            const dest = restorePixels(playerPixels, playerOriginalPixelsRef.current, myState.hp - currentP);
            arenaRef.current.updatePixels('player', dest.newPixels);
          }
          setPlayerPixelsCount(myState.hp);
        }
        
        if (opponentPixels) {
          const currentO = countActivePixels(opponentPixels);
          if (currentO > theirState.hp) {
            const dest = removeRandomPixels(opponentPixels, currentO - theirState.hp);
            arenaRef.current.updatePixels('opponent', dest.newPixels);
            arenaRef.current.damageEffect('opponent', currentO - theirState.hp, false, dest.removed);
          } else if (currentO < theirState.hp && opponentOriginalPixelsRef.current) {
            const dest = restorePixels(opponentPixels, opponentOriginalPixelsRef.current, theirState.hp - currentO);
            arenaRef.current.updatePixels('opponent', dest.newPixels);
          }
          setOpponentPixelsCount(theirState.hp);
        }
      };

      let willReconcileInCallback = false;
      if (data.lastAction && data.lastAction.damage > 0 && !data.lastAction.dodged) {
        willReconcileInCallback = true;
      }

      if (!willReconcileInCallback) {
        setTimeout(reconcilePixels, 800); // Wait for dodges/heals
      }
    });

    onTimingPrompt(() => {
      setTimingActiveState(true);
      // Start the timing bar sweep (same as PVE)
      timingActive.current = true;
      timingPosition.current = 0;
      timingDirection.current = 1;
      timingSpeed.current = 2.5;

      const animate = () => {
        if (!timingActive.current) return;
        timingPosition.current += timingSpeed.current * timingDirection.current;
        if (timingPosition.current >= 100) {
          timingPosition.current = 100;
          timingDirection.current = -1;
        } else if (timingPosition.current <= 0) {
          timingPosition.current = 0;
          timingDirection.current = 1;
        }
        if (timingCursorRef.current) {
          timingCursorRef.current.style.left = `${timingPosition.current}%`;
        }
        timingAnimFrame.current = requestAnimationFrame(animate);
      };
      timingAnimFrame.current = requestAnimationFrame(animate);
    });

    onDodgePrompt(() => {
      setDodgeActiveState(true);
      dodgeActive.current = true;
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const key = letters[Math.floor(Math.random() * letters.length)];
      dodgeKey.current = key;
      setDodgeKeyPrompt(key);

      const duration = 500;
      const startTime = Date.now();

      dodgeInterval.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1 - elapsed / duration);
        if (dodgeTimerFillRef.current) {
          dodgeTimerFillRef.current.style.width = `${remaining * 100}%`;
        }
      }, 15);

      dodgeTimeout.current = setTimeout(() => {
        if (dodgeActive.current) {
          dodgeActive.current = false;
          setDodgeActiveState(false);
          if (dodgeTimeout.current) clearTimeout(dodgeTimeout.current);
          if (dodgeInterval.current) clearInterval(dodgeInterval.current);
          audio.playDodgeFail();
          sendDodgeResult(false);
        }
      }, duration);
    });

    onPvpBattleEnd((data: PvpBattleEndPayload) => {
      const side = pvpSideRef.current;
      const iWon = (side === 'player1' && data.winnerSide === 'player1') ||
                   (side === 'player2' && data.winnerSide === 'player2');

      if (iWon) {
        audio.playVictory();
        setWinner('player');
      } else {
        audio.playDefeat();
        setWinner('opponent');
      }

      setTurnsCount(data.summary.turns);
      setDamageDealtCount(side === 'player1' ? data.summary.player1Damage : data.summary.player2Damage);
      setDamageTakenCount(side === 'player1' ? data.summary.player2Damage : data.summary.player1Damage);
      setMaxComboCount(0);
      setPerfectsCount(0);
      setDodgesCount(0);

      // Record locally too
      if (playerFighter && opponentFighter) {
        const winnerId = iWon ? playerFighter.id : opponentFighter.id;
        const loserId = iWon ? opponentFighter.id : playerFighter.id;
        recordResult(winnerId, loserId);
      }

      setTimeout(() => setCurrentScreen("results"), 1500);
    });

    onOpponentDisconnect(() => {
      setPvpOpponentDisconnected(true);
      audio.playVictory();
      setWinner('player');
      setTurnsCount(0);
      setDamageDealtCount(0);
      setDamageTakenCount(0);
      setTimeout(() => setCurrentScreen("results"), 1500);
    });

    onPvpError((data) => {
      console.error('PVP Error:', data.message);
    });

    // Actually join the queue
    joinQueue(pvpFighter);
  };

  const cancelPvpSearch = () => {
    leaveQueue();
    setPvpSearching(false);
    removeAllPvpListeners();
  };

  // 3. Initiate Battle Screen & Canvas Loops
  const startBattle = async () => {
    if (!playerFighter || !opponentFighter) return;
    setCurrentScreen("battle");
    setBattleLogs([]);
    setPlayerBuffs([]);
    setOpponentBuffs([]);
    setCombo(0);
    setTimingResultVisible(false);
    setTimingActiveState(false);
    setDodgeActiveState(false);
    audio.playSelect();
  };

  useEffect(() => {
    if (currentScreen !== "battle" || !canvasRef.current || !playerFighter || !opponentFighter) return;
    // In PVP mode, skip local CombatEngine setup — state comes from server
    if (gameMode === 'pvp') {
      const canvas = canvasRef.current;
      const arena = new ArenaRenderer(canvas);
      arenaRef.current = arena;

      Promise.all([
        getPixels(playerFighter.id, playerFighter.isGhost).catch(() => null),
        getPixels(opponentFighter.id, opponentFighter.isGhost).catch(() => null)
      ]).then(async ([playerPixels, opponentPixels]) => {
        playerOriginalPixelsRef.current = playerPixels;
        opponentOriginalPixelsRef.current = opponentPixels;
        
        arena.setFighters(playerPixels, opponentPixels, playerFighter.isGhost, opponentFighter.isGhost);
        await arena.loadFighterImages(playerFighter.imageUrl, opponentFighter.imageUrl);
        arena.start();
      });

      return () => {
        arena.destroy();
        arenaRef.current = null;
      };
    }

    const canvas = canvasRef.current;
    const arena = new ArenaRenderer(canvas);
    arenaRef.current = arena;

    // Load pixel data and sync HP stats
    Promise.all([
      getPixels(playerFighter.id, playerFighter.isGhost).catch(() => null),
      getPixels(opponentFighter.id, opponentFighter.isGhost).catch(() => null)
    ]).then(async ([playerPixels, opponentPixels]) => {
      arena.setFighters(playerPixels, opponentPixels, playerFighter.isGhost, opponentFighter.isGhost);

      // Fetch fallback image assets
      await arena.loadFighterImages(playerFighter.imageUrl, opponentFighter.imageUrl);
      arena.start();

      // Setup Combat callbacks
      const engine = new CombatEngine(playerFighter, opponentFighter, {
        onLog: (entry) => {
          setBattleLogs(prev => [...prev, entry]);
          // Scroll log consoles to bottom
          setTimeout(() => {
            const playerEl = document.getElementById("player-log-console");
            const opponentEl = document.getElementById("opponent-log-console");
            if (playerEl) playerEl.scrollTop = playerEl.scrollHeight;
            if (opponentEl) opponentEl.scrollTop = opponentEl.scrollHeight;
          }, 30);
        },
        onDamage: (target, damage, isCrit, removedCoords) => {
          arena.damageEffect(target, damage, isCrit, removedCoords);
          audio.playPixelCrunch();
          if (isCrit) audio.playCrit();
          else audio.playHit();
        },
        onHeal: (target, amount) => {
          arena.healEffect(target, amount);
          audio.playHeal();
        },
        onBuff: (target, buff) => {
          arena.buffEffect(target, buff);
          audio.playBuff();
        },
        onTurnChange: (isPlayerTurnNow) => {
          setIsPlayerTurn(isPlayerTurnNow);
          setTurnIndicator(isPlayerTurnNow ? "YOUR TURN" : "ENEMY TURN");
          setAbilities(engine.getPlayerAbilities());
          setPlayerBuffs([...engine.playerBuffs]);
          setOpponentBuffs([...engine.opponentBuffs]);
        },
        onStatsUpdate: () => {
          setPlayerHp(engine.player.stats.hp);
          setPlayerMaxHp(engine.player.stats.maxHp);
          setOpponentHp(engine.opponent.stats.hp);
          setOpponentMaxHp(engine.opponent.stats.maxHp);
          
          setPlayerDodgeCharges(engine.playerDodgeCharges);
          setMaxDodgeCharges(engine.maxDodgeCharges);

          setPlayerBuffs([...engine.playerBuffs]);
          setOpponentBuffs([...engine.opponentBuffs]);

          // Count active pixel arrays
          if (engine.playerPixels) {
            let pCount = 0;
            for (let i = 0; i < engine.playerPixels.length; i++) {
              if (engine.playerPixels[i] === '1') pCount++;
            }
            setPlayerPixelsCount(pCount);
          }
          if (engine.opponentPixels) {
            let oCount = 0;
            for (let i = 0; i < engine.opponentPixels.length; i++) {
              if (engine.opponentPixels[i] === '1') oCount++;
            }
            setOpponentPixelsCount(oCount);
          }
        },
        onTimingAttackStart: (ability) => {
          pendingAbilityRef.current = ability;
          setTimingActiveState(true);
          startTimingBarSweep(ability);
        },
        onDodgePrompt: (ability) => {
          setDodgeActiveState(true);
          startDodgeQTE(ability);
        },
        onComboUpdate: (comboCount) => {
          setCombo(comboCount);
          if (comboCount > 1) {
            audio.playCombo(comboCount);
          }
        },
        onPixelDestruction: (side, newPixels) => {
          arena.updatePixels(side, newPixels);
        },
        onFireAttack: (attackerSide, type, impactCoords, onImpact, abilityName) => {
          arena.fireAttack(attackerSide, type, impactCoords, onImpact, abilityName);
        },
        onBattleEnd: (winnerName, wFighter, lFighter) => {
          recordResult(wFighter.id, lFighter.id);
          if (winnerName === "player") {
            audio.playVictory();
          } else {
            audio.playDefeat();
          }

          const summary = engine.getSummary();
          setWinner(winnerName);
          setTurnsCount(summary.turns);
          setMaxComboCount(summary.combo);
          setPerfectsCount(summary.perfects);
          setDodgesCount(summary.dodges);
          setDamageDealtCount(summary.totalPlayerDamage);
          setDamageTakenCount(summary.totalOpponentDamage);

          setTimeout(() => {
            setCurrentScreen("results");
          }, 1500);
        }
      });

      combatRef.current = engine;
      engine.setPixelData(playerPixels, opponentPixels);

      // Sync starting stats
      setPlayerHp(engine.player.stats.hp);
      setPlayerMaxHp(engine.player.stats.maxHp);
      setOpponentHp(engine.opponent.stats.hp);
      setOpponentMaxHp(engine.opponent.stats.maxHp);
      setPlayerPixelsCount(engine.playerOriginalPixelCount);
      setOpponentPixelsCount(engine.opponentOriginalPixelCount);
      setPlayerDodgeCharges(engine.playerDodgeCharges);
      setMaxDodgeCharges(engine.maxDodgeCharges);
      setAbilities(engine.getPlayerAbilities());
      setIsPlayerTurn(engine.isPlayerTurn);
      setTurnIndicator(engine.isPlayerTurn ? "YOUR TURN" : "ENEMY TURN");

      engine.onLog({ message: `⚔️ ${playerFighter.name} vs ${opponentFighter.name} — FIGHT!`, type: "system", turn: 0 });
      engine.onLog({ message: `🎯 Perfect timing boosts attack strength! Earn Dodge charges!`, type: "system", turn: 0 });
      engine.onLog({ message: `${engine.isPlayerTurn ? 'Player' : 'Opponent'} strikes first due to higher SPD`, type: "system", turn: 0 });

      if (!engine.isPlayerTurn) {
        setTimeout(() => engine._startEnemyTurn(), 1200);
      }
    });

    return () => {
      arena.destroy();
      arenaRef.current = null;
      combatRef.current = null;
      if (timingAnimFrame.current) cancelAnimationFrame(timingAnimFrame.current);
    };
  }, [currentScreen]);

  // 4. Timing attack sweep loop
  const startTimingBarSweep = (ability: Ability) => {
    timingActive.current = true;
    timingPosition.current = 0;
    timingDirection.current = 1;
    timingSpeed.current = ability.cooldown > 0 ? 2.2 + ability.cooldown * 0.35 : 2.2;

    const animate = () => {
      if (!timingActive.current) return;
      timingPosition.current += timingSpeed.current * timingDirection.current;

      if (timingPosition.current >= 100) {
        timingPosition.current = 100;
        timingDirection.current = -1;
      } else if (timingPosition.current <= 0) {
        timingPosition.current = 0;
        timingDirection.current = 1;
      }

      if (timingCursorRef.current) {
        timingCursorRef.current.style.left = `${timingPosition.current}%`;
      }
      timingAnimFrame.current = requestAnimationFrame(animate);
    };

    timingAnimFrame.current = requestAnimationFrame(animate);
  };

  const resolveTimingBar = () => {
    if (!timingActive.current) return;
    timingActive.current = false;
    setTimingActiveState(false);
    if (timingAnimFrame.current) cancelAnimationFrame(timingAnimFrame.current);

    const pos = timingPosition.current;
    let result: "miss" | "ok" | "perfect" | "critical" = "miss";

    if (pos >= 47 && pos <= 51) {
      result = "critical";
    } else if ((pos >= 37 && pos < 47) || (pos > 51 && pos <= 61)) {
      result = "perfect";
    } else if ((pos >= 21 && pos < 37) || (pos > 61 && pos <= 77)) {
      result = "ok";
    }

    setTimingResultState(result);
    setTimingResultVisible(true);

    if (result === "critical") audio.playCriticalPerfect();
    else if (result === "perfect") audio.playPerfect();
    else if (result === "ok") audio.playHit();
    else audio.playMiss();

    setTimeout(() => {
      setTimingResultVisible(false);
      if (gameMode === 'pvp') {
        // Send timing result to server
        sendTimingResult(result);
      } else if (combatRef.current) {
        combatRef.current.resolveTimingAttack(result);
      }
    }, 400);
  };

  // Keyboard timing hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (timingActiveState && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        resolveTimingBar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timingActiveState]);

  // 5. Dodge QTE setup
  const startDodgeQTE = (ability: Ability) => {
    dodgeActive.current = true;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const key = letters[Math.floor(Math.random() * letters.length)];
    dodgeKey.current = key;
    setDodgeKeyPrompt(key);

    const duration = 500; // 0.5 seconds QTE
    const startTime = Date.now();

    // Visual bar update
    dodgeInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / duration);
      if (dodgeTimerFillRef.current) {
        dodgeTimerFillRef.current.style.width = `${remaining * 100}%`;
      }
    }, 15);

    // QTE failed timeout
    dodgeTimeout.current = setTimeout(() => {
      if (dodgeActive.current) {
        endDodgeQTE(false);
      }
    }, duration);
  };

  const endDodgeQTE = (dodged: boolean) => {
    if (!dodgeActive.current) return;
    dodgeActive.current = false;
    setDodgeActiveState(false);

    if (dodgeTimeout.current) clearTimeout(dodgeTimeout.current);
    if (dodgeInterval.current) clearInterval(dodgeInterval.current);

    // Apply dodge action
    if (dodged) {
      audio.playDodge();
      if (arenaRef.current) {
        if (combatRef.current) {
          arenaRef.current.dodgeAnimation("player", combatRef.current.playerPixels);
        }
        arenaRef.current.dodgeEffect("player");
      }
    } else {
      audio.playDodgeFail();
    }

    setTimeout(() => {
      if (gameMode === 'pvp') {
        sendDodgeResult(dodged);
      } else if (combatRef.current) {
        combatRef.current.resolveDodge(dodged);
      }
    }, 500);
  };

  // Dodge QTE keyboard hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dodgeActiveState) return;
      const pressed = e.key.toUpperCase();
      if (pressed === dodgeKey.current) {
        e.preventDefault();
        endDodgeQTE(true);
      } else if (/^[A-Z]$/.test(pressed)) {
        e.preventDefault();
        endDodgeQTE(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dodgeActiveState]);

  // Load Leaderboard
  const openLeaderboard = () => {
    setLeaderboardEntries(getLeaderboard());
    setCurrentScreen("leaderboard");
    audio.playSelect();
  };

  // Rematch
  const triggerRematch = () => {
    if (playerFighter && opponentFighter) {
      const pData = getMockFighterData(playerFighter.id);
      const oData = getMockFighterData(opponentFighter.id);
      setPlayerFighter(createFighter(pData));
      setOpponentFighter(createFighter(oData));
      startBattle();
    }
  };

  const resetGame = () => {
    setPlayerFighter(null);
    setOpponentFighter(null);
    setPlayerId("");
    setOpponentId("");
    if (gameMode === 'pvp') {
      removeAllPvpListeners();
      disconnectFromServer();
    }
    setGameMode('pve');
    setPvpSearching(false);
    setPvpRoomId(null);
    setPvpOpponentDisconnected(false);
    setCurrentScreen("mode-select");
    audio.playSelect();
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-grid">
            <div className="logo-pixel"></div>
            <div className="logo-pixel"></div>
            <div className="logo-pixel"></div>
            <div className="logo-pixel"></div>
          </div>
          <span className="logo-text">NORMIES BATTLEGROUND</span>
        </div>
        <div className="audio-controls">
          <button className="btn-audio-mute" onClick={() => { setShowHelpModal(true); audio.playSelect(); }} style={{ marginRight: "8px" }}>
            <FontAwesomeIcon icon={faCircleQuestion} style={{ marginRight: "4px" }} /> HELP
          </button>
          <button className="btn-audio-mute" onClick={toggleMute}>
            {isMuted ? (
              <>
                <FontAwesomeIcon icon={faVolumeXmark} style={{ marginRight: "4px" }} /> UNMUTE
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faVolumeHigh} style={{ marginRight: "4px" }} /> MUTE SOUND
              </>
            )}
          </button>
        </div>
      </header>

      {/* Screen 1: LOADING SCREEN */}
      {currentScreen === "loading" && (
        <section className="screen active loading-screen">
          <div className="loading-core"></div>
          <div className="loading-bar-container">
            <div className="loading-bar-fill" id="loading-bar"></div>
          </div>
          <div className="loading-text" id="loading-text">
            Connecting to Ethereum...
          </div>
        </section>
      )}
      {/* Screen 1.5: MODE SELECT SCREEN */}
      {currentScreen === "mode-select" && (
        <section className="screen active mode-select-screen">
          <div className="mode-select-container">
            <h1 className="mode-select-title">
              <FontAwesomeIcon icon={faGamepad} style={{ marginRight: "12px" }} />
              CHOOSE YOUR BATTLEGROUND
            </h1>
            <p className="mode-select-subtitle">Select how you want to fight</p>

            <div className="mode-cards">
              <button
                className="mode-card pve-card"
                onClick={() => {
                  setGameMode('pve');
                  setCurrentScreen('select');
                  audio.playSelect();
                }}
              >
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
                <div className="mode-card-badge">SINGLE PLAYER</div>
              </button>

              <div className="mode-vs-divider">
                <span>VS</span>
              </div>

              <button
                className="mode-card pvp-card"
                onClick={() => {
                  setGameMode('pvp');
                  setCurrentScreen('pvp-lobby');
                  audio.playSelect();
                }}
              >
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
                <div className="mode-card-badge online">MULTIPLAYER</div>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Screen 1.75: PVP LOBBY */}
      {currentScreen === "pvp-lobby" && (
        <section className="screen active pvp-lobby-screen">
          <div className="pvp-lobby-container">
            <h1 className="pvp-lobby-title">
              <FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "10px" }} />
              PVP ARENA LOBBY
            </h1>

            <div className="pvp-lobby-grid">
              {/* Fighter Selection */}
              <div className="pvp-lobby-fighter-select">
                <h2 className="panel-title">
                  <FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "6px" }} />
                  SELECT YOUR FIGHTER
                </h2>
                <div className="cyber-input-group">
                  <input
                    type="number"
                    placeholder="NORMIE ID (0-9999)"
                    className="cyber-input"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadFighter(playerId, "player")}
                  />
                  <button
                    className="cyber-button primary"
                    onClick={() => loadFighter(playerId, "player")}
                    disabled={playerLoading}
                  >
                    {playerLoading ? "..." : "LOAD"}
                  </button>
                  <button
                    className="cyber-button"
                    onClick={() => {
                      const randomId = Math.floor(Math.random() * 10000);
                      setPlayerId(randomId.toString());
                      loadFighter(randomId.toString(), "player");
                    }}
                    title="Random fighter"
                  >
                    <FontAwesomeIcon icon={faDice} />
                  </button>
                </div>

                {playerFighter && (
                  <div className="pvp-fighter-preview">
                    <div className="fighter-image-container">
                      <img src={playerFighter.imageUrl} alt={playerFighter.name} />
                    </div>
                    <div className="pvp-fighter-info">
                      <div className="fighter-name">{playerFighter.name}</div>
                      <div className="fighter-class">{playerFighter.class} • {playerFighter.type} • Lv.{playerFighter.level}</div>
                      <div className="pvp-stats-mini">
                        <span><FontAwesomeIcon icon={faHeart} style={{ color: "var(--accent-red)" }} /> {playerFighter.stats.hp}</span>
                        <span><FontAwesomeIcon icon={faBurst} style={{ color: "var(--accent-gold)" }} /> {playerFighter.stats.atk}</span>
                        <span><FontAwesomeIcon icon={faShieldHalved} style={{ color: "var(--accent-secondary)" }} /> {playerFighter.stats.def}</span>
                        <span><FontAwesomeIcon icon={faWind} style={{ color: "var(--accent-primary)" }} /> {playerFighter.stats.spd}</span>
                      </div>
                    </div>
                  </div>
                )}

                {playerFighter && !pvpSearching && (
                  <button
                    className="cyber-button primary pvp-find-match-btn"
                    onClick={startPvpSearch}
                  >
                    <FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "8px" }} />
                    FIND MATCH
                  </button>
                )}

                {pvpSearching && (
                  <div className="pvp-searching">
                    <div className="pvp-searching-spinner">
                      <div className="loading-core"></div>
                    </div>
                    <p className="pvp-searching-text">Searching for opponent...</p>
                    <p className="pvp-queue-count">{pvpQueueCount} player{pvpQueueCount !== 1 ? 's' : ''} in queue</p>
                    <button className="cyber-button" onClick={cancelPvpSearch}>
                      CANCEL
                    </button>
                  </div>
                )}
              </div>

              {/* PVP Info / Status */}
              <div className="pvp-lobby-info">
                <div className="pvp-info-card">
                  <h3><FontAwesomeIcon icon={faChartSimple} style={{ marginRight: "6px" }} /> HOW PVP WORKS</h3>
                  <ul className="pvp-info-list">
                    <li><FontAwesomeIcon icon={faBolt} style={{ marginRight: "6px", color: "var(--accent-gold)" }} /> Load your Normie fighter</li>
                    <li><FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "6px", color: "var(--accent-red)" }} /> Click FIND MATCH to enter the queue</li>
                    <li><FontAwesomeIcon icon={faGamepad} style={{ marginRight: "6px", color: "var(--accent-primary)" }} /> Get matched with another player in real-time</li>
                    <li><FontAwesomeIcon icon={faTrophy} style={{ marginRight: "6px", color: "var(--accent-gold)" }} /> Win to climb the ELO leaderboard!</li>
                  </ul>
                </div>

                <button
                  className="cyber-button"
                  onClick={() => { setGameMode('pve'); setCurrentScreen('mode-select'); audio.playSelect(); }}
                  style={{ marginTop: "16px", width: "100%" }}
                >
                  <FontAwesomeIcon icon={faGamepad} style={{ marginRight: "6px" }} /> BACK TO MODE SELECT
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Screen 2: SELECT SCREEN */}
      {currentScreen === "select" && (
        <section className="screen active select-screen">
          <div className="select-grid">
            {/* Player Selection */}
            <div className="select-column">
              <div className="select-panel player">
                <h2 className="panel-title"><FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "6px" }} /> PLAYER NORMIE</h2>
                <div className="cyber-input-group">
                  <input
                    type="number"
                    placeholder="ID (0-9999)"
                    className="cyber-input"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadFighter(playerId, "player")}
                  />
                  <button className="cyber-button primary" onClick={() => loadFighter(playerId, "player")} disabled={playerLoading}>
                    {playerLoading ? "..." : "LOAD"}
                  </button>
                </div>

                {/* Wallet Connected Portfolio */}
                <div className="wallet-portfolio-search">
                  <div className="cyber-input-group">
                    <input
                      type="text"
                      placeholder="WALLET ADDRESS"
                      className="cyber-input"
                      style={{ fontSize: "9px", padding: "8px 10px" }}
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleWalletSearch()}
                    />
                    <button className="cyber-button tertiary" onClick={handleWalletSearch} disabled={walletLoading} style={{ padding: "8px 12px" }}>
                      {walletLoading ? "..." : "SCAN"}
                    </button>
                  </div>
                  <div className="wallet-samples">
                    <span className="sample-label">DEMO:</span>
                    <button onClick={() => { setWalletAddress("0x9Eb6E2025B64f340691e424b7fe7022fFDE12438"); setTimeout(() => handleWalletSearch(), 50); }} className="sample-btn">MINT OWNER</button>
                    <button onClick={() => { setWalletAddress("0xC74994dD70FFb621CC514cE18a4F6F52124e296d"); setTimeout(() => handleWalletSearch(), 50); }} className="sample-btn">MINTER</button>
                  </div>
                  
                  {walletSearched && (
                    <div className="wallet-results">
                      {walletTokens.length > 0 ? (
                        <div className="wallet-tokens-row">
                          {walletTokens.map((tokenId) => (
                            <button
                              key={tokenId}
                              className="wallet-token-badge"
                              onClick={() => { setPlayerId(tokenId.toString()); loadFighter(tokenId.toString(), "player"); }}
                            >
                              #{tokenId}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="wallet-empty">No Normies owned or scan failed.</div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="preview-container">
                  {playerFighter ? (
                    <div className="fighter-card">
                      <div className="fighter-image-container">
                        <img src={playerFighter.imageUrl} alt={playerFighter.name} />
                      </div>
                      <div className="fighter-name">
                        {playerFighter.name}
                        {playerFighter.level > 1 && <span style={{ color: "var(--accent-gold)" }}> <FontAwesomeIcon icon={faStar} style={{ fontSize: "8px", marginRight: "2px" }} /> Lv.{playerFighter.level}</span>}
                        {playerFighter.customized && <span style={{ color: "var(--accent-tertiary)" }}> ✦ CUSTOM</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        <span className={`fighter-type-badge type-${playerFighter.type}`}>{playerFighter.type} — {playerFighter.class}</span>
                        {playerFighter.isGhost && <span className="fighter-type-badge" style={{ backgroundColor: "rgba(0, 240, 255, 0.15)", border: "1px solid var(--accent-secondary)", color: "var(--accent-secondary)" }}><FontAwesomeIcon icon={faGhost} style={{ marginRight: "4px" }} /> GHOST</span>}
                      </div>

                      {/* Card Tabs */}
                      <div className="fighter-card-tabs">
                        <button className={`card-tab ${playerTab === "stats" ? "active" : ""}`} onClick={() => setPlayerTab("stats")}>STATS</button>
                        <button className={`card-tab ${playerTab === "evolution" ? "active" : ""}`} onClick={() => setPlayerTab("evolution")}>EVOLUTION</button>
                        {playerFighter.agentPersona && (
                          <button className={`card-tab ${playerTab === "agent" ? "active" : ""}`} onClick={() => setPlayerTab("agent")}>AI AGENT</button>
                        )}
                      </div>

                      {playerTab === "stats" && (
                        <>
                          <div className="stat-bars">
                            {Object.entries(playerFighter.stats)
                              .filter(([k]) => k !== "maxHp")
                              .map(([key, val]) => (
                                <div className="stat-row" key={key}>
                                  <span className="stat-label">{key.toUpperCase()}</span>
                                  <div className="stat-bar-bg">
                                    <div className={`stat-bar-fill stat-${key}`} style={{ width: `${getStatPercent(key as any, val)}%` }}></div>
                                  </div>
                                  <span className="stat-value">{val}</span>
                                </div>
                              ))}
                          </div>
                          <div className="trait-tags">
                            {Object.values(playerFighter.traits).map((v, i) => (
                              <span className="trait-tag" key={i}>{v}</span>
                            ))}
                          </div>
                        </>
                      )}

                      {playerTab === "evolution" && (
                        <div className="evolution-details">
                          <div className="owner-badge">
                            <span className="label">OWNER:</span>
                            <span className="val" title={playerFighter.owner}>
                              {playerFighter.owner ? `${playerFighter.owner.slice(0, 6)}...${playerFighter.owner.slice(-4)}` : "Contract Store"}
                            </span>
                          </div>
                          <div className="canvas-stats-row">
                            <div className="c-stat"><span>LV</span> <span>{playerFighter.level}</span></div>
                            <div className="c-stat"><span>AP</span> <span>{playerFighter.actionPoints}</span></div>
                            <div className="c-stat"><span>CUSTOM</span> <span>{playerFighter.customized ? "YES" : "NO"}</span></div>
                          </div>
                          {playerDiff && (
                            <div className="diff-summary">
                              <span className="diff-title"><FontAwesomeIcon icon={faPalette} style={{ marginRight: "6px" }} /> Canvas Pixels Diff:</span>
                              <div className="diff-stats">
                                <span className="diff-added">+{playerDiff.addedCount || 0} px</span>
                                <span className="diff-removed">-{playerDiff.removedCount || 0} px</span>
                                <span className="diff-net">Net: {playerDiff.netChange || 0}</span>
                              </div>
                            </div>
                          )}
                          <div className="versions-timeline">
                            <span className="timeline-title"><FontAwesomeIcon icon={faScroll} style={{ marginRight: "6px" }} /> On-Chain Versions ({playerVersions.length}):</span>
                            {playerVersions.length > 0 ? (
                              <div className="versions-list">
                                {playerVersions.map((v: any, index: number) => (
                                  <div className="version-item" key={index}>
                                    <span className="v-num">v{v.version}</span>
                                    <span className="v-changes">+{v.changeCount} px changed</span>
                                    <span className="v-tx" title={v.transformer}>{v.transformer ? `${v.transformer.slice(0, 6)}...` : ""}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="timeline-empty">No edited canvas versions recorded on-chain.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {playerTab === "agent" && playerFighter.agentPersona && (
                        <div className="agent-details">
                          <div className="agent-tagline">"{playerFighter.agentPersona.tagline}"</div>
                          <div className="agent-backstory">
                            <strong>Backstory:</strong> {playerFighter.agentPersona.backstory || "No backstory registered."}
                          </div>
                          <div className="agent-quirks">
                            <strong>Quirks:</strong>
                            <div className="quirks-list">
                              {(playerFighter.agentPersona.quirks || []).slice(0, 3).map((q: string, i: number) => (
                                <span className="quirk-badge" key={i}>{q}</span>
                              ))}
                            </div>
                          </div>
                          <div className="agent-greeting">
                            <strong>Greeting:</strong> "{playerFighter.agentPersona.greeting}"
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="preview-placeholder">
                      <div className="placeholder-pixel-grid"></div>
                      <p>Awaiting Player Normie...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Matchmaker Console */}
            <div className="select-column center-select-panel">
              <h1 className="center-title">NORMIES BATTLEGROUND</h1>
              <div className="matchmaker-console">
                <div className="console-header">
                  <span className="console-prefix">&gt;</span>
                  <span className="console-title" style={{ fontFamily: "var(--font-pixel)", fontSize: "7px" }}>MATCHMAKER SERVICE</span>
                  <span className={`api-health-badge ${isApiOnline ? "online" : "offline"}`}>
                    <span className="health-dot"></span>
                    API: {isApiOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                
                <div className="stats-dashboard">
                  <div className="dashboard-grid">
                    <div className="dash-item">
                      <span className="dash-label">ON-CHAIN AGENTS</span>
                      <span className="dash-val">{totalAgents}</span>
                    </div>
                    <div className="dash-item">
                      <span className="dash-label">BURNED TOKENS</span>
                      <span className="dash-val">{globalStats?.totalBurnedTokens ?? 118}</span>
                    </div>
                    <div className="dash-item">
                      <span className="dash-label">TOTAL TRANSFORMS</span>
                      <span className="dash-val">{globalStats?.totalTransforms ?? 87}</span>
                    </div>
                    <div className="dash-item">
                      <span className="dash-label">CANVAS STATUS</span>
                      <span className="dash-val" style={{ color: canvasStatus?.paused ? "var(--accent-red)" : "var(--accent-green)", fontSize: "7px" }}>
                        {canvasStatus?.paused ? "PAUSED" : "ACTIVE"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="console-log-lines">
                  <p>&gt; Choose a Player character and load or summon an Opponent.</p>
                  <p>&gt; Custom on-chain traits scale character stats.</p>
                  <p>&gt; Precision timing strikes award dodge energy charges.</p>
                </div>
              </div>
              
              <button 
                className="btn-commence" 
                onClick={startBattle} 
                disabled={!playerFighter || !opponentFighter}
              >
                <FontAwesomeIcon icon={faBurst} style={{ marginRight: "6px" }} /> COMMENCE PROTOCOL
              </button>

              <button className="cyber-button" onClick={openLeaderboard} style={{ width: "180px", marginTop: "10px" }}>
                <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "6px" }} /> LEADERBOARD
              </button>

              <button className="cyber-button" onClick={() => { setShowHelpModal(true); audio.playSelect(); }} style={{ width: "180px", marginTop: "10px" }}>
                <FontAwesomeIcon icon={faCircleQuestion} style={{ marginRight: "6px" }} /> GAME MANUAL
              </button>
            </div>

            {/* Opponent Selection */}
            <div className="select-column">
              <div className="select-panel opponent">
                <h2 className="panel-title"><FontAwesomeIcon icon={faSkull} style={{ marginRight: "6px" }} /> OPPONENT</h2>
                <div className="cyber-input-group">
                  <input
                    type="number"
                    placeholder="ID (0-9999)"
                    className="cyber-input"
                    value={opponentId}
                    onChange={(e) => setOpponentId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadFighter(opponentId, "opponent")}
                  />
                  <button className="cyber-button opponent-btn" onClick={() => loadFighter(opponentId, "opponent")} disabled={opponentLoading}>
                    {opponentLoading ? "..." : "LOAD"}
                  </button>
                  <button className="cyber-button" onClick={loadRandomOpponent} disabled={opponentLoading}>
                    <FontAwesomeIcon icon={faDice} />
                  </button>
                </div>

                {/* Ghost & Agent Challenge Actions */}
                <div className="opponent-actions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button className="cyber-button ghost-summon-btn" onClick={summonGhostOpponent} disabled={opponentLoading} style={{ fontSize: "5.5px" }}>
                    <FontAwesomeIcon icon={faGhost} style={{ marginRight: "4px" }} /> GHOST SUMMON
                  </button>
                  <button className="cyber-button agent-gallery-btn" onClick={openAgentGallery} disabled={opponentLoading} style={{ fontSize: "5.5px" }}>
                    <FontAwesomeIcon icon={faRobot} style={{ marginRight: "4px" }} /> AGENT REGISTRY
                  </button>
                </div>
                
                <div className="preview-container">
                  {opponentFighter ? (
                    <div className="fighter-card">
                      <div className="fighter-image-container">
                        <img src={opponentFighter.imageUrl} alt={opponentFighter.name} />
                      </div>
                      <div className="fighter-name">
                        {opponentFighter.name}
                        {opponentFighter.level > 1 && <span style={{ color: "var(--accent-gold)" }}> <FontAwesomeIcon icon={faStar} style={{ fontSize: "8px", marginRight: "2px" }} /> Lv.{opponentFighter.level}</span>}
                        {opponentFighter.customized && <span style={{ color: "var(--accent-tertiary)" }}> ✦ CUSTOM</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        <span className={`fighter-type-badge type-${opponentFighter.type}`}>{opponentFighter.type} — {opponentFighter.class}</span>
                        {opponentFighter.isGhost && <span className="fighter-type-badge" style={{ backgroundColor: "rgba(0, 240, 255, 0.15)", border: "1px solid var(--accent-secondary)", color: "var(--accent-secondary)" }}><FontAwesomeIcon icon={faGhost} style={{ marginRight: "4px" }} /> GHOST</span>}
                      </div>

                      {/* Card Tabs */}
                      <div className="fighter-card-tabs">
                        <button className={`card-tab ${opponentTab === "stats" ? "active" : ""}`} onClick={() => setOpponentTab("stats")}>STATS</button>
                        <button className={`card-tab ${opponentTab === "evolution" ? "active" : ""}`} onClick={() => setOpponentTab("evolution")}>EVOLUTION</button>
                        {opponentFighter.agentPersona && (
                          <button className={`card-tab ${opponentTab === "agent" ? "active" : ""}`} onClick={() => setOpponentTab("agent")}>AI AGENT</button>
                        )}
                      </div>

                      {opponentTab === "stats" && (
                        <>
                          <div className="stat-bars">
                            {Object.entries(opponentFighter.stats)
                              .filter(([k]) => k !== "maxHp")
                              .map(([key, val]) => (
                                <div className="stat-row" key={key}>
                                  <span className="stat-label">{key.toUpperCase()}</span>
                                  <div className="stat-bar-bg">
                                    <div className={`stat-bar-fill stat-${key}`} style={{ width: `${getStatPercent(key as any, val)}%` }}></div>
                                  </div>
                                  <span className="stat-value">{val}</span>
                                </div>
                              ))}
                          </div>
                          <div className="trait-tags">
                            {Object.values(opponentFighter.traits).map((v, i) => (
                              <span className="trait-tag" key={i}>{v}</span>
                            ))}
                          </div>
                        </>
                      )}

                      {opponentTab === "evolution" && (
                        <div className="evolution-details">
                          <div className="owner-badge">
                            <span className="label">OWNER:</span>
                            <span className="val" title={opponentFighter.owner}>
                              {opponentFighter.owner ? `${opponentFighter.owner.slice(0, 6)}...${opponentFighter.owner.slice(-4)}` : "Contract Store"}
                            </span>
                          </div>
                          <div className="canvas-stats-row">
                            <div className="c-stat"><span>LV</span> <span>{opponentFighter.level}</span></div>
                            <div className="c-stat"><span>AP</span> <span>{opponentFighter.actionPoints}</span></div>
                            <div className="c-stat"><span>CUSTOM</span> <span>{opponentFighter.customized ? "YES" : "NO"}</span></div>
                          </div>
                          {opponentDiff && (
                            <div className="diff-summary">
                              <span className="diff-title"><FontAwesomeIcon icon={faPalette} style={{ marginRight: "6px" }} /> Canvas Pixels Diff:</span>
                              <div className="diff-stats">
                                <span className="diff-added">+{opponentDiff.addedCount || 0} px</span>
                                <span className="diff-removed">-{opponentDiff.removedCount || 0} px</span>
                                <span className="diff-net">Net: {opponentDiff.netChange || 0}</span>
                              </div>
                            </div>
                          )}
                          <div className="versions-timeline">
                            <span className="timeline-title"><FontAwesomeIcon icon={faScroll} style={{ marginRight: "6px" }} /> On-Chain Versions ({opponentVersions.length}):</span>
                            {opponentVersions.length > 0 ? (
                              <div className="versions-list">
                                {opponentVersions.map((v: any, index: number) => (
                                  <div className="version-item" key={index}>
                                    <span className="v-num">v{v.version}</span>
                                    <span className="v-changes">+{v.changeCount} px changed</span>
                                    <span className="v-tx" title={v.transformer}>{v.transformer ? `${v.transformer.slice(0, 6)}...` : ""}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="timeline-empty">No edited canvas versions recorded on-chain.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {opponentTab === "agent" && opponentFighter.agentPersona && (
                        <div className="agent-details">
                          <div className="agent-tagline">"{opponentFighter.agentPersona.tagline}"</div>
                          <div className="agent-backstory">
                            <strong>Backstory:</strong> {opponentFighter.agentPersona.backstory || "No backstory registered."}
                          </div>
                          <div className="agent-quirks">
                            <strong>Quirks:</strong>
                            <div className="quirks-list">
                              {(opponentFighter.agentPersona.quirks || []).slice(0, 3).map((q: string, i: number) => (
                                <span className="quirk-badge" key={i}>{q}</span>
                              ))}
                            </div>
                          </div>
                          <div className="agent-greeting">
                            <strong>Greeting:</strong> "{opponentFighter.agentPersona.greeting}"
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="preview-placeholder">
                      <div className="placeholder-pixel-grid"></div>
                      <p>Awaiting Opponent...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Screen 3: BATTLE SCREEN */}
      {currentScreen === "battle" && (
        <section className="screen active battle-screen">
          <div className="battle-layout">
            {/* Player Sidebar */}
            <aside className="battle-sidebar">
              <div className="sidebar-portrait">
                {playerFighter && <img src={playerFighter.imageUrl} alt={playerFighter.name} />}
              </div>
              <div className="sidebar-name">{playerFighter?.name}</div>
              <div className="sidebar-hp-container">
                <div className="sidebar-hp-label">
                  <span>HP</span>
                  <span>{playerHp} / {playerMaxHp}</span>
                </div>
                <div className="sidebar-hp-bar">
                  <div 
                    className="sidebar-hp-fill player-hp" 
                    style={{ width: `${playerMaxHp > 0 ? (playerHp / playerMaxHp) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="sidebar-pixel-count">
                <span>PIXELS:</span>
                <div className="pixel-count-bar">
                  <div 
                    className="pixel-count-fill" 
                    style={{ width: `${playerMaxHp > 0 ? (playerPixelsCount / playerMaxHp) * 100 : 0}%` }}
                  ></div>
                </div>
                <span>{playerPixelsCount}</span>
              </div>
              
              {/* Dodge Charges Indicator */}
              <div className="sidebar-dodge-charges">
                <span>DODGE ENERGY:</span>
                <span style={{ display: "inline-flex", gap: "3px" }}>
                  {Array.from({ length: maxDodgeCharges }).map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`dodge-diamond ${idx < playerDodgeCharges ? "filled" : "empty"}`}
                      style={{ fontSize: "8px" }}
                    >
                      <FontAwesomeIcon icon={faDiamond} />
                    </span>
                  ))}
                </span>
              </div>

              {/* Player Sidebar Combat Feed Terminal */}
              <div className="sidebar-terminal">
                <div className="terminal-header">
                  <span className="terminal-dot red"></span>
                  <span className="terminal-dot yellow"></span>
                  <span className="terminal-dot green"></span>
                  <span className="terminal-title">COMBAT FEED</span>
                </div>
                <div className="terminal-content" id="player-log-console">
                  {battleLogs
                    .filter(log => isPlayerLog(log.message, playerFighter?.name || "Player", opponentFighter?.name || "Opponent"))
                    .map((log, i) => (
                      <div className={`log-entry ${log.type}`} key={i}>
                        {log.message}
                      </div>
                    ))}
                </div>
              </div>

              <div className="sidebar-stats-mini">
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faBolt} style={{ marginRight: "4px" }} /> ATK:</span>
                  <span>
                    {playerFighter ? (() => {
                      const { total, boost } = getBuffedStat(playerFighter.stats.atk, 'atk', playerBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{playerFighter.stats.atk}</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "4px" }} /> DEF:</span>
                  <span>
                    {playerFighter ? (() => {
                      const { total, boost } = getBuffedStat(playerFighter.stats.def, 'def', playerBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{playerFighter.stats.def}</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faWind} style={{ marginRight: "4px" }} /> SPD:</span>
                  <span>
                    {playerFighter ? (() => {
                      const { total, boost } = getBuffedStat(playerFighter.stats.spd, 'spd', playerBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{playerFighter.stats.spd}</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "4px" }} /> CRT:</span>
                  <span>
                    {playerFighter ? (() => {
                      const { total, boost } = getBuffedStat(playerFighter.stats.crit, 'crit', playerBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{playerFighter.stats.crit}%</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}%</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}%</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
              </div>
            </aside>

            {/* Central Canvas Arena */}
            <div className="arena-central">
              <div className="arena-box">
                <div className="arena-header-indicator">
                  <div className={`turn-indicator ${!isPlayerTurn ? "enemy-turn" : ""}`}>
                    {turnIndicator}
                  </div>
                </div>

                <canvas ref={canvasRef} className="arena-canvas" />

                {/* Combo Popup */}
                {combo > 1 && (
                  <div className="combo-counter">
                    <div className="combo-count">{combo}×</div>
                    <div className="combo-label">COMBO</div>
                  </div>
                )}

                {/* Float result of QTE */}
                {timingResultVisible && (
                  <div className={`timing-result result-${timingResultState}`}>
                    {timingResultState === "critical" ? "★ CRITICAL ★" : timingResultState.toUpperCase() + "!"}
                  </div>
                )}

                {/* TIMING QTE OVERLAY */}
                {timingActiveState && (
                  <div className="timing-bar-overlay" ref={timingOverlayRef} onClick={resolveTimingBar}>
                    <div className="timing-bar-title">LOCK TIMING TO ATTACK</div>
                    <div className="timing-bar-container">
                      <div className="timing-zone timing-miss-left"></div>
                      <div className="timing-zone timing-ok-left"></div>
                      <div className="timing-zone timing-perfect-left"></div>
                      <div className="timing-zone timing-perfect"></div>
                      <div className="timing-zone timing-perfect-right"></div>
                      <div className="timing-zone timing-ok-right"></div>
                      <div className="timing-zone timing-miss-right"></div>
                      <div className="timing-cursor" ref={timingCursorRef}></div>
                    </div>
                    <div className="timing-hint">
                      Press <span className="key-hint">SPACE</span> or <span className="key-hint">CLICK</span> to strike!
                    </div>
                  </div>
                )}

                {/* DODGE QTE OVERLAY */}
                {dodgeActiveState && (
                  <div className="dodge-overlay" ref={dodgeOverlayRef}>
                    <div className="dodge-warning"><FontAwesomeIcon icon={faTriangleExclamation} style={{ marginRight: "8px" }} /> INCOMING PROJECTILE!</div>
                    <div className="dodge-prompt">
                      <span>PRESS</span>
                      <span className="dodge-key">{dodgeKeyPrompt}</span>
                      <span>TO DODGE!</span>
                    </div>
                    <div className="dodge-timer-bar">
                      <div className="dodge-timer-fill" ref={dodgeTimerFillRef}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Console logs & Action Bar */}
              <div className="battle-controls">
                <div className="ability-bar">
                  {abilities.map((ability, index) => (
                    <button
                      key={index}
                      className="ability-btn"
                      disabled={!ability.canUse || !isPlayerTurn}
                      onClick={() => {
                        if (gameMode === 'pvp') {
                          sendAbility(index);
                        } else {
                          combatRef.current?.playerAction(index);
                        }
                      }}
                      title={ability.description}
                    >
                      <span className="ability-icon">{getAbilityIcon(ability.id)}</span>
                      <span>{ability.name}</span>
                      {ability.currentCooldown !== undefined && ability.currentCooldown > 0 && (
                        <span className="ability-cooldown">({ability.currentCooldown})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Opponent Sidebar */}
            <aside className="battle-sidebar opponent-sidebar">
              <div className="sidebar-portrait">
                {opponentFighter && <img src={opponentFighter.imageUrl} alt={opponentFighter.name} />}
              </div>
              <div className="sidebar-name">{opponentFighter?.name}</div>
              <div className="sidebar-hp-container">
                <div className="sidebar-hp-label">
                  <span>HP</span>
                  <span>{opponentHp} / {opponentMaxHp}</span>
                </div>
                <div className="sidebar-hp-bar">
                  <div 
                    className="sidebar-hp-fill opponent-hp" 
                    style={{ width: `${opponentMaxHp > 0 ? (opponentHp / opponentMaxHp) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="sidebar-pixel-count">
                <span>PIXELS:</span>
                <div className="pixel-count-bar">
                  <div 
                    className="pixel-count-fill" 
                    style={{ width: `${opponentMaxHp > 0 ? (opponentPixelsCount / opponentMaxHp) * 100 : 0}%` }}
                  ></div>
                </div>
                <span>{opponentPixelsCount}</span>
              </div>

              {/* Opponent Sidebar Combat Feed Terminal */}
              <div className="sidebar-terminal">
                <div className="terminal-header">
                  <span className="terminal-dot red"></span>
                  <span className="terminal-dot yellow"></span>
                  <span className="terminal-dot green"></span>
                  <span className="terminal-title">COMBAT FEED</span>
                </div>
                <div className="terminal-content" id="opponent-log-console">
                  {battleLogs
                    .filter(log => isOpponentLog(log.message, playerFighter?.name || "Player", opponentFighter?.name || "Opponent"))
                    .map((log, i) => (
                      <div className={`log-entry ${log.type}`} key={i}>
                        {log.message}
                      </div>
                    ))}
                </div>
              </div>

              <div className="sidebar-stats-mini">
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faBolt} style={{ marginRight: "4px" }} /> ATK:</span>
                  <span>
                    {opponentFighter ? (() => {
                      const { total, boost } = getBuffedStat(opponentFighter.stats.atk, 'atk', opponentBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{opponentFighter.stats.atk}</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "4px" }} /> DEF:</span>
                  <span>
                    {opponentFighter ? (() => {
                      const { total, boost } = getBuffedStat(opponentFighter.stats.def, 'def', opponentBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{opponentFighter.stats.def}</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faWind} style={{ marginRight: "4px" }} /> SPD:</span>
                  <span>
                    {opponentFighter ? (() => {
                      const { total, boost } = getBuffedStat(opponentFighter.stats.spd, 'spd', opponentBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{opponentFighter.stats.spd}</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
                <div className="mini-stat">
                  <span><FontAwesomeIcon icon={faCrosshairs} style={{ marginRight: "4px" }} /> CRT:</span>
                  <span>
                    {opponentFighter ? (() => {
                      const { total, boost } = getBuffedStat(opponentFighter.stats.crit, 'crit', opponentBuffs);
                      return (
                        <>
                          <span className="base-stat-val">{opponentFighter.stats.crit}%</span>
                          {boost > 0 && <span className="stat-boost-val green"> +{boost}%</span>}
                          {boost < 0 && <span className="stat-boost-val red"> {boost}%</span>}
                        </>
                      );
                    })() : '-'}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* Screen 4: RESULTS SCREEN */}
      {currentScreen === "results" && (
        <section className="screen active results-screen">
          <div className="results-container">
            <div className="results-banner">
              <h1 className={`results-banner-title ${winner === "player" ? "victory" : "defeat"}`}>
                {winner === "player" ? (
                  <>
                    <FontAwesomeIcon icon={faBurst} style={{ marginRight: "8px" }} /> PROTOCOL SUCCESS <FontAwesomeIcon icon={faBurst} style={{ marginLeft: "8px" }} />
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSkull} style={{ marginRight: "8px" }} /> CHARACTER TERMINATED <FontAwesomeIcon icon={faSkull} style={{ marginLeft: "8px" }} />
                  </>
                )}
              </h1>
              <p className="results-banner-sub">
                {winner === "player" 
                  ? `${playerFighter?.name} wiped out ${opponentFighter?.name}!` 
                  : `${opponentFighter?.name} destroyed ${playerFighter?.name}...`}
              </p>
            </div>

            <div className="results-stats-grid">
              <div className="result-stat-card">
                <div className="result-stat-label">TURNS RESOLVED</div>
                <div className="result-stat-value" style={{ color: "var(--accent-secondary)" }}>{turnsCount}</div>
              </div>
              <div className="result-stat-card">
                <div className="result-stat-label">MAX COMBO STREAK</div>
                <div className="result-stat-value" style={{ color: "var(--accent-gold)" }}>
                  <FontAwesomeIcon icon={faFire} style={{ marginRight: "6px" }} /> {maxComboCount}×
                </div>
              </div>
              <div className="result-stat-card">
                <div className="result-stat-label">PERFECT TIMINGS</div>
                <div className="result-stat-value" style={{ color: "var(--accent-green)" }}>
                  <FontAwesomeIcon icon={faStar} style={{ marginRight: "6px" }} /> {perfectsCount}
                </div>
              </div>
              <div className="result-stat-card">
                <div className="result-stat-label">DODGES EXECUTED</div>
                <div className="result-stat-value" style={{ color: "var(--accent-secondary)" }}>
                  <FontAwesomeIcon icon={faWind} style={{ marginRight: "6px" }} /> {dodgesCount}
                </div>
              </div>
              <div className="result-stat-card">
                <div className="result-stat-label">DAMAGE INFLICTED</div>
                <div className="result-stat-value" style={{ color: "var(--accent-primary)" }}>{damageDealtCount}</div>
              </div>
              <div className="result-stat-card">
                <div className="result-stat-label">DAMAGE TAKEN</div>
                <div className="result-stat-value" style={{ color: "var(--accent-red)" }}>{damageTakenCount}</div>
              </div>
            </div>

            {/* Scoreboard rankings */}
            <div className="leaderboard-panel">
              <h3 className="panel-title" style={{ marginBottom: "15px" }}>
                <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "8px" }} /> LOCAL SCOREBOARD
              </h3>
              {getLeaderboard().length > 0 ? (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>NORMIE CHARACTER</th>
                      <th>WINS</th>
                      <th>LOSSES</th>
                      <th>WIN RATIO</th>
                      <th>STREAK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getLeaderboard().map((entry, idx) => {
                      const ratio = entry.wins + entry.losses > 0 ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100) : 0;
                      return (
                        <tr key={idx}>
                          <td>
                            {idx === 0 ? (
                              <FontAwesomeIcon icon={faCrown} style={{ color: "var(--accent-gold)" }} />
                            ) : idx === 1 ? (
                              <FontAwesomeIcon icon={faMedal} style={{ color: "#c0c0c0" }} />
                            ) : idx === 2 ? (
                              <FontAwesomeIcon icon={faMedal} style={{ color: "#cd7f32" }} />
                            ) : (
                              `#${idx+1}`
                            )}
                          </td>
                          <td>Normie #{entry.id}</td>
                          <td className="leaderboard-wins">{entry.wins}</td>
                          <td className="leaderboard-losses">{entry.losses}</td>
                          <td>{ratio}%</td>
                          <td>
                            {entry.streak > 0 ? (
                              <>
                                <FontAwesomeIcon icon={faFire} style={{ color: "var(--accent-gold)", marginRight: "4px" }} /> {entry.streak}
                              </>
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="leaderboard-empty">No combat rankings recorded.</div>
              )}
            </div>

            <div className="results-actions">
              <button className="cyber-button primary" style={{ padding: "14px 28px" }} onClick={triggerRematch}>
                💥 INITIATE REMATCH
              </button>
              <button className="cyber-button" style={{ padding: "14px 28px" }} onClick={resetGame}>
                🎮 NEW COMBAT
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Screen 5: LEADERBOARD SCREEN */}
      {currentScreen === "leaderboard" && (
        <section className="screen active leaderboard-screen">
          <div className="results-container">
            <h1 className="center-title" style={{ textAlign: "center" }}>
              <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "10px" }} /> NORMIES CHAMPIONSHIP
            </h1>
            
            <div className="leaderboard-panel">
              <h3 className="panel-title" style={{ marginBottom: "15px" }}>LEADERBOARD STATS</h3>
              {leaderboardEntries.length > 0 ? (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>NORMIE CHARACTER</th>
                      <th>WINS</th>
                      <th>LOSSES</th>
                      <th>WIN RATIO</th>
                      <th>STREAK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardEntries.map((entry, idx) => {
                      const ratio = entry.wins + entry.losses > 0 ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100) : 0;
                      return (
                        <tr key={idx}>
                          <td>
                            {idx === 0 ? (
                              <FontAwesomeIcon icon={faCrown} style={{ color: "var(--accent-gold)" }} />
                            ) : idx === 1 ? (
                              <FontAwesomeIcon icon={faMedal} style={{ color: "#c0c0c0" }} />
                            ) : idx === 2 ? (
                              <FontAwesomeIcon icon={faMedal} style={{ color: "#cd7f32" }} />
                            ) : (
                              `#${idx+1}`
                            )}
                          </td>
                          <td>Normie #{entry.id}</td>
                          <td className="leaderboard-wins">{entry.wins}</td>
                          <td className="leaderboard-losses">{entry.losses}</td>
                          <td>{ratio}%</td>
                          <td>
                            {entry.streak > 0 ? (
                              <>
                                <FontAwesomeIcon icon={faFire} style={{ color: "var(--accent-gold)", marginRight: "4px" }} /> {entry.streak}
                              </>
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="leaderboard-empty">No rankings recorded. Start fighting to record scores!</div>
              )}
            </div>

            <div className="results-actions">
              <button className="cyber-button" onClick={() => setCurrentScreen("select")}>
                <FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "6px" }} /> RETURN TO COMMAND CONSOLE
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Help / Game Manual Modal */}
      {showHelpModal && (
        <div className="help-modal-backdrop" onClick={() => { setShowHelpModal(false); audio.playSelect(); }}>
          <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h2 className="help-modal-title">
                <span><FontAwesomeIcon icon={faGamepad} style={{ marginRight: "8px" }} /> NORMIES BATTLEGROUND: CORE SYSTEM MANUAL</span>
              </h2>
              <button className="help-modal-close" onClick={() => { setShowHelpModal(false); audio.playSelect(); }}>
                [ ESC ] CLOSE ×
              </button>
            </div>

            <div className="help-modal-body">
              <section className="help-section">
                <h3 className="help-section-title"><FontAwesomeIcon icon={faGamepad} style={{ marginRight: "6px" }} /> 1. GAME OVERVIEW</h3>
                <p className="help-section-p">
                  Welcome to <span className="help-highlight">Normies Battleground</span>, a high-stakes, skill-based cyberpunk combat simulator. Load standard Web3 characters or customizable fighters to battle. Under the hood, if remote APIs are offline, a seed-based deterministic rendering engine generates fully symmetrical pixel avatars procedurally.
                </p>
              </section>

              <section className="help-section">
                <h3 className="help-section-title"><FontAwesomeIcon icon={faHeart} style={{ marginRight: "6px" }} /> 2. 1:1 PIXEL-HP SYNCHRONIZATION</h3>
                <p className="help-section-p">
                  Fighters are literally made of their visual assets! A character's health points (HP) is bound <span className="help-highlight green">1:1</span> to the number of active canvas pixels.
                </p>
                <ul className="help-bullets">
                  <li className="help-bullet-item">
                    <span className="help-highlight pink">Damage:</span> When struck, pixels physically blast off the character's body at the exact combat impact coordinates. Taking 40 damage removes exactly 40 pixels.
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight green">Healing:</span> Recovering health (e.g. via <span className="help-highlight">Nine Lives</span> or <span className="help-highlight">Pixel Drain</span>) dynamically reconstructs and restores previously destroyed pixels back onto the character model.
                  </li>
                </ul>
              </section>

              <section className="help-section">
                <h3 className="help-section-title"><FontAwesomeIcon icon={faBurst} style={{ marginRight: "6px" }} /> 3. OFFENSIVE STRIKES (TIMING BAR)</h3>
                <p className="help-section-p">
                  Triggering any ability initiates a timing cursor sweep. Press <span className="help-key">SPACE</span>, <span className="help-key">ENTER</span>, or <span className="help-highlight">CLICK</span> to lock the cursor:
                </p>
                <div className="help-grid">
                  <div className="help-card">
                    <div className="help-card-title" style={{ color: '#ffffff', textShadow: '0 0 8px #fff' }}><FontAwesomeIcon icon={faStar} /> CRITICAL (White Center Line)</div>
                    <div className="help-card-desc">
                      Deals <span className="help-highlight pink">200% base damage</span> + 20% flat bonus, builds combo multiplier, and rewards <span className="help-highlight green">+1 Dodge Charge</span>.
                    </div>
                  </div>
                  <div className="help-card">
                    <div className="help-card-title" style={{ color: 'var(--accent-green)' }}><FontAwesomeIcon icon={faStar} /> PERFECT (Green Zone)</div>
                    <div className="help-card-desc">
                      Deals <span className="help-highlight green">150% base damage</span>, builds combo, and rewards <span className="help-highlight green">+1 Dodge Charge</span>.
                    </div>
                  </div>
                  <div className="help-card">
                    <div className="help-card-title" style={{ color: 'var(--accent-gold)' }}><FontAwesomeIcon icon={faShieldHalved} /> OK (Yellow Zone)</div>
                    <div className="help-card-desc">
                      Deals <span className="help-highlight gold">100% standard damage</span>. Does not grant Dodge Charges.
                    </div>
                  </div>
                  <div className="help-card">
                    <div className="help-card-title" style={{ color: 'var(--accent-red)' }}><FontAwesomeIcon icon={faWind} /> MISS (Red Outer Zones)</div>
                    <div className="help-card-desc">
                      Deals <span className="help-highlight pink">50% weak damage</span> and resets your active combo counter to zero.
                    </div>
                  </div>
                </div>
              </section>

              <section className="help-section">
                <h3 className="help-section-title"><FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: "6px" }} /> 4. DEFENSE & DODGE CHARGE ECONOMY</h3>
                <p className="help-section-p">
                  Dodging is high-risk, high-reward, and limited by charges (shown as ◆ diamonds in the player sidebar).
                </p>
                <ul className="help-bullets">
                  <li className="help-bullet-item">
                    <span className="help-highlight">Dodge Charges:</span> You start with <span className="help-highlight">1 charge</span> (max 3). Charges are gained by landing <span className="help-highlight green">Perfect/Critical</span> attacks.
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight pink">0.5s reaction QTE:</span> If you have charges, enemy attacks trigger a rapid <span className="help-highlight pink">500ms</span> QTE. Press the displayed random letter key (<span className="help-key">A</span>-<span className="help-key">Z</span>) before time runs out.
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight green">Perfect Dodge:</span> Take <span className="help-highlight green">0 damage</span> and immediately trigger an automatic <span className="help-highlight">Counter-Strike</span> dealing 50% ATK damage to the enemy.
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight pink">No Charges:</span> If you have 0 charges, you cannot dodge and will automatically receive full damage.
                  </li>
                </ul>
              </section>

              <section className="help-section">
                <h3 className="help-section-title"><FontAwesomeIcon icon={faBolt} style={{ marginRight: "6px" }} /> 5. FIGHTER CLASSES & SPECIAL ABILITIES</h3>
                <p className="help-section-p">
                  Each fighter class possesses standard stats and unique ultimate abilities, supplemented by special eye-based modifiers:
                </p>
                <div className="help-grid">
                  <div className="help-card">
                    <div className="help-card-title">HUMAN — RALLY CRY</div>
                    <div className="help-card-desc">Boosts ATK stat by 30% for 2 turns (cooldown: 4 turns).</div>
                  </div>
                  <div className="help-card">
                    <div className="help-card-title">CAT — NINE LIVES</div>
                    <div className="help-card-desc">Restores 25% of max HP and reconstructs missing pixels (cooldown: 5 turns).</div>
                  </div>
                  <div className="help-card">
                    <div className="help-card-title">ALIEN — COSMIC BLAST</div>
                    <div className="help-card-desc">Massive beam attack ignoring 50% of the defender's defense stat (cooldown: 4 turns).</div>
                  </div>
                  <div className="help-card">
                    <div className="help-card-title">AGENT — FIREWALL</div>
                    <div className="help-card-desc">Augments defense (DEF) by 50% for 3 turns (cooldown: 5 turns).</div>
                  </div>
                </div>
                <p className="help-section-p" style={{ marginTop: '8px' }}>
                  Fighters also inherit eye-based actions like <span className="help-highlight">Laser Beam</span>, <span className="help-highlight">Shield Bash</span>, <span className="help-highlight">Psychic Wave</span>, or <span className="help-highlight">Berserker Rage</span> based on their visual traits.
                </p>
              </section>

              <section className="help-section">
                <h3 className="help-section-title"><FontAwesomeIcon icon={faChartSimple} style={{ marginRight: "6px" }} /> 6. NORMIE STATS SYSTEM</h3>
                <p className="help-section-p">
                  Fighter stats are calculated deterministically from the visual traits of their Web3 metadata:
                </p>

                <h4 style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: "var(--accent-gold)", marginTop: "10px", textShadow: "0 0 5px rgba(251,191,36,0.3)" }}>A. Base Stats Formula</h4>
                <div className="manual-table-container">
                  <table className="manual-table">
                    <thead>
                      <tr>
                        <th>STAT</th>
                        <th>BASE</th>
                        <th>DESCRIPTION / SCALING SOURCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>HP (Health)</strong></td>
                        <td><code>Pixel Count</code></td>
                        <td>Bound 1:1 to active pixels count (e.g. 527 px = 527 HP)</td>
                      </tr>
                      <tr>
                        <td><strong>ATK (Attack)</strong></td>
                        <td><code>25</code></td>
                        <td>Boosted by Eyewear/Accessories, scaled by Type multiplier</td>
                      </tr>
                      <tr>
                        <td><strong>DEF (Defense)</strong></td>
                        <td><code>20</code></td>
                        <td>Boosted by Hair/Accessories/Eyewear, scaled by Type multiplier</td>
                      </tr>
                      <tr>
                        <td><strong>SPD (Speed)</strong></td>
                        <td><code>15</code></td>
                        <td>Boosted by Accessories, scaled by Type multiplier</td>
                      </tr>
                      <tr>
                        <td><strong>CRT (Critical)</strong></td>
                        <td><code>10%</code></td>
                        <td>Boosted by Expression/Accessories, scaled by Type (capped at 50%)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: "var(--accent-gold)", marginTop: "10px", textShadow: "0 0 5px rgba(251,191,36,0.3)" }}>B. Class Modifiers</h4>
                <div className="manual-table-container">
                  <table className="manual-table">
                    <thead>
                      <tr>
                        <th>TYPE</th>
                        <th>HP</th>
                        <th>ATK</th>
                        <th>DEF</th>
                        <th>SPD</th>
                        <th>CRIT</th>
                        <th>CLASS ULTIMATE ABILITY</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Human</strong></td>
                        <td>1.0x</td>
                        <td>1.0x</td>
                        <td>1.0x</td>
                        <td>1.0x</td>
                        <td>1.0x</td>
                        <td><strong>Rally Cry</strong> (+30% ATK for 2 turns)</td>
                      </tr>
                      <tr>
                        <td><strong>Cat</strong></td>
                        <td>0.85x</td>
                        <td>1.15x</td>
                        <td>0.9x</td>
                        <td>1.3x</td>
                        <td>1.2x</td>
                        <td><strong>Nine Lives</strong> (Heal 25% HP & restore pixels)</td>
                      </tr>
                      <tr>
                        <td><strong>Alien</strong></td>
                        <td>1.1x</td>
                        <td>1.2x</td>
                        <td>0.85x</td>
                        <td>0.9x</td>
                        <td>1.1x</td>
                        <td><strong>Cosmic Blast</strong> (ignores 50% enemy DEF)</td>
                      </tr>
                      <tr>
                        <td><strong>Agent</strong></td>
                        <td>1.2x</td>
                        <td>0.9x</td>
                        <td>1.3x</td>
                        <td>0.85x</td>
                        <td>0.9x</td>
                        <td><strong>Firewall</strong> (+50% DEF for 3 turns)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: "var(--accent-gold)", marginTop: "10px", textShadow: "0 0 5px rgba(251,191,36,0.3)" }}>C. Key Visual Trait Modifiers</h4>
                <div className="manual-table-container">
                  <table className="manual-table">
                    <thead>
                      <tr>
                        <th>TRAIT CATEGORY</th>
                        <th>TRAIT NAME</th>
                        <th>BONUS</th>
                        <th>COMBAT EFFECTS / PASSIVES</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Eyewear</td>
                        <td><code>VR Headset</code></td>
                        <td>+10 ATK</td>
                        <td>Gains **Laser Eyes** ability (Laser Beam)</td>
                      </tr>
                      <tr>
                        <td>Eyewear</td>
                        <td><code>Eye Patch</code></td>
                        <td>+9 ATK, +2 DEF</td>
                        <td>Gains **Berserker Rage** ability</td>
                      </tr>
                      <tr>
                        <td>Eyewear</td>
                        <td><code>Big Shades</code></td>
                        <td>+3 ATK, +8 DEF</td>
                        <td>Gains **Shield Bash** ability</td>
                      </tr>
                      <tr>
                        <td>Eyewear</td>
                        <td><code>3D Glasses</code></td>
                        <td>+7 ATK, +3 DEF</td>
                        <td>Gains **Psychic Wave** ability</td>
                      </tr>
                      <tr>
                        <td>Eyewear</td>
                        <td><code>Eye Mask</code></td>
                        <td>+4 ATK, +7 DEF</td>
                        <td>Gains **Shadow Strike** ability</td>
                      </tr>
                      <tr>
                        <td>Expression</td>
                        <td><code>Serious</code></td>
                        <td>+12% CRIT</td>
                        <td>Passive: **Focused**</td>
                      </tr>
                      <tr>
                        <td>Expression</td>
                        <td><code>Confident</code></td>
                        <td>+8% CRIT</td>
                        <td>Passive: **Bold** (+3% Dodge Chance)</td>
                      </tr>
                      <tr>
                        <td>Expression</td>
                        <td><code>Friendly</code></td>
                        <td>+10% Heal</td>
                        <td>Passive: **Supportive** (+2% Dodge Chance)</td>
                      </tr>
                      <tr>
                        <td>Accessory</td>
                        <td><code>Gold Chain</code></td>
                        <td>+2 HP, +5 ATK</td>
                        <td>Flat attribute boosts</td>
                      </tr>
                      <tr>
                        <td>Accessory</td>
                        <td><code>Silver Chain</code></td>
                        <td>+2 HP, +4 DEF</td>
                        <td>Flat attribute boosts</td>
                      </tr>
                      <tr>
                        <td>Accessory</td>
                        <td><code>Headband</code></td>
                        <td>+2 HP, +5 SPD</td>
                        <td>Flat attribute boosts</td>
                      </tr>
                      <tr>
                        <td>Hair Style</td>
                        <td><code>Mohawk</code></td>
                        <td>+8 DEF</td>
                        <td>Flat attribute boosts</td>
                      </tr>
                      <tr>
                        <td>Hair Style</td>
                        <td><code>Spiky Hair</code></td>
                        <td>+6 DEF</td>
                        <td>Flat attribute boosts</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: "var(--accent-gold)", marginTop: "10px", textShadow: "0 0 5px rgba(251,191,36,0.3)" }}>D. Level & Awakening Boosts</h4>
                <p className="help-section-p">
                  • <strong>Level Up:</strong> Each level above 1 grants a flat <strong>+5% boost</strong> to HP, ATK, DEF, and SPD stats.
                  <br />
                  • <strong>Awakening:</strong> Customized characters (edited on-chain) receive a special awakened pool of <strong>+15 HP</strong> and <strong>+3 ATK</strong>.
                </p>
              </section>

              <section className="help-section">
                <h3 className="help-section-title"><FontAwesomeIcon icon={faBookOpen} style={{ marginRight: "6px" }} /> 7. NEWBIE GUIDE: HOW TO FIGHT</h3>
                <p className="help-section-p">
                  Follow this cycle to dominate the combat simulator:
                </p>
                <ol className="help-bullets" style={{ listStyleType: 'decimal' }}>
                  <li className="help-bullet-item">
                    <span className="help-highlight">Setup:</span> Enter a Normie ID (0-9999) for Player and Opponent in the Select screen. Click <span className="help-highlight">COMMENCE PROTOCOL</span>.
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight green">Your Turn:</span> Select an ability from your action bar. A timing bar will sweep. Press <span className="help-key">SPACE</span> or <span className="help-highlight">CLICK</span> at the center to deal maximum damage.
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight pink">Earn Dodges:</span> Landing a <span className="help-highlight green">Perfect</span> or <span className="help-highlight">Critical</span> hit grants <span className="help-highlight green">+1 Dodge Charge</span>. You will need these to survive!
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight">Enemy Turn:</span> When the enemy strikes back, if you have Dodge Charges, press the random key shown (A-Z) within <span className="help-highlight pink">0.5 seconds</span>. Succeeding blocks all damage and fires an auto-counter laser!
                  </li>
                  <li className="help-bullet-item">
                    <span className="help-highlight gold">Win:</span> Blast all opponent pixels off the screen until their HP/Pixel count falls to zero!
                  </li>
                </ol>
              </section>
            </div>

            <div className="help-modal-footer">
              <button className="cyber-button primary" onClick={() => { setShowHelpModal(false); audio.playSelect(); }}>
                UNDERSTOOD, LOG ONTO COMMAND CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Gallery Modal */}
      {showAgentGallery && (
        <div className="help-modal-backdrop" onClick={() => { setShowAgentGallery(false); audio.playSelect(); }}>
          <div className="help-modal-content agent-gallery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h2 className="help-modal-title" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span><FontAwesomeIcon icon={faRobot} style={{ marginRight: "8px" }} /> ON-CHAIN AGENT REGISTRY</span>
              </h2>
              <button className="help-modal-close" onClick={() => { setShowAgentGallery(false); audio.playSelect(); }}>
                CLOSE ×
              </button>
            </div>

            <div className="help-modal-body">
              <p style={{ fontSize: "11px", marginBottom: "15px", color: "var(--text-secondary)" }}>
                Browsing all ERC-8004 bound Normie Agents. Pick one to challenge them to a pixel-level combat.
              </p>
              
              {galleryLoading ? (
                <div className="gallery-loader">
                  <div className="loading-core"></div>
                  <p>Querying Ponder indexer registry...</p>
                </div>
              ) : (
                <div className="agents-grid">
                  {galleryAgents.map((agent: any, idx: number) => (
                    <div key={idx} className="agent-gallery-card">
                      <div className="agent-avatar-container">
                        <img src={`https://api.normies.art/normie/${agent.tokenId}/image.svg`} alt={agent.name} />
                      </div>
                      <div className="agent-card-info">
                        <div className="agent-card-name" style={{ fontFamily: "var(--font-pixel)", fontSize: "6.5px" }}>{agent.name || `Agent #${agent.tokenId}`}</div>
                        <div className="agent-card-type" style={{ fontSize: "9px" }}>{agent.type} Agent</div>
                        <div className="agent-card-owner" style={{ fontFamily: "var(--font-pixel)", fontSize: "5px" }}>ID: #{agent.tokenId}</div>
                      </div>
                      <button 
                        className="cyber-button primary select-agent-btn"
                        onClick={() => selectAgentAsOpponent(parseInt(agent.tokenId))}
                      >
                        CHALLENGE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
