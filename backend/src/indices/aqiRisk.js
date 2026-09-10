import { aqiBand } from '../normalise/units.js';

// AQIRisk: CPCB AQI + dominant pollutant + dust-storm nowcast as a LEADING
// indicator (PM10 spikes hours before CPCB's hourly average catches it -
// section 5 cross-cutting rule). A pending dust-storm nowcast event bumps the
// band up one step and is disclosed in `why`.
export function aqiRisk({ aqi, dominantPollutant, dustStormPending }) {
  let band = aqiBand(aqi);
  let leadingIndicator = false;
  const bands = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'];
  if (dustStormPending && bands.indexOf(band) < bands.length - 1) {
    band = bands[bands.indexOf(band) + 1];
    leadingIndicator = true;
  }

  const verdictByBand = {
    Good: 'Air quality is good. Fine for outdoor activity.',
    Satisfactory: 'Air quality is satisfactory. Fine for most people outdoors.',
    Moderate: 'Sensitive groups should limit prolonged outdoor exertion.',
    Poor: 'Avoid outdoor exercise 7-10 AM.',
    'Very Poor': 'Avoid outdoor activity; sensitive groups should stay indoors.',
    Severe: 'Stay indoors. Health emergency for at-risk groups.',
  };

  return {
    name: 'AQIRisk',
    value: aqi,
    band,
    confidence: leadingIndicator ? 0.7 : 0.9,
    dominant_pollutant: dominantPollutant,
    leading_indicator: leadingIndicator,
    verdict: verdictByBand[band] + (leadingIndicator ? ' (dust-storm nowcast suggests rising PM10)' : ''),
  };
}
