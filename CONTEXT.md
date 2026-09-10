# Session context — resume here

Working on SIH26076 "Mausam personalized homepage". Plan is `docs/plan.md`.
Repo root: `C:\Users\LENOVO\Desktop\ZMausam\mausam-home` (git initialized,
not yet a GitHub remote).

## Done and committed

1. **Backend** (`backend/`, Node/Express, not the plan's FastAPI since this
   machine has no Python) — ingestion with mock fallbacks, normaliser
   (WMO/warning/nowcast codes incl. the colour inversion bug), derived-index
   engine, card generation with pinned safety overrides, rule-based ranker,
   4 demo scenarios + 2 demo accounts. 9/9 tests pass (`npm test` in
   `backend/`). Verified live in two browser tabs side by side — different
   card order per account, safety override pins red warnings above ranked
   cards under the cyclone scenario. Commit `600d12b`.
2. **Web demo** (`web/index.html`) — single-page client for the backend,
   covers the plan's 6 demo beats. Same commit.
3. **Flutter mobile app source** (`mobile/lib/`) — matches plan's mobile/
   layout (ranker/cards/cache/i18n). On-device ranker ported from
   `backend/src/ranker/rank.js`. Commit `1f5ba3c`.

## In progress — NOT yet committed

Installed Flutter SDK 3.27.1 to `C:\dev\flutter` (not on permanent PATH —
each shell needs `export PATH="/c/dev/flutter/bin:$PATH"` first) to actually
build/run the mobile app, since we'd only written it blind before. Ran
`flutter create --platforms=web .` inside `mobile/` to scaffold the missing
`web/`, `.idea/`, `analysis_options.yaml` etc. around the existing `lib/` —
this did NOT touch `lib/` or `pubspec.yaml`, but it added a stock
`test/widget_test.dart` (deleted, since it referenced a nonexistent `MyApp`
and had nothing to do with this app).

`flutter analyze` found and I fixed two real issues (not yet re-verified,
not yet committed):
- **`lib/cards/override_banner.dart`**: the class had a field named
  `override` (`final CardOverride override;`), which shadowed the
  `@override` annotation on `build()` and made analysis fail with
  "Annotation must be either a const variable reference or const
  constructor invocation". Renamed the field to `data`. Also updated the
  one call site in `lib/screens/home_screen.dart`
  (`OverrideBanner(override: o)` → `OverrideBanner(data: o)`).
- Replaced deprecated `color.withOpacity(0.12)` with
  `color.withValues(alpha: 0.12)` in the same file.
- Added `flutter_lints: ^4.0.0` to `pubspec.yaml` dev_dependencies, because
  the generated `analysis_options.yaml` includes
  `package:flutter_lints/flutter.yaml` and pub get would otherwise fail to
  resolve it.

**Next step, exactly where this stopped:** re-run `flutter pub get` then
`flutter analyze` in `mobile/` to confirm those three fixes actually
resolve cleanly (this was interrupted mid-command, never got output).

## Remaining steps to finish "test the Flutter app"

1. `export PATH="/c/dev/flutter/bin:$PATH"` then in `mobile/`:
   `flutter pub get && flutter analyze`
2. `flutter test` (runs `test/ranker_test.dart`)
3. Start the backend if not already running: `cd ../backend && npm start`
   (serves API + web demo on `http://localhost:3000`)
4. `flutter run -d chrome` in `mobile/` to actually launch the app in a
   Chrome tab and click through it (account switch, scenario switch,
   language toggle, offline toggle, why-chips, safety override banner)
5. Fix whatever `flutter run` surfaces that `analyze`/`test` didn't catch —
   this app has never actually been rendered yet.
6. Once verified, `git add -A && git commit` the fixes above plus whatever
   `flutter create` added (`mobile/web/`, `mobile/.idea/` — consider
   whether `.idea/` should be gitignored instead of committed;
   `mobile/.gitignore` from `flutter create` already excludes `.dart_tool/`,
   build output, etc. but the repo's top-level `.gitignore` does not yet
   reference it — check for conflicts before committing).

## Known loose ends / things to double check later

- `ApiClient` in `lib/api/api_client.dart` defaults to `http://10.0.2.2:3000`
  (Android emulator loopback) — wrong base URL for `flutter run -d chrome`,
  which needs `http://localhost:3000` instead. Will need a platform check or
  a run-arg override before the web build can actually talk to the backend.
- Backend demo scenario state is global/server-side (`state.scenario` in
  `backend/src/api/routes/home.js`) — switching it from one client affects
  all clients. Fine for a single-demo-machine hackathon demo, worth knowing.
- A Node server may still be running in the background from the earlier
  browser demo (`node src/api/server.js`, logged to
  `/tmp/mausam-server.log`) — check with
  `netstat -ano | grep 3000` / `wmic process where "name='node.exe'"`
  before starting a new one.
- Flutter SDK at `C:\dev\flutter` is a manual extract, not on permanent
  PATH and not registered with winget/choco — if the user wants it
  permanently available, add `C:\dev\flutter\bin` to their System PATH.
- `mobile/android/`, `mobile/ios/` etc. were never generated (only
  `--platforms=web` was scaffolded) since there's no Android SDK/Xcode on
  this machine. A real device/emulator build still needs those installed
  separately.
