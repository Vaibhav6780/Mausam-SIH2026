// IMD ingestion module.
//
// NOTE ON SCOPE: several IMD endpoints have historically required IP
// whitelisting (see docs/plan.md, section 4.1 "Day-1 risk"). This module
// exposes the real fetch functions AND a mock fallback per endpoint so a
// dead/unreachable endpoint never kills a card mid-demo - callers get
// `{ data, stale, source: 'live' | 'mock' }` either way.

const IMD_BASE = 'https://api.imd.gov.in/api/v1';

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`IMD ${url} -> ${res.status}`);
  return res.json();
}

async function withFallback(fetcher, mock) {
  try {
    const data = await fetcher();
    return { data, stale: false, source: 'live' };
  } catch {
    return { data: mock, stale: true, source: 'mock' };
  }
}

export function getCurrentWeather(stationId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/current_wx?id=${stationId}`),
    {
      station_id: stationId,
      mslp: 1006.2,
      wind_dir_code: 250,
      wind_speed_kmh: 14,
      temp_c: 33.5,
      wmo_code: '02',
      nebulosity: 4,
      humidity_pct: 58,
      rain_24h_mm: 0,
      observed_at: new Date().toISOString(),
    },
  );
}

export function getAwsData(stationId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/aws_data?id=${stationId}`),
    {
      station_id: stationId,
      lat: 28.6139,
      lon: 77.209,
      dew_point_c: 22.1,
      feel_like_c: 36.8,
      temp_max_c: 37.2,
      temp_min_c: 26.4,
      observed_at: new Date().toISOString(),
    },
  );
}

export function getCityForecast(cityId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/cityforecast?id=${cityId}`),
    {
      city_id: cityId,
      days: Array.from({ length: 7 }).map((_, i) => ({
        date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
        max_c: 34 - i * 0.4,
        min_c: 24 + i * 0.2,
        text: i % 3 === 0 ? 'Partly cloudy, chance of rain' : 'Generally clear',
        rh_0830_pct: 60,
        rh_1730_pct: 45,
      })),
    },
  );
}

export function getDistrictNowcast(districtId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/districtnowcast?id=${districtId}`),
    {
      district_id: districtId,
      issued_at: new Date().toISOString(),
      valid_hours: 3,
      events: [
        { category: 11, colour: 3, label: 'Fog', visibility_m: 180 },
        { category: 18, colour: 2, label: 'Lightning', probability_pct: 30 },
      ],
    },
  );
}

export function getDistrictWarning(districtId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/districtwarning?id=${districtId}`),
    {
      district_id: districtId,
      days: [
        { day: 1, code: 15, colour: 2 },
        { day: 2, code: 15, colour: 3 },
        { day: 3, code: 9, colour: 4 },
      ],
    },
  );
}

export function getSunMoon(lat, lon) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/sunmoon?lat=${lat}&lon=${lon}`),
    { sunrise: '06:12', sunset: '18:34', moonrise: '20:01', moonset: '08:47' },
  );
}

export function getHighwayNowcast(routeId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/highway_nowcast?route=${routeId}`),
    {
      route_id: routeId,
      segments: [
        { segment: 'NH-9 km 12-18', event: 'Dense fog', visibility_m: 190, valid_until: '09:00' },
      ],
    },
  );
}

export function getCoastalBulletin(zoneId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/coastalbulletin?zone=${zoneId}`),
    {
      zone_id: zoneId,
      sea_state: 'Moderate',
      wind_kt: 12,
      visibility_km: 6,
      port_signal: null,
      fishermen_warning: false,
    },
  );
}

export function getAgrometAdvisory(districtId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/agromet_advisory?id=${districtId}`),
    {
      district_id: districtId,
      issued_at: new Date().toISOString(),
      advisory: 'Cover nursery beds tonight; ground frost expected in low-lying fields.',
    },
  );
}

export function getStateDistrictRainfallForecast(districtId) {
  return withFallback(
    () => fetchJson(`${IMD_BASE}/state_district_rainfall_forecast?id=${districtId}`),
    {
      district_id: districtId,
      days: [
        { day: 1, category: 'E', pct_stations: 62 },
        { day: 2, category: 'N', pct_stations: 40 },
        { day: 3, category: 'D', pct_stations: 20 },
        { day: 4, category: 'N', pct_stations: 35 },
        { day: 5, category: 'NR', pct_stations: 5 },
      ],
    },
  );
}
