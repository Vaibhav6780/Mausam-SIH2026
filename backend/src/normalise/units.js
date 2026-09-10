// Unit and time-zone normalisation. One place, so persona/index logic never
// has to remember that INCOIS reports knots or that IMD timestamps arrive
// mixed IST/UTC.

export function knotsToKmh(knots) {
  return knots * 1.852;
}

export function knotsToMs(knots) {
  return knots * 0.514444;
}

export function celsiusToApparent({ tempC, rhPercent, windKmh }) {
  // Simplified apparent-temperature (heat-index-style) approximation, used
  // as IMD's own "Feel Like" field when a station lacks it.
  if (tempC >= 27 && rhPercent >= 40) {
    const heatIndex =
      -8.784 +
      1.611 * tempC +
      2.338 * rhPercent -
      0.146 * tempC * rhPercent +
      -0.0123 * tempC ** 2 -
      0.0164 * rhPercent ** 2 +
      0.00221 * tempC ** 2 * rhPercent +
      0.00073 * tempC * rhPercent ** 2 -
      0.000004 * tempC ** 2 * rhPercent ** 2;
    return Math.round(heatIndex * 10) / 10;
  }
  if (tempC <= 10 && windKmh >= 5) {
    const windChill =
      13.12 + 0.6215 * tempC - 11.37 * windKmh ** 0.16 + 0.3965 * tempC * windKmh ** 0.16;
    return Math.round(windChill * 10) / 10;
  }
  return tempC;
}

// IMD payloads mix IST wall-clock strings and UTC epoch fields depending on
// endpoint. Callers pass the source's declared tz; everything downstream of
// this function is IST.
export function toIst(dateInput, sourceTz = 'IST') {
  const d = new Date(dateInput);
  if (sourceTz === 'UTC') {
    return new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  }
  return d;
}

export function ugm3Band(value, thresholds) {
  for (const [band, max] of thresholds) {
    if (value <= max) return band;
  }
  return thresholds[thresholds.length - 1][0];
}

// CPCB AQI sub-index bands (national AQI scale, not raw pollutant concentration).
export const AQI_BANDS = [
  ['Good', 50],
  ['Satisfactory', 100],
  ['Moderate', 200],
  ['Poor', 300],
  ['Very Poor', 400],
  ['Severe', 500],
];

export function aqiBand(aqi) {
  return ugm3Band(aqi, AQI_BANDS);
}
