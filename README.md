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

## Mobile app (Flutter, unbuilt)

`mobile/` contains real Flutter/Dart source targeting the plan's actual
stack (`lib/ranker`, `lib/cards`, `lib/cache`, `lib/i18n` per plan §8) — but
this machine has no Flutter SDK, so **it has not been built, analyzed, or
run**. Only `lib/`, `test/`, and `pubspec.yaml` exist; platform folders
(`android/`, `ios/`) are not generated. To actually build it elsewhere:

```
cd mobile
flutter create .        # generates android/ ios/ etc. around the existing lib/
flutter pub get
flutter test             # runs test/ranker_test.dart
flutter run               # ApiClient defaults to http://10.0.2.2:3000 (Android emulator
                           # loopback to the host); override baseUrl for a real device
```

Run `backend` first (`npm start` in `backend/`) so the app has something to
talk to. Key files:

- `lib/models/home_response.dart` — typed parse of the `/v1/home` contract
- `lib/ranker/ranker.dart` — Dart port of `backend/src/ranker/rank.js`; this
  is what actually personalizes the feed — the server sends unranked
  `cards[]`, this file reorders them from an on-device affinity vector that
  never leaves the phone (plan §3 rule 3)
- `lib/cache/home_cache.dart` — stale-while-revalidate cache for the offline
  demo beat
- `lib/onboarding/` — three-tap interest-chip onboarding, skippable, storing
  the affinity vector in `SharedPreferences`
- `lib/cards/override_banner.dart` — pinned safety warnings, visually
  distinct, always rendered above the ranked list
- `lib/i18n/strings.dart` — chrome-only translation stub standing in for the
  plan's Bhashini integration

Because none of this has been compiled, treat it as a strong starting point
to fix up under a real Flutter SDK, not as verified-working code.

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
