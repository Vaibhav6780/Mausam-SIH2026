import { celsiusToApparent } from '../normalise/units.js';

// ComfortIndex 0-100 + confidence band for the events persona, over a date
// range. Confidence band widens with lead time - Mission Mausam names
// uncertainty communication as an unsolved need; we show it rather than hide it.
export function comfortIndex({ days }) {
  return days.map((d, i) => {
    const apparent = celsiusToApparent({ tempC: d.tempC, rhPercent: d.rhPercent, windKmh: d.windKmh });
    let score = 100 - Math.abs(apparent - 20) * 2.5 - d.rainProb * 0.6 - d.windKmh * 0.3;
    score = Math.max(0, Math.min(100, Math.round(score)));
    const uncertainty = Math.min(35, 5 + i * 6); // widens with lead time
    return {
      date: d.date,
      score,
      confidence_band: [Math.max(0, score - uncertainty), Math.min(100, score + uncertainty)],
    };
  });
}

// Deterministic packing rule table. LLM (if wired) only phrases the sentence
// from these rules - it never computes weather values itself (section 5:
// hallucinated weather in a government app is a catastrophic failure mode).
export function packingRules({ forecastDays }) {
  const rainyDays = forecastDays.filter((d) => d.rainProb > 40).length;
  const items = [];
  if (rainyDays >= forecastDays.length * 0.5) items.push('raincoat');
  if (forecastDays.some((d) => d.maxC >= 34)) items.push('sunscreen', 'light cottons');
  if (forecastDays.some((d) => d.minC <= 12)) items.push('warm layer');
  return {
    items,
    rainy_days: rainyDays,
    total_days: forecastDays.length,
    verdict:
      rainyDays > 0
        ? `Carry a raincoat - ${rainyDays} of ${forecastDays.length} days show widespread rain.`
        : 'Dry conditions expected for the full trip.',
  };
}
