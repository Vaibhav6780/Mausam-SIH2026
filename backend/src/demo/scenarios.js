// Scenario switcher: replays archived-style source payloads so the demo
// doesn't depend on interesting weather existing on presentation day
// (section 12/13). Each scenario is a full `source` object shaped exactly
// like what cards/generateCards.js expects.

const baseSource = () => ({
  currentWx: { station_id: '42182', wind_speed_kmh: 12, temp_c: 32, humidity_pct: 55, rain_24h_mm: 0 },
  aqi: { station: 'Vasundhara', aqi: 180, dominant_pollutant: 'PM2.5' },
  districtNowcast: { events: [] },
  districtWarning: { days: [{ day: 1, code: 9, colour: 4 }, { day: 2, code: 9, colour: 4 }, { day: 3, code: 9, colour: 4 }] },
  hourlyForecast: Array.from({ length: 24 }).map((_, hour) => ({
    hour, tempC: 22 + 10 * Math.sin(((hour - 6) / 24) * Math.PI), rhPercent: 55, windKmh: 10, precipProb: 10, isDaylight: hour >= 6 && hour <= 18,
  })),
  coastal: { waveHeightM: 0.8, wavePeriodS: 9, sstC: 28.1, tide: { type: 'low', at: '14:20' }, portSignal: null, fishermenWarning: false },
  highway: { segments: [] },
  traffic: { congestion_level: 'light', delay_min: 5, eta_min: 22 },
  agromet: { advisory: null },
  rainfallForecast: { days: [{ category: 'N' }, { category: 'N' }, { category: 'E' }, { category: 'N' }, { category: 'NR' }] },
  cityForecast: { days: Array.from({ length: 7 }).map((_, i) => ({ date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10), max_c: 33, min_c: 24, text: 'Generally clear', rh_1730_pct: 45 })) },
});

export const SCENARIOS = {
  clear: { label: 'Clear day (baseline)', source: baseSource() },

  delhi_fog: {
    label: 'Delhi fog morning',
    source: (() => {
      const s = baseSource();
      s.districtNowcast.events = [{ category: 11, colour: 3, label: 'Fog', visibility_m: 180 }];
      s.districtWarning.days = [{ day: 1, code: 15, colour: 1 }, { day: 2, code: 15, colour: 2 }, { day: 3, code: 9, colour: 4 }];
      s.highway.segments = [{ segment: 'NH-9 km 12-18', event: 'Dense fog', visibility_m: 190, valid_until: '09:00' }];
      s.traffic = { congestion_level: 'heavy', delay_min: 35, eta_min: 57 };
      return s;
    })(),
  },

  cyclone: {
    label: 'Cyclone on east coast',
    source: (() => {
      const s = baseSource();
      s.districtWarning.days = [{ day: 1, code: 2, colour: 1 }, { day: 2, code: 4, colour: 1 }, { day: 3, code: 9, colour: 4 }];
      s.coastal = { waveHeightM: 4.2, wavePeriodS: 5, sstC: 27.4, tide: { type: 'high', at: '11:05' }, portSignal: 'Signal 10', fishermenWarning: true };
      return s;
    })(),
  },

  heatwave: {
    label: 'North India heatwave',
    source: (() => {
      const s = baseSource();
      s.currentWx.temp_c = 44;
      s.currentWx.humidity_pct = 20;
      s.districtWarning.days = [{ day: 1, code: 9, colour: 1 }, { day: 2, code: 9, colour: 1 }, { day: 3, code: 9, colour: 2 }];
      s.hourlyForecast = s.hourlyForecast.map((h) => ({ ...h, tempC: h.tempC + 14 }));
      return s;
    })(),
  },

  punjab_frost: {
    label: 'Punjab frost night',
    source: (() => {
      const s = baseSource();
      s.currentWx.temp_c = 4;
      s.districtWarning.days = [{ day: 1, code: 14, colour: 1 }, { day: 2, code: 14, colour: 2 }, { day: 3, code: 9, colour: 4 }];
      s.agromet = { advisory: 'Cover nursery beds tonight; ground frost expected in low-lying fields.' };
      return s;
    })(),
  },
};

export function getScenario(name) {
  return SCENARIOS[name] ?? SCENARIOS.clear;
}

// Two demo accounts, same city, different affinity vectors -> different card
// order (success criterion #1).
export const DEMO_ACCOUNTS = {
  amit: {
    name: 'Amit (fitness + health)',
    affinityVector: { health: 0.9, fitness: 0.95, beach: 0.1, commuter: 0.3, parent: 0.1, agriculture: 0.05, travel: 0.2, events: 0.3 },
    engagement: { run_fitness: 0.8, aqi_health: 0.6 },
    fatigue: {},
  },
  priya: {
    name: 'Priya (parent + commuter)',
    affinityVector: { health: 0.3, fitness: 0.1, beach: 0.05, commuter: 0.9, parent: 0.95, agriculture: 0.05, travel: 0.3, events: 0.2 },
    engagement: { commute_risk: 0.85, parent_school_window: 0.9 },
    fatigue: {},
  },
};
