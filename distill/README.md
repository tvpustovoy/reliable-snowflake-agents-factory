# distill/ — Hive distillation

Brief for the **distillation agent**. Read in this order:
1. This file — what to do, inputs, waves, outputs, done criteria.
2. [`BUSINESS_MODEL.md`](BUSINESS_MODEL.md) — company model structure (9 zones → subzones) every fact is placed into; coverage is computed over it.
3. [`LENS.md`](LENS.md) — the lens: worker role, mission, **target queries Q1–Q9** the facts must feed, keep/discard, TARA, privacy. Injected into every prompt.
4. `prompts/` — roles (`roles/*.md`), response schema (`schema_v1.json`), compiler (`compile.py`) and **immutable compiled versions** (`compiled/*.txt`, `compiled/MANIFEST.md`). Benchmark: [`reports/bench_prompts.md`](reports/bench_prompts.md).
5. Repo rules: [`../AGENTS.md`](../AGENTS.md) (no client data in the repo, English only). Concept behind it: `research/01-hive-distillation.md`.

Talk to Taras in Russian. SQL, objects, comments in English. Internal tracking lives in `~/Projects/anthropic-snowflake-hackathon/delivery/`.

## Layout
| Path | What |
|---|---|
| `sql/gen_seed.py` → `sql/00_seed_model.sql` | `MODEL.ZONES` generated from BUSINESS_MODEL.md |
| `prompts/compile.py` → `prompts/compiled/`, `sql/00_prompts.sql` | prompt = role + LENS §2–6 + zones + task + schema, compiled ahead of time; versions immutable in `MODEL.PROMPT_VERSIONS` |
| `sql/20_bench.sql` | prompt × model benchmark (`BENCH_RUN`, `V_BENCH_SUMMARY`) |
| `sql/01_tables.sql` | field tables (§4) |
| `sql/10_select_wave.sql` | wave selection: seed sample (wave 1), need-first (wave ≥ 2) |
| `sql/11_snapshot.sql` | neighbourhoods → `FIELD_SNAPSHOTS` |
| `sql/12_extract.sql` | prompt from LENS + ZONES + snapshot, `AI_COMPLETE`, parse, gate |
| `sql/13_merge_field.sql` | merge asserts/refs/signals into the field, strength, evaporation, need |
| `sql/14_coverage.sql` | `V_COVERAGE` |
| `reports/waveN.md` | wave report — **aggregates only, no texts or names** |

## 1. Goal
Firn Chief of Staff (LENS §2) needs a map of **every zone** of RecPlace: trust = visible coverage; the same map later compiles narrower agents. Facts must be able to answer the target queries Q1–Q9 (LENS §3); the demo query is Q1–Q3: *"What should I fix to get more money?"*.

## 2. Input (read-only)
`RECPLACE.CORE.DOCUMENT_CHUNKS (DOC_ID, CHUNK_NO, CHUNK_TEXT)` ⋈ `RECPLACE.CORE.DOCUMENTS (BASKET, BASKET_MAPPED, DAY, OWNER, PEER, TITLE, NOISE_FLAG, DUP_OF_DOC_ID)`; CRM link `CORE.DOC_CRM_LINKS (DOC_ID → CLIENT_ID = CORE.CRM_CLIENTS.CLIENT_ID)`.
Always filter `coalesce(noise_flag,false)=false and dup_of_doc_id is null`.
Corpus (chunks): founder-chats 8481 · sales-chats 3854 · sales-calls 2601 · founder-insights 2141 · product-wiki 1201 · team-meetings 1060 · public 406 · training 22 · engagement 21 ≈ 21.8K.

## 3. How the hive works (waves + shared field)
Workers never talk to each other directly. **They communicate through the field** — shared tables of facts and signals. A worker is one row of an `INSERT … SELECT AI_COMPLETE(...)`; a wave is one snapshot of the field; the field is updated between waves.

| Wave | Chunks | Selection | Worker sees |
|---|---|---|---|
| 1 · scouts | ≈ 1 200 | **seed**: all CRM-linked docs (≈ 582) + training & engagement (43) + stratified by basket and month: founder-insights 150, sales-calls 150, sales-chats 100, founder-chats 100, team-meetings 50, wiki 50; deterministic `hash(doc_id, chunk_no)` | empty field |
| merge | — | embed facts (`AI_EMBED snowflake-arctic-embed-l-v2.0`), dedupe near-identical (cos ≥ 0.9 → reinforce), compute strength, need | — |
| 2 · foragers | ≈ 1 000 | **need-first**: chunks near blind/thin subzones, open `gap/question` signals, high-similarity to weak facts; ≤ 3 per doc | neighbourhood snapshot |
| 3 (if time) | ≈ 500 | need-first again | neighbourhood snapshot |

**Neighbourhood snapshot** (`FIELD_SNAPSHOTS`, ≤ 2.5K tokens, written before the call): ring 0 — facts from the same document; ring 1 — facts about the same `client_id`; ring 2 — top-K (K=12) semantic neighbours of the chunk (`AI_EMBED` + `VECTOR_COSINE_SIMILARITY` + `QUALIFY`); ring 4 — open signals in the same subzones.

**What a worker returns:** `asserts` (new facts), `refs` to field facts (`reinforces | contradicts | updates`), `signals` (`gap | question`, or resolves an open one).

**Pheromones:** fact `strength` = number of independent carriers (distinct docs × speakers; founder counted separately). Accepted = gated and (`strength ≥ 2` or `knowledge_state='known'` from founder/doc). Unconfirmed candidates lose strength each wave (evaporation, ×0.7). Contradictions are kept open as findings.

**Chunk need** = open signals nearby + blind/thin subzones nearby + unreferenced weak facts nearby, × basket weight. Stop when Q1–Q9 have enough facts (§7), the budget is spent, or field growth per wave < 10 %.

**Dry run on 20 chunks first** (wave 1 subset), inspect JSON and gate, then the full wave.

## 4. Field tables (`RECPLACE.MODEL`)
```sql
ZONES(zone, subzone, question, sources)                    -- generated
PROMPT_VERSIONS(version, role, sha, prompt_text, response_schema, created_at)  -- immutable
HIVE_WAVES(wave_no, started_at, finished_at, model, lens_version, selection_rule,
           chunks, asserts, refs, signals, gate_rate, field_before, field_after, credits)
WAVE_INPUT(wave_no, doc_id, chunk_no, basket, stratum, need_score)
FIELD_SNAPSHOTS(wave_no, doc_id, chunk_no, fact_ids array, signal_ids array, digest_text)
FIELD_FACTS(fact_id, first_wave, doc_id, chunk_no, basket, zone, subzone, client_id,
            claim, quote, speaker_role, fact_type, target_q, knowledge_state, stake,
            amount_rub, due_date, counterparty, promise_status, deal_hint, fact_day,
            emb vector(float,1024), strength, carriers, status,   -- candidate|accepted|contradicted|superseded
            gate_passed)
FIELD_EVIDENCE(fact_id, wave_no, doc_id, chunk_no, relation, quote, gate_passed)  -- asserts|reinforces|contradicts|updates
FIELD_SIGNALS(signal_id, wave_no, kind, zone, subzone, text, why_matters, strength, status, resolved_by)
```

## 5. Extraction
Run SQL from the CLI with a key-pair connection (`snow sql -c <jwt-connection> -f ...`) so parallel runs do not open browser logins. Calls that return no parsable result are retried automatically (`BENCH_RUN(..., max_retries)`, `attempts` per row); in waves the same rule applies — failed chunks stay open and are re-called before the wave closes.

One `AI_COMPLETE` per chunk, model **`claude-opus-5-5`** (benchmark winner). Use a compiled version from `MODEL.PROMPT_VERSIONS`; at runtime only replace `{basket} {day} {client_id} {field} {chunk_text}`. The schema is compiled into the prompt and parsed with `TRY_PARSE_JSON` (opus-5-5 returns NULL with `response_format` here). `max_tokens` 8192. Parse with `LATERAL FLATTEN`; reject unknown `zone/subzone`, unknown `fact_id`/`signal_id` in refs.

## 6. Gate (SQL, not LLM)
For asserts and refs: `contains(regexp_replace(chunk_text,'\\s+',' '), regexp_replace(quote,'\\s+',' '))` and `length(quote) ≥ 15`. Only gated rows enter the field. Gate rate → `HIVE_WAVES`.

## 7. Coverage and done criteria
`MODEL.V_COVERAGE`: one row per `zone, subzone` from `ZONES` (left join → blind subzones visible): accepted facts, candidates, contradictions, open signals, carriers, status `covered | thin | blind`. Also `MODEL.V_QUERY_READINESS`: accepted facts per target query Q1–Q9.

- [ ] ≥ 1 500 accepted facts, gate rate ≥ 85 %
- [ ] every zone except `other` ≥ 40 accepted facts; blind subzones listed
- [ ] query readiness: Q1–Q3 ≥ 100 facts each, Q4 ≥ 30 promises with counterparty, Q5 ≥ 30 with `amount_rub`, Q6 ≥ 30 in `marketing`, Q9 ≥ 50 open signals
- [ ] ≥ 200 refs between waves (`reinforces`/`contradicts`) — proof the hive exchanged knowledge
- [ ] PII regex (phones/emails) = 0; 10 random facts checked by eye

## 8. Hand-off
- SQL here; `reports/waveN.md`: `V_COVERAGE`, `V_QUERY_READINESS`, gate rate, refs, duration, credits, 3 example claims per zone **paraphrased without names**.
- Internal: line in `delivery/1-concept/L0-work-log.md`, O2 status in `delivery/OUTCOMES.md`, `delivery/ROADMAP.md` "▶ СЕЙЧАС" → step 3.
- Commit **only on Taras's command**; record in A13.

## Never
Modify `RAW`/`CORE`; move data out of Snowflake; commit chunk texts, quotes, names, phones; run a full wave without the 20-chunk dry run.
