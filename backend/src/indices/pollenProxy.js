// PollenProxy: India has no national pollen monitoring network and is not in
// Google Pollen API's coverage list; Open-Meteo's pollen variables are the
// European CAMS ensemble only. We ship a modelled proxy, always labelled as
// such (`modelled: true` -> forces the "estimated, not observed" chip on the
// card - see API contract section 9). This is a documented national data gap
// for MoES, not a hidden approximation.

// Peak months (1-12) for major Indian aeroallergens, by rough region.
const PHENOLOGY = {
  Parthenium: { peakMonths: [8, 9, 10], weight: 0.3 },
  ProsopisJuliflora: { peakMonths: [2, 3, 4], weight: 0.2 },
  Holoptelea: { peakMonths: [2, 3], weight: 0.15 },
  Cassia: { peakMonths: [3, 4, 5], weight: 0.15 },
  Amaranthus: { peakMonths: [9, 10, 11], weight: 0.2 },
};

function seasonalLoad(month) {
  return Object.values(PHENOLOGY).reduce(
    (sum, sp) => sum + (sp.peakMonths.includes(month) ? sp.weight : sp.weight * 0.1),
    0,
  );
}

export function pollenProxy({ month, windKmh, rhPercent, rain24hMm, tempC }) {
  const base = seasonalLoad(month); // 0..1

  // Wind lofts pollen; recent rain scavenges it out of the air; low humidity
  // and warm temperature favour dispersal.
  const windFactor = Math.min(1.4, 1 + windKmh / 40);
  const rainFactor = rain24hMm > 2 ? 0.4 : 1;
  const humidityFactor = rhPercent > 70 ? 0.7 : 1;
  const tempFactor = tempC > 20 ? 1.1 : 0.9;

  const score = Math.max(0, Math.min(1, base * windFactor * rainFactor * humidityFactor * tempFactor));
  const band = score < 0.2 ? 'Low' : score < 0.45 ? 'Moderate' : score < 0.7 ? 'High' : 'Very High';

  return {
    name: 'PollenProxy',
    value: Math.round(score * 100),
    band,
    confidence: 0.4,
    modelled: true,
    verdict: `Modelled estimate (${band}) - India has no national pollen monitoring network.`,
  };
}
