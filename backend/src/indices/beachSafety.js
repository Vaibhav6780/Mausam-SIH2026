// BeachSafety: INCOIS wave/SST/tide + IMD coastal bulletin, port signal,
// fishermen warning.
//
// SAFETY RULE (non-negotiable, section 5): an active fishermen warning or
// port signal forces the block red and suppresses every "good conditions"
// verdict. No index overrides an official warning.
export function beachSafety({ waveHeightM, wavePeriodS, sstC, tide, portSignal, fishermenWarning }) {
  if (fishermenWarning || portSignal) {
    return {
      name: 'BeachSafety',
      value: 0,
      band: 'Unsafe',
      confidence: 1,
      overridden_by_warning: true,
      verdict: fishermenWarning
        ? 'Fishermen warning in effect. Do not enter the water.'
        : `Port signal ${portSignal} in effect. Do not enter the water.`,
    };
  }

  let band = 'Safe';
  if (waveHeightM > 2 || wavePeriodS < 6) band = 'Caution';
  if (waveHeightM > 3.5) band = 'Unsafe';

  return {
    name: 'BeachSafety',
    value: Math.round((1 - Math.min(1, waveHeightM / 4)) * 100),
    band,
    confidence: 0.85,
    overridden_by_warning: false,
    verdict: `Wave ${waveHeightM} m, period ${wavePeriodS} s, water ${sstC}°C. ${tide.type === 'low' ? 'Low' : 'High'} tide ${tide.at}.`,
  };
}
