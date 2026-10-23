# 04 · Open Digital Employee — outcomes, five conditions, three quality pillars

*An open specification for digital employees: connect domain expertise, working context and decision rights to achieve agreed, measurable outcomes when facts, priorities and resources change.*

**Origin.** Prior art: Open Digital Employee (ODE) 0.2.0-draft (2026-10-04), https://opendigitalemployee.org, spec https://github.com/opendigitalemployee/specification (Apache-2.0 spec & schemas, CC BY 4.0 docs); working corpus `digital-employee-standard/`. ODE concretises TARA (concept 03) for digital employees; OHC (concept 05) is its person-side companion.
**Built during the hackathon:** ODE applied to agents grown in Snowflake: the company environment built automatically from raw data, backward design from a CRM outcome, and the 3×5 scorecard computed in SQL (§5).

---

## 1. Definition and loop
A **digital employee** is an agent designed to achieve agreed, measurable outcomes — with professional judgment, clear responsibility and evidence of what actually happened.
- *A completed task is an output; an outcome is a measurable change.* The link between them is a hypothesis to test.
- The world is imperfect: information is missing, outcomes are uncertain, interests conflict, resources are limited, conditions change, execution can fail.
- Loop: **Understand → Choose a step → Act and check → Adjust the next step.** Waiting or stopping can be the right next step.

## 2. Five conditions for success (design lens)
| # | Condition | Agree on |
|---|---|---|
| 01 | Measurable outcomes & alignment | baseline, target, time frame, budget, accountable owner |
| 02 | Domain expertise | method, work hypotheses, professional quality standards |
| 03 | A prepared working environment | sources, freshness, access, dependencies, human workload (incl. the cost of review) |
| 04 | Governance & accountability | permissions, launch criteria, stop conditions, escalation, audit trail |
| 05 | The right platform, controlled improvement | runtime capabilities, operating limits, change tests, rollback |

## 3. Backward design from outcomes
Define the outcome (baseline, target, time, budget, owner) → propose the work (how it could contribute, deliverable, **what would disprove it**) → design the employee (all five conditions; plan the checks before building) → build & pilot (routine + edge cases, bounded) → measure & learn (output, business impact, **total cost incl. human oversight**) → keep / change / stop. Any change to the outcome or decision rights goes back to its owner.

## 4. Three layers of the package · three quality pillars
**Layers** (what you keep): **Domain expertise** (Agent DNA: methods, skills, hypotheses, decision principles, quality standards) · **Company environment** (people, business concepts, trusted sources, systems, company rules) · **Your digital employee** (goals, selected work, local settings, tool access, decision rights). Versioned JSON + Markdown + manifest; the package describes, a runtime executes. Object kinds include `WorldModel, Fact, MasterData, EntityType, EntityRecord, Source, SourceReceipt, Transformation, Evidence, Decision, GoalMap, Policy, Check, Run, ChangeSet, Party, Organization, Role, DigitalEmployee, Agent, ToolBinding…` (38 in the type catalog).

**Pillars × areas (review lens)** — *a digital employee your business can rely on*:

| Area | **Performance** — does it move the needle? | **Reliability** — can it keep delivering? | **Alignment** — is it pursuing the right goals? |
|---|---|---|---|
| 01 Work & outcomes | useful deliverables; measurable contribution | verified outputs; exceptions handled | priorities and commitments respected |
| 02 Interaction | clear answers; useful initiative | context retained; dependable handoffs | appropriate tone, recipients, boundaries |
| 03 Knowledge & memory | relevant knowledge when needed | traceable sources; stale data detected | privacy, consent, data boundaries respected |
| 04 Authority & safety | enough access to do the job | failures contained; stop & recovery paths | permissions and approval rules followed |
| 05 Oversight & improvement | impact and total cost measured | monitoring, regression checks, rollback | changes approved; goals & obligations preserved |

*All three matter. A strength in one does not cancel a critical failure in another.* (No single aggregated score.)

## 5. How Firn uses ODE in Snowflake
**Positioning.** ODE says what a digital employee needs; the hardest part is condition 03 / layer 2 — the **company environment**, usually prepared by hand. **Firn builds it automatically from raw company data, provably** (concepts 01, 02), then compiles employees from it.

| ODE | Firn / Snowflake |
|---|---|
| Domain expertise layer | methods (WMLM distillation, TARA rules, sales canon), agent skills (contradictions, promises, evidence, replay) |
| Company environment layer | the world model in `MODEL`: five Books + engine + codex |
| Digital employee layer | Cortex Agent compiled by `COMPILE_AGENT(mission)`: instructions, tools, decision rights |
| Kinds | `WorldModel→MODEL`, `Fact→FACTS`, `MasterData→MASTER_VALUES`, `EntityRecord→ENTITIES`, `Source/SourceReceipt→CORE.SRC_DOCUMENTS` (sha, source_ref), `Transformation→HIVE_RUNS`, `Evidence→EVIDENCE`, `Decision→OWNER_ACTS/FORKS`, `Policy→CODEX_ARTICLES`, `Check→gates/eval`, `Run→agent runs, replay`, `ChangeSet→agent versions` |
| Backward design | `OUTCOMES` (baseline SQL, target, owner, review_at), e.g. share of deals lost after the proposal stage; overdue client commitments; founder load |
| Work as hypothesis | each of the agent's "3 actions" names its expected signal and what would disprove it (TARA next-step) |
| Five conditions | readiness checklist; each condition points to where it lives in Snowflake |
| Pillars × areas | `ODE_SCORECARD(agent_version, area, pillar, metric, value, threshold, verdict)` computed in SQL — e.g. Perf·Work = accepted-action rate & replay win-rate; Rel·Knowledge = share of claims with a verified verbatim quote, stale master values detected; Align·Interaction = forbidden-vocabulary gate (RU+EN); Align·Authority = actions above mandate routed to the owner; Rel·Oversight = eval regression between versions |
| Controlled improvement | new agent version promoted only if the scorecard does not regress; rollback = previous version |
| Export (optional) | `EXPORT_ODE_PACKAGE`: the compiled employee as an ODE package → portable to Claude Code and other runtimes |

Demo line: *"A digital employee your business can rely on — measured, not claimed."* (the 3×5 matrix, red cells included).
