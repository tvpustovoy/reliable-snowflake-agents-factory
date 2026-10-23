# dashboard/ — Firn dashboards (synthetic data)

Purpose: the Firn screens a founder and an agent both look at — as a web app hosted in
Snowflake (Snowflake App Runtime) and as standalone HTML reports a Cortex Agent can return
in Snowflake CoWork. Both outputs are rendered from the **same React components**.
Inputs: `app_runtime/lib/firn/data.json` — synthetic, shaped like future `RECPLACE.MODEL`
tables (zones, facts, conflicts, signals, master values, versions, culture, codex, agents).
Outputs: Next.js app (8 routes); `agent_html/<screen>.html` (8 files).

## Screens
| Route / file | Screen | Answers |
|---|---|---|
| `/` · `map.html` | Map | what we know; where agents may act (ACT / DRAFT / ASK) |
| `/conflicts` | Conflicts | same thing said differently; robust vs blocking; Pick A / B / Merge / Ask holder |
| `/facts` | Facts | search facts; verbatim quote, source, links reinforces / contradicts / updates |
| `/agents` | Agent factory | which agents compile, mandate, codex rules, create buttons per mandate |
| `/gaps` | Gaps | blind spots and founder questions, ranked by agents unblocked |
| `/evolution` | Evolution | v1 → v3: facts, coverage, conflicts, agent mandates by version |
| `/values` | Master values | prices, discounts, terms over time with sources |
| `/culture` | Culture | norms × layers (codified / declared / manifested / practiced / latent), tensions, codex |

## Run
```bash
cd app_runtime
npm install
npm run dev          # app at http://localhost:3000
npm run agent-html   # regenerate ../agent_html/*.html
```

## How it fits together
- `lib/firn/logic.js` — trust rules: subzone / zone / agent mandate, culture legitimacy.
- `components/screens/*` — stateless screens (no hooks, no event props).
- `lib/firn/interact.js` — one vanilla interactivity layer driven by `data-*` attributes
  (filters, search, action buttons). The app attaches it after render; the generator inlines it.
- `scripts/build-agent-html.mjs` — `react-dom/server` → sandbox-safe HTML: inline CSS and JS,
  no network, no inline handlers, light/dark, responsive.

Rules: subzone ASK if 0 facts; ACT if ≥5 facts from ≥2 carriers and conflicts/facts < 0.2;
else DRAFT. Zone ACT if ≥60% subzones ACT and none ASK; ASK if ≥50% ASK; else DRAFT.
Agent mandate = weakest zone mandate. Culture: owner voice counted separately; a codex article
binds agents only after ratification.

Actions (create, decide, ask, ratify) only show a local confirmation for now — no writes to Snowflake.

`streamlit_sis/` — first-pass Streamlit-in-Snowflake variant, frozen for comparison.

Logo: `lib/firn/logo.js` is a data URI of `media/firn-logo-transparent.png` resized to 160px
(`sips -Z 160 … --out lib/firn/assets/logo-nav.png`, then base64). Inlined so it renders in the sandbox.
