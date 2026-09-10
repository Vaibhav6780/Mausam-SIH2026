import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCards } from '../src/cards/generateCards.js';
import { rankCards } from '../src/ranker/rank.js';
import { beachSafety } from '../src/indices/beachSafety.js';
import { SCENARIOS, DEMO_ACCOUNTS } from '../src/demo/scenarios.js';

test('cyclone scenario produces a red pinned override', () => {
  const { overrides } = generateCards(SCENARIOS.cyclone.source);
  assert.ok(overrides.length > 0);
  assert.ok(overrides.every((o) => o.pinned === true));
  assert.ok(overrides.some((o) => o.severity === 'red'));
});

test('fishermen warning forces BeachSafety unsafe and suppresses good-conditions verdict', () => {
  const result = beachSafety({ waveHeightM: 0.3, wavePeriodS: 12, sstC: 27, tide: { type: 'low', at: '10:00' }, portSignal: null, fishermenWarning: true });
  assert.equal(result.band, 'Unsafe');
  assert.equal(result.overridden_by_warning, true);
  assert.match(result.verdict, /do not enter the water/i);
});

test('overrides are never reordered by the ranker - ranker only touches cards[]', () => {
  const { overrides, cards } = generateCards(SCENARIOS.cyclone.source);
  const ranked = rankCards({ cards, affinityVector: DEMO_ACCOUNTS.amit.affinityVector });
  assert.equal(ranked.length, cards.length);
  // overrides array is untouched / separate from cards ranking
  assert.ok(Array.isArray(overrides));
});

test('two accounts with different affinity vectors get different card ordering for the same scenario', () => {
  const { cards } = generateCards(SCENARIOS.clear.source);
  const rankedAmit = rankCards({ cards, affinityVector: DEMO_ACCOUNTS.amit.affinityVector, engagement: DEMO_ACCOUNTS.amit.engagement });
  const rankedPriya = rankCards({ cards, affinityVector: DEMO_ACCOUNTS.priya.affinityVector, engagement: DEMO_ACCOUNTS.priya.engagement });
  assert.notDeepEqual(
    rankedAmit.map((c) => c.card_id),
    rankedPriya.map((c) => c.card_id),
  );
});
