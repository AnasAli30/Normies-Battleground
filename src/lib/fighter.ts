import { Fighter, Stats } from './types';

const TYPE_MODIFIERS: Record<string, { hp: number; atk: number; def: number; spd: number; crit: number; class: string }> = {
  'Human':  { hp: 1.0,  atk: 1.0,  def: 1.0,  spd: 1.0,  crit: 1.0, class: 'Balanced' },
  'Cat':    { hp: 0.85, atk: 1.15, def: 0.9,  spd: 1.3,  crit: 1.2, class: 'Assassin' },
  'Alien':  { hp: 1.1,  atk: 1.2,  def: 0.85, spd: 0.9,  crit: 1.1, class: 'Warlock' },
  'Agent':  { hp: 1.2,  atk: 0.9,  def: 1.3,  spd: 0.85, crit: 0.9, class: 'Tank' },
};

const EYES_MODIFIERS: Record<string, { atk: number; def: number; abilityType: string }> = {
  'Classic Shades':     { atk: 5,  def: 3,  abilityType: 'ranged' },
  'Big Shades':         { atk: 3,  def: 8,  abilityType: 'shield' },
  'Regular Shades':     { atk: 4,  def: 4,  abilityType: 'ranged' },
  'Small Shades':       { atk: 6,  def: 2,  abilityType: 'ranged' },
  'Horned Rim Glasses': { atk: 2,  def: 6,  abilityType: 'magic' },
  'Nerd Glasses':       { atk: 8,  def: 1,  abilityType: 'magic' },
  'VR Headset':         { atk: 10, def: 0,  abilityType: 'laser' },
  '3D Glasses':         { atk: 7,  def: 3,  abilityType: 'psychic' },
  'Eye Mask':           { atk: 4,  def: 7,  abilityType: 'stealth' },
  'Eye Patch':          { atk: 9,  def: 2,  abilityType: 'berserker' },
  'Round Glasses':      { atk: 3,  def: 5,  abilityType: 'magic' },
  'Square Glasses':     { atk: 5,  def: 5,  abilityType: 'balanced' },
  'Aviators':           { atk: 6,  def: 4,  abilityType: 'ranged' },
  'No Glasses':         { atk: 4,  def: 4,  abilityType: 'melee' },
};

const HAIR_DEF_BONUS: Record<string, number> = {
  'Mohawk': 8, 'Spiky Hair': 6, 'Wild Hair': 4, 'Crazy Hair': 5,
  'Top Hat': 7, 'Fedora': 5, 'Bald': 2, 'Ponytail': 3,
  'Short Hair': 3, 'Long Hair': 4, 'Curly Hair': 4, 'Straight Hair': 3,
  'Wavy Hair': 3, 'Messy Hair': 2, 'Braided Hair': 5, 'Pigtails': 3,
  'Afro': 6, 'Buzz Cut': 2, 'Frumpy Hair': 1, 'Stringy Hair': 1,
  'Peak Spike': 7, 'Half Shaved': 4, 'Knitted Cap': 5,
};

const EXPRESSION_PASSIVES: Record<string, { name: string; effect: string; critBonus: number; healBonus: number; dodgeBonus: number }> = {
  'Neutral':       { name: 'Stoic',       effect: 'balanced', critBonus: 0, healBonus: 0, dodgeBonus: 5 },
  'Slight Smile':  { name: 'Charming',    effect: 'heal',     critBonus: 0, healBonus: 8, dodgeBonus: 0 },
  'Serious':       { name: 'Focused',     effect: 'crit',     critBonus: 12, healBonus: 0, dodgeBonus: 0 },
  'Content':       { name: 'Zen',         effect: 'defense',  critBonus: 0, healBonus: 5, dodgeBonus: 5 },
  'Peaceful':      { name: 'Pacifist',    effect: 'heal',     critBonus: 0, healBonus: 12, dodgeBonus: 0 },
  'Confident':     { name: 'Bold',        effect: 'crit',     critBonus: 8, healBonus: 0, dodgeBonus: 3 },
  'Friendly':      { name: 'Supportive',  effect: 'heal',     critBonus: 0, healBonus: 10, dodgeBonus: 2 },
};

const ACCESSORY_BONUSES: Record<string, Partial<Stats>> = {
  'Top Hat': { hp: 5, def: 3 }, 'Fedora': { hp: 3, atk: 3 },
  'Cowboy Hat': { hp: 4, atk: 2 }, 'Beanie': { hp: 6, def: 2 },
  'Cap': { hp: 3, spd: 3 }, 'Cap Forward': { hp: 3, spd: 4 },
  'Bandana': { hp: 2, atk: 4 }, 'Headband': { hp: 2, spd: 5 },
  'Do-Rag': { hp: 3, def: 3 }, 'Hoodie': { hp: 8, def: 1 },
  'Earring': { hp: 1, crit: 5 }, 'Gold Chain': { hp: 2, atk: 5 },
  'Silver Chain': { hp: 2, def: 4 }, 'Bow Tie': { hp: 4, def: 2 },
  'No Accessories': { hp: 0, def: 0 },
};

function getTraitValue(traits: any[], traitType: string): string | null {
  const t = traits.find(t => t.trait_type === traitType);
  return t ? t.value : null;
}

export function createFighter(data: any): Fighter {
  const { id, traits, canvasInfo, pixelCount, agentInfo, owner, isGhost, agentPersona } = data;

  const type = getTraitValue(traits, 'Type') || 'Human';
  const gender = getTraitValue(traits, 'Gender') || 'Male';
  const age = getTraitValue(traits, 'Age') || 'Young';
  const hairStyle = getTraitValue(traits, 'Hair Style') || 'Short Hair';
  const facialFeature = getTraitValue(traits, 'Facial Feature') || 'Clean Shaven';
  const eyes = getTraitValue(traits, 'Eyes') || 'No Glasses';
  const expression = getTraitValue(traits, 'Expression') || 'Neutral';
  const accessory = getTraitValue(traits, 'Accessory') || 'No Accessories';

  const level = canvasInfo?.level || 1;
  const actionPoints = canvasInfo?.actionPoints || 0;
  const customized = canvasInfo?.customized || false;

  // Base stats from pixel count
  const baseHp = Math.floor(pixelCount * 0.8) + 50;  // 50-850 range
  const baseAtk = 25;
  const baseDef = 20;
  const baseSpd = 15;
  const baseCrit = 10;

  // Apply type modifier
  const typeMod = TYPE_MODIFIERS[type] || TYPE_MODIFIERS['Human'];
  let hp = Math.floor(baseHp * typeMod.hp);
  let atk = Math.floor(baseAtk * typeMod.atk);
  let def = Math.floor(baseDef * typeMod.def);
  let spd = Math.floor(baseSpd * typeMod.spd);
  let crit = Math.floor(baseCrit * typeMod.crit);

  // Eyes modifier
  const eyesMod = EYES_MODIFIERS[eyes] || EYES_MODIFIERS['No Glasses'];
  atk += eyesMod.atk;
  def += eyesMod.def;

  // Hair defense bonus
  const hairDef = HAIR_DEF_BONUS[hairStyle] || 3;
  def += hairDef;

  // Expression passive
  const expressionPassive = EXPRESSION_PASSIVES[expression] || EXPRESSION_PASSIVES['Neutral'];
  crit += expressionPassive.critBonus;

  // Accessory bonus
  const accBonus = ACCESSORY_BONUSES[accessory] || { hp: 0, def: 0 };
  hp += accBonus.hp || 0;
  atk += accBonus.atk || 0;
  def += accBonus.def || 0;
  spd += accBonus.spd || 0;
  crit += accBonus.crit || 0;

  // Level multiplier (each level adds 5% to all stats)
  const levelMult = 1 + (level - 1) * 0.05;
  hp = Math.floor(hp * levelMult);
  atk = Math.floor(atk * levelMult);
  def = Math.floor(def * levelMult);
  spd = Math.floor(spd * levelMult);

  // Customized bonus
  if (customized) {
    hp += 15;
    atk += 3;
  }

  // Cap crit at 50%
  crit = Math.min(crit, 50);

  // HP must always match the exact pixelCount (the number of pixels in the fighter's image)
  hp = pixelCount;

  return {
    id,
    name: `Normie #${id}`,
    type,
    class: typeMod.class,
    gender,
    age,
    traits: { hairStyle, facialFeature, eyes, expression, accessory },
    level,
    actionPoints,
    customized,
    pixelCount,
    agentInfo,
    stats: { hp, maxHp: hp, atk, def, spd, crit },
    imageUrl: data.imageUrl,
    pngUrl: data.pngUrl,
    abilityType: eyesMod.abilityType,
    passive: expressionPassive,
    statusEffects: [],
    isAlive: true,
    owner,
    isGhost,
    agentPersona,
  };
}

export function getStatPercent(statName: keyof Stats, value: number): number {
  const maxValues: Record<keyof Stats, number> = {
    hp: 900,
    maxHp: 900,
    atk: 60,
    def: 55,
    spd: 30,
    crit: 50,
  };
  return Math.min(100, Math.floor((value / (maxValues[statName] || 100)) * 100));
}
