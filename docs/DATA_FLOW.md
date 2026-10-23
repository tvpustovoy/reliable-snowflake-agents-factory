# Firn — Data Flow

The chain of transformations from raw company data to agent decisions, step by step.
Objects are described in `DATA_MAP.md`; this file is about **how** each one was produced.

```
documents + CRM ─▶ 0 CORE ─▶ 1 model+lens ─▶ 2 prompts ─▶ 3 bench ─▶ 4 hive wave ─▶ 5 gate ─▶ FIELD_FACTS
                                                                                              │
          ┌───────────────────┬────────────────────┬────────────────────┬─────────────────────┤
          ▼                   ▼                    ▼                    ▼                     ▼
     6 domain map       7 money at stake     8 conflicts          9 norms + corpus     10 goal vertical
          └───────────────────┴────────┬───────────┴────────────────────┴─────────────────────┘
                                       ▼
                     11 semantic view ─▶ 12 agent ─▶ 13 decisions
```

| # | Step | Input → Output | Operation | Code |
|---|---|---|---|---|
| 0 | **Load core** | company documents, calls, chats, CRM dumps → `CORE.DOCUMENTS`, `DOCUMENT_CHUNKS`, `CRM_CLIENTS`, `CRM_DEALS`, `DOC_CRM_LINKS` | load and chunk; CORE is read-only after this | `sql/core/01_core.sql` |
| 1 | **Business model + lens** | founder interview → 9 zones / 37 subzones (`MODEL.ZONES`), lens Q1–Q9 + TARA rules | written by hand, seeded to SQL | `distill/BUSINESS_MODEL.md`, `LENS.md`, `sql/gen_seed.py` |
| 2 | **Compile prompts** | role + lens + zones + task + JSON schema → immutable prompt text, sha-versioned in `MODEL.PROMPT_VERSIONS` | `compile.py`; no prompt is edited in place, only new versions | `distill/prompts/` |
| 3 | **Benchmark** | same chunk sample × {bee, plain} × {opus-5.5, sonnet-5, sonnet-5.5} × v1–v3 → `BENCH_RUNS`, `BENCH_JUDGE` | `AI_COMPLETE`, timings, LLM judge for faithfulness / atomicity; winner `distill_plain_v3` on `claude-opus-5-5` | `distill/sql/20_bench.sql`, `reports/bench_prompts.md` |
| 4 | **Hive wave 1 (distillation)** | 1,121 chunks → `WAVE_RAW` (raw JSON) | batches of 100, `AI_COMPLETE(claude-opus-5-5, temp 0, 8192 tokens)`, schema in prompt, `TRY_PARSE_JSON`; unparsable calls retried via MERGE (`attempts`); progress in `V_WAVE_PROGRESS`. 638 s | `distill/sql/30_wave.sql` (`HIVE_WAVE`) |
| 5 | **Verbatim gate** | `WAVE_RAW` → `FIELD_FACTS` (5,315 → 5,302 passed, 99.8%), `FIELD_SIGNALS` (2,714) | flatten JSON; a fact passes only if its quote (≥15 chars) appears verbatim in the chunk after whitespace normalisation; zone/subzone validated against `ZONES`; PII check | `30_wave.sql` |
| 6 | **Coverage + domain map** | `FIELD_FACTS`, `FIELD_SIGNALS` → `V_COVERAGE`, `V_DOMAIN_MAP` | covered = ≥5 facts from ≥2 carriers, else thin / blind; hypothesis share, unknowns per fact | `sql/model/20_domain_map.sql` |
| 7 | **Money at stake** | `CRM_DEALS` ⋈ `CRM_CLIENTS` (by normalised name) + loss facts → `V_MONEY_AT_STAKE` B1–B6 | rule-based bucketing of deals / MRR | `20_domain_map.sql` |
| 8 | **Conflicts** | facts + CRM → `CONFLICTS`, `V_CONFLICT_MAP` (372 conflicts) | fact↔fact: `AI_EMBED` (arctic-embed-l-v2.0) → cosine top pairs (1,598) → LLM judge `FACT_PAIR_JUDGE`; fact↔CRM and CRM↔CRM by SQL rules | `sql/model/30_conflicts.sql` |
| 9 | **Norms + knowledge corpus** | facts of type rule → `V_NORMS` (authority L1 docs > L2 founder > L3 practice, violations); facts + norms + conflicts + open questions → `KNOWLEDGE_CORPUS` → Cortex Search `FIRN_KNOWLEDGE_SEARCH` | SQL union + search service | `sql/factory/10_agent_tools.sql` |
| 10 | **Goal vertical** | founder facts about goals → `ORG_GOALS_RAW` → `ORG_GOALS` G1–G6; seeded missions → `AGENT_GOALS` M1–M4 → `V_AGENT_GOAL_METRICS` → `V_GOAL_VERTICAL` | `AI_COMPLETE` distils goals with evidence ids and alignment; missions mapped by hand | `sql/model/50_goals.sql`, `51_agent_goals_seed.sql`, `distill/GOALS.md` |
| 11 | **Semantic view** | CRM + map + goals + decisions → `MODEL.FIRN_BUSINESS` | semantic layer for Cortex Analyst | `sql/factory/20_semantic_view.sql` |
| 12 | **Compile + deploy agent** | `ROLE.md` (competency model) + zone mandate from `V_DOMAIN_MAP` + 60 L1/L2 norms + goals → `agent_spec.yaml` → `APP.FIRN_CHIEF_OF_STAFF` | mandate per zone: ACT / ACT-AS-HYPOTHESIS / ASK-FIRST by hypothesis share and unknowns; deployed with `cortex agent-studio agent-deploy`; available in CoWork | `sql/factory/compile_agent.py`, `agents/chief_of_staff/` |
| 13 | **Governed decisions** | agent answer → `APP.PROPOSE_ACTION` → `ACTION_PROPOSALS` + `TRACES`; human → `DECIDE_PROPOSAL` | tag validated (ACT/HYPOTHESIS/ASK/APPROVE); every write traced; conversations in AI Observability | `10_agent_tools.sql` |

## Principles along the chain
- **Ledger vs field.** Money comes from CRM as recorded; knowledge comes from documents only through the gate.
- **Every fact has a quote.** Nothing enters the field without verbatim evidence.
- **Versioned, not edited.** Prompts and runs are immutable; reruns create new versions.
- **Know what you know.** Coverage and conflicts set how far the agent may act on its own in each zone.
