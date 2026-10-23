# dashboard/ — Firn Trust Dashboard (live Snowflake data or synthetic sample)

Purpose: the Firn screens a founder and an agent both look at — as a web app hosted in
Snowflake (Snowflake App Runtime) and as standalone HTML reports a Cortex Agent can return
in Snowflake CoWork. Both outputs are rendered from the **same React components**.
Inputs: a snapshot of `RECPLACE` built by `scripts/export-live.mjs` from the objects in
[`docs/DATA_MAP.md`](../docs/DATA_MAP.md) → `lib/firn/live/current.json` (**gitignored**: it holds company
text). Without it everything runs on `lib/firn/sample.json` (synthetic, same shape).
Outputs: Next.js app (9 routes); `agent_html/<screen>.html` (synthetic, committed) and
`agent_html/live/<screen>.html` (live, gitignored). What is missing: [`docs/DASHBOARD_DATA_REPORT.md`](../docs/DASHBOARD_DATA_REPORT.md).

## Screens
| Route / file | Screen | Answers |
|---|---|---|
| `/` · `home.html` | Home | money on the table, decision inbox, goals, agent missions |
| `/map` · `map.html` | Map | what we know; where agents may act (ACT / DRAFT / ASK) |
| `/conflicts` | Conflicts | contradictions with quotes and the decision each blocks |
| `/facts` | Facts | search proven facts; verbatim quote, speaker, source basket |
| `/values` | Master values | price points stated repeatedly; price changes over time |
| `/agents` | Agents | working agents (with evolution drill-down) and proposed agents with create buttons |
| `/gaps` | Gaps | open gaps and questions per zone, ASK subzones |
| `/evolution` | Evolution | build timeline: waves, agent creation, proposals |
| `/culture` | Culture | rules by layer (documented / founder / practice) and rules broken in practice |

## Run
```bash
cd app_runtime
npm install
npm run export-live  # optional: pull a live snapshot (snow CLI, connection FIRN_CONN or anthropic-snowflake-hackathon-jwt)
#   + English layer: AI_TRANSLATE ru->en for claims/quotes/explanations, cached in lib/firn/live/translations.json;
#     screens show English with the verbatim original beneath. FIRN_TRANSLATE=estimate (token count) | off

npm run dev          # app at http://localhost:3000 (live if a snapshot exists, else sample)
npm run agent-html   # regenerate agent HTML; FIRN_DATA=sample forces the synthetic sample
```

## How it fits together
- `lib/firn/logic.js` — trust rules: subzone / zone / agent mandate, culture legitimacy.
- `components/screens/*` — stateless screens (no hooks, no event props).
- `lib/firn/interact.js` — one vanilla interactivity layer driven by `data-*` attributes
  (filters, search, action buttons). The app attaches it after render; the generator inlines it.
- `scripts/build-agent-html.mjs` — `react-dom/server` → sandbox-safe HTML: inline CSS and JS,
  no network, no inline handlers, light/dark, responsive.

Rules: subzone ASK if open questions per fact > 1; DRAFT if hypotheses ≥ 35 %, questions per fact ≥ 0.5
or ≥ 5 high-severity conflicts per 100 facts; else ACT. Zone ACT if ≥60% subzones ACT and none ASK;
ASK if ≥50% ASK; else DRAFT. Agent mandate = weakest zone mandate.

Actions (create, decide, ask, ratify) only show a local confirmation for now — no writes to Snowflake.

`streamlit_sis/` — first-pass Streamlit-in-Snowflake variant, frozen for comparison.

Logo: `lib/firn/logo.js` is a data URI of `media/firn-logo-transparent.png` resized to 160px
(`sips -Z 160 … --out lib/firn/assets/logo-nav.png`, then base64). Inlined so it renders in the sandbox.
