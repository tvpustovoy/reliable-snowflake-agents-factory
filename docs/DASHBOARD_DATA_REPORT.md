# Firn dashboards — data report

Purpose: what the dashboards read from `RECPLACE` (see [DATA_MAP.md](DATA_MAP.md)), what we had to derive,
and what is missing. Written 2026-10-23 after rebuilding `dashboard/` on live data.
Snapshot: `dashboard/app_runtime/scripts/export-live.mjs` → `lib/firn/live/current.json` (gitignored —
it holds company text). Without it the app falls back to the synthetic `lib/firn/sample.json`.

## Screen → source

| Screen | Reads | Status |
|---|---|---|
| Home | `V_MONEY_AT_STAKE`, `ORG_GOALS`, `V_AGENT_GOAL_METRICS`, `APP.ACTION_PROPOSALS`, `FIELD_FACTS` totals | complete |
| Map | `V_COVERAGE` + `CONFLICTS` per subzone | complete; mandate rule recalibrated (below) |
| Conflicts | `CONFLICTS` (top 6 per zone × kind = 115 of 372), `V_CONFLICT_MAP` totals | complete; decisions not written back |
| Facts | `FIELD_FACTS` where `gate_passed` (top 12 per subzone = 451 of 5,309) | complete for browsing; full-text search needs a live query |
| Master values | **derived**: amounts named in ≥3 `price` facts + `changed_over_time` price conflicts | gap — no master-values table |
| Agents | `SHOW/DESCRIBE AGENTS IN DATABASE RECPLACE`, `V_AGENT_GOAL_METRICS`, `ACTION_PROPOSALS`, wave dates | working agents complete; evolution thin (one version) |
| Gaps | `FIELD_SIGNALS` counts per zone × kind + sample of 108 | complete; no priority / owner |
| Evolution | wave timestamps, agent `created_on` / versions, `TRACES` | gap — build timeline only, no version history |
| Culture | `V_NORMS` by authority (L1 / L2 / L3) + `violations` | partial — rules layer only |

## Mandate rule on live data
`V_COVERAGE` marks all 37 subzones `covered` (≥5 facts from ≥2 sources), so coverage alone would make every
zone green. The dashboards decide trust per subzone from what is unknown or contested:
- **ASK** if open questions per fact > 1;
- **DRAFT** if hypotheses ≥ 35 %, or open questions per fact ≥ 0.5, or ≥ 5 high-severity conflicts per 100 facts;
- **ACT** otherwise.

Result on the 23.10 snapshot: 17 ACT / 17 DRAFT / 3 ASK subzones (ASK: `marketing/funnel_metrics`,
`founder_rules/decision_rights`, `team_people/roles_ownership`); only the `product` zone is ACT.
Thresholds live in `lib/firn/logic.js` (`THRESHOLDS`). **Decision needed:** confirm or move this rule into
`V_COVERAGE` / `V_DOMAIN_MAP` so the agent and the dashboard use the same mandate.

## Missing data — what to add

| # | Missing | Screen hurt | Proposal |
|---|---|---|---|
| 1 | **Master values table** — no curated list of prices, discounts, terms with owner and history | Master values | `MODEL.MASTER_VALUES(value_id, name, unit, owner, conflict_id)` + `MODEL.MASTER_VALUE_OBS(value_id, day, value, fact_id)`; seed from `price` facts grouped by subzone + amount |
| 2 | **Version history** of the map and agents — one wave, one agent version, nothing to diff | Evolution, Agents drill-down | `MODEL.MAP_VERSIONS(version, built_at, facts, covered, act/draft/ask counts, conflicts_open/resolved)` written after each wave; agent `ALTER AGENT … COMMIT` per recompile with a changelog in `APP.TRACES` |
| 3 | **Per-agent mandate and zones** — Chief of Staff covers all zones, so its mandate is the weakest zone (DRAFT); per-mission zones are not stored | Agents, Map | add `zones` (array) to `MODEL.AGENT_GOALS`; mandate per mission instead of per agent |
| 4 | **Decisions on conflicts** — buttons only confirm locally | Conflicts, Evolution | `APP.CONFLICT_DECISIONS(conflict_key, choice A/B/merge/ask, decided_by, decided_at, note)` + stable `conflict_id` in `MODEL.CONFLICTS` (today the key is a row number in the snapshot) |
| 5 | **Culture beyond rules** — no narratives, no declared-vs-practiced comparison, no owner-voice separation (known gap 6 in DATA_MAP) | Culture | culture extraction per `research/08`: `MODEL.CULTURE_TENSIONS(norm_id, layer, value, carriers, source)`; tag founder speech separately (`speaker_role = founder` already exists) |
| 6 | **Codex** — no table of ratified articles (hard/soft) the agents must follow | Culture, Agents | `MODEL.CODEX(article_id, kind, text, status proposed/ratified, from_norm_id, ratified_by)` |
| 7 | **Signal priority / owner** — 2,714 open signals, all `open`, no ranking or addressee | Gaps | add `priority`, `owner_role`, `unblocks_mission` to `FIELD_SIGNALS` or a `V_SIGNAL_QUEUE` view |
| 8 | **Stable fact ids for links** — snapshot shortens `fact_id`; conflicts carry `fact_a/fact_b` but proposals and norms reference facts as text | Facts, Conflicts | keep full ids in the snapshot; `evidence` in `ACTION_PROPOSALS` as an array of `fact_id` |
| 9 | Known gaps already in DATA_MAP: violations not attributed to sellers (1), goals without numeric targets except G1 (2), no approved decisions → M3 = 0 (3), single CRM dump, no trends (4), no channel spend (7) | Home, Culture, Evolution | as described in DATA_MAP |

## Privacy
Live snapshot and `agent_html/live/*.html` contain quotes and client codes: both paths are in
`dashboard/.gitignore`. Phones, emails and long digit runs are redacted at export. Committed files
(`sample.json`, `agent_html/*.html`) are synthetic.
