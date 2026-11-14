import { describe, expect, it } from 'vitest';
import {
  createMateriaState, completeMateriaRound, claimMateria, equipMateria,
  materiaLevel, castMateria, applyMateriaScore, newMateriaRound,
  materiaBoardPrice, buyMateriaBoardUpgrade, createPermanentProgress,
  breakMateriaFreeze, spellCost, releasePlayedMagic,
} from '../src/index.js';
import type { Card } from '@pokermanic/contracts';
const hand: Card[] = [
  { rank: 'K', suit: 'hearts' }, { rank: 'K', suit: 'spades' },
  { rank: '9', suit: 'clubs' }, { rank: '7', suit: 'diamonds' },
];
describe('Materia discovery and spellcasting', () => {
  it('is likely to offer a starter on round one and guarantees one by round three', () => {
    const empty = createMateriaState();
    expect(completeMateriaRound(empty,1,false,()=>0.5).offers).toHaveLength(3);
    expect(completeMateriaRound(empty,3,false,()=>0.99).offers).toHaveLength(3);
    expect(completeMateriaRound(empty,1,false,()=>0.99).offers).toHaveLength(0);
  });
  it('gains XP, offers higher spells and cheaper earlier spells', () => {
    const found = claimMateria({ ...createMateriaState(), offers:['fire'] },'fire');
    const equipped = equipMateria(found,1,0);
    const won = completeMateriaRound(equipped,2,false,()=>0.99);
    expect(materiaLevel(won.collection[0]!)).toBe(2);
    expect(spellCost('fire',2,1)).toBe(5);
    expect(spellCost('fire',2,2)).toBe(20);
  });
  it('allows repeated casts while MP is available and changes only scoring cards', () => {
    const state = equipMateria(claimMateria({ ...createMateriaState(),offers:['fire'] },'fire'),1,0);
    const cast = castMateria(state,hand,1,1,0);
    expect(cast.mp).toBe(40);
    const twice = castMateria(cast,hand,1,1,0);
    expect(twice.mp).toBe(30);
    expect(twice.effects['hearts:K']?.chips).toBe(20);
    expect(twice.castThisRound).toEqual([1,1]);
    let drained = twice;
    while (drained.mp >= 10) drained = castMateria(drained,hand,1,1,0);
    expect(drained.mp).toBe(0);
    expect(() => castMateria(drained,hand,1,1,0)).toThrow('Not enough MP.');
    const base = { score:5, baseChips:5, multiplier:1, scoringCardIndices:[0] };
    expect(applyMateriaScore(base,hand,cast).score).toBe(15);
    expect(applyMateriaScore({ ...base, scoringCardIndices:[2] },hand,cast).score).toBe(5);
    expect(releasePlayedMagic(cast,[hand[0]!]).effects['hearts:K']).toBeUndefined();
    const refreshed = newMateriaRound(cast);
    expect(refreshed.effects).toEqual({});
    expect(refreshed.castThisRound).toEqual([]);
  });
  it('preserves selected target when linked to Rank', () => {
    let state = createMateriaState(2);
    state = claimMateria({ ...state,offers:['fire'] },'fire');
    state = claimMateria({ ...state,offers:['rank'] },'rank');
    state = equipMateria(equipMateria(state,1,0),2,1);
    const cast = castMateria(state,hand,1,1,0,[0]);
    expect(cast.effects['hearts:K']?.chips).toBe(10);
    expect(cast.effects['spades:K']?.chips).toBe(10);
    expect(cast.effects['clubs:9']).toBeUndefined();
  });
  it('Ice retains and propagates Fire bonuses and supports breaking at level two', () => {
    let state = createMateriaState(2);
    state = claimMateria({ ...state,offers:['fire'] },'fire');
    state = claimMateria({ ...state,offers:['ice'] },'ice');
    state = equipMateria(equipMateria(state,1,0),2,1);
    state = castMateria(state,hand,1,1,0);
    state = { ...state,collection:state.collection.map(g=>g.kind==='ice'?{...g,xp:20}:g) };
    state = castMateria(state,hand,2,2,0);
    expect(state.effects['hearts:K']?.frozen).toBe(true);
    expect(state.effects['spades:K']?.chips).toBe(10);
    expect(releasePlayedMagic(state,[hand[1]!]).effects['spades:K']?.chips).toBe(10);
    expect(breakMateriaFreeze(state,hand[0]!).effects['hearts:K']?.frozen).toBe(false);
  });
});
describe('Permanent Materia Board', () => {
  it('requires prestige milestones and allows slot or link purchases independently', () => {
    let profile = { ...createPermanentProgress(),prestigeChips:100,transcends:1 };
    expect(materiaBoardPrice(profile,'slot')).toBe(10);
    profile = buyMateriaBoardUpgrade(profile,'slot');
    expect(profile.materiaSlots).toBe(2);
    expect(materiaBoardPrice(profile,'link_0')).toBeNull();
    profile = { ...profile,transcends:2 };
    expect(materiaBoardPrice(profile,'slot')).toBe(25);
    expect(materiaBoardPrice(profile,'link_0')).toBe(20);
    profile = buyMateriaBoardUpgrade(profile,'link_0');
    expect(profile.materiaLinks).toEqual([0]);
    expect(materiaBoardPrice(profile,'slot')).toBe(25);
  });
});
