import { warningColour, WARNING_CODES } from '../normalise/warningCodes.js';

// FrostRisk / SowingWindow: soil moisture + 5-day rain distribution + IMD
// Ground Frost warning (code 14) + agromet advisory passthrough.
export function frostRisk({ districtWarningDays, agromet }) {
  const frostDay = districtWarningDays.find((d) => d.code === 14);
  const frostTonight = frostDay && warningColour(frostDay.colour) !== 'green';

  return {
    name: 'FrostRisk',
    active: Boolean(frostTonight),
    confidence: 0.8,
    advisory: agromet?.advisory ?? null,
    verdict: frostTonight
      ? `${WARNING_CODES[14]} warning tonight - cover seedlings.${agromet ? ' ' + agromet.advisory : ''}`
      : 'No frost risk in the next 24h.',
  };
}

export function sowingWindow({ rainfallForecastDays }) {
  const wetDays = rainfallForecastDays.filter((d) => ['E', 'LE', 'N'].includes(d.category)).length;
  const favourable = wetDays >= 3;
  return {
    name: 'SowingWindow',
    favourable,
    confidence: 0.65,
    verdict: favourable
      ? `${wetDays} of ${rainfallForecastDays.length} days show adequate rainfall - good sowing window.`
      : `Only ${wetDays} of ${rainfallForecastDays.length} days show adequate rainfall - consider delaying sowing.`,
  };
}
