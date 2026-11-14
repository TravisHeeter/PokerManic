import { MATERIA_KINDS, XP_LEVELS, materiaLevel } from './materia.js';
import type { MateriaGem, MateriaKind } from './materia.js';

/** Total XP required to reach a level. Existing level 1–4 thresholds stay unchanged. */
export function materiaXpThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('Invalid materia level.');
  if (level <= XP_LEVELS.length) return XP_LEVELS[level - 1]!;
  // Beyond level 4, increase the XP gap by 200 per level.
  let total = XP_LEVELS[XP_LEVELS.length - 1]!;
  let gap = total - XP_LEVELS[XP_LEVELS.length - 2]!;
  for (let next = XP_LEVELS.length + 1; next <= level; next++) {
    gap += 200;
    total += gap;
  }
  return total;
}

export interface MateriaProgress {
  level: number;
  maxLevel: number;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpToNextLevel: number;
  progress: number;
  isMaxLevel: boolean;
  unlockedSpellTiers: number[];
  nextUnlock: string | null;
}

const SPELL_NAMES: Partial<Record<MateriaKind, readonly string[]>> = {
  fire: ['Fire', 'Fira', 'Firaga'],
  ice: ['Blizzard', 'Blizzara', 'Blizzaga', 'Blizzaja'],
  lightning: ['Thunder', 'Thundara', 'Thundaga'],
};

/** Pure projection for the UI, shop, and future save versions. Does not mutate a gem. */
export function materiaProgress(gem: Readonly<MateriaGem>): MateriaProgress {
  const maxLevel = MATERIA_KINDS[gem.kind].maxLevel;
  const xp = Math.max(0, Number.isFinite(gem.xp) ? Math.floor(gem.xp) : 0);
  const level = materiaLevel({ ...gem, xp });
  const isMaxLevel = level >= maxLevel;
  const levelStartXp = materiaXpThreshold(level);
  const nextLevelXp = isMaxLevel ? null : materiaXpThreshold(level + 1);
  const xpIntoLevel = Math.max(0, xp - levelStartXp);
  const xpToNextLevel = nextLevelXp === null ? 0 : Math.max(0, nextLevelXp - xp);
  const progress = nextLevelXp === null ? 1 : Math.min(1, xpIntoLevel / (nextLevelXp - levelStartXp));
  const names = SPELL_NAMES[gem.kind];
  const unlockedSpellTiers = names ? names.map((_, index) => index + 1).filter(tier => tier <= level) : [];
  const nextUnlock = names && !isMaxLevel ? (names[level] ?? null) : null;
  return { level, maxLevel, xp, levelStartXp, nextLevelXp, xpIntoLevel, xpToNextLevel,
    progress, isMaxLevel, unlockedSpellTiers, nextUnlock };
}
