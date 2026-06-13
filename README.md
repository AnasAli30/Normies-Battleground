# Normies Battleground ⚔️ Skill-Based Combat

Welcome to **Normies Battleground**, a pixel-combat arena built in **Next.js 16 + Node.js (Socket.io) + TypeScript**. In this game, Normies pixel characters battle in real-time against AI or real players online, utilizing active timing bars, high-speed dodging QTEs, and direct pixel-destruction canvas animations.

---

## 🎮 Core Game Mechanics

### 🩺 1. 1:1 HP & Pixel Synchronization
Fighters are made of active pixels. A fighter's health (HP) is bound **1:1** to the number of active pixels in their Normies.
- **Direct Combat Damage**: Taking damage physically blasts pixels off the character's body at the combat impact coordinates. Taking 50 damage removes exactly 50 pixels from the canvas.
- **Pixel Reconstruction (Healing)**: Healing abilities (such as *Cat Ultimate: Nine Lives* or *Pixel Drain*) dynamically reconstruct and restore previously destroyed pixels back onto the character's body.
- **Universal Reconciliation Engine**: In PVP, to prevent desync during network latency or complex dodge animations, an authoritative client-side reconciler forces the canvas to mirror the server's exact pixel count after every combat sequence.

### ⚔️ 2. Offensive Timing Strikes (QTE)
When you trigger an attack, a timing cursor sweeps across a QTE bar. Hitting **SPACE**, **ENTER**, or **CLICKING** locks the cursor:
- **★ CRITICAL ★ (White Center Line)**: Deals **200% base damage** + 20% flat bonus, builds combo multiplier, and awards **+1 Dodge Energy**.
- **⭐ PERFECT (Green Zone)**: Deals **150% base damage**, builds combo multiplier, and awards **+1 Dodge Energy**.
- **🛡️ OK (Yellow Zone)**: Deals **100% standard damage**. Does not build combo or award Dodge Energy.
- **💨 MISS (Red Outer Zones)**: Deals **50% weak damage** and resets your active combo counter to zero.

### 💨 3. Dodge Charge Economy & Counter-Strikes
Dodging is a limited skill-based resource, represented as ◆ diamonds in the player sidebar.
- **Energy consumption**: Attempting a dodge consumes **1 Dodge Energy** (starts at 1 charge, maximum 3).
- **0.5-Second QTE Prompt**: If you have energy, an enemy attack triggers a rapid **500ms (0.5 second)** random letter prompt (A-Z) on your screen.
- **Counter-Strike**: Pressing the correct letter key in time results in a **Perfect Dodge** (0 damage taken) and triggers a **Counter-Strike** (a fast laser projectile dealing 50% of your ATK stat back to the enemy).
- **Automatic Hits**: If you have **0 Dodge Energy**, you cannot attempt to dodge and will take full damage from enemy strikes automatically.

### 🔥 4. Combo Multiplier
Chaining successive Perfect or Critical timing strikes builds your combo multiplier (up to 1.3x damage). Getting hit or scoring a timing miss resets the combo to zero.

---

## 🌐 Real-Time PVP Multiplayer

Take your Normie online and battle real opponents in the **PVP Arena Lobby**!

### Matchmaking Modes
1. **Find Random Match**: Enters the global matchmaking queue. The server pairs you with another player instantly based on queue status.
2. **Create Private Room**: Generates a secure, 6-character shortcode (e.g. `X8K2M9`). Share this code with a friend.
3. **Join Private Room**: Enter a friend's room code to bypass the queue and instantly connect to a 1v1 match.

### Authoritative Server Architecture
- **State Management**: The Node.js server calculates all damage, dodge frames, and ability cooldowns to prevent client-side cheating or tampering.
- **Randomness Sync**: Critical hit chances and pixel impact coordinates are seeded by the server so both players see the identical pixel destruction animations at the same time.
- **ELO Leaderboard**: Winning PVP matches increases your ranking. The global leaderboard is persistently stored via **MongoDB**.

---

## 🎭 Fighter Classes & Abilities

Fighters loaded into the console inherit stats and traits depending on their ID:

### 1. Classes & Ultimates
*   **Human** (Ultimate: *Rally Cry*): Boosts ATK stat by 30% for 2 turns (cooldown: 4 turns).
*   **Cat** (Ultimate: *Nine Lives*): Restores 25% of max HP and reconstructs missing pixels (cooldown: 5 turns).
*   **Alien** (Ultimate: *Cosmic Blast*): Massive beam attack ignoring 50% of defender's defense (cooldown: 4 turns).
*   **Agent** (Ultimate: *Firewall*): Boosts DEF stat by 50% for 3 turns (cooldown: 5 turns).

### 2. Eye-Based Trait Abilities
Fighters inherit a signature sub-ability based on their eye modifications:
*   *Laser Eyes* -> **Laser Beam**: Deals 1.8x ATK damage (cooldown: 3 turns).
*   *Shield Eyes* -> **Shield Bash**: Deals 1.2x DEF damage (cooldown: 2 turns).
*   *Psychic Eyes* -> **Psychic Wave**: Deals 1.5x ATK + 0.5x SPD damage (cooldown: 3 turns).
*   *Stealth Eyes* -> **Shadow Strike**: Guarantees a critical hit dealing 1.6x ATK damage (cooldown: 2 turns).
*   *Berserker Eyes* -> **Berserker Rage**: Sacrifices 10% max HP for 2.5x ATK damage (cooldown: 3 turns).
*   *Balanced/Melee Eyes* -> **Pixel Drain**: Steals pixels from the opponent (deals 1.0x ATK damage and heals for 50% of damage dealt) (cooldown: 3 turns).

---

## 📊 Fighter Stats System & Generation

Fighter stats are calculated deterministically based on the character's visual metadata traits.

### 1. Base Stats
| Stat | Base Value | Description / Scaling |
| :--- | :--- | :--- |
| **HP (Health)** | `Pixel Count` | Bounded **1:1** to the character's active pixel count (e.g., 527 px = 527 HP). |
| **ATK (Attack)** | `25` | Boosted by Eyewear/Accessories, scaled by Type multiplier. |
| **DEF (Defense)** | `20` | Boosted by Hair/Accessories/Eyewear, scaled by Type multiplier. |
| **SPD (Speed)** | `15` | Boosted by Accessories, scaled by Type multiplier. |
| **CRT (Critical)** | `10%` | Boosted by Expression/Accessories, scaled by Type multiplier. Capped at 50%. |

### 2. Class Modifiers (By Character Type)
| Class / Type | HP Mod | ATK Mod | DEF Mod | SPD Mod | CRIT Mod | Archetype | Unique Ultimate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Human** | `1.0x` | `1.0x` | `1.0x` | `1.0x` | `1.0x` | Balanced | **Rally Cry** (+30% ATK for 2 turns) |
| **Cat** | `0.85x` | `1.15x` | `0.9x` | `1.3x` | `1.2x` | Assassin | **Nine Lives** (Heal 25% HP & restore pixels) |
| **Alien** | `1.1x` | `1.2x` | `0.85x` | `0.9x` | `1.1x` | Warlock | **Cosmic Blast** (Massive beam ignores 50% DEF) |
| **Agent** | `1.2x` | `0.9x` | `1.3x` | `0.85x` | `0.9x` | Tank | **Firewall** (+50% DEF for 3 turns) |

### 3. Visual Trait Stat Additions (Key Modifiers)
| Category | Trait Name | Stat Bonus | Gained Ability / Passive Effect |
| :--- | :--- | :--- | :--- |
| **Eyewear** | `VR Headset` | `+10 ATK, +0 DEF` | Laser Eyes (Laser Beam) |
| **Eyewear** | `Eye Patch` | `+9 ATK, +2 DEF` | Berserker Rage |
| **Eyewear** | `Big Shades` | `+3 ATK, +8 DEF` | Shield Bash |
| **Eyewear** | `3D Glasses` | `+7 ATK, +3 DEF` | Psychic Wave |
| **Eyewear** | `Eye Mask` | `+4 ATK, +7 DEF` | Shadow Strike |
| **Expression**| `Serious` | `+12% CRIT` | Passive: **Focused** |
| **Expression**| `Confident` | `+8% CRIT` | Passive: **Bold** (+3% Dodge Chance) |
| **Expression**| `Friendly` | `+10% Heal` | Passive: **Supportive** (+2% Dodge Chance) |
| **Accessory** | `Gold Chain` | `+2 HP, +5 ATK` | Flat stats addition |
| **Accessory** | `Silver Chain` | `+2 HP, +4 DEF` | Flat stats addition |
| **Accessory** | `Headband` | `+2 HP, +5 SPD` | Flat stats addition |
| **Hair Style**| `Mohawk` | `+8 DEF` | Flat stats addition |
| **Hair Style**| `Spiky Hair` | `+6 DEF` | Flat stats addition |

### 4. Level & awakening Boosts
- **Level Up**: Each level above 1 (retrieved from `Level` on-chain attribute) grants a flat **+5% boost** to HP, ATK, DEF, and SPD.
- **Awakening**: Custom edited characters (where `Customized` is true) receive a special awakened bonus of **+15 HP** and **+3 ATK**.

### Stats Summary in Gameplay
*   **HP**: Determines how many pixels your character has before being terminated.
*   **ATK**: Dictates baseline damage of attacks (mitigated by 30% of target's DEF).
*   **DEF**: Dampens raw incoming damage from attacks.
*   **SPD**: The fighter with the higher SPD stat takes the very first turn of the combat.
*   **CRT**: Baseline chance to score random double-damage critical strikes.

---

## 🕹️ How to Play: Step-by-Step

Follow this cycle to dominate the combat simulator:

1.  **Select Game Mode**: Choose between single-player **PVE** (against random fighters/AI) or multiplayer **PVP** (against real humans online).
2.  **Select Fighters**: Enter a Normie character ID (0-9999) to load from the blockchain, or click the 🎲 random button.
3.  **Take Your Turn**: Select one of the three actions on your bottom action bar.
4.  **Lock the Timing Bar**: A timing cursor will sweep across a QTE bar. Press **SPACE**, **ENTER**, or **CLICK** when it is in the middle white/green zone to trigger a **Critical/Perfect** strike.
5.  **Accumulate Dodge Charges**: Striking with Perfect or Critical timing awards you **+1 Dodge Charge** (displayed as ◆ diamonds in your sidebar).
6.  **Defend & Counter-Attack**: On the enemy's turn, if they attack and you have Dodge Charges, press the displayed keyboard key (A-Z) within **0.5 seconds**. Succeeding avoids all damage and fires a laser Counter-Strike.
7.  **Wreak Havoc**: Win by blasting all opponent pixels off the screen!

---

## ⌨️ Controls Cheat Sheet
- **Offensive Strikes**: Press `SPACE`, `ENTER`, or `LEFT CLICK` to stop the cursor sweep.
- **Defensive Dodges**: Press the corresponding displayed keyboard letter (`A` to `Z`) within `0.5 seconds` to dodge.
- **Mute Sound**: Toggle header audio controls.
- **Dismiss Manual**: Press `ESC` or click the modal backdrop.

---

## 💻 Tech Stack & Architecture
- **Frontend**: Next.js 16 (App Router, Client-side Canvas loops).
- **Backend**: Node.js + Express + Socket.io (Authoritative server combat engine).
- **Database**: MongoDB (ELO Leaderboard, Match History).
- **Language**: TypeScript (Strict type checks, shared interfaces between client/server).
- **Styling**: Vanilla CSS (Cyberpunk neon theme, glassmorphism layout panels).
- **Audio**: Web Audio API (Procedural synthesizer sound effects).
- **State Sync**: Universal Reconciliation Engine (Ensures 1:1 pixel/HP sync across high-latency connections).
- **Resilience**: Seed-based deterministic fallback engine. If the remote API is offline, the client procedurally generates unique, symmetrical pixel characters and traits based on the loaded ID.

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install dependencies for both frontend and backend:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Running Development Servers
You will need to run both the Next.js frontend and the Node.js PVP server.

Terminal 1 (Backend Server):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend Next.js):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to play!

### 3. Production Build
Build and optimize the application:
```bash
npm run build
```
Launch the compiled production bundle:
```bash
npm run start
```
