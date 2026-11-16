<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { GAME_SAVE_STORAGE_KEY, formatGameSave, parseGameSave } from '@pokermanic/contracts';
import type { GameSaveV1, SavedProfile } from '@pokermanic/contracts';
import { isSuitPaletteId, suitPaletteColors, type SuitPaletteId } from '~/utils/suitPalettes';
import {
  DEFAULT_ROUND_RULES,
  advanceRound,
  applyRunUpgrades,
  applyPurchasedRuleUpgrade,
  awardRoundUpgradeChips,
  createRunProgress,
  discardCards,
  listEligiblePokerHands,
  playScoringHand,
  purchaseRunUpgrade,
  resolveScoringOption,
  startRun,
  manualSelectionUnlocked,
  createPermanentProgress, startingUpgradeChips,
  transcendReward, transcendRun, PERMANENT_UPGRADES,
  permanentUpgradeCost, buyPermanentUpgrade, isRunUpgradeUnlocked,
  MATERIA_KINDS, XP_LEVELS, materiaLevel, sortHandForDisplay, beginAnotherRun, createMateriaState, reconcileMateriaSlots, completeMateriaRound, claimMateria, equipMateria, unequipMateria, sellMateria, materiaSaleValue, castMateria, breakMateriaFreeze, applyMateriaScore, buyMateriaBoardUpgrade,
} from '@pokermanic/engine';
import type { RunState, ScoringOption, RunUpgradeId, RunProgress, HandSortMode, PermanentUpgradeId, MateriaKind, MateriaBoardPurchase } from '@pokermanic/engine';

useSeoMeta({
  title: 'PokerManic',
  description: 'Earn permanent prestige perks that survive every run.',
});

const progress = ref<RunProgress>(createRunProgress());
const profile = ref<SavedProfile>({ lifetimeRunsStarted: 1, bestRound: 1, ...createPermanentProgress() });
const sortMode = ref<HandSortMode>('rank');
const cardStyle = ref('classic');
const suitFont = ref('symbol');
const suitColors = ref<'themed' | 'standard'>('themed');
const selectedPalette = ref<SuitPaletteId | null>(null);
const customSuitColors = computed(() => suitPaletteColors(selectedPalette.value));
const SUIT_PALETTE_STORAGE_KEY = 'pokermanic.suit-palette.v1';
const SUIT_COLORS_STORAGE_KEY = 'pokermanic.suit-colors.v1';
const CARD_STYLE_STORAGE_KEY = 'pokermanic.card-style.v1';
const SUIT_FONT_STORAGE_KEY = 'pokermanic.suit-font.v1';
const validSuitFonts = new Set(['symbol', 'theme', 'georgia', 'sans']);
const validCardStyles = new Set([
  'classic', 'victorian', 'deco', 'cyber', 'bold-victorian',
  'vivid-gothic', 'art-nouveau', 'cosmic-horror', 'medieval-illuminated',
]);
const hydrated = ref(false);
const savingBlocked = ref(false);
const saveStatus = ref('Loading browser save…');
const saveJson = ref('');
const saveJsonDirty = ref(false);
function updateSaveJson(value: string) {
  saveJson.value = value;
  saveJsonDirty.value = true;
}
// Effective rules update as perks are purchased, without resetting the round.

const rules = ref({ ...DEFAULT_ROUND_RULES });
// Keep active run rules stable when prestige perks are bought mid-run.
const nextRoundRules = computed(() => rules.value);
function activeRunBaseRules() {
  const levels = progress.value.levels;
  return {
    ...rules.value,
    handSize: rules.value.handSize - levels.hand_size,
    cardsPerPlay: rules.value.cardsPerPlay - levels.cards_per_play,
    maxCardsPerDiscard: rules.value.maxCardsPerDiscard - levels.discard_batch,
    baseHandsPerRound: rules.value.baseHandsPerRound - levels.extra_hand,
    baseDiscardsPerRound: rules.value.baseDiscardsPerRound - levels.extra_discard,
  };
}

// Nuxt useState serializes the randomly dealt opening run into the SSR payload.
// The browser hydrates that exact run instead of shuffling a second time.
const run = useState<RunState>('pokermanic-opening-run', () => startRun(DEFAULT_ROUND_RULES));
const hand = computed(() => run.value.hand);
const remainingDeck = computed(() => run.value.drawPile);
const inRound = computed(() => run.value.phase === 'playing');
const selectedIndexes = ref<number[]>([]);
const selectedInputIndexes = computed(() => hand.value.flatMap((_, i) =>
  selectedIndexes.value.includes(i) ? [i] : []));
const selectedCards = computed(() => selectedInputIndexes.value.map((i) => hand.value[i]!));
const eligibleOptions = computed(() => selectedCards.value.length >= 1
  && selectedCards.value.length <= rules.value.cardsPerPlay
  ? listEligiblePokerHands(selectedCards.value, run.value.cardModifiers) : []);

const manualUnlocked = computed(() =>
  isRunUpgradeUnlocked(profile.value, 'manual_selection') && manualSelectionUnlocked(progress.value));
const selectionMode = ref<'automatic' | 'manual'>('automatic');
const manualOptionId = ref<string>();
const preview = computed(() => {
  const option = resolveScoringOption(eligibleOptions.value, {
    manualSelectionUnlocked: manualUnlocked.value,
    selectionMode: selectionMode.value,
  }, manualOptionId.value);
  return option ? applyMateriaScore(option, selectedCards.value, run.value.materia ?? createMateriaState()) : null;
});
const scoringCardIndexes = computed(() => preview.value?.scoringCardIndices
  .map((i) => selectedInputIndexes.value[i]!) ?? []);
const scoredHand = ref<ScoringOption | null>(null);
const roundSummaryOpen = ref(false);
const selectedMateriaInfoId = ref<number | null>(null);
const selectedMateriaInfo = computed(() => (run.value.materia?.collection ?? []).find(gem => gem.id === selectedMateriaInfoId.value) ?? null);
const lastAction = ref('Run started. Earn upgrade chips by clearing rounds. The perk shop is always open.');
const canDiscardSelection = computed(() => inRound.value
  && run.value.discardsRemaining > 0
  && selectedIndexes.value.length >= 1
  && selectedIndexes.value.length <= rules.value.maxCardsPerDiscard);

function clearSelection() {
  selectedIndexes.value = [];
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function setSelectionMode(mode: 'automatic' | 'manual') {
  if (mode === 'manual' && !manualUnlocked.value) return;
  selectionMode.value = mode;
  scoredHand.value = null;
}

function chooseScoringOption(optionId: string) {
  if (!manualUnlocked.value || selectionMode.value !== 'manual') return;
  manualOptionId.value = optionId;
  scoredHand.value = null;
}

function toggleCard(index: number) {
  if (!inRound.value) return;
  if (selectedIndexes.value.includes(index)) {
    selectedIndexes.value = selectedIndexes.value.filter((value) => value !== index);
  } else if (selectedIndexes.value.length < Math.max(rules.value.cardsPerPlay, rules.value.maxCardsPerDiscard)) {
    selectedIndexes.value = [...selectedIndexes.value, index];
  }
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function scoreSelectedHand() {
  if (!preview.value || !inRound.value) return;
  const next = playScoringHand(run.value, selectedInputIndexes.value, {
    manualSelectionUnlocked: manualUnlocked.value,
    selectionMode: selectionMode.value,
  }, manualOptionId.value, rules.value);
  const scored = next.lastScored;
  run.value = next;
  if (next.lastGoldReward) progress.value = { ...progress.value, upgradeChips: progress.value.upgradeChips + next.lastGoldReward };
  if (next.phase === 'round_won') {
    progress.value = awardRoundUpgradeChips(next, progress.value);
    run.value = { ...run.value, materia: completeMateriaRound(run.value.materia ?? createMateriaState(),next.round,(profile.value.materiaLinks ?? []).length > 0) };
    roundSummaryOpen.value = true;
  }
  clearSelection();
  scoredHand.value = scored;
  lastAction.value = scored
    ? `Scored ${scored.label}: +${scored.score} chips.${next.lastGoldReward ? ` +${next.lastGoldReward} Gold upgrade chips.` : ''} ${next.roundChips} / ${next.roundTarget} this round.`
    : 'Hand scored.';
}

function discardSelectedCards() {
  if (!canDiscardSelection.value) return;
  const count = selectedIndexes.value.length;
  run.value = discardCards(run.value, selectedIndexes.value, rules.value);
  clearSelection();
  lastAction.value = `Discarded ${count} ${count === 1 ? 'card' : 'cards'} and drew replacements.`;
}

function nextRound() {
  if (run.value.phase !== 'round_won' || roundSummaryOpen.value) return;
  rules.value = nextRoundRules.value;
  if (run.value.materia?.offers.length) { lastAction.value = 'Choose your Materia reward before advancing.'; return; }
  run.value = advanceRound(run.value, rules.value);
  roundSummaryOpen.value = false;
  clearSelection();
  lastAction.value = `Round ${run.value.round} started. Reach ${run.value.roundTarget} chips to survive.`;
}

// The results modal is the sole advancement control. If a reward was found,
// the discovery modal opens first; claiming it completes the advancement.
function advanceFromRoundSummary() {
  if (run.value.phase !== 'round_won') return;
  roundSummaryOpen.value = false;
  if (!run.value.materia?.offers.length) nextRound();
}

function resetToFreshRun(transcending = false) {
  roundSummaryOpen.value = false;
  profile.value = {
    ...profile.value,
    lifetimeRunsStarted: profile.value.lifetimeRunsStarted + 1,
    bestRound: Math.max(profile.value.bestRound, run.value.round),
  };
  savingBlocked.value = false;
  saveJsonDirty.value = false;
  const fresh = beginAnotherRun(run.value, progress.value, profile.value, transcending);
  progress.value = fresh.progress;
  rules.value = fresh.rules;
  run.value = fresh.run;
  selectionMode.value = 'automatic';
  sortMode.value = 'rank';
  clearSelection();
  saveStatus.value = 'New run created. Autosaving in this browser.';
}
function restartRun() {
  if (import.meta.client && !window.confirm('Start a new run? Earned upgrade chips and purchased card upgrades will carry over.')) return;
  resetToFreshRun();
  lastAction.value = 'New run started. Upgrade chips, card upgrades and prestige unlocks carried over.';
}
const earnedPrestige = computed(() => transcendReward(run.value));
const prestigeMateriaBonus = computed(() => {
  const materia = run.value.materia;
  if (!materia) return 0;
  const equipped = new Set(materia.equipped.filter((id): id is number => id !== null));
  return materia.collection.reduce((sum, gem) =>
    sum + (gem.kind === 'prestige' && equipped.has(gem.id) ? materiaLevel(gem) : 0), 0);
});
function transcend() {
  const reward = earnedPrestige.value;
  if (!reward) return;
  if (import.meta.client && !window.confirm(`Transcend for ${reward} prestige chips and reset this run?`)) return;
  const permanent = transcendRun(run.value, profile.value);
  profile.value = { ...profile.value, ...permanent };
  resetToFreshRun(true);
  lastAction.value = `Transcended! Earned ${reward} prestige chips. Materia and XP reset; board slots and links remain.`;
}
function purchasePermanent(id: PermanentUpgradeId) {
  profile.value = { ...profile.value, ...buyPermanentUpgrade(profile.value, id) };
  lastAction.value = 'Shop perk permanently unlocked. You can purchase it with upgrade chips in the Perk Shop.';
}

function buyMateriaBoard(id: MateriaBoardPurchase) {
  try {
    profile.value = { ...profile.value, ...buyMateriaBoardUpgrade(profile.value, id) };
    run.value = { ...run.value, materia: reconcileMateriaSlots(run.value.materia ?? createMateriaState(),profile.value.materiaSlots ?? 1) };
    lastAction.value = id === 'slot' ? 'Materia slot permanently unlocked.' : 'Materia link permanently unlocked.';
  } catch (error) { lastAction.value = error instanceof Error ? error.message : 'Prestige purchase failed.'; }
}

// Acquisition and optional equipment are committed together. An occupied slot's
// previous gem stays in the collection (storage), never lost.
function acquireDiscoveredMateria(kind: MateriaKind, slot: number | null) {
  try {
    const current = run.value.materia ?? createMateriaState(profile.value.materiaSlots ?? 1);
    const claimed = claimMateria(current, kind);
    const updated = slot === null ? claimed : equipMateria(claimed, claimed.nextId - 1, slot);
    run.value = { ...run.value, materia: updated };
    lastAction.value = slot === null
      ? `${kind} Materia sent to storage.`
      : `${kind} Materia equipped in slot ${slot + 1}. Replaced gems remain in storage.`;
    if (run.value.phase === 'round_won' && !roundSummaryOpen.value) nextRound();
  } catch (error) {
    lastAction.value = error instanceof Error ? error.message : 'Materia acquisition failed.';
  }
}

// God Mode changes use the same live state as the board, inventory, spells and
// browser save. Keep IDs unique and always use the canonical XP thresholds.
function godMateriaXp(kind: MateriaKind, level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > MATERIA_KINDS[kind].maxLevel) {
    throw new RangeError('Invalid Materia level.');
  }
  return XP_LEVELS[level - 1] ?? 0;
}
function godAddMateria(kind: MateriaKind, level: number) {
  const xp = godMateriaXp(kind, level);
  const current = run.value.materia ?? createMateriaState(profile.value.materiaSlots ?? 1);
  const nextId = Math.max(current.nextId, ...current.collection.map(gem => gem.id + 1), 1);
  run.value = { ...run.value, materia: { ...current,
    collection: [...current.collection, { id: nextId, kind, xp }], nextId: nextId + 1 } };
  lastAction.value = `God Mode: Added ${MATERIA_KINDS[kind].name} level ${level} to inventory.`;
}
function godSetMateriaLevel(id: number, level: number) {
  const current = run.value.materia;
  if (!current) return;
  const gem = current.collection.find(item => item.id === id);
  if (!gem) return;
  const xp = godMateriaXp(gem.kind, level);
  run.value = { ...run.value, materia: { ...current,
    collection: current.collection.map(item => item.id === id ? { ...item, xp } : item) } };
  lastAction.value = `God Mode: ${MATERIA_KINDS[gem.kind].name} set to level ${level}.`;
}
function godSetMateriaKind(id: number, kind: MateriaKind) {
  const current = run.value.materia;
  if (!current) return;
  const gem = current.collection.find(item => item.id === id);
  if (!gem || !MATERIA_KINDS[kind]) return;
  const level = Math.min(materiaLevel(gem), MATERIA_KINDS[kind].maxLevel);
  run.value = { ...run.value, materia: { ...current,
    collection: current.collection.map(item => item.id === id ? { ...item, kind, xp: godMateriaXp(kind, level) } : item) } };
  lastAction.value = `God Mode: Changed Materia to ${MATERIA_KINDS[kind].name} level ${level}.`;
}
function godRemoveMateria(id: number) {
  const current = run.value.materia;
  if (!current || !current.collection.some(gem => gem.id === id)) return;
  run.value = { ...run.value, materia: { ...current,
    collection: current.collection.filter(gem => gem.id !== id),
    equipped: current.equipped.map(value => value === id ? null : value),
    castThisRound: current.castThisRound.filter(value => value !== id) } };
  if (selectedMateriaInfoId.value === id) selectedMateriaInfoId.value = null;
  lastAction.value = 'God Mode: Materia removed.';
}

function sellGem(id: number) {
  const current = run.value.materia;
  const gem = current?.collection.find(item => item.id === id);
  if (!current || !gem) return;
  const price = materiaSaleValue(gem);
  if (!import.meta.client || !window.confirm(
    `Sell level ${materiaLevel(gem)} ${MATERIA_KINDS[gem.kind].name} Materia for ${price} PP? This permanently removes it from inventory and equipment.`
  )) return;
  try {
    const result = sellMateria(current, id);
    const balance = profile.value.prestigeChips + result.prestigePoints;
    if (!Number.isSafeInteger(balance)) throw new RangeError('Prestige balance exceeds safe integer precision.');
    run.value = { ...run.value, materia: result.materia };
    profile.value = { ...profile.value, prestigeChips: balance };
    if (selectedMateriaInfoId.value === id) selectedMateriaInfoId.value = null;
    lastAction.value = `Sold ${MATERIA_KINDS[gem.kind].name} Materia for ${price} PP.`;
  } catch (error) {
    lastAction.value = error instanceof Error ? error.message : 'Materia sale failed.';
  }
}
function equipGem(id: number, slot: number) {
  try {
    run.value = { ...run.value, materia: equipMateria(run.value.materia ?? createMateriaState(),id,slot) };
    lastAction.value = 'Materia equipped.';
  } catch (error) { lastAction.value = error instanceof Error ? error.message : 'Equip failed.'; }
}
function unequipGem(slot: number) {
  run.value = { ...run.value, materia: unequipMateria(run.value.materia ?? createMateriaState(),slot) };
}
function castSpellOnCard(id: number, tier: number, index: number) {
  if (!inRound.value || !Number.isInteger(index) || index < 0 || index >= run.value.hand.length) return;
  try {
    run.value = { ...run.value, materia: castMateria(
      run.value.materia ?? createMateriaState(), run.value.hand, id, tier, index,
      profile.value.materiaLinks ?? [],
      sortHandForDisplay(run.value.hand, sortMode.value).map(entry => entry.originalIndex)
    ) };
    scoredHand.value = null;
    lastAction.value = 'Spell cast on target card! Chips, Mult and hand preview updated.';
  } catch (error) {
    lastAction.value = error instanceof Error ? error.message : 'Spell failed.';
  }
}
function castSpell(id: number, tier: number) {
  if (selectedIndexes.value.length !== 1) return;
  castSpellOnCard(id, tier, selectedIndexes.value[0]!);
}
function breakFreeze() {
  if (selectedIndexes.value.length !== 1) return;
  try {
    run.value = { ...run.value, materia: breakMateriaFreeze(run.value.materia ?? createMateriaState(),run.value.hand[selectedIndexes.value[0]!]!) };
    lastAction.value = 'Freeze broken.';
  } catch (error) { lastAction.value = error instanceof Error ? error.message : 'Cannot break freeze.'; }
}

function buyPerk(id: RunUpgradeId) {
  // Calculate the complete transaction before updating the reactive UI.
  const purchased = purchaseRunUpgrade(run.value, progress.value, id, profile.value);
  const upgradedRules = applyRunUpgrades(activeRunBaseRules(), purchased);
  const updatedRun = applyPurchasedRuleUpgrade(run.value, rules.value, upgradedRules);

  run.value = updatedRun;
  rules.value = upgradedRules;
  progress.value = purchased;
  // Preserve selected card indices and any manual selection. New cards append
  // after the existing hand, so selections don't move or silently clear.
  lastAction.value = id === 'manual_selection'
    ? 'Manual Hand Selection unlocked immediately! You can switch to Manual now.'
    : id === 'hand_size'
      ? `Extra card drawn! Your hand now holds ${updatedRun.hand.length} cards.`
      : id === 'extra_hand'
        ? `Extra scoring hand added! ${updatedRun.handsRemaining} hands remain.`
        : id === 'extra_discard'
          ? `Extra discard added! ${updatedRun.discardsRemaining} discards remain.`
          : id === 'cards_per_play'
            ? `You can now score 1 to ${upgradedRules.cardsPerPlay} cards per play.`
            : `You can now discard up to ${upgradedRules.maxCardsPerDiscard} cards at once.`;
}


/** The saved payload is also the public modding format: readable, without obfuscation. */
function snapshot(): GameSaveV1 {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    run: run.value,
    progress: progress.value,
    rules: rules.value,
    profile: profile.value,
    ui: {
      selectedIndexes: selectedIndexes.value,
      selectionMode: selectionMode.value,
      manualOptionId: manualOptionId.value ?? null,
      sortMode: sortMode.value,
    },
  };
}
function installSave(save: GameSaveV1) {
  run.value = { ...save.run, cardModifiers: {}, cardGrowth: {}, materia: reconcileMateriaSlots(save.run.materia ?? createMateriaState(),save.profile.materiaSlots ?? 1) };
  roundSummaryOpen.value = save.run.phase === 'round_won';
  rules.value = save.rules;
  progress.value = save.progress;
  profile.value = save.profile;
  selectedIndexes.value = save.ui.selectedIndexes;
  selectionMode.value = save.ui.selectionMode;
  manualOptionId.value = save.ui.manualOptionId ?? undefined;
  sortMode.value = save.ui.sortMode;
  scoredHand.value = save.run.lastScored;
  lastAction.value = 'Local save restored. Continue your run or import edited JSON.';
}
function persistSave() {
  if (!hydrated.value || savingBlocked.value || !import.meta.client) return;
  try {
    const json = formatGameSave(snapshot());
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, json);
    if (!saveJsonDirty.value) saveJson.value = json;
    saveStatus.value = 'Autosaved locally in this browser.';
  } catch (error) {
    savingBlocked.value = true;
    saveStatus.value = 'Autosave paused: ' + (error instanceof Error ? error.message : 'browser storage unavailable');
  }
}
onMounted(() => {
  try {
    const savedStyle = localStorage.getItem(CARD_STYLE_STORAGE_KEY);
    if (savedStyle && validCardStyles.has(savedStyle)) cardStyle.value = savedStyle;
    const savedSuitFont = localStorage.getItem(SUIT_FONT_STORAGE_KEY);
    if (savedSuitFont && validSuitFonts.has(savedSuitFont)) suitFont.value = savedSuitFont;
    const savedColors = localStorage.getItem(SUIT_COLORS_STORAGE_KEY);
    if (savedColors === 'themed' || savedColors === 'standard') suitColors.value = savedColors;
    const savedPalette = localStorage.getItem(SUIT_PALETTE_STORAGE_KEY);
    if (isSuitPaletteId(savedPalette)) selectedPalette.value = savedPalette;
  } catch { /* Appearance preference is optional when storage is blocked. */ }
  try {
    const raw = localStorage.getItem(GAME_SAVE_STORAGE_KEY);
    if (raw) {
      installSave(parseGameSave(raw));
      saveStatus.value = 'Existing save restored from this browser.';
    } else {
      saveStatus.value = 'New run. Autosave enabled in this browser.';
    }
  } catch (error) {
    savingBlocked.value = true;
    saveStatus.value = 'Save not loaded: ' + (error instanceof Error ? error.message : 'invalid JSON');
    try {
      saveJson.value = localStorage.getItem(GAME_SAVE_STORAGE_KEY) ?? '';
      saveJsonDirty.value = true;
    } catch { /* storage denied */ }
  } finally {
    hydrated.value = true;
    persistSave();
  }
});
watch(selectedPalette, value => {
  if (!import.meta.client) return;
  try {
    if (value) localStorage.setItem(SUIT_PALETTE_STORAGE_KEY, value);
    else localStorage.removeItem(SUIT_PALETTE_STORAGE_KEY);
  } catch { /* Optional preference. */ }
});
watch(suitColors, value => {
  if (!import.meta.client) return;
  try { localStorage.setItem(SUIT_COLORS_STORAGE_KEY, value); } catch { /* Optional preference. */ }
});
watch(cardStyle, value => {
  if (!import.meta.client) return;
  try { localStorage.setItem(CARD_STYLE_STORAGE_KEY, value); } catch { /* Optional preference. */ }
});
watch(suitFont, value => {
  if (!import.meta.client) return;
  try { localStorage.setItem(SUIT_FONT_STORAGE_KEY, value); } catch { /* Optional preference. */ }
});
watch([run, rules, progress, profile, selectedIndexes, selectionMode, manualOptionId, sortMode],
  () => {
    if (run.value.round > profile.value.bestRound) profile.value.bestRound = run.value.round;
    persistSave();
  }, { deep: true, flush: 'post' });

function exportSave() {
  try {
    const json = formatGameSave(snapshot());
    saveJson.value = json;
    saveJsonDirty.value = false;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pokermanic-save-v1.json';
    link.click();
    URL.revokeObjectURL(url);
    saveStatus.value = 'JSON exported. You can also edit it in the textarea below.';
  } catch (error) {
    saveStatus.value = error instanceof Error ? error.message : 'Could not export save.';
  }
}
function importSave() {
  try {
    const parsed = parseGameSave(saveJson.value);
    installSave(parsed);
    savingBlocked.value = false;
    saveJsonDirty.value = false;
    persistSave();
    saveStatus.value = 'Edited JSON imported successfully and saved locally.';
  } catch (error) {
    saveStatus.value = 'Import rejected (your run is unchanged): ' +
      (error instanceof Error ? error.message : 'invalid JSON');
  }
}

const { data: health, error, status, refresh } = await useFetch('/api/health');
</script>

<template>
  <UContainer class="min-h-screen pt-10 pb-28 md:pt-16 md:pb-28">
    <div class="mx-auto max-w-6xl space-y-9">
      <header class="space-y-4">
        <div class="space-y-2">
          <h1 class="text-5xl font-bold tracking-tight md:text-6xl">PokerManic</h1>
          <p class="text-lg text-muted">
            A poker-based roguelite in development
          </p>
        </div>
      </header>

      <section aria-labelledby="hand-heading" class="space-y-4">
        <UCard>
            <RoundStatus :run="run" :hand="hand" :remaining-deck="remainingDeck"
              @restart-run="restartRun" />

            <MateriaBoard :materia="run.materia ?? createMateriaState()" :links="profile.materiaLinks ?? []" @show-info="selectedMateriaInfoId = $event"
              :target-ready="selectedIndexes.length === 1" :phase="run.phase"
              @cast="castSpell" @drop-cast="castSpellOnCard" />

            <PlayingCardHand :hand="hand" 
              :card-modifiers="{}" :magic-effects="run.materia?.effects ?? {}" 
              :selected-indexes="selectedIndexes"
              :scoring-card-indexes="scoringCardIndexes"
              :cards-per-play="rules.cardsPerPlay" 
              :max-cards-per-discard="rules.maxCardsPerDiscard"
              :round="run.round" 
              :hands-played="run.handsPlayed" 
              :in-round="inRound"
              :card-style="cardStyle" :suit-font="suitFont" :suit-colors="suitColors" :custom-suit-colors="customSuitColors"
              v-model:sort-mode="sortMode" 
              @toggle-card="toggleCard" @materia-drop="(id, index) => castSpellOnCard(id, 1, index)" />

            <HandActions
              :preview="preview"
              :in-round="inRound"
              :hands-remaining="run.handsRemaining"
              :discards-remaining="run.discardsRemaining"
              :can-discard-selection="canDiscardSelection"
              :selected-count="selectedIndexes.length"
              @score-hand="scoreSelectedHand"
              @discard-selected="discardSelectedCards"
              @clear-selection="clearSelection"
            />

            <div class="flex flex-wrap gap-3">
              <UButton data-testid="new-run" icon="i-lucide-rotate-ccw"
                color="neutral" variant="ghost" @click="restartRun">
                Start new run
              </UButton>
            </div>
            <p aria-live="polite" class="text-sm text-muted">{{ lastAction }}</p>
            <p class="text-xs text-muted">
              Played and discarded cards are recycled when needed. Purchased perks and Materia persist across new runs until you transcend. Prestige permanently unlocks Materia slots and links.
            </p>
        </UCard>
      </section>

      <DevelopmentProgress />

      <SystemStatus :health="health" :error="error" :status="status" @refresh="refresh" />
    </div>
  </UContainer>

  <!-- The viewport dock must not inherit the centered page container's layout. -->
  <MateriaDetailsModal :open="selectedMateriaInfo !== null" :gem="selectedMateriaInfo" @close="selectedMateriaInfoId = null" />

  <RoundCompleteModal :open="roundSummaryOpen" :round="run.round" :score="run.roundChips"
    :required="run.roundTarget" :materia="run.materia ?? createMateriaState(profile.materiaSlots ?? 1)"
    @continue="advanceFromRoundSummary" />

  <MateriaDiscoveryModal :enabled="!roundSummaryOpen" :materia="run.materia ?? createMateriaState(profile.materiaSlots ?? 1)"
    @acquire="acquireDiscoveredMateria" />

  <PerkShop :phase="run.phase" :progress="progress" :profile="profile" :rules="rules"
    :next-round-rules="nextRoundRules" :manual-selection-available="manualUnlocked"
    :earned-prestige="earnedPrestige"
    :materia="run.materia ?? createMateriaState(profile.materiaSlots ?? 1)"
    :target-ready="selectedIndexes.length === 1"
    @buy-perk="buyPerk" @cast-spell="castSpell" @break-freeze="breakFreeze"
    @show-materia-info="selectedMateriaInfoId = $event">
    <template #materia>
      <MateriaPanel mode="inventory" :materia="run.materia ?? createMateriaState()" :target-ready="selectedIndexes.length === 1" :phase="run.phase"
        @equip="equipGem" @unequip="unequipGem" @sell="sellGem" @cast="castSpell" @break-freeze="breakFreeze" @show-info="selectedMateriaInfoId = $event" />
    </template>
    <template #hand>
      <ScoringPanel :preview="preview" :scored-hand="scoredHand"
        :eligible-options="eligibleOptions" :selected-cards="selectedCards"
        :manual-unlocked="manualUnlocked"
        :selection-mode="selectionMode" :cards-per-play="rules.cardsPerPlay"
        @set-selection-mode="setSelectionMode" @choose-scoring-option="chooseScoringOption" />
    </template>
    <template #transcendence>
      <TranscendencePanel :profile="profile" :earned-prestige="earnedPrestige" :prestige-materia-bonus="prestigeMateriaBonus"
        :perks="PERMANENT_UPGRADES"
        :prices="Object.fromEntries(PERMANENT_UPGRADES.map(perk => [perk.id, permanentUpgradeCost(profile, perk.id)]))"
        @transcend="transcend" @purchase="purchasePermanent" @buy-board="buyMateriaBoard" />
    </template>
    <template #god>
      <GodMateriaEditor :materia="run.materia ?? createMateriaState(profile.materiaSlots ?? 1)"
        @add="godAddMateria" @set-kind="godSetMateriaKind" @set-level="godSetMateriaLevel"
        @equip="equipGem" @unequip="unequipGem" @remove="godRemoveMateria" />
      <SaveManager :json="saveJson" @update:json="updateSaveJson" :status="saveStatus" :blocked="savingBlocked"
        @export="exportSave" @import="importSave" @new-run="restartRun" />
    </template>
    <template #settings>
      <CardStyleSettings v-model:card-style="cardStyle" v-model:suit-font="suitFont" v-model:suit-colors="suitColors"
        v-model:selected-palette="selectedPalette" />
    </template>
  </PerkShop>
</template>
