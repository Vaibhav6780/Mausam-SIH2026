// RunScore(t): hourly 0-24, best window highlighted for the fitness persona.
import { celsiusToApparent } from '../normalise/units.js';

function hourlyScore({ tempC, rhPercent, windKmh, aqi, precipProb, isDaylight }) {
  const apparent = celsiusToApparent({ tempC, rhPercent, windKmh });
  let score = 100;
  // Comfort penalty away from ~18C apparent.
  score -= Math.min(60, Math.abs(apparent - 18) * 3);
  // AQI penalty.
  score -= Math.max(0, (aqi - 50) / 5);
  // Rain risk penalty.
  score -= precipProb * 0.5;
  if (!isDaylight) score -= 10;
  return Math.max(0, Math.round(score));
}

export function runScore({ hourlyForecast, aqi }) {
  const hours = hourlyForecast.map((h) => ({
    hour: h.hour,
    score: hourlyScore({ ...h, aqi }),
  }));
  const best = hours.reduce((a, b) => (b.score > a.score ? b : a), hours[0]);
  return {
    name: 'RunScore',
    hourly: hours,
    best_window: { hour: best.hour, score: best.score },
    confidence: 0.75,
    verdict: `Best window today: ${String(best.hour).padStart(2, '0')}:00 (score ${best.score}/100).`,
  };
}
