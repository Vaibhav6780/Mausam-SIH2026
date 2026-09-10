// CPCB real-time AQI via data.gov.in OGD catalog. Requires an API key
// (`DATA_GOV_IN_KEY` env var) registered day 1 per the plan; falls back to a
// mock reading, clearly labelled, when the key/network isn't available.

const RESOURCE_ID = '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'; // "Real time Air Quality Index" catalog

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`CPCB ${url} -> ${res.status}`);
  return res.json();
}

export async function getAqi(stationName) {
  const apiKey = process.env.DATA_GOV_IN_KEY;
  if (apiKey) {
    try {
      const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${apiKey}&format=json&filters[station]=${encodeURIComponent(stationName)}`;
      const json = await fetchJson(url);
      const record = json.records?.[0];
      if (record) {
        return {
          data: {
            station: record.station,
            aqi: Number(record.avg_index ?? record.aqi ?? 0),
            dominant_pollutant: record.pollutant_id ?? 'PM2.5',
            observed_at: record.last_update ?? new Date().toISOString(),
          },
          stale: false,
          source: 'live',
        };
      }
    } catch {
      // fall through to mock
    }
  }
  return {
    data: {
      station: stationName,
      aqi: 287,
      dominant_pollutant: 'PM2.5',
      observed_at: new Date().toISOString(),
    },
    stale: true,
    source: 'mock',
  };
}
