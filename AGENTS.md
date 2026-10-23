# AGENTS.md — public submission repo

This repo is what the judges read. They expect **every relevant piece**: queries, scripts, prompts, agent specs, the app, evals, final reports and the story of how it was built. A judge must be able to answer three questions from the repo alone: *what did they build, how, and does it work?*

## Hard rules
1. **Publish only on Taras's command**, one piece at a time. Work happens in `~/Projects/anthropic-snowflake-hackathon`; after each publish record date + commit in its ledger `delivery/3-artifacts/13-public-repo.md` (A13) and a line in its work log (L0).
2. **No client data.** Never commit raw data, names, phones, emails, document or chat texts, CRM exports. Only schemas, code, aggregates and synthetic/redacted samples. Grep every diff for PII before commit.
3. **No secrets.** No passwords, tokens, account credentials. Use placeholders (`<ACCOUNT>`, `<WAREHOUSE>`).
4. **English only.** Snowflake object names, comments, docs.
5. **Built today.** Everything here was written during the event (23.10.2026). Earlier ideas live only in `research/` and are labeled as prior art.
6. Every file starts with a short header: purpose, inputs, outputs, run order (for code).

## Layout
| Path | What goes here | Example |
|---|---|---|
| `README.md` | Front page = submission summary: problem, value case, numbers, architecture diagram, how to run, demo video link, links to everything below | — |
| `docs/` | Submission texts (from artifacts A02–A07, A12) | `value-case.md`, `architecture.md`, `viability.md`, `tools-used.md`, `data-and-consent.md`, `built-today.md` |
| `BUILD_LOG.md` | Timestamped build story: what we did, why, result (from L0) | — |
| `sql/` | All DDL/DML, numbered in run order, idempotent (`CREATE OR REPLACE`) | — |
| `sql/00_setup/` | Database, schemas, roles, warehouse, grants | `00_setup.sql` |
| `sql/core/` | RAW → CORE normalization | `01_core.sql` |
| `distill/` | Distillation, self-contained: brief, business model (zones → subzones), lens, prompt, SQL, wave reports | `README.md`, `BUSINESS_MODEL.md`, `LENS.md`, `sql/11_extract.sql` |
| `sql/model/` | Knowledge map: domains, conflicts, gaps, money at stake | `20_domain_map.sql` |
| `sql/factory/` | `COMPILE_AGENT`, `EVOLVE`, agent/semantic view creation | `30_compile_agent.sql` |
| `sql/app/` | ACTION_PROPOSALS, traces, row access policies, governed write-back | `40_actions.sql`, `41_policies.sql` |
| `prompts/` | Every LLM prompt as a separate file, referenced by SQL | `extract_facts.md`, `decide_action.md` |
| `agents/` | Generated agent specs, semantic view YAML, tool definitions | `chief_of_staff.yaml` |
| `queries/` | Analysis and demo queries **with a one-line answer each** (aggregates only) — the numbers we quote | `money_at_stake.sql`, `demo_questions.md` |
| `streamlit/` | The app (Streamlit in Snowflake) | `app.py`, `environment.yml` |
| `eval/` | Eval sets and aggregate results: % facts proven, decision accuracy under conflict | `cases.csv`, `results.md` |
| `reports/` | Final outputs: generated reports, screenshots, measured numbers | `knowledge_map.html`, `screenshots/` |
| `media/` | Video link/file, demo GIFs, pitch | `video.md` |
| `sessions/` | Key Cortex Code prompts/steps that built the system (redacted) | `01_core.md` |
| `delivery/` | Our outcomes / delivery-management system (sanitized copy) | `OUTCOMES.md`, `build.py` |
| `sample/` | Synthetic sample data so the pipeline can be run without client data | `deals_sample.csv` |
| `research/` | Long-term concepts behind Firn (prior art, referenced only) | `01-hive-distillation.md` |

## How to run (keep README in sync)
`sql/00_setup` → `sql/core` → `distill/sql` → `sql/model` → `sql/factory` → `sql/app` → deploy `streamlit/` → run `eval/`. Each step lists required privileges.

## Before each publish (checklist)
- [ ] Piece marked 🟩 ready in A13
- [ ] PII / secrets grep clean
- [ ] Header + run order present; README links updated
- [ ] Commit message: `publish: <piece>`; then record commit in A13 and L0
