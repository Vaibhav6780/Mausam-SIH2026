// Personalization ranker: rule-based cold start + a simple contextual-bandit
// style weight nudge over impressions/taps. In production this runs on
// device (ONNX Runtime Mobile) over a persona vector that never leaves the
// phone; here it's the same scoring function run server-side for the demo,
// so the mobile client would only need to port this file.
//
// score = w1*affinity + w2*severity + w3*temporal_fit + w4*engagement_prior - w5*fatigue
// Safety override is handled upstream (overrides[] always renders above
// cards[]); this ranker only reorders cards[].

const DEFAULT_WEIGHTS = { affinity: 0.4, severity: 0.35, temporal: 0.1, engagement: 0.2, fatigue: 0.25 };

const SEVERITY_SCORE = { red: 1, orange: 0.7, yellow: 0.4, green: 0.1 };

function bandSeverity(card) {
  const band = (card.index?.band ?? '').toLowerCase();
  if (['severe', 'very poor', 'unsafe', 'red'].includes(band)) return 1;
  if (['poor', 'caution', 'orange'].includes(band)) return 0.7;
  if (['moderate', 'yellow'].includes(band)) return 0.4;
  return 0.15;
}

function temporalFit(card, hourOfDay) {
  // Commute/parent cards matter most in morning/evening windows.
  if (['commuter', 'parent_commute_window'].includes(card.type)) {
    const inWindow = (hourOfDay >= 6 && hourOfDay <= 10) || (hourOfDay >= 15 && hourOfDay <= 19);
    return inWindow ? 1 : 0.3;
  }
  if (card.type === 'fitness_run') return hourOfDay <= 10 || hourOfDay >= 16 ? 0.8 : 0.4;
  return 0.5;
}

export function rankCards({ cards, affinityVector, engagement = {}, fatigue = {}, weights = DEFAULT_WEIGHTS, hourOfDay = new Date().getHours() }) {
  const scored = cards.map((card) => {
    const affinity = card.affinity_tags.reduce((max, tag) => Math.max(max, affinityVector[tag] ?? 0), 0);
    const severity = bandSeverity(card);
    const temporal = temporalFit(card, hourOfDay);
    const eng = engagement[card.card_id] ?? 0.5;
    const shown = fatigue[card.card_id]?.shown ?? 0;
    const ignored = fatigue[card.card_id]?.ignored ?? 0;
    const fatiguePenalty = shown === 0 ? 0 : Math.min(1, ignored / shown);

    const score =
      weights.affinity * affinity +
      weights.severity * severity +
      weights.temporal * temporal +
      weights.engagement * eng -
      weights.fatigue * fatiguePenalty;

    return { ...card, _score: Math.round(score * 1000) / 1000 };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored;
}

// Thompson-sampling-style nudge: reward taps, decay on ignores. Kept as an
// in-memory per-session update for the demo (see plan risk: "bandit has no
// data to learn from in demo" -> seed synthetic tap history for the accounts).
export function updateEngagement(engagement, cardId, tapped) {
  const prior = engagement[cardId] ?? 0.5;
  const rate = 0.15;
  const next = tapped ? prior + rate * (1 - prior) : prior - rate * prior;
  return { ...engagement, [cardId]: Math.max(0, Math.min(1, Math.round(next * 1000) / 1000)) };
}
