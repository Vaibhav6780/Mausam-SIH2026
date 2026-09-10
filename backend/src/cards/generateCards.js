import { aqiRisk } from '../indices/aqiRisk.js';
import { pollenProxy } from '../indices/pollenProxy.js';
import { runScore } from '../indices/runScore.js';
import { beachSafety } from '../indices/beachSafety.js';
import { commuteRisk } from '../indices/commuteRisk.js';
import { frostRisk, sowingWindow } from '../indices/frost.js';
import { comfortIndex, packingRules } from '../indices/comfort.js';
import { warningColour, warningLabel, isSevere } from '../normalise/warningCodes.js';

// Turns normalised source data into the candidate card set: index + severity +
// affinity + TTL + why. `overrides[]` (safety warnings) are generated
// separately and always rendered above `cards[]` - see section 9 API contract.

function severityFromBand(band) {
  const map = {
    Good: 'green', Satisfactory: 'green', Moderate: 'yellow', Poor: 'orange', 'Very Poor': 'red', Severe: 'red',
    Safe: 'green', Caution: 'yellow', Unsafe: 'red',
    Low: 'green', Moderate2: 'yellow', High: 'orange', 'Very High': 'red',
  };
  return map[band] ?? 'green';
}

export function generateCards(source) {
  const cards = [];
  const overrides = [];

  // --- Safety overrides: district warnings, pinned regardless of affinity ---
  for (const day of source.districtWarning.days) {
    const colour = warningColour(day.colour);
    if (isSevere(colour)) {
      overrides.push({
        card_id: `warn_${warningLabel(day.code).toLowerCase().replace(/\s+/g, '_')}_d${day.day}`,
        severity: colour,
        pinned: true,
        title: `${warningLabel(day.code)} warning`,
        body: `Day ${day.day}: ${warningLabel(day.code)} warning in effect.`,
        source: 'IMD District Warning',
      });
    }
  }

  // --- Health: AQI + dust leading indicator ---
  const dustPending = source.districtNowcast.events.some((e) => e.category === 7 || e.category === 10);
  const aqi = aqiRisk({ aqi: source.aqi.aqi, dominantPollutant: source.aqi.dominant_pollutant, dustStormPending: dustPending });
  cards.push({
    card_id: 'aqi_health',
    type: 'health_aqi',
    index: { name: aqi.name, value: aqi.value, band: aqi.band, confidence: aqi.confidence },
    verdict: aqi.verdict,
    why: `AQI is ${aqi.value} and you follow air quality.`,
    features: [aqi.value / 500, aqi.confidence, dustPending ? 1 : 0],
    affinity_tags: ['health'],
    ttl_seconds: 3600,
    source: { name: 'CPCB', station: source.aqi.station, distance_km: source.aqi.distance_km ?? null },
    modelled: false,
  });

  // --- Health: Pollen proxy ---
  const pollen = pollenProxy({
    month: new Date().getMonth() + 1,
    windKmh: source.currentWx.wind_speed_kmh,
    rhPercent: source.currentWx.humidity_pct,
    rain24hMm: source.currentWx.rain_24h_mm,
    tempC: source.currentWx.temp_c,
  });
  cards.push({
    card_id: 'pollen_health',
    type: 'health_pollen',
    index: { name: pollen.name, value: pollen.value, band: pollen.band, confidence: pollen.confidence },
    verdict: pollen.verdict,
    why: 'You follow air quality and outdoor allergies.',
    features: [pollen.value / 100, pollen.confidence, 0],
    affinity_tags: ['health'],
    ttl_seconds: 3600,
    source: { name: 'Modelled (phenology + weather)', station: null, distance_km: null },
    modelled: true,
  });

  // --- Fitness: RunScore ---
  const run = runScore({ hourlyForecast: source.hourlyForecast, aqi: source.aqi.aqi });
  cards.push({
    card_id: 'run_fitness',
    type: 'fitness_run',
    index: { name: run.name, value: run.best_window.score, band: run.best_window.score > 70 ? 'Good' : 'Fair', confidence: run.confidence },
    verdict: run.verdict,
    why: 'You follow fitness and running.',
    features: [run.best_window.score / 100, run.confidence, run.best_window.hour / 24],
    affinity_tags: ['fitness'],
    ttl_seconds: 3600,
    hourly: run.hourly,
    source: { name: 'IMD AWS + CPCB', station: source.currentWx.station_id, distance_km: 4.2 },
    modelled: false,
  });

  // --- Beach ---
  const beach = beachSafety(source.coastal);
  cards.push({
    card_id: 'beach_safety',
    type: 'beach_safety',
    index: { name: beach.name, value: beach.value, band: beach.band, confidence: beach.confidence },
    verdict: beach.verdict,
    why: 'You follow beach and coastal conditions.',
    features: [beach.value / 100, beach.confidence, beach.overridden_by_warning ? 1 : 0],
    affinity_tags: ['beach'],
    ttl_seconds: 1800,
    source: { name: 'INCOIS + IMD Coastal Bulletin', station: null, distance_km: null },
    modelled: false,
  });

  // --- Commuter ---
  const commute = commuteRisk({ highwaySegments: source.highway.segments, traffic: source.traffic });
  cards.push({
    card_id: 'commute_risk',
    type: 'commuter',
    index: { name: commute.name, value: commute.eta_min, band: commute.band, confidence: commute.confidence },
    verdict: commute.verdict,
    why: 'You follow your saved commute route.',
    features: [commute.eta_min / 120, commute.confidence, commute.band === 'red' ? 1 : commute.band === 'orange' ? 0.5 : 0],
    affinity_tags: ['commuter'],
    ttl_seconds: 900,
    source: { name: 'IMD Highway Nowcast + Mappls', station: null, distance_km: null },
    modelled: false,
  });

  // --- Parents: commute window risk reuses commuteRisk over school windows ---
  cards.push({
    card_id: 'parent_school_window',
    type: 'parent_commute_window',
    index: { name: 'CommuteWindowRisk', value: commute.eta_min, band: commute.band, confidence: commute.confidence },
    verdict: commute.band === 'green' ? 'Safe to send kids on the usual school run.' : commute.verdict,
    why: 'You follow school-run safety.',
    features: [commute.band === 'red' ? 1 : commute.band === 'orange' ? 0.5 : 0, commute.confidence, 0],
    affinity_tags: ['parent'],
    ttl_seconds: 900,
    source: { name: 'IMD District Nowcast', station: null, distance_km: null },
    modelled: false,
  });

  // --- Agriculture: frost + sowing window ---
  const frost = frostRisk({ districtWarningDays: source.districtWarning.days, agromet: source.agromet });
  cards.push({
    card_id: 'agri_frost',
    type: 'agri_frost',
    index: { name: frost.name, value: frost.active ? 1 : 0, band: frost.active ? 'Active' : 'None', confidence: frost.confidence },
    verdict: frost.verdict,
    why: 'You follow agriculture and crop advisories.',
    features: [frost.active ? 1 : 0, frost.confidence, 0],
    affinity_tags: ['agriculture'],
    ttl_seconds: 3600 * 6,
    source: { name: 'IMD District Warning + Agromet Advisory', station: null, distance_km: null },
    modelled: false,
  });

  const sowing = sowingWindow({ rainfallForecastDays: source.rainfallForecast.days });
  cards.push({
    card_id: 'agri_sowing',
    type: 'agri_sowing',
    index: { name: sowing.name, value: sowing.favourable ? 1 : 0, band: sowing.favourable ? 'Favourable' : 'Unfavourable', confidence: sowing.confidence },
    verdict: sowing.verdict,
    why: 'You follow agriculture and sowing windows.',
    features: [sowing.favourable ? 1 : 0, sowing.confidence, 0],
    affinity_tags: ['agriculture'],
    ttl_seconds: 3600 * 6,
    source: { name: 'IMD 5-day District Rainfall Forecast', station: null, distance_km: null },
    modelled: false,
  });

  // --- Travel: destination outlook + packing ---
  const packing = packingRules({ forecastDays: source.cityForecast.days.map((d) => ({ maxC: d.max_c, minC: d.min_c, rainProb: /rain/i.test(d.text) ? 60 : 10 })) });
  cards.push({
    card_id: 'travel_outlook',
    type: 'travel_outlook',
    index: { name: 'DestinationOutlook', value: packing.rainy_days, band: packing.rainy_days > 2 ? 'Wet' : 'Dry', confidence: 0.7 },
    verdict: packing.verdict,
    why: 'You have an upcoming trip saved.',
    features: [packing.rainy_days / packing.total_days, 0.7, 0],
    affinity_tags: ['travel'],
    ttl_seconds: 3600 * 6,
    packing_items: packing.items,
    source: { name: 'IMD 7-day City Forecast + 5-day District Warning', station: null, distance_km: null },
    modelled: false,
  });

  // --- Events: comfort index with uncertainty band ---
  const comfort = comfortIndex({
    days: source.cityForecast.days.map((d) => ({ date: d.date, tempC: (d.max_c + d.min_c) / 2, rhPercent: d.rh_1730_pct, windKmh: source.currentWx.wind_speed_kmh, rainProb: /rain/i.test(d.text) ? 60 : 10 })),
  });
  cards.push({
    card_id: 'events_comfort',
    type: 'events_comfort',
    index: { name: 'ComfortIndex', value: comfort[0].score, band: comfort[0].score > 70 ? 'Good' : 'Fair', confidence: 1 - (comfort[0].confidence_band[1] - comfort[0].confidence_band[0]) / 100 },
    verdict: `Comfort score ${comfort[0].score}/100 today (uncertainty widens further out).`,
    why: 'You have an event planned.',
    features: [comfort[0].score / 100, 0.6, 0],
    affinity_tags: ['events'],
    daily: comfort,
    ttl_seconds: 3600 * 3,
    source: { name: 'IMD 7-day City Forecast', station: null, distance_km: null },
    modelled: false,
  });

  return { overrides, cards };
}
