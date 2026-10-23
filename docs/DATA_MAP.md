# Firn — Data Map

Single entry point for anyone (human or agent) building dashboards or apps on top of Firn.
What lives where, what it means, where it came from, and what is still missing.

- Account: `sfsehol-anthropic_snowflake_hackathon_exwjdc`, database `RECPLACE`, role `ATTENDEE_ROLE`, warehouse `DEFAULT_WH`.
- Machine-readable layer: semantic view **`RECPLACE.MODEL.FIRN_BUSINESS`** (`sql/factory/20_semantic_view.sql`).
  Start with `DESCRIBE SEMANTIC VIEW RECPLACE.MODEL.FIRN_BUSINESS` or query it via Cortex Analyst.
- How each object was produced, step by step: `docs/DATA_FLOW.md`.
- Method docs: `distill/BUSINESS_MODEL.md` (zones), `distill/LENS.md` (what was distilled), `distill/GOALS.md` (goal vertical).

## Layers

| Layer | Schema | Truth type |
|---|---|---|
| Ledger (CRM) | `CORE` | recorded — money and statuses as in CRM, read-only |
| Field (distilled facts) | `MODEL` | proven — every fact has a verbatim quote that passed the SQL gate |
| Map (aggregates) | `MODEL` | derived views over ledger + field |
| Goals | `MODEL` | distilled org goals + seeded agent missions |
| Decisions | `APP` | governed write-back by the agent, decided by humans |

## Objects

### Ledger — `CORE` (source: CRM dumps)
| Object | Grain | Key fields | Use for |
|---|---|---|---|
| `CORE.CRM_CLIENTS` | client | `client_id, name, status, mrr, manager_name, manager_fired, renewal_at, last_paid_at, revenue_total, niche, city, tariff` | client base, MRR, churn risk, orphaned clients |
| `CORE.CRM_DEALS` | deal | `deal_id, client_id, client_name, amount, stage, status (open/won/lost), manager_id, created_at, closed_at, last_activity_at, age_days` | pipeline, win/loss, stalled deals, per-manager funnel |

Join deals↔clients on `lower(trim(client_name)) = lower(trim(name))` — `client_id` does not match across the two dumps.

### Field — `MODEL` (source: `distill/`, wave 1, prompt `distill_plain_v3`, `claude-opus-5-5`)
| Object | Grain | Key fields | Use for |
|---|---|---|---|
| `MODEL.FIELD_FACTS` | fact (5,302 gated) | `fact_id, doc_id, zone, subzone, claim, quote, fact_type, knowledge_state, speaker_role, client_id, amount_rub, fact_day, gate_passed, strength` | evidence drill-down; always filter `gate_passed` |
| `MODEL.FIELD_SIGNALS` | signal (2,714) | `signal_id, kind, zone, subzone, text, why_matters, status` | open questions, gaps per zone |
| `MODEL.V_NORMS` | norm | `norm_id, zone, norm, quote, authority (L1 docs > L2 founder > L3 practice), violations` | company rules ("codex"), rule-violation counts |
| `MODEL.KNOWLEDGE_CORPUS` | item | `kid, kind (fact/norm/conflict/open_question), zone, text, authority, client_id` | search index source (`MODEL.FIRN_KNOWLEDGE_SEARCH`) |
| `MODEL.ZONES` | subzone (37) | `zone, subzone, question, sources` | business model skeleton (9 zones) |

### Map — `MODEL` (source: `sql/model/20_domain_map.sql`, `30_conflicts.sql`)
| Object | Grain | Key fields | Use for |
|---|---|---|---|
| `MODEL.V_DOMAIN_MAP` | zone | `facts, sources, covered/thin/blind, hypothesis_pct, open_signals, unknown_per_fact` | "what we know" map; agent mandate per zone |
| `MODEL.V_COVERAGE` | subzone | `facts, sources, hypotheses, open_signals, status (covered ≥5 facts from ≥2 carriers / thin / blind)` | coverage heatmap |
| `MODEL.V_MONEY_AT_STAKE` | bucket B1–B6 | `meaning, deals, amount_rub, clients_with_facts, loss_facts` | headline "money on the table" |
| `MODEL.CONFLICTS` | conflict | `layer (fact_vs_fact/fact_vs_crm/crm_vs_crm), kind, zone, claim_a/b, quote_a/b, severity, amount_rub, explanation` | contradiction list with evidence |
| `MODEL.V_CONFLICT_MAP` | layer×kind×zone | `conflicts, high, with_decision, amount_rub` | contradiction summary |

### Goals — `MODEL` (source: `sql/model/50_goals.sql`, `51_agent_goals_seed.sql`, method `distill/GOALS.md`)
| Object | Grain | Key fields | Use for |
|---|---|---|---|
| `MODEL.ORG_GOALS` | org goal G1–G6 | `title, statement, horizon, target_text, alignment (aligned/partly/conflicting), evidence_count, latest_evidence_day` | "does the company know its goal" |
| `MODEL.AGENT_GOALS` | mission M1–M4 | `mission_title, serves_goals, metric, metric_sql, owner` | agent missions definition |
| `MODEL.V_AGENT_GOAL_METRICS` | mission | `current_value` | mission KPIs |
| `MODEL.V_GOAL_VERTICAL` | goal×mission | `org_goal, alignment, mission, metric, proposals, proposals_rub` | goal tree: org goal → agent mission → metric → actions |

### Decisions — `APP` (source: `sql/factory/10_agent_tools.sql`)
| Object | Grain | Key fields | Use for |
|---|---|---|---|
| `APP.ACTION_PROPOSALS` | proposal | `proposal_id, created_at, mission, title, action, owner_role, tag (ACT/HYPOTHESIS/ASK/APPROVE), amount_rub, evidence, conflicts, loss_limit, review_date, status, decided_by, decided_at` | decision inbox, approved ₽ |
| `APP.TRACES` | event | `at, actor, role, event, object_id, payload` | audit trail |
| `SNOWFLAKE.LOCAL.GET_AI_OBSERVABILITY_EVENTS('RECPLACE','APP','FIRN_CHIEF_OF_STAFF','CORTEX AGENT')` | agent span | question, answer, tool calls, latency | conversation log, agent usage |

Agent: `RECPLACE.APP.FIRN_CHIEF_OF_STAFF` (tools: `knowledge_search`, `business_analyst` → `FIRN_BUSINESS`, `propose_action`).

## Suggested dashboards → sources

| Dashboard | Sources |
|---|---|
| Money on the table | `V_MONEY_AT_STAKE`, drill to `CRM_DEALS` |
| What we know (coverage) | `V_DOMAIN_MAP`, `V_COVERAGE`, `FIELD_SIGNALS` |
| Contradictions | `V_CONFLICT_MAP`, `CONFLICTS` |
| Goal vertical | `V_GOAL_VERTICAL`, `ORG_GOALS`, `V_AGENT_GOAL_METRICS` |
| Decision inbox | `ACTION_PROPOSALS`, `TRACES` |
| Clients to save | `CRM_CLIENTS` where `manager_fired` and active, ordered by `mrr` |
| Agent usage | observability events (above) |

## Known gaps (data we do not have yet)

1. **Rule violations are not attributed to sellers.** Violations come from call/chat facts, but facts carry `speaker_role`, not a manager id → no "who to retrain" by person. Needs: speaker → `manager_id` mapping.
2. **Org goals have no numeric targets** besides G1 (300M ₽ 2027). Founder must set targets in `ORG_GOALS.target_text`.
3. **No approved decisions yet** → M3 (approved ₽) = 0. Fills as proposals get `DECIDE_PROPOSAL`.
4. **No time series.** CRM is a single dump; trends need repeated dumps (`dump_id`).
5. **Deals↔clients have no shared id** — name join only, some deals stay unmatched.
6. **Culture layer not extracted** (norms are L1–L3 rules only).
7. **No marketing spend / channel data** — marketing zone is covered by facts only, no numbers.
