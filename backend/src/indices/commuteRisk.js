// CommuteRisk: Highway Nowcast + Highway 5-day + Mappls live traffic on the
// user's saved route, plus fog/visibility. Queried only for the user-set
// commute windows (parent persona reuses this for school-run windows).
export function commuteRisk({ highwaySegments, traffic }) {
  const fogSegment = highwaySegments.find((s) => /fog/i.test(s.event) && s.visibility_m < 500);

  let band = 'green';
  const reasons = [];
  if (fogSegment) {
    band = fogSegment.visibility_m < 200 ? 'red' : 'orange';
    reasons.push(`${fogSegment.event} on ${fogSegment.segment}, visibility <${fogSegment.visibility_m}m until ${fogSegment.valid_until}`);
  }
  if (traffic.congestion_level === 'heavy') {
    band = band === 'red' ? band : 'orange';
    reasons.push(`Heavy traffic, +${traffic.delay_min} min delay expected`);
  }

  const verdict =
    reasons.length > 0
      ? `${reasons.join('. ')}.`
      : 'Clear roads, no delays expected.';

  return {
    name: 'CommuteRisk',
    band,
    confidence: 0.8,
    eta_min: traffic.eta_min,
    verdict,
  };
}
