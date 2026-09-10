# Session context — resume here

Working on SIH26076 "Mausam personalized homepage". Plan is `docs/plan.md`.
Repo: `C:\Users\LENOVO\Desktop\ZMausam\mausam-home`, pushed to
`https://github.com/Vaibhav6780/Mausam-SIH2026.git` (branch `main`).

## Live deployments

- **Backend**: `https://mausam-sih2026.onrender.com` (Render, free tier).
  Root Directory = `backend`, Build = `npm install`, Start = `npm start`.
  Verified working: `/v1/scenarios` and `/v1/home?account=amit` both return
  correct JSON. **Free tier spins down on inactivity — first request after
  idling takes 30-50s to wake up.** No environment variables are set
  (`DATA_GOV_IN_KEY`, `MAPPLS_CLIENT_ID` are both unset), so ingestion falls
  back to mock data everywhere — see "What data is actually flowing" below.
- **Vercel** (`https://weather-sih-2026.vercel.app/`) — **currently 404s**.
  User is deploying this separately (not something I set up). Root cause:
  Vercel is pointed at the repo root, which has no `index.html`/build
  output — the two candidate targets in this repo are `web/index.html`
  (plain static demo, needs Root Directory = `web`, Framework = Other) or
  the Flutter web build (`mobile/`, needs a build step Vercel doesn't know
  natively — would need a `vercel.json` running `flutter build web`).
  **Unresolved**: I asked the user which of these two they want served
  there and got interrupted before an answer. Ask again before touching
  Vercel config.

## What data is actually flowing (important — explained to user already)

Nothing live yet. Chain is: app → Render backend → ingestion modules
(`backend/src/ingest/{imd,cpcb,incois,mappls}.js`) which all fall back to
hardcoded mock constants because no real API keys are configured → OR
the currently-selected demo scenario (`backend/src/demo/scenarios.js`)
overrides that mock data entirely with a scripted fixture (fog/cyclone/
heatwave/frost). Only the on-device ranking in
`mobile/lib/ranker/ranker.dart` is "real" logic, not mocked. To get real
data: register a CPCB key at data.gov.in, set `DATA_GOV_IN_KEY` in Render's
Variables tab. IMD endpoints are called live in code but historically need
IP whitelisting (see plan §4.1) — untested against the real IMD API.

## Done and committed (chronological, latest first)

- `3441411` — `ApiClient` in `mobile/lib/api/api_client.dart` now defaults
  `baseUrl` to the deployed Render URL (`kDeployedBaseUrl` constant) instead
  of localhost/emulator addresses, with a 45s timeout to tolerate Render
  cold starts. Local dev can still override `baseUrl` explicitly.
- `27a0209` — Flutter app verified: `flutter analyze` clean, `flutter test`
  2/2 pass, `flutter build web` succeeds. Fixed a real bug where
  `OverrideBanner`'s field named `override` shadowed the `@override`
  annotation (renamed field to `data`). Added `flutter_lints` dev dep.
  Enabled permissive CORS on the backend (`backend/src/api/server.js`) so
  a Flutter web build on a different origin can reach the API.
- `1f5ba3c` — Flutter mobile app source added under `mobile/lib/` (models,
  api client, on-device ranker ported from `backend/src/ranker/rank.js`,
  cache, onboarding, card widgets, i18n stub). Matches plan §8 layout.
- `600d12b` — Backend (Node/Express, not the plan's FastAPI — no Python on
  the original dev machine) + web demo (`web/index.html`). 9/9 backend
  tests pass (`npm test` in `backend/`).

## Local toolchain state (on the ZMausam Desktop machine)

- Flutter SDK 3.27.1 manually extracted to `C:\dev\flutter` — **not on
  permanent PATH**, every shell needs
  `export PATH="/c/dev/flutter/bin:$PATH"` first.
- Only the **web** platform is scaffolded in `mobile/` (via
  `flutter create --platforms=web .`). No `android/` or `ios/` folders —
  no Android SDK, no JDK, no `adb` installed on this machine.
- `flutter devices` on this machine only sees Windows/Chrome/Edge — no
  phone has ever been detected here. The phone the user has the app
  installed on was set up via a **different PC** that already had
  Flutter/Android tooling.
- Started installing a JDK via winget for Android SDK setup, then got
  interrupted to pivot to backend deployment instead — nothing was left
  mid-install (the winget search ran, no package was actually installed).
- Tried installing the Railway CLI via npm (`@railway/cli`) — failed twice
  with `EPERM` on rmdir during postinstall (likely AV/file-lock on
  Windows), never got a working `railway` binary. Abandoned in favor of
  deploying via Render's web dashboard instead, which worked.

## Immediate next steps / open threads

1. **Vercel 404** — ask the user (again) whether `weather-sih-2026.vercel.app`
   should serve `web/index.html` (quick: set Root Directory = `web`,
   Framework Preset = Other) or the Flutter web build (needs a
   `vercel.json` with a `flutter build web` build command — more setup,
   would need Flutter available in Vercel's build image or a custom
   Docker/build script).
2. **Rebuild + reinstall on phone** — only possible today from whichever PC
   already has Flutter + Android SDK + the phone plugged in with USB
   debugging on. From that machine: `git pull` in the repo, then in
   `mobile/`: `flutter pub get && flutter run -d <device_id>`. This
   machine (ZMausam Desktop) cannot do this yet — no Android SDK/adb.
3. **Real data** — if the user wants live AQI instead of mock, register a
   data.gov.in CPCB key and add `DATA_GOV_IN_KEY` in Render's Variables
   tab (no code change needed, `backend/src/ingest/cpcb.js` already reads
   it). Mappls traffic (`backend/src/ingest/mappls.js`) has an env-var
   check but the actual authenticated call was never wired up — would need
   real implementation work, not just a key.

## Known loose ends from earlier

- Backend demo scenario state is global/server-side (`state.scenario` in
  `backend/src/api/routes/home.js`) — switching it from one client affects
  all clients hitting the same deployed backend. Fine for a single demo,
  worth knowing if multiple people hit the Render URL at once.
- `mobile/serve_static.js` is a throwaway local static server used only to
  smoke-test `flutter build web` output locally; not part of any real
  deployment path.
