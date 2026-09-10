# mausam-home

Working scaffold for SIH26076 — personalized homepage for the Mausam app.
See `docs/plan.md` for the full build plan this implements against.

**Stack note:** the plan's target stack is FastAPI (Python) + Flutter. This
machine only has Node.js available, so the backend spine below is built in
Node/Express with a static web page standing in for the mobile client, so it
can actually run and be tested here. Porting `backend/src/` to FastAPI and
`web/` to Flutter widgets is mechanical — the ingestion/normalise/indices/
cards/ranker logic and the `/v1/home` contract are stack-agnostic.

## Run it

```
cd backend
npm install
npm start        # serves API + the demo web page on http://localhost:3000
npm test         # runs the index/safety-override/normaliser test suite
```

Open `http://localhost:3000` for the demo homepage: switch account, scenario
(fog / cyclone / heatwave / frost), and language from the header.

## What's implemented

- `backend/src/normalise/` — WMO codes, the warning-vs-nowcast colour
  inversion, unit/timezone conversion (plan §Appendix B, §3 rule 1)
- `backend/src/ingest/` — IMD/CPCB/INCOIS/Mappls fetchers, each with a
  labelled mock fallback so a dead/unwhitelisted endpoint never kills a card
- `backend/src/indices/` — the derived-index engine (AQIRisk w/ dust leading
  indicator, PollenProxy always labelled modelled, RunScore, BeachSafety with
  the non-negotiable warning override, CommuteRisk, FrostRisk/SowingWindow,
  ComfortIndex with widening uncertainty band, deterministic packing rules)
- `backend/src/cards/generateCards.js` — candidate card generation +
  `overrides[]` (pinned safety warnings, rendered above ranked cards, always)
- `backend/src/ranker/rank.js` — the rule-based ranker from plan §6
  (`affinity + severity + temporal_fit + engagement - fatigue`), plus a
  simple engagement-update function standing in for the on-device bandit
- `backend/src/demo/scenarios.js` — the four replay scenarios from plan §12
  and two demo accounts with different affinity vectors
- `web/index.html` — single-page demo client covering the 6 demo beats:
  dual accounts, why-chips, scenario switcher, safety override, language
  toggle, offline/"last updated" stamp, and the modelled-pollen chip

## Not implemented (left for the real build)

- Postgres/PostGIS/Timescale + Redis — the demo runs entirely in-memory
- FastAPI/Flutter ports of the same logic
- On-device ONNX ranker — the ranker function is written so it can be ported
  as-is, but currently runs server-side
- Real API keys for CPCB/Mappls/Bhashini (ingestion modules are wired for
  them via env vars, see `backend/src/ingest/*.js`)
