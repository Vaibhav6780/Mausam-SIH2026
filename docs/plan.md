# Mausam Personalized Homepage — Build Plan

**PS ID:** SIH26076
**Title:** Development of personalized homepage for 'Mausam' mobile application
**Sponsor:** Ministry of Earth Sciences (MoES)
**Track:** Software · Theme: Miscellaneous
**Codename:** `mausam-home`

---

## 1. The thesis

Mausam already has authoritative data and 10 lakh+ downloads with a ~3.1 rating. The gap is not data — it's that every user gets the same undifferentiated wall of nowcasts, radar tiles and district warnings, and has to know what "Cat 9 nowcast" or "orange warning" means for their own life.

**We are building a decision layer, not a weather app.**

The homepage answers *"what should I do in the next 6 hours"* instead of *"what is the temperature."* Every persona in the PS is a different decision, and every decision needs a derived index, not a raw variable.

> **Pitch line:** We turn IMD's existing products into per-user decisions, with safety overrides and honest uncertainty.

### Non-goals
- Building our own forecast model (IMD/NCMRWF already do this; competing looks naive)
- Replacing the Mausam app wholesale — we ship a homepage module that drops into it
- Pretty UI over generic global weather data (this is the losing entry)

---

## 2. Success criteria

| # | Criterion | How we prove it |
|---|---|---|
| 1 | Homepage visibly reorders per user | Two demo accounts, same city, different card order |
| 2 | Built on IMD's own APIs | Source badge on every card |
| 3 | Safety never suppressed by personalization | Trigger a red warning live in demo mode |
| 4 | Works offline / low bandwidth | Airplane mode demo with "last updated" stamp |
| 5 | Multilingual | Language switch mid-demo (Hindi + one regional) |
| 6 | Honest about data gaps | Pollen slide |

---

## 3. Architecture

```
IMD API      ─┐
CPCB/OGD     ─┤
INCOIS ERDDAP─┼→ Ingestion workers → Normaliser → TimescaleDB/PostGIS
Mappls       ─┤   (per-source cron)   (canonical    + Redis (per-source TTL)
MOSDAC/Bhuvan─┘                        schema)
                                            │
                                            ▼
                                 ┌────────────────────────┐
                                 │  Derived Index Engine   │  ← core IP
                                 │  comfort / run-window / │
                                 │  commute-risk / frost / │
                                 │  beach-safety / pollen  │
                                 └───────────┬────────────┘
                                             ▼
                                 ┌────────────────────────┐
                                 │  Card Candidate Set     │
                                 │  index + severity +     │
                                 │  affinity + TTL + why   │
                                 └───────────┬────────────┘
                                             ▼
                            feature vector → device → on-device ranker
                                                          ↓
                                                  Personalized homepage
```

### Three rules that must not be broken

1. **Normalise at ingest.** IMD returns wind direction as coded degrees, weather as WMO codes 01–99, warnings as ints with separate colour fields, times mixed IST/UTC. INCOIS uses knots and NetCDF. CPCB uses µg/m³ with 8h vs 24h averaging depending on pollutant. One translation layer, or persona logic drowns in special cases.
2. **Cache with per-source TTL.** IMD's own docs ask integrators to cache during peak events — precisely when their servers are hammered. Degrade gracefully: cached data + visible "last updated 47 min ago", never a spinner.
3. **Rank on device.** Persona vector, symptom logs and tap history never leave the phone. Privacy argument for a government health-adjacent app + instant cold start offline.

---

## 4. Data sources

### 4.1 IMD — `https://api.imd.gov.in/api/v1/...` (primary, no key in current docs)

| Endpoint | Payload | Feeds |
|---|---|---|
| `cityforecast` / `cityforecastloc` | 7-day max/min, text forecast, past-24h rain, RH@0830 & 1730, sun/moon rise-set | Everyone, travelers, events |
| `current_wx` | MSLP, wind dir/speed, temp, WMO code, nebulosity, humidity, 24h rain | Baseline |
| `aws_data` (`?id=` or `?sid=` state) | Station lat/lon, dew point, **"Feel Like"**, min/max | Hyperlocal, heat |
| `districtnowcast` / `stationnowcast` | 3-hourly, 19 categories: rain bands, TS gust bands, **dust storm w/ visibility thresholds**, lightning probability bands, colour 1–4 | Commuter, parent, fitness |
| `districtwarning` | 5-day, 17 codes incl. **Fog(15)**, **Ground Frost(14)**, Heat Wave(9), Cold Wave(12), Hailstorm(5) | Parent, travel, agri |
| `state_district_rainfall_forecast` | 5-day district rain distribution + % stations | Agri, events |
| `subdivisionwarning`, `subdivision_rainfall_forecast` | Regional rollups | Travel |
| `districtrainfall` / `staterainfall` | Actual vs normal, departure %, category LE/E/N/D/LD/NR | Agri |
| `sunmoon?lat=&lon=` | Sunrise/sunset by coordinate | Fitness |
| **Highway Nowcast + Highway 5-day** | NHAI road-level warnings | **Commuter — underused, high value** |
| `seabulletin`, `coastalbulletin`, `portwarning`, Fishermen Warning | Sea state, wind (knots), visibility, port signals | Beach |
| `basinqpf` | River basin QPF | Flood context |
| Agromet Advisory | GKMS bulletins from IMD agromet field units | Agri |
| Mausamgram, Radar Image, Lightning, Cyclone track/wind/COU | Point forecast, imagery, cyclone geometry | Severe weather |

> **Day-1 risk:** some IMD endpoints have historically required **IP whitelisting**. Test every endpoint we depend on in the first 2 hours. Keep a labelled fallback wired so a dead endpoint never kills a card mid-demo.

### 4.2 Gap fills

| Need | Source | Notes |
|---|---|---|
| AQI | **CPCB via data.gov.in** ("Real time Air Quality Index" catalog) | Free API key, hourly, station-level, 8 pollutants, dominant pollutant derivable. Register **day 1**, key isn't instant |
| AQI forecast | IITM/SAFAR, MoES Delhi-NCR air quality EWS | Optional |
| UV index | Open-Meteo (CAMS/GFS) | Or compute from solar zenith + column ozone |
| Wave/swell/SST/currents/**tides** | **INCOIS** — `erddap.incois.gov.in` (RESTful JSON/CSV), OSF/INDOFOS 5–7 day | Also MoES. Good optics |
| Soil moisture | data.gov.in district daily; MOSDAC Soil Wetness Index (SMAP-derived); ISRO EOS-04 500 m | Open-Meteo `soil_moisture_0_to_7cm` as gap-filler |
| Traffic | **Mappls (MapmyIndia)** live traffic + predictive ETA | Indian, govt-used, data resident in India. Prefer over Google |
| Land cover | Bhuvan API (`bhuvan-app1.nrsc.gov.in/api/`) | Pollen proxy input |
| Language | **Bhashini / ULCA** — 22 languages, Flutter SDK | Free non-commercial |

### 4.3 The pollen gap — handle it explicitly

**India is not in Google Pollen API's 65-country coverage list.** Open-Meteo's pollen variables come from the CAMS *European* ensemble — Europe only. There is no national pollen network comparable to CPCB's air network.

We ship a **Pollen Risk Proxy**, labelled as modelled, not observed:
- Regional flora phenology calendar — Parthenium, *Prosopis juliflora*, *Holoptelea*, Cassia, Amaranthus (documented major Indian aeroallergens; cite per-city aerobiological survey literature)
- Modulated by wind speed, RH, recent rainfall (rain scavenges pollen), temperature, Bhuvan land cover
- Explicit disclaimer in-card: *"Modelled estimate — India has no national pollen monitoring network"*
- Optional symptom logging to calibrate

This is a slide, not an embarrassment. It demonstrates scientific honesty to a panel of scientists and flags a real national data gap to the ministry that owns it.

---

## 5. Derived index engine

Universal pattern: **raw variables → derived index → plain-language verdict → notification trigger.** Never show a number without a verdict.

| Persona | Index | Inputs | Verdict example |
|---|---|---|---|
| Health | `AQIRisk`, `PollenProxy` | CPCB AQI + dominant pollutant, UV, RH (AWS), dust-storm nowcast cats 5/10/32, phenology model | "AQI 287 (Poor), PM2.5 dominant. Avoid outdoor exercise 7–10 AM." |
| Fitness | `RunScore(t)`, hourly 0–24 | Apparent temp ("Feel Like"), AQI, UV, precip nowcast prob, wind, daylight from `/sunmoon` | 24h heat strip, best 2h window highlighted |
| Beach | `BeachSafety` | INCOIS wave height/period/direction, SST, currents, tides; IMD coastal bulletin sea state, port signal, fishermen warning | "Wave 0.8 m, period 9 s, water 28°C. Low tide 14:20." |
| Travel | `DestinationOutlook` + packing rules | 7-day forecast + 5-day district warnings per saved destination | "Carry a raincoat — 4 of 5 days show widespread rain" |
| Parents | `CommuteWindowRisk` × 2 windows | Nowcast queried for user-set windows only; fog(15), visibility thresholds, TS + lightning bands | Green/amber/red per window, nothing else |
| Agriculture | `SoilMoistureStatus`, `FrostRisk`, `SowingWindow` | Soil moisture, 5-day rain distribution, **IMD Ground Frost warning(14)**, cumulative rainfall departure category, **Agromet Advisory passthrough** | "Frost warning tonight — cover seedlings" |
| Commuter | `CommuteRisk` | **Highway Nowcast + Highway 5-day**, Mappls live traffic on saved route, fog/visibility | "Dense fog on NH-9 till 09:00, visibility <200 m. Delay 45 min or expect +35 min." |
| Events | `ComfortIndex` 0–100 + confidence band | Apparent temp, rain probability, wind, humidity over date range | Score per day, band widens with lead time |

### Cross-cutting index rules
- **Dust-storm nowcast is a leading indicator for AQI** — PM10 spikes hours before CPCB's hourly average catches it. Wire this link; it's free insight.
- **Beach: an active fishermen warning or port signal forces the block red and suppresses all "good conditions" copy.** Rip currents kill; no index overrides an official warning.
- **Events: show the uncertainty band.** Mission Mausam explicitly names uncertainty communication as an unsolved need — quote it back.
- **Travel packing: LLM phrases, never computes.** Deterministic rule table produces the items; language model only renders the sentence. Hallucinated weather in a government app is a catastrophic failure mode and judges will probe for it.

---

## 6. Personalization engine

### Multi-persona, not single-persona
A parent who runs and gardens is one user, not three. Interests are a **multi-label affinity vector**. Single-category persona modelling is the most common design mistake on this PS.

### Onboarding
Three taps max: interest chips → location → optional commute route. Fully skippable, with geography defaults (Puri user gets beach; Ludhiana user gets frost + fog).

### Ranking

```
score = w1 * affinity(persona_vector, card)
      + w2 * severity(current_index_value)      # dominant term
      + w3 * temporal_fit(time_of_day, card)
      + w4 * engagement_prior(tap_history)
      - w5 * fatigue(shown_count, ignored_count)
```

- **Cold start:** hand-tuned rule-based weights
- **Learning:** contextual bandit (LinUCB or Thompson sampling) over card impressions and taps. **Not** a deep model — no training data, 36 hours, and a bandit is more defensible and honest about explore/exploit
- **Runs on device**, ONNX Runtime Mobile

### Safety override (non-negotiable)
Any red or orange IMD warning **pins to top** regardless of affinity, engagement or bandit state. Personalization never suppresses a cyclone warning. This gets its own slide with the word "override" on it — it's what separates a consumer weather app from a government warning system.

### Explainability
Every card carries a one-line *why*: "Shown because AQI is 287 and you follow air quality." Trust is a feature; it also makes the ranker auditable.

---

## 7. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Mobile | **Flutter** | One codebase, strong offline, Bhashini ships a Flutter SDK for 22-language auto-translation. *Use React Native instead only if the team already knows it — do not learn a framework during a hackathon* |
| Backend | **FastAPI (Python)** | Index models + bandit are Python; don't split languages |
| Ingestion | APScheduler / Prefect workers, one per source | Airflow is overkill |
| Store | **PostgreSQL + PostGIS + TimescaleDB** | PostGIS for nearest-station & district-polygon lookup; Timescale for observation series |
| Cache | **Redis**, per-source TTL, doubles as circuit breaker | See TTLs below |
| Push | **FCM**, topic fan-out on (district × persona × severity) | Never per-user push — rate limits during events |
| ML | scikit-learn / LightGBM for indices, in-house bandit, **ONNX Runtime Mobile** | Small, explainable, exportable |
| Maps | **Mappls** primary; MapLibre + Bhuvan WMS fallback | Indian, govt-aligned, data resident in India |
| Language | **Bhashini (ULCA)** | 22 scheduled languages, free non-commercial, govt DPI |
| Offline | Isar / SQLite, stale-while-revalidate | Rural connectivity is the real deployment condition |
| Charts | fl_chart | |

### Cache TTLs
| Source | TTL |
|---|---|
| Nowcast | 15 min |
| Current weather | 3 h (issued 8×/day) |
| City forecast | 6 h |
| CPCB AQI | 1 h |
| Sea/coastal bulletin | Respect the `Validity` field in the payload |
| Soil moisture | 24 h |
| Traffic | 5 min |

---

## 8. Repo structure

```
mausam-home/
├── backend/
│   ├── app/
│   │   ├── ingest/          # one module per source
│   │   │   ├── imd.py
│   │   │   ├── cpcb.py
│   │   │   ├── incois.py
│   │   │   └── mappls.py
│   │   ├── normalise/       # canonical schema, code tables
│   │   │   ├── wmo_codes.py
│   │   │   ├── warning_codes.py
│   │   │   └── units.py
│   │   ├── indices/         # THE IP
│   │   │   ├── run_score.py
│   │   │   ├── commute_risk.py
│   │   │   ├── comfort.py
│   │   │   ├── beach_safety.py
│   │   │   ├── frost.py
│   │   │   └── pollen_proxy.py
│   │   ├── cards/           # candidate generation
│   │   ├── api/             # FastAPI routes
│   │   └── models/
│   ├── migrations/
│   └── tests/
├── mobile/                  # Flutter
│   ├── lib/
│   │   ├── ranker/          # on-device ONNX bandit
│   │   ├── cards/           # one widget per card type
│   │   ├── cache/           # Isar, SWR
│   │   └── i18n/            # Bhashini
├── demo/
│   ├── scenarios/           # cyclone / fog / heatwave replays
│   └── seed.py
└── docs/
    ├── plan.md
    ├── data-sources.md
    └── pitch/
```

---

## 9. API contract (backend → mobile)

```
GET /v1/home?lat=&lon=&tz=IST
```

```jsonc
{
  "location": { "district": "Ghaziabad", "station_id": "42182", "station_name": "..." },
  "generated_at": "2026-09-10T06:30:00+05:30",
  "sources": [{ "name": "IMD", "fetched_at": "...", "stale": false }],
  "overrides": [
    {
      "card_id": "warn_fog_d1",
      "severity": "red",
      "pinned": true,
      "title": "Dense fog warning",
      "body": "...",
      "source": "IMD District Warning"
    }
  ],
  "cards": [
    {
      "card_id": "aqi_health",
      "type": "health_aqi",
      "index": { "name": "AQIRisk", "value": 287, "band": "Poor", "confidence": 0.9 },
      "verdict": "Avoid outdoor exercise 7-10 AM.",
      "why": "AQI is 287 and you follow air quality.",
      "features": [0.81, 0.12, 0.44],   // for on-device ranker
      "affinity_tags": ["health", "fitness"],
      "ttl_seconds": 3600,
      "source": { "name": "CPCB", "station": "Vasundhara", "distance_km": 4.2 },
      "modelled": false
    }
  ]
}
```

- `overrides[]` is rendered above `cards[]` **always**; the on-device ranker only reorders `cards[]`.
- `modelled: true` forces the "estimated, not observed" chip (pollen, and any gap-filled variable).
- `source.distance_km` is always disclosed for nearest-station lookups.

---

## 10. Build phases

### Phase 0 — first 2 hours (blocking, do not skip)
- [ ] Hit **every** IMD endpoint we plan to use; log which respond, which 403 on IP
- [ ] Register data.gov.in account + CPCB AQI API key
- [ ] Confirm INCOIS ERDDAP returns JSON for a coastal point
- [ ] Mappls developer key
- [ ] Bhashini/ULCA key
- [ ] Decide Flutter vs RN based on team skill — **lock it, no revisiting**

### Phase 1 — spine (hours 2–10)
- [ ] Postgres + PostGIS + Timescale up, district polygons + IMD station table loaded
- [ ] Ingest workers for IMD (cityforecast, current_wx, districtnowcast, districtwarning, aws_data, sunmoon) + CPCB
- [ ] Normaliser: WMO code table, warning code table, wind direction, unit conversion, IST/UTC
- [ ] Redis caching layer + stale flag
- [ ] `GET /v1/home` returning hardcoded card order

### Phase 2 — indices + cards (hours 10–22)
- [ ] **Deep three:** Health (AQI + dust leading indicator), Commuter (highway nowcast + Mappls), Agriculture (soil moisture + frost + agromet passthrough)
- [ ] **Shallow five:** Fitness, Beach, Travel, Parents, Events — real data, simpler logic
- [ ] Card candidate generator with severity + affinity tags + `why` strings
- [ ] Safety override path, tested

### Phase 3 — personalization (hours 22–30)
- [ ] Onboarding chips → affinity vector, stored locally
- [ ] Rule-based ranker on device, hand-tuned weights
- [ ] Bandit layer over tap events (in-memory is fine for demo)
- [ ] Fatigue decay
- [ ] Explainability chips rendered

### Phase 4 — polish + demo (hours 30–36)
- [ ] Bhashini language switch (Hindi + one regional minimum)
- [ ] Offline mode + "last updated" stamps
- [ ] **Demo/time-travel scenario switcher**
- [ ] Two seeded demo accounts, same city, different orders
- [ ] Pitch deck + rehearsal ×3

---

## 11. Team split (6 people)

| Role | Owns |
|---|---|
| **Data engineer** | Ingestion workers, normaliser, code tables, cache TTLs |
| **Backend / indices** | Index engine, card generation, `/v1/home`, safety override |
| **ML** | Ranker, bandit, ONNX export, pollen proxy model |
| **Mobile 1** | Shell, navigation, on-device ranker integration, offline cache |
| **Mobile 2** | Card widgets, charts, i18n/Bhashini, accessibility |
| **Lead / pitch** | Demo scenarios, deck, source attributions, rehearsal, unblocking |

---

## 12. Demo plan

**We cannot rely on interesting weather existing on presentation day.** Build a scenario switcher that replays real archived events:

| Scenario | Shows |
|---|---|
| **Delhi fog morning** | Commuter block, highway nowcast, visibility thresholds, parent school-window card |
| **Cyclone on east coast** | Safety override firing — a beach user's "good conditions" card gets pinned under a red warning |
| **North India heatwave** | Fitness `RunScore` recommending afternoon over dawn in winter vs the inverse in summer |
| **Punjab frost night** | Agri frost warning + agromet advisory passthrough |

### Demo beats (5 min)
1. Two accounts, same city — different homepages. *(personalization is real)*
2. Tap a card → the *why* chip. *(explainable)*
3. Switch scenario to cyclone → red warning pins to top over the user's favourite card. *(safety override)*
4. Switch language to Hindi. *(Bhashini, accessibility)*
5. Airplane mode → still renders with "last updated" stamp. *(rural reality)*
6. Pollen card → "modelled, no national network exists." *(honesty + national data gap)*

---

## 13. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| IMD endpoint needs IP whitelisting | Medium | Test hour 1. Labelled Open-Meteo fallback per card. Never let a dead endpoint kill a card |
| data.gov.in key delay | Medium | Register hour 1; cache a CSV snapshot as backup |
| INCOIS ERDDAP is NetCDF-heavy / slow | Medium | Pre-fetch a coastal grid subset to Postgres; beach block is a "shallow five" anyway |
| Scope creep to 8 deep personas | **High** | Locked: 3 deep, 5 shallow. Enforce at hour 22 |
| Bandit has no data to learn from in demo | High | Seed synthetic tap history for demo accounts; present bandit as the production path, rules as the shipped cold start |
| Live weather is boring on demo day | **Certain** | Scenario switcher (Phase 4, non-negotiable) |
| LLM hallucinating weather numbers | High if unguarded | Templates compute, LLM only phrases. Add a unit test |

---

## 14. Pitch outline

1. **The rating slide** — 10 lakh downloads, 3.1 stars. The gap isn't data, it's decisions.
2. **What we built** — decision layer on IMD's own APIs. Architecture diagram.
3. **Live demo** — the 6 beats above.
4. **The ranking engine** — multi-persona affinity, bandit, on-device.
5. **Safety override** — personalization never suppresses a warning.
6. **Underused IMD products** — highway nowcast, agromet advisory, coastal bulletin, basin QPF. *We read your documentation.*
7. **The pollen gap** — India isn't in any pollen coverage. Here's our proxy, labelled as modelled. Here's a national data gap for MoES.
8. **Uncertainty** — Mission Mausam names this as an open need; here's our confidence band.
9. **Reach** — Bhashini 22 languages, offline-first, on-device privacy. The people who most need warnings have the worst phones.
10. **Ask** — deployment path into the existing Mausam app as a homepage module.

---

## 15. What loses vs what wins

**Loses:** a beautiful UI over Open-Meteo data. First question from the panel will be *"why aren't you using IMD's data?"* and there's no good answer.

**Wins:**
- IMD's *underused* products (highway nowcast, agromet, coastal bulletin, basin QPF)
- Honest pollen gap instead of a fake number
- Safety structurally overriding personalization
- Bhashini multilingual + offline for actual rural conditions
- On-device personalization, and saying why
- Showing uncertainty, which MoES itself named as unsolved

---

## Appendix A — key reference links

- IMD API reference: `https://api.imd.gov.in/public/api_reference.html`
- IMD APIs page: `https://mausam.imd.gov.in/responsive/apis.php`
- CPCB real-time AQI (OGD): `https://www.data.gov.in/catalog/real-time-air-quality-index`
- INCOIS ERDDAP: `https://erddap.incois.gov.in/erddap/`
- INCOIS Ocean State Forecast: `https://incois.gov.in/site/services/osf.jsp`
- MOSDAC soil moisture: `https://www.mosdac.gov.in/soil-moisture-0`
- Bhuvan API: `https://bhuvan-app1.nrsc.gov.in/api/`
- Mappls APIs: `https://about.mappls.com/api/`
- Bhashini API docs: `https://bhashini.gitbook.io/bhashini-apis`
- Mission Mausam doc (quote source for uncertainty): `https://mausam.imd.gov.in/event/mission_mausam.pdf`

## Appendix B — IMD code tables to load at ingest

- **WMO weather codes 01–99** — full table in the IMD API reference; needed for icon + copy mapping
- **Wind direction codes** — 0 (Calm), 20, 50, 70, 90, 110, 140, 160, 180, 200, 230, 250, 270, 290, 320, 340, 360
- **Nowcast categories Cat1–Cat19** + colour bands (1 green / 2 yellow / 3 orange / 4 red)
- **District warning codes 1–17** + day colour codes (note: warning colour mapping is 1=red … 4=green, which is **inverted** relative to the nowcast colour mapping — easy bug, handle in the normaliser)
- **Rainfall categories** — LE, E, N, D, LD, NR, ND
- **AWS state IDs 1–36**
