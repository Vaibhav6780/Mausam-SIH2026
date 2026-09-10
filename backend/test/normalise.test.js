import test from 'node:test';
import assert from 'node:assert/strict';
import { warningColour } from '../src/normalise/warningCodes.js';
import { nowcastColour } from '../src/normalise/wmoCodes.js';
import { aqiBand } from '../src/normalise/units.js';

test('warning colour mapping is inverted vs nowcast (1=red for warnings, 1=green for nowcast)', () => {
  assert.equal(warningColour(1), 'red');
  assert.equal(warningColour(4), 'green');
  assert.equal(nowcastColour(1), 'green');
  assert.equal(nowcastColour(4), 'red');
});

test('aqi bands', () => {
  assert.equal(aqiBand(30), 'Good');
  assert.equal(aqiBand(287), 'Poor');
  assert.equal(aqiBand(450), 'Severe');
});
