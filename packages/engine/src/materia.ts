import type { Card } from '@pokermanic/contracts';

export type MateriaKind = 'fire' | 'ice' | 'lightning' | 'rank' | 'hand' | 'suits' | 'fortune';
export interface MateriaGem { id: number; kind: MateriaKind; xp: number }
export interface CardMagic { chips: number; mult: number; frozen: boolean }
export interface MateriaState {
  collection: MateriaGem[];
  equipped: (number | null)[];
  nextId: number;
  mp: number;
  castThisRound: number[];
  effects: Record<string, CardMagic>;
  offers: MateriaKind[];
  discoveries: number;
}
export const MATERIA_KINDS: Readonly<Record<MateriaKind, { name: string; color: string; maxLevel: number }>> = {
  fire: { name: 'Fire', color: 'green', maxLevel: 3 },
  ice: { name: 'Ice', color: 'green', maxLevel: 4 },
  lightning: { name: 'Lightning', color: 'green', maxLevel: 3 },
  rank: { name: 'Rank', color: 'blue', maxLevel: 3 },
  hand: { name: 'Hand', color: 'blue', maxLevel: 3 },
  suits: { name: 'Suits', color: 'blue', maxLevel: 3 },
  fortune: { name: 'Fortune', color: 'purple', maxLevel: 5 },
};
export const MAX_MP = 50;
export const XP_LEVELS = [0, 20, 100, 350]; // 20 XP: first-run level 2
export function materiaLevel(gem: Readonly<MateriaGem>): number {
  const max = MATERIA_KINDS[gem.kind].maxLevel;
  return Math.min(max, 1 + XP_LEVELS.slice(1).filter(threshold => gem.xp >= threshold).length);
}
export function materiaKey(card: Pick<Card, 'rank' | 'suit'>): string {
  return `${card.suit}:${card.rank}`;
}
export function createMateriaState(slots = 1): MateriaState {
  return { collection: [], equipped: Array(slots).fill(null), nextId: 1, mp: MAX_MP,
    castThisRound: [], effects: {}, offers: [], discoveries: 0 };
}
export function reconcileMateriaSlots(state: Readonly<MateriaState>, slots: number): MateriaState {
  return { ...state, equipped: [...state.equipped, ...Array(Math.max(0, slots - state.equipped.length)).fill(null)].slice(0, slots) };
}
export function equipMateria(state: Readonly<MateriaState>, id: number, slot: number): MateriaState {
  if (!Number.isInteger(slot) || slot < 0 || slot >= state.equipped.length) throw new RangeError('Materia slot is locked.');
  if (!state.collection.some(gem => gem.id === id)) throw new Error('Materia not owned.');
  const equipped = state.equipped.map(value => value === id ? null : value);
  equipped[slot] = id;
  return { ...state, equipped };
}
export function unequipMateria(state: Readonly<MateriaState>, slot: number): MateriaState {
  if (slot < 0 || slot >= state.equipped.length) throw new RangeError('Invalid slot.');
  return { ...state, equipped: state.equipped.map((id, i) => i === slot ? null : id) };
}
export function completeMateriaRound(state: Readonly<MateriaState>, round: number, linksUnlocked: boolean, random: () => number = Math.random): MateriaState {
  const equippedIds = new Set(state.equipped.filter((id): id is number => id !== null));
  const collection = state.collection.map(g => equippedIds.has(g.id) ? { ...g, xp: g.xp + 20 } : g);
  const pool: MateriaKind[] = linksUnlocked ? ['fire','fire','ice','ice','lightning','rank','rank','hand','suits','fortune'] : ['fire','fire','ice','ice','lightning'];
  const fortune = collection.find(g => g.kind === 'fortune' && equippedIds.has(g.id));
  const chance = state.discoveries === 0 ? (round === 1 ? .65 : round === 2 ? .9 : 1) : .35;
  const offers: MateriaKind[] = [];
  if (random() < chance) {
    for (let i = 0; i < 3; i++) {
      const weighted = fortune ? [...pool, ...Array(materiaLevel(fortune)).fill('lightning' as MateriaKind)] : pool;
      offers.push(weighted[Math.floor(random() * weighted.length)]!);
    }
  }
  return { ...state, collection, offers };
}
export function claimMateria(state: Readonly<MateriaState>, kind: MateriaKind): MateriaState {
  if (!state.offers.includes(kind)) throw new Error('Materia was not offered.');
  return { ...state, collection: [...state.collection, { id: state.nextId, kind, xp: 0 }],
    nextId: state.nextId + 1, discoveries: state.discoveries + 1, offers: [] };
}
export function newMateriaRound(state: Readonly<MateriaState>): MateriaState {
  return { ...state, mp: MAX_MP, castThisRound: [], effects: {}, offers: [] };
}
export function fireValue(tier: number): number { return [10,100,1000][tier - 1] ?? 0; }
export function lightningValue(tier: number): number { return [1,3,10][tier - 1] ?? 0; }
export function spellCost(kind: 'fire'|'ice'|'lightning', level: number, tier: number): number {
  if (tier > level || tier < 1) throw new RangeError('Spell not yet learned.');
  const base = kind === 'fire' ? [10,20,40] : kind === 'lightning' ? [20,40,80] : [15,30,50,70];
  return Math.max(1, Math.ceil((base[tier-1] ?? 10) / 2 ** (level-tier)));
}
export function castMateria(state: Readonly<MateriaState>, hand: readonly Card[], id: number, tier: number, targetIndex: number, linkedPairs: readonly number[] = [], visibleOrder?: readonly number[]): MateriaState {
  if (targetIndex < 0 || targetIndex >= hand.length || !Number.isInteger(targetIndex)) throw new RangeError('Choose a card in hand.');
  const slot = state.equipped.indexOf(id);
  const gem = state.collection.find(g => g.id === id);
  if (slot < 0 || !gem || !['fire','ice','lightning'].includes(gem.kind)) throw new Error('Equip a castable Materia first.');
  if (state.castThisRound.includes(id)) throw new Error('This Materia has already been cast this round.');
  const kind = gem.kind as 'fire'|'ice'|'lightning';
  const level = materiaLevel(gem);
  const cost = spellCost(kind, level, tier);
  if (state.mp < cost) throw new Error('Not enough MP.');
  const effects = Object.fromEntries(Object.entries(state.effects).map(([key,value])=>[key,{...value}])) as Record<string,CardMagic>;
  const key = materiaKey(hand[targetIndex]!);
  const existing = effects[key] ?? { chips: 0, mult: 0, frozen: false };
  // A linked blue Materia expands the target without replacing the selected card.
  const pair = Math.floor(slot / 2);
  const partnerSlot = slot % 2 === 0 ? slot + 1 : slot - 1;
  const support = linkedPairs.includes(pair)
    ? state.collection.find(g => g.id === state.equipped[partnerSlot]) : undefined;
  const selected = hand[targetIndex]!;
  const targetIndices = new Set([targetIndex]);
  if (support?.kind === 'rank') {
    const ranks = [...new Set(hand.map(card => card.rank))].filter(rank => rank !== selected.rank);
    const rankCount = [0,0,2,5][materiaLevel(support)] ?? 0;
    const affected = new Set([selected.rank,...ranks.slice(0,rankCount)]);
    hand.forEach((card,i) => { if (affected.has(card.rank)) targetIndices.add(i); });
  }
  if (support?.kind === 'suits') {
    const suits = [...new Set(hand.map(card => card.suit))].filter(suit => suit !== selected.suit);
    const affected = new Set([selected.suit,...suits.slice(0,materiaLevel(support)-1)]);
    hand.forEach((card,i) => { if (affected.has(card.suit)) targetIndices.add(i); });
  }
  if (kind === 'fire' || kind === 'lightning') for (const i of targetIndices) {
    const affectedKey = materiaKey(hand[i]!);
    const current = effects[affectedKey] ?? { chips:0,mult:0,frozen:false };
    effects[affectedKey] = kind === 'fire'
      ? { ...current, chips:current.chips + fireValue(tier) }
      : { ...current, mult:current.mult + lightningValue(tier) };
  }
  if (kind === 'ice') {
    effects[key] = { ...existing, frozen: true };
    // Ice copies the target's magical bonuses, not its frozen status, to neighbors.
    const order = visibleOrder && visibleOrder.length === hand.length
      && new Set(visibleOrder).size === hand.length ? visibleOrder : hand.map((_,i)=>i);
    const position = order.indexOf(targetIndex);
    const targets = tier === 1 ? [] : tier === 2 ? [order[position+1]] : tier === 3
      ? [order[position-1],order[position+1]] : order.filter(i=>i!==targetIndex);
    for (const i of targets) if (i !== undefined && i >= 0 && i < hand.length) {
      const recipient = materiaKey(hand[i]!);
      const old = effects[recipient] ?? { chips:0,mult:0,frozen:false };
      effects[recipient] = { ...old, chips:old.chips + existing.chips, mult:old.mult + existing.mult };
    }
  }
  return { ...state, effects, mp: state.mp-cost, castThisRound: [...state.castThisRound,id] };
}
export function breakMateriaFreeze(state: Readonly<MateriaState>, card: Card): MateriaState {
  const key = materiaKey(card);
  if (!state.effects[key]?.frozen) throw new Error('This card is not frozen.');
  const iceLevel2 = state.equipped.some(id => {
    const gem = state.collection.find(g => g.id === id);
    return gem?.kind === 'ice' && materiaLevel(gem) >= 2;
  });
  if (!iceLevel2) throw new Error('Break Freeze requires Ice Level 2.');
  return { ...state, effects: { ...state.effects, [key]: { ...state.effects[key]!, frozen: false } } };
}
export function applyMateriaScore<T extends { score: number; baseChips: number; multiplier: number; scoringCardIndices: number[] }>(
  option: T, committed: readonly Card[], state: Readonly<MateriaState>
): T {
  let chips = 0, mult = 0;
  for (const index of new Set(option.scoringCardIndices)) {
    const effect = state.effects[materiaKey(committed[index]!)] ;
    chips += effect?.chips ?? 0;
    mult += effect?.mult ?? 0;
  }
  if (!chips && !mult) return option;
  const score = Math.round(option.score + chips * option.multiplier + (option.baseChips + chips) * mult);
  if (!Number.isSafeInteger(score)) throw new RangeError('Materia score exceeds safe integer precision.');
  return { ...option, score };
}
