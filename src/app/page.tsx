"use client";

import React, { useState, useEffect, useRef } from "react";
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
  getApiHealth,
} from "../lib/api";
import { createFighter } from "../lib/fighter";
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
  onRoomCreated,
  createRoom,
  joinRoom,
  removeAllPvpListeners,
  fetchPvpLeaderboard,
} from "../lib/socket";
import type { PvpFighterData, PvpMatchFoundPayload, PvpBattleEndPayload } from "../lib/shared-types";
import type { GameScreen } from "../lib/game-ui";

import { AppHeader } from "@/components/layout/AppHeader";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/components/ui/useToast";
import { LoadingScreen } from "@/components/screens/LoadingScreen";
import { ModeSelectScreen } from "@/components/screens/ModeSelectScreen";
import { FighterSelectScreen } from "@/components/screens/FighterSelectScreen";
import { PvpLobbyScreen } from "@/components/screens/PvpLobbyScreen";
import { BattleScreen } from "@/components/screens/BattleScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { LeaderboardScreen } from "@/components/screens/LeaderboardScreen";
import { HelpModal } from "@/components/modals/HelpModal";
import { AgentGalleryModal } from "@/components/modals/AgentGalleryModal";

export default function Home() {
  const { toasts, error: toastError, dismiss: dismissToast } = useToast();
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("loading");
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
  const [arenaShake, setArenaShake] = useState(false);
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
  const [pvpLobbyMode, setPvpLobbyMode] = useState<'find' | 'create' | 'join'>('find');
  const [pvpRoomCode, setPvpRoomCode] = useState<string | null>(null);
  const [pvpJoinCode, setPvpJoinCode] = useState('');
  const [pvpWaitingForOpponent, setPvpWaitingForOpponent] = useState(false);

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

  // Help modal keyboard escape handler â€” HelpModal handles its own escape

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
    if (!idStr.trim() || isNaN(id) || id < 0 || id > 9999) {
      toastError("Enter a valid Normie ID between 0 and 9999.");
      return;
    }

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
      toastError(`Could not load Normie #${id}. Check the ID or try again.`);
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
    if (!walletAddress.trim()) {
      toastError("Enter a wallet address to scan.");
      return;
    }
    setWalletLoading(true);
    setWalletSearched(true);
    try {
      const ids = await getHolderNormies(walletAddress.trim());
      setWalletTokens(ids);
      audio.playSelect();
      if (ids.length === 0) {
        toastError("No Normies found for this wallet.");
      }
    } catch (e) {
      console.error(e);
      setWalletTokens([]);
      toastError("Wallet scan failed. Check the address and try again.");
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

  // â”€â”€ PVP Mode Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Helper to convert Fighter to PvpFighterData
  const buildPvpFighterData = (): PvpFighterData | null => {
    if (!playerFighter) return null;
    return {
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
  };

  // Helper to setup all PVP listeners (shared across find/create/join)
  const setupPvpListeners = () => {
    const socket = connectToServer();
    removeAllPvpListeners();
    setPvpOpponentDisconnected(false);

    onQueueJoined(() => {
      console.log('Joined PVP queue');
    });

    onQueueStatus((data) => {
      setPvpQueueCount(data.playersInQueue);
    });

    onRoomCreated((data) => {
      setPvpRoomCode(data.roomCode);
      setPvpWaitingForOpponent(true);
      console.log('Room created with code:', data.roomCode);
    });

    onMatchFound((data: PvpMatchFoundPayload) => {
      console.log('Match found!', data);
      setPvpSearching(false);
      setPvpWaitingForOpponent(false);
      setPvpRoomCode(null);
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
            if (data.lastAction!.damage >= 30 || data.lastAction!.isCrit) {
              setArenaShake(true);
              setTimeout(() => setArenaShake(false), 300);
            }
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
        setTimeout(reconcilePixels, 800);
      }
    });

    onTimingPrompt(() => {
      setTimingActiveState(true);
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
      console.error("PVP Error:", data.message);
      toastError(data.message || "PVP connection error. Please try again.");
    });

    return socket;
  };

  // Mode 1: Find Match (random queue)
  const startPvpSearch = () => {
    const pvpFighter = buildPvpFighterData();
    if (!pvpFighter) {
      toastError("Load your fighter before searching for a match.");
      return;
    }
    setupPvpListeners();
    setPvpSearching(true);
    joinQueue(pvpFighter);
  };

  // Mode 2: Create Room (private)
  const startPvpCreateRoom = () => {
    const pvpFighter = buildPvpFighterData();
    if (!pvpFighter) {
      toastError("Load your fighter before creating a room.");
      return;
    }
    setupPvpListeners();
    setPvpWaitingForOpponent(true);
    createRoom(pvpFighter);
  };

  // Mode 3: Join Room (private)
  const startPvpJoinRoom = () => {
    const pvpFighter = buildPvpFighterData();
    if (!pvpFighter) {
      toastError("Load your fighter before joining a room.");
      return;
    }
    if (!pvpJoinCode.trim()) {
      toastError("Enter a room code to join.");
      return;
    }
    setupPvpListeners();
    setPvpSearching(true);
    joinRoom(pvpFighter, pvpJoinCode.trim());
  };

  const cancelPvpSearch = () => {
    leaveQueue();
    setPvpSearching(false);
    setPvpWaitingForOpponent(false);
    setPvpRoomCode(null);
    setPvpJoinCode('');
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
    // In PVP mode, skip local CombatEngine setup â€” state comes from server
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
          if (damage >= 30 || isCrit) {
            setArenaShake(true);
            setTimeout(() => setArenaShake(false), 300);
          }
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

      engine.onLog({ message: `âš”ï¸ ${playerFighter.name} vs ${opponentFighter.name} â€” FIGHT!`, type: "system", turn: 0 });
      engine.onLog({ message: `ðŸŽ¯ Perfect timing boosts attack strength! Earn Dodge charges!`, type: "system", turn: 0 });
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
    setPvpWaitingForOpponent(false);
    setPvpRoomCode(null);
    setPvpJoinCode('');
    setPvpLobbyMode('find');
    setCurrentScreen("mode-select");
    audio.playSelect();
  };


  const handleAbilityClick = (index: number) => {
    if (gameMode === "pvp") {
      sendAbility(index);
    } else {
      combatRef.current?.playerAction(index);
    }
  };

  const openHelp = () => {
    setShowHelpModal(true);
    audio.playSelect();
  };

  const closeHelp = () => {
    setShowHelpModal(false);
    audio.playSelect();
  };

  return (
    <div className="app-container">
      <AppHeader
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpenHelp={openHelp}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {currentScreen === "loading" && <LoadingScreen />}

      {currentScreen === "mode-select" && (
        <ModeSelectScreen
          onSelectPve={() => {
            setGameMode("pve");
            setCurrentScreen("select");
            audio.playSelect();
          }}
          onSelectPvp={() => {
            setGameMode("pvp");
            setCurrentScreen("pvp-lobby");
            audio.playSelect();
          }}
        />
      )}

      {currentScreen === "pvp-lobby" && (
        <PvpLobbyScreen
          playerId={playerId}
          playerFighter={playerFighter}
          playerLoading={playerLoading}
          pvpLobbyMode={pvpLobbyMode}
          pvpSearching={pvpSearching}
          pvpWaitingForOpponent={pvpWaitingForOpponent}
          pvpQueueCount={pvpQueueCount}
          pvpRoomCode={pvpRoomCode}
          pvpJoinCode={pvpJoinCode}
          onPlayerIdChange={setPlayerId}
          onLoadPlayer={() => loadFighter(playerId, "player")}
          onRandomPlayer={() => {
            const randomId = Math.floor(Math.random() * 10000);
            setPlayerId(randomId.toString());
            loadFighter(randomId.toString(), "player");
          }}
          onLobbyModeChange={(mode) => {
            setPvpLobbyMode(mode);
            audio.playSelect();
          }}
          onFindMatch={startPvpSearch}
          onCreateRoom={startPvpCreateRoom}
          onJoinRoom={startPvpJoinRoom}
          onJoinCodeChange={setPvpJoinCode}
          onCancelSearch={cancelPvpSearch}
          onCopyRoomCode={() => {
            if (pvpRoomCode) {
              navigator.clipboard.writeText(pvpRoomCode);
              audio.playSelect();
            }
          }}
          onBack={() => {
            setGameMode("pve");
            setCurrentScreen("mode-select");
            audio.playSelect();
          }}
        />
      )}

      {currentScreen === "select" && (
        <FighterSelectScreen
          playerId={playerId}
          opponentId={opponentId}
          playerFighter={playerFighter}
          opponentFighter={opponentFighter}
          playerLoading={playerLoading}
          opponentLoading={opponentLoading}
          playerTab={playerTab}
          opponentTab={opponentTab}
          playerVersions={playerVersions}
          opponentVersions={opponentVersions}
          playerDiff={playerDiff}
          opponentDiff={opponentDiff}
          walletAddress={walletAddress}
          walletTokens={walletTokens}
          walletLoading={walletLoading}
          walletSearched={walletSearched}
          isApiOnline={isApiOnline}
          totalAgents={totalAgents}
          globalStats={globalStats}
          canvasStatus={canvasStatus}
          onBack={() => {
            setCurrentScreen("mode-select");
            audio.playSelect();
          }}
          onPlayerIdChange={setPlayerId}
          onOpponentIdChange={setOpponentId}
          onLoadPlayer={() => loadFighter(playerId, "player")}
          onLoadOpponent={() => loadFighter(opponentId, "opponent")}
          onPlayerTabChange={setPlayerTab}
          onOpponentTabChange={setOpponentTab}
          onWalletAddressChange={setWalletAddress}
          onWalletSearch={handleWalletSearch}
          onWalletTokenSelect={(tokenId) => {
            setPlayerId(tokenId.toString());
            loadFighter(tokenId.toString(), "player");
          }}
          onRandomOpponent={loadRandomOpponent}
          onSummonGhost={summonGhostOpponent}
          onOpenAgentGallery={openAgentGallery}
          onStartBattle={startBattle}
          onOpenLeaderboard={openLeaderboard}
          onOpenHelp={openHelp}
        />
      )}

      {currentScreen === "battle" && (
        <BattleScreen
          canvasRef={canvasRef}
          playerFighter={playerFighter}
          opponentFighter={opponentFighter}
          playerHp={playerHp}
          playerMaxHp={playerMaxHp}
          opponentHp={opponentHp}
          opponentMaxHp={opponentMaxHp}
          playerPixelsCount={playerPixelsCount}
          opponentPixelsCount={opponentPixelsCount}
          playerDodgeCharges={playerDodgeCharges}
          maxDodgeCharges={maxDodgeCharges}
          combo={combo}
          turnIndicator={turnIndicator}
          isPlayerTurn={isPlayerTurn}
          battleLogs={battleLogs}
          abilities={abilities}
          playerBuffs={playerBuffs}
          opponentBuffs={opponentBuffs}
          arenaShake={arenaShake}
          timingActiveState={timingActiveState}
          timingResultVisible={timingResultVisible}
          timingResultState={timingResultState}
          dodgeActiveState={dodgeActiveState}
          dodgeKeyPrompt={dodgeKeyPrompt}
          timingOverlayRef={timingOverlayRef}
          timingCursorRef={timingCursorRef}
          dodgeTimerFillRef={dodgeTimerFillRef}
          onResolveTiming={resolveTimingBar}
          onDodgePress={endDodgeQTE}
          onAbilityClick={handleAbilityClick}
        />
      )}

      {currentScreen === "results" && (
        <ResultsScreen
          winner={winner}
          playerFighter={playerFighter}
          opponentFighter={opponentFighter}
          turnsCount={turnsCount}
          maxComboCount={maxComboCount}
          perfectsCount={perfectsCount}
          dodgesCount={dodgesCount}
          damageDealtCount={damageDealtCount}
          damageTakenCount={damageTakenCount}
          leaderboard={getLeaderboard()}
          onRematch={triggerRematch}
          onNewCombat={resetGame}
        />
      )}

      {currentScreen === "leaderboard" && (
        <LeaderboardScreen
          entries={leaderboardEntries}
          onPlayAgain={() => {
            setCurrentScreen("select");
            audio.playSelect();
          }}
          onModeSelect={() => {
            setCurrentScreen("mode-select");
            audio.playSelect();
          }}
        />
      )}

      <HelpModal open={showHelpModal} onClose={closeHelp} />

      <AgentGalleryModal
        open={showAgentGallery}
        loading={galleryLoading}
        agents={galleryAgents}
        onClose={() => {
          setShowAgentGallery(false);
          audio.playSelect();
        }}
        onSelectAgent={selectAgentAsOpponent}
      />
    </div>
  );
}
