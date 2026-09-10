// WMO present-weather codes (01-99) -> plain-language + icon key.
// Only the subset actually emitted by IMD's current_wx / cityforecast is mapped;
// anything else falls back to "unknown" rather than throwing, so a new code
// from IMD never kills a card mid-demo.
export const WMO_CODES = {
  '00': { text: 'Clear sky', icon: 'clear' },
  '01': { text: 'Mainly clear', icon: 'clear' },
  '02': { text: 'Partly cloudy', icon: 'partly_cloudy' },
  '03': { text: 'Overcast', icon: 'cloudy' },
  '10': { text: 'Mist', icon: 'mist' },
  '45': { text: 'Fog', icon: 'fog' },
  '48': { text: 'Depositing rime fog', icon: 'fog' },
  '51': { text: 'Light drizzle', icon: 'drizzle' },
  '61': { text: 'Light rain', icon: 'rain' },
  '63': { text: 'Moderate rain', icon: 'rain' },
  '65': { text: 'Heavy rain', icon: 'rain_heavy' },
  '80': { text: 'Rain showers', icon: 'showers' },
  '95': { text: 'Thunderstorm', icon: 'storm' },
  '96': { text: 'Thunderstorm with hail', icon: 'storm_hail' },
};

export function describeWmo(code) {
  const key = String(code).padStart(2, '0');
  return WMO_CODES[key] ?? { text: 'Unknown', icon: 'unknown' };
}

// Wind direction: IMD reports coded compass degrees, not raw bearings.
export const WIND_DIRECTION_CODES = [0, 20, 50, 70, 90, 110, 140, 160, 180, 200, 230, 250, 270, 290, 320, 340, 360];

const COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'];

export function windDirectionToCompass(degrees) {
  if (degrees === 0) return 'Calm';
  const idx = Math.round((degrees % 360) / 22.5);
  return COMPASS_16[idx] ?? 'Calm';
}

// Nowcast categories 1-19. Severity colour is read off the payload's own
// colour field per category (1 green / 2 yellow / 3 orange / 4 red) - never
// inferred from the category id itself.
export const NOWCAST_CATEGORIES = {
  1: 'No significant weather',
  2: 'Rain',
  3: 'Thunderstorm',
  4: 'Thunderstorm with gusty winds',
  5: 'Thunderstorm with hail',
  6: 'Squall',
  7: 'Dust storm',
  8: 'Dust raising winds',
  9: 'Hazy',
  10: 'Dust storm with visibility below threshold',
  11: 'Fog',
  12: 'Cold wave',
  13: 'Heat wave',
  14: 'Ground frost',
  15: 'Fog / low visibility',
  16: 'Heavy rain',
  17: 'Very heavy rain',
  18: 'Lightning',
  19: 'Gale wind',
};

export const NOWCAST_COLOUR_BAND = { 1: 'green', 2: 'yellow', 3: 'orange', 4: 'red' };

export function nowcastColour(code) {
  return NOWCAST_COLOUR_BAND[code] ?? 'green';
}

// Rainfall departure categories.
export const RAINFALL_CATEGORY = {
  LE: 'Large Excess',
  E: 'Excess',
  N: 'Normal',
  D: 'Deficient',
  LD: 'Large Deficient',
  NR: 'No Rain',
  ND: 'No Data',
};
