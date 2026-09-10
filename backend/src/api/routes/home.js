import { generateCards } from '../../cards/generateCards.js';
import { rankCards, updateEngagement } from '../../ranker/rank.js';
import { getScenario, DEMO_ACCOUNTS, SCENARIOS } from '../../demo/scenarios.js';

// In-memory demo state only - production stores affinity/engagement/fatigue
// on-device, never server-side (section 3, "rank on device").
const state = {
  scenario: 'clear',
  accounts: JSON.parse(JSON.stringify(DEMO_ACCOUNTS)),
};

export function registerHomeRoutes(app) {
  app.get('/v1/home', (req, res) => {
    const accountId = req.query.account ?? 'amit';
    const account = state.accounts[accountId] ?? state.accounts.amit;
    const scenario = getScenario(state.scenario);

    const { overrides, cards } = generateCards(scenario.source);
    const ranked = rankCards({
      cards,
      affinityVector: account.affinityVector,
      engagement: account.engagement,
      fatigue: account.fatigue,
    }).map(({ _score, ...card }) => ({ ...card, _debug_score: _score }));

    res.json({
      location: { district: 'Ghaziabad', station_id: '42182', station_name: 'Ghaziabad AWS' },
      generated_at: new Date().toISOString(),
      scenario: { id: state.scenario, label: scenario.label },
      account: { id: accountId, name: account.name },
      sources: [
        { name: 'IMD', fetched_at: new Date().toISOString(), stale: false },
        { name: 'CPCB', fetched_at: new Date().toISOString(), stale: false },
        { name: 'INCOIS', fetched_at: new Date().toISOString(), stale: false },
      ],
      overrides,
      cards: ranked,
    });
  });

  app.post('/v1/scenario', (req, res) => {
    const { scenario } = req.body ?? {};
    if (!scenario) return res.status(400).json({ error: 'scenario required' });
    state.scenario = scenario;
    res.json({ ok: true, scenario });
  });

  app.post('/v1/tap', (req, res) => {
    const { account: accountId = 'amit', cardId, tapped = true } = req.body ?? {};
    const account = state.accounts[accountId];
    if (!account || !cardId) return res.status(400).json({ error: 'account and cardId required' });
    account.engagement = updateEngagement(account.engagement, cardId, tapped);
    account.fatigue[cardId] = account.fatigue[cardId] ?? { shown: 0, ignored: 0 };
    account.fatigue[cardId].shown += 1;
    if (!tapped) account.fatigue[cardId].ignored += 1;
    res.json({ ok: true, engagement: account.engagement[cardId] });
  });

  app.get('/v1/scenarios', (_req, res) => {
    res.json({
      scenarios: Object.entries(SCENARIOS).map(([id, s]) => ({ id, label: s.label })),
      accounts: Object.entries(state.accounts).map(([id, a]) => ({ id, name: a.name })),
    });
  });
}
