// INCOIS ERDDAP ingestion (wave/swell/SST/tide) for the beach-safety index.
// ERDDAP is NetCDF-heavy for grid queries; for a coastal point we ask for the
// JSON table response. Falls back to a mock reading if unreachable.

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`INCOIS ${url} -> ${res.status}`);
  return res.json();
}

export async function getCoastalPoint(lat, lon) {
  try {
    const url = `https://erddap.incois.gov.in/erddap/tabledap/wave_watch.json?time,waveHeight,wavePeriod,waveDirection,sst&latitude=${lat}&longitude=${lon}`;
    const json = await fetchJson(url);
    const row = json.table?.rows?.[0];
    if (row) {
      const [, waveHeight, wavePeriod, waveDirection, sst] = row;
      return { data: { wave_height_m: waveHeight, wave_period_s: wavePeriod, wave_direction_deg: waveDirection, sst_c: sst }, stale: false, source: 'live' };
    }
    throw new Error('empty table');
  } catch {
    return {
      data: {
        wave_height_m: 0.8,
        wave_period_s: 9,
        wave_direction_deg: 210,
        sst_c: 28.1,
        tide: { type: 'low', at: '14:20' },
      },
      stale: true,
      source: 'mock',
    };
  }
}
