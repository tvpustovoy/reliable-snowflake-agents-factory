# Firn — build status

Live status of the hackathon build (Anthropic × Snowflake, 23 Oct 2026, 11:00–16:30 PT).
Snapshot: **14:50 PT**. Aggregates only — no customer texts, quotes or names.

## Where we are
**Defense level: L1 reached at 13:55** — a provable map of the business plus money at stake.
**Now: step 4** — conflicts are detected; next are action proposals tagged ACT / HYPOTHESIS / ASK / APPROVE (→ L2).
Running in parallel: the agent role (input for the agent compiler), the app, and the 60-second video.
Cut to stay on time: EVOLVE / replay (L4) and distillation wave 2. Code freeze at 15:30.

## Submission gate (what stands between us and submitting)
Required by the organizers: **public repo**, **1-minute demo video** of what was built today (public link), **all team members added** in the submission form, demo only of hackathon work. Deadline 16:30 PT.

| # | Blocker | Needs | Status |
|---|---|---|---|
| G1 | Video recorded and uploaded | L3 screens (steps 4–7) + render of `video/firn-a`; storyboard ready | ⬜ |
| G2 | Repo public and pushed | translate RU labels in `sql/model/30_conflicts.sql`; commit parallel-agent files; PII review; push | 🟨 commits local |
| G3 | Form texts | A02, A03, A05, A07, A12 finalized in English | 🟨 drafts |
| G4 | Links | public repo URL + video URL (A08) | ⬜ |
| G5 | Team members | list names in the form and in README | ⬜ |

## Submission artifacts (A01–A13)
| # | Artifact | Form / use | Status | Left to do |
|---|---|---|---|---|
| A01 | Project name & tagline — Firn, *Know what you know. Act anyway.* | form: name | 🟩 | — |
| A02 | Value case (founder, problems, money at stake) | form: description / impact | 🟨 draft | fill measured numbers from L1/L2 |
| A03 | Architecture summary (5 dimensions) | form + README | 🟨 draft | confirm each line is built; add a diagram |
| A04 | Build story (timeline) | form + `BUILD_LOG.md` | 🟨 draft | keep appending until submission |
| A05 | Viability (one factory, any company) | form | ⬜ | write |
| A06 | Data & consent (founder consent, phones removed, deletion 27.10) | form + README | 🟩 | — |
| A07 | Tools used | form | 🟨 draft | remove anything not actually used |
| A08 | Links (repo, video) | form | ⬜ | after G2 and G1 |
| A09 | 1-minute demo video | form: **required** | 🟨 script + storyboard + logo ready | render animation, record screens after L3 |
| A10 | 3-minute live pitch | round 1 | 🟨 draft | rehearse; ≤30 s opener |
| A11 | Q&A prep | round 1 | 🟨 draft | — |
| A12 | Built today (evidence list, one line per artifact with time) | form: built during hackathon | ⬜ | derive from A04 |
| A13 | Public repo ledger (ready / published) | internal control | 🟨 | push on Taras's command |

## Outcomes (what judges should take away)
Status: ⬜ not started · 🟨 in progress · 🟩 done and demoable

| # | Outcome | Evidence | Snowflake objects | Status |
|---|---|---|---|---|
| O1 | All company data in → a map of what the business knows, where sources conflict, where it is blind | 9 zones × 37 subzones, share of hypotheses / unknowns per zone | `MODEL.V_DOMAIN_MAP`, `MODEL.V_COVERAGE` | 🟩 37/37 subzones |
| O2 | Every fact is provable: a verbatim quote verified by SQL | 5 302 facts pass the verbatim gate (99.8 %) | `MODEL.FIELD_FACTS`, `MODEL.HIVE_WAVES` | 🟩 |
| O3 | The agent is compiled from the map, not hand-written as a prompt | founder-defined role → `COMPILE_AGENT` → Cortex Agent | `agents/chief_of_staff/ROLE.md`, `sql/factory/` | 🟨 role ready, compiler not yet |
| O4 | Acts under conflict — ACT / HYPOTHESIS / ASK / APPROVE — and explains why | conflicts found automatically; proposals with evidence | `MODEL.CONFLICTS`, `MODEL.V_CONFLICT_MAP`, `APP.ACTION_PROPOSALS` | 🟨 conflicts ready, proposals next |
| O5 | Measurable value for one person, the founder: money at stake | 726 deals lost yet on a "deal successful" stage 7.38M ₽ · 2 874 lost with no reason 20.0M ₽ · 161 stalled one step from payment 8.3M ₽ · MRR of clients whose manager left 283K ₽/month | `MODEL.V_MONEY_AT_STAKE` | 🟩 |
| O6 | Trust by design: the agent acts with the user's rights, every step traced | trace table + row access policy | `APP.TRACES` | ⬜ |
| O7 | Learns: outcome → updated map → better agent v2 | v1 → v2 → v3 metrics on replay | `EVOLVE()` | ⬜ cut first |
| O8 | Submission accepted, clearly new work | public repo, video, form, built-today list | this repo | 🟨 |

## Defense ladder
| Level | Outcomes | Story | Status |
|---|---|---|---|
| L1 | O1 + O2 + O5 | "A provable map of the business + money at stake" | 🟩 13:55 |
| L2 | L1 + O4 | "…and it acts under conflict" | 🟨 target 14:50 |
| L3 | L2 + O3 + O6 | "Agents compiled from the map, under control" — **goal** | ⬜ target 15:30 |
| L4 | L3 + O7 | "A self-improving organization" | cut |

## Checkpoints (PT)
| Time | Must be 🟩 |
|---|---|
| 13:55 | L1 — reached |
| 14:50 | L2 (moved from 14:00) |
| 15:30 | L3, code freeze, start recording the video |
| 16:15 | Form filled, links public |
| 16:30 | **Submitted** |
| 16:45 | Pitch, round 1 |

## Roadmap (PT)
| # | Window | Step | Done when | Status |
|---|---|---|---|---|
| 0 | –11:45 | Rules, outcomes, scenarios, name Firn, repos | outcome map + status page | 🟩 |
| 1 | –11:45 | CORE rebuilt from RAW, rights checked | `sql/core` | 🟩 |
| 2 | 11:50–13:42 | Distillation wave 1: `AI_COMPLETE(claude-opus-5-5)`, prompt `distill_plain_v3` chosen by bench, verbatim SQL gate | ≥100 gated facts | 🟩 1 121 chunks → 5 302 facts |
| 3 | –13:55 | Domain map + money at stake | map + 3 numbers by SQL | 🟩 → L1 |
| 4 | 14:10–14:50 | Conflicts + decision test → action proposals | ≥5 proposals, each with quotes and a tag | 🟨 |
| 5 | 14:40–15:20 | Agent factory: `COMPILE_AGENT(mission)` → Cortex Agent (search over facts + CRM analytics) | agent answers in CoWork with quotes | ⬜ |
| 6 | with 5 | Control: traces + row access policy; write-back only through approval | trace per action | ⬜ → L3 |
| 7 | 14:40–15:20 | App (Snowflake App Runtime, `dashboard/`): map → proposals → approve → trace; switch from synthetic data to `RECPLACE.MODEL` | end-to-end click path | 🟨 8 screens on synthetic data |
| 8 | 15:20–15:30 | **Freeze L3**, full demo run + fallback | demo runs without edits | ⬜ |
| 9 | 15:30–16:00 | 60-second video (script + storyboard; only screens built today) | file + link | 🟨 script, storyboard, logo ready |
| 10 | 16:00–16:15 | Submission form, publish repo | public links | ⬜ |
| 11 | 16:15–16:30 | Submit | — | ⬜ |

## Where the agent lives
- **Role** — `agents/chief_of_staff/ROLE.md`: missions → tasks → subtasks, owned by the founder.
- **Agent** — a Cortex Agent in Snowflake; the founder talks to it in **Snowflake CoWork**; it answers with sandbox-safe HTML reports (`dashboard/agent_html/`).
- **App** — Snowflake App Runtime (`dashboard/app_runtime/`); the same React components render the agent's HTML reports.
- **Knowledge** — `RECPLACE.MODEL` (facts, coverage, conflicts, money); the CRM stays the ledger in `CORE` and is not distilled.
- **Workbench** — Cortex Code (distillation, build, publishing).

## Build log
See [`distill/reports/wave1.md`](../distill/reports/wave1.md) for the distillation run and [`distill/reports/bench_prompts.md`](../distill/reports/bench_prompts.md) for the prompt bench.
