import type { CardSuit } from '@pokermanic/contracts';

// Every row is one indivisible palette. Order: spades, hearts, clubs, diamonds.
export const SUIT_PALETTES = [
  { id: 'vibrant', name: 'Vibrant', colors: { spades: '#1D3557', hearts: '#E63946', clubs: '#2A9D8F', diamonds: '#FFB703' } },
  { id: 'electric', name: 'Electric', colors: { spades: '#00F5D4', hearts: '#F15BB5', clubs: '#AACC00', diamonds: '#FF6B35' } },
  { id: 'jewel', name: 'Jewel Tones', colors: { spades: '#005F73', hearts: '#9B2226', clubs: '#0A9396', diamonds: '#EE9B00' } },
  { id: 'earth', name: 'Earth Tones', colors: { spades: '#3D405B', hearts: '#E07A5F', clubs: '#81B29A', diamonds: '#F2CC8F' } },
  { id: 'playful', name: 'Playful', colors: { spades: '#1982C4', hearts: '#FF595E', clubs: '#6A4C93', diamonds: '#FFCA3A' } },
  { id: 'pastel', name: 'Pastel', colors: { spades: '#D8BBFF', hearts: '#FFD6A5', clubs: '#B8E0D2', diamonds: '#333533' } },
  { id: 'accessible', name: 'Accessible Bright', colors: { spades: '#56B4E9', hearts: '#E69F00', clubs: '#009E73', diamonds: '#CC79A7' } },
  { id: 'modern', name: 'Modern', colors: { spades: '#14213D', hearts: '#FCA311', clubs: '#2EC4B6', diamonds: '#E5E5E5' } },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  colors: Record<CardSuit, string>;
}>;

export type SuitPaletteId = (typeof SUIT_PALETTES)[number]['id'];

export function isSuitPaletteId(value: unknown): value is SuitPaletteId {
  return typeof value === 'string' && SUIT_PALETTES.some(palette => palette.id === value);
}

export function suitPaletteColors(id: SuitPaletteId | null): Partial<Record<CardSuit, string>> {
  return SUIT_PALETTES.find(palette => palette.id === id)?.colors ?? {};
}
