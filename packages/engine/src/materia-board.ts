import type { PermanentProgress } from './permanent.js';
export const MATERIA_SLOT_COSTS = [10,25,40,60,85] as const;
export const MATERIA_LINK_COSTS = [20,45,90] as const;
export type MateriaBoardPurchase = 'slot' | 'link_0' | 'link_1' | 'link_2';
export function materiaBoardPrice(profile: Readonly<PermanentProgress>, purchase: MateriaBoardPurchase): number | null {
  const slots = profile.materiaSlots ?? 1;
  const links = profile.materiaLinks ?? [];
  if (purchase === 'slot') {
    if (slots >= 6 || profile.transcends < (slots === 1 ? 1 : slots === 2 ? 2 : slots === 3 ? 4 : 5)) return null;
    return MATERIA_SLOT_COSTS[slots - 1] ?? null;
  }
  const pair = Number(purchase.slice(-1));
  if (links.includes(pair) || slots < (pair + 1) * 2 || profile.transcends < (pair === 0 ? 2 : 4)) return null;
  return MATERIA_LINK_COSTS[pair] ?? null;
}
export function buyMateriaBoardUpgrade(profile: Readonly<PermanentProgress>, purchase: MateriaBoardPurchase): PermanentProgress {
  const cost = materiaBoardPrice(profile,purchase);
  if (cost === null) throw new Error('Materia Board upgrade is locked or already purchased.');
  if (profile.prestigeChips < cost) throw new Error('Not enough Prestige Chips.');
  return purchase === 'slot'
    ? { ...profile, prestigeChips: profile.prestigeChips-cost, materiaSlots: (profile.materiaSlots ?? 1)+1 }
    : { ...profile, prestigeChips: profile.prestigeChips-cost, materiaLinks: [...(profile.materiaLinks ?? []), Number(purchase.slice(-1))] };
}
