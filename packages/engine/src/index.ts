export { createStandardDeck, shuffleDeck, dealCards } from './deck.js';
export { evaluatePokerHand, POKER_HAND_VALUES } from './scoring.js';
export type { PokerHandCategory, PokerHandResult } from './scoring.js';
export { listEligiblePokerHands, resolveScoringOption } from './choices.js';
export type { ScoringOption, ScoringCategory, HandSelectionSettings } from './choices.js';
export {
  DEFAULT_ROUND_RULES, validateRoundRules, getRoundTarget, getRoundHands, getRoundDiscards,
  startRun, playScoringHand, discardCards, advanceRound, applyPurchasedRuleUpgrade,
} from './rounds.js';
export type { RoundRules, RunState, RunPhase } from './rounds.js';
export {
  RUN_UPGRADES, createRunProgress, awardRoundUpgradeChips, upgradeCost,
  purchaseRunUpgrade, applyRunUpgrades, manualSelectionUnlocked,
} from './progression.js';
export type { RunUpgradeId, RunUpgradeDefinition, RunProgress } from './progression.js';
export { sortHandForDisplay } from './hand-sort.js';
export type { HandSortMode, IndexedCard } from './hand-sort.js';
export {
  PERMANENT_UPGRADES, createPermanentProgress, permanentUpgradeCost,
  buyPermanentUpgrade, isRunUpgradeUnlocked, startingUpgradeChips,
  transcendReward, transcendRun,
} from './permanent.js';
export type { PermanentUpgradeId, PermanentProgress } from './permanent.js';

export { CARD_MODIFIERS, cardIdentity, purchaseCardModifier, applyCardModifiers } from './modifiers.js';
export type { CardModifier, CardModifierMap } from './modifiers.js';

export { beginAnotherRun } from './run-lifecycle.js';
export type { NewRunState } from './run-lifecycle.js';
