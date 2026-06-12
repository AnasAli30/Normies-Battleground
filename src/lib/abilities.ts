import { Fighter, Ability, AbilityExecutionResult } from './types';

export const ABILITY_DEFS: Record<string, Omit<Ability, 'currentCooldown'>> = {
  basicAttack: {
    id: 'basicAttack',
    name: 'Pixel Strike',
    icon: '⚔️',
    type: 'damage',
    cooldown: 0,
    description: 'A basic attack using your pixels',
    calculate: (attacker, defender) => {
      const baseDmg = attacker.stats.atk;
      const defense = defender.stats.def * 0.3;
      const dmg = Math.max(5, Math.floor(baseDmg - defense + (Math.random() * 8 - 4)));
      return { damage: dmg, isCrit: false };
    },
  },

  humanUlt: {
    id: 'humanUlt',
    name: 'Rally Cry',
    icon: '📢',
    type: 'buff',
    cooldown: 4,
    description: 'Boost ATK by 30% for 2 turns',
    calculate: () => {
      return { buff: { stat: 'atk', multiplier: 1.3, turns: 2 }, damage: 0 };
    },
  },
  catUlt: {
    id: 'catUlt',
    name: 'Nine Lives',
    icon: '🐱',
    type: 'heal',
    cooldown: 5,
    description: 'Restore 25% of max HP',
    calculate: (attacker) => {
      const heal = Math.floor(attacker.stats.maxHp * 0.25);
      return { heal, damage: 0 };
    },
  },
  alienUlt: {
    id: 'alienUlt',
    name: 'Cosmic Blast',
    icon: '👽',
    type: 'damage',
    cooldown: 4,
    description: 'Massive energy blast ignoring 50% defense',
    calculate: (attacker, defender) => {
      const baseDmg = attacker.stats.atk * 2.2;
      const defense = defender.stats.def * 0.15;
      const dmg = Math.max(10, Math.floor(baseDmg - defense));
      return { damage: dmg, isCrit: false };
    },
  },
  agentUlt: {
    id: 'agentUlt',
    name: 'Firewall',
    icon: '🛡️',
    type: 'buff',
    cooldown: 5,
    description: 'Increase DEF by 50% for 3 turns',
    calculate: () => {
      return { buff: { stat: 'def', multiplier: 1.5, turns: 3 }, damage: 0 };
    },
  },

  laserBeam: {
    id: 'laserBeam',
    name: 'Laser Beam',
    icon: '🔴',
    type: 'damage',
    cooldown: 3,
    description: 'VR-powered laser blast',
    calculate: (attacker) => {
      const dmg = Math.floor(attacker.stats.atk * 1.8);
      return { damage: dmg, isCrit: false };
    },
  },
  shieldBash: {
    id: 'shieldBash',
    name: 'Shield Bash',
    icon: '🛡️',
    type: 'damage',
    cooldown: 2,
    description: 'Defensive strike using Big Shades',
    calculate: (attacker) => {
      const dmg = Math.floor(attacker.stats.def * 1.2);
      return { damage: dmg, isCrit: false };
    },
  },
  psychicWave: {
    id: 'psychicWave',
    name: 'Psychic Wave',
    icon: '🌀',
    type: 'damage',
    cooldown: 3,
    description: '3D Glasses distort reality',
    calculate: (attacker) => {
      const dmg = Math.floor(attacker.stats.atk * 1.5 + attacker.stats.spd * 0.5);
      return { damage: dmg, isCrit: false };
    },
  },
  shadowStrike: {
    id: 'shadowStrike',
    name: 'Shadow Strike',
    icon: '🗡️',
    type: 'damage',
    cooldown: 2,
    description: 'Strike from the shadows with guaranteed crit',
    calculate: (attacker) => {
      const dmg = Math.floor(attacker.stats.atk * 1.6);
      return { damage: dmg, isCrit: true };
    },
  },
  berserkerRage: {
    id: 'berserkerRage',
    name: 'Berserker Rage',
    icon: '💢',
    type: 'damage',
    cooldown: 3,
    description: 'Sacrifice HP for massive damage',
    calculate: (attacker) => {
      const selfDmg = Math.floor(attacker.stats.maxHp * 0.1);
      const dmg = Math.floor(attacker.stats.atk * 2.5);
      return { damage: dmg, selfDamage: selfDmg, isCrit: false };
    },
  },
  arcaneBlast: {
    id: 'arcaneBlast',
    name: 'Arcane Blast',
    icon: '✨',
    type: 'damage',
    cooldown: 2,
    description: 'Focused magical attack',
    calculate: (attacker) => {
      const dmg = Math.floor(attacker.stats.atk * 1.4);
      return { damage: dmg, isCrit: false };
    },
  },
  quickShot: {
    id: 'quickShot',
    name: 'Quick Shot',
    icon: '🎯',
    type: 'damage',
    cooldown: 1,
    description: 'Fast ranged attack',
    calculate: (attacker) => {
      const dmg = Math.floor(attacker.stats.atk * 1.1 + attacker.stats.spd * 0.3);
      return { damage: dmg, isCrit: false };
    },
  },
  pixelDrain: {
    id: 'pixelDrain',
    name: 'Pixel Drain',
    icon: '🧲',
    type: 'drain',
    cooldown: 3,
    description: 'Steal pixels from opponent to heal',
    calculate: (attacker) => {
      const dmg = Math.floor(attacker.stats.atk * 1.0);
      const heal = Math.floor(dmg * 0.5);
      return { damage: dmg, heal, isCrit: false };
    },
  },
};

/**
 * Get the ability set for a fighter based on their traits
 */
export function getAbilitiesForFighter(fighter: Fighter): Ability[] {
  const abilities: Ability[] = [];

  // 1. Basic attack (always available)
  abilities.push({ ...ABILITY_DEFS.basicAttack, currentCooldown: 0 } as Ability);

  // 2. Eye-based ability
  const eyeAbilityMap: Record<string, string> = {
    'laser': 'laserBeam',
    'shield': 'shieldBash',
    'psychic': 'psychicWave',
    'stealth': 'shadowStrike',
    'berserker': 'berserkerRage',
    'magic': 'arcaneBlast',
    'ranged': 'quickShot',
    'balanced': 'pixelDrain',
    'melee': 'pixelDrain',
  };

  const eyeAbility = eyeAbilityMap[fighter.abilityType] || 'quickShot';
  abilities.push({ ...ABILITY_DEFS[eyeAbility], currentCooldown: 0 } as Ability);

  // 3. Type ultimate
  const typeUltMap: Record<string, string> = {
    'Human': 'humanUlt',
    'Cat': 'catUlt',
    'Alien': 'alienUlt',
    'Agent': 'agentUlt',
  };

  const typeUlt = typeUltMap[fighter.type] || 'humanUlt';
  abilities.push({ ...ABILITY_DEFS[typeUlt], currentCooldown: 0 } as Ability);

  // 4. Pixel Drain (bonus ability if customized)
  if (fighter.customized && !abilities.find(a => a.id === 'pixelDrain')) {
    abilities.push({ ...ABILITY_DEFS.pixelDrain, currentCooldown: 0 } as Ability);
  }

  return abilities;
}

/**
 * Execute an ability
 */
export function executeAbility(ability: Ability, attacker: Fighter, defender: Fighter): AbilityExecutionResult {
  const result = ability.calculate(attacker, defender);

  // Check for critical hit
  if (result.damage > 0 && !result.isCrit) {
    const critRoll = Math.random() * 100;
    if (critRoll < attacker.stats.crit) {
      result.damage = Math.floor(result.damage * 1.5);
      result.isCrit = true;
    }
  }

  return {
    abilityId: ability.id,
    abilityName: ability.name,
    abilityIcon: ability.icon,
    type: ability.type,
    ...result,
  };
}
