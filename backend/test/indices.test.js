import test from 'node:test';
import assert from 'node:assert/strict';
import { pollenProxy } from '../src/indices/pollenProxy.js';
import { packingRules } from '../src/indices/comfort.js';
import { frostRisk } from '../src/indices/frost.js';

test('pollen proxy is always labelled modelled', () => {
  const result = pollenProxy({ month: 9, windKmh: 10, rhPercent: 50, rain24hMm: 0, tempC: 28 });
  assert.equal(result.modelled, true);
  assert.match(result.verdict, /no national pollen monitoring network/i);
});

test('packing rules are deterministic (no randomness / no LLM call) - same input, same output', () => {
  const days = [
    { maxC: 35, minC: 25, rainProb: 60 },
    { maxC: 34, minC: 24, rainProb: 70 },
    { maxC: 33, minC: 23, rainProb: 10 },
  ];
  const a = packingRules({ forecastDays: days });
  const b = packingRules({ forecastDays: days });
  assert.deepEqual(a, b);
  assert.ok(a.items.includes('raincoat'));
});

test('frost warning (code 14) triggers active FrostRisk', () => {
  const result = frostRisk({ districtWarningDays: [{ day: 1, code: 14, colour: 1 }], agromet: { advisory: 'Cover seedlings.' } });
  assert.equal(result.active, true);
  assert.match(result.verdict, /cover seedlings/i);
});
