// District warning codes 1-17.
//
// IMPORTANT: warning colour mapping is INVERTED relative to nowcast colour
// mapping - here 1 = red (most severe) ... 4 = green (least severe). This is
// the single most-cited integration bug against IMD's docs. Normalise it once,
// here, so nothing downstream re-derives it and gets it backwards.
export const WARNING_CODES = {
  1: 'Cold wave',
  2: 'Heavy rain',
  3: 'Very heavy rain',
  4: 'Thunderstorm',
  5: 'Hailstorm',
  6: 'Squall',
  7: 'Dust storm',
  8: 'Gale wind',
  9: 'Heat wave',
  10: 'Lightning',
  11: 'Snowfall',
  12: 'Cold wave',
  13: 'Cold day',
  14: 'Ground frost',
  15: 'Fog',
  16: 'Thunderstorm with hail',
  17: 'Dust raising winds',
};

export const WARNING_COLOUR_BAND = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'green' };

export function warningColour(code) {
  return WARNING_COLOUR_BAND[code] ?? 'green';
}

export function warningLabel(code) {
  return WARNING_CODES[code] ?? `Warning code ${code}`;
}

export function isSevere(colour) {
  return colour === 'red' || colour === 'orange';
}
