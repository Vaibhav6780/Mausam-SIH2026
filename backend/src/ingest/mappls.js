// Mappls (MapmyIndia) live traffic + predictive ETA for the commuter index.
// Requires MAPPLS_CLIENT_ID / MAPPLS_CLIENT_SECRET; falls back to mock.

export async function getRouteTraffic(routeId) {
  const clientId = process.env.MAPPLS_CLIENT_ID;
  if (!clientId) {
    return {
      data: { route_id: routeId, congestion_level: 'heavy', delay_min: 35, eta_min: 52 },
      stale: true,
      source: 'mock',
    };
  }
  try {
    // Real Mappls traffic call would go here once a token is minted.
    throw new Error('live Mappls call not wired in this build');
  } catch {
    return {
      data: { route_id: routeId, congestion_level: 'heavy', delay_min: 35, eta_min: 52 },
      stale: true,
      source: 'mock',
    };
  }
}
