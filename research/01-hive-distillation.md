# 01 · Hive distillation

*How many short-lived LLM workers build one provable world model of a company — coordinated by a shared field of knowledge, not by a dispatcher — and how this runs natively in Snowflake.*

**Origin.** Hive knowledge distillation was first tried three months ago on file-based storage (8Hats, WM Learning Machine, Aug 2026).

**Built during the hackathon.** We re-implemented it natively in Snowflake (§4–§7) and ran it on the pilot company:
- **The goal comes first.** The business model is split into 9 zones and 37 subzones. The worker brief is derived from target questions Q1–Q9: what to extract, and which fields are needed (amount, due date, counterparty, promise status).
- **Prompts are compiled and versioned** (`MODEL.PROMPT_VERSIONS`).
  - Benchmarked prompt × model on the same 20 chunks.
  - Prompt v3 raised quote faithfulness from ≈3 to ≈4 out of 5. A claim is now backed only by its own quote.
  - Picked `claude-opus-5-5` for wave 1.
- **Wave 1:** 1,121 chunks in 638 s.
  - 5,302 facts, 99.8 % of them passed the SQL quote gate.
  - All 37 subzones covered; 2,714 open signals.
  - 0 personal data; failed calls retried automatically.
- **Conflicts:** embedding-based candidate pairs within a subzone, then an LLM judge.
  - 341 fact↔fact conflicts, split into changed over time, direct contradiction and rule violation.
  - 30 fact↔CRM conflicts.
  - Each conflict is linked to the decision that depends on it.
- **Organisation goals** distilled from the facts, with evidence and founder/team agreement.
- **The resulting world model feeds the compiled agent** `FIRN_CHIEF_OF_STAFF`.

---

## 1. Do we need a hive at all? Why not put everything into one context?

Measured on the pilot (RecPlace, `RECPLACE.CORE.SRC_DOCUMENTS`, ~2.8 chars/token for Russian):

| Basket | Docs | ≈ tokens |
|---|---:|---:|
| meetings (summary + transcript) | 1,464 | 5.9M |
| founder's Telegram archive | 7,905 | 3.3M |
| team chats | 4,360 | 1.8M |
| old sales calls | 91 | 0.9M |
| knowledge-base notes | 289 | 0.6M |
| product wiki | 706 | 0.5M |
| public site | 188 | 0.4M |
| founder insights + sales training + calls + engagement | 152 | 0.3M |
| **Total** | **15,155** | **≈13.8M** |

**Answer: hybrid.**
- **The whole company does not fit:** ~14× a 1M window, and growing every day. Even if it fit, one pass gives a summary, not a verifiable atomic map. Recall in very long contexts degrades in the middle, nothing is checked per claim, and every refresh means re-reading everything.
- **The canon does almost fit:** sales training, founder insights, wiki and KB notes ≈ 1.3M tokens. So we use the **long context where it is strongest: seeding**. One or a few large-context passes over the canon produce the initial vocabulary, entity list, glossary and domain map, the "queen" that sets the language of the hive.
- **The operational stream needs the hive:** meetings, chats, archive and calls (≈12M tokens and growing) are where state, promises, conflicts and culture live. They are processed by many small workers who share a field.
- **Business reasons beyond window size:**
  1. *Provenance:* every fact needs a verbatim quote checked by SQL. That is cheap per chunk and impossible to audit for a single giant answer.
  2. *Incrementality:* new data → only new chunks are processed (Stream → Task). One context means re-running everything.
  3. *Independence:* the same fact confirmed by different people in different chunks is real evidence. One context collapses this into one opinion.
  4. *Cost and parallelism:* Snowflake fans out `AI_COMPLETE` across rows. Wall-clock time is set by the wave, not by the corpus.
  5. *Governance:* per-chunk outputs carry source, layer and speaker, so they can be filtered, masked and projected per agent.

Rule of thumb: **use one context when the material is small, static and canonical; use the hive when it is large, living, multi-voiced and must be provable.**

## 2. Core ideas (prior art, WMLM fleet)

1. **Preparing data = manufacturing workers.** Role + lens + data boundaries + pointer to the field = the firmware of a worker instance. The machine that compiles agents for clients starts by compiling its own workers: a fractal of the same cycle.
2. **Optics: lenses and objective.** What a worker extracts is determined by the frame of view, not by the corpus.
   - **Operator lens:** task, target role, boundaries, truth hierarchy, acceptance criteria.
   - **Basket lens:** what to look for in this kind of data and what to ignore.
   - **Objective:** their composite for a run.

   Lenses are addressable (name + version + sha), immutable and **inactive without the owner's signature**. Two runs of the same `lens@version` are comparable.
3. **Fleet: species, instances, two lives.** A species is a template (distiller, field keeper, consolidator, operator); an instance is species + objective. The operator is long-lived. Distillers are **ephemeral**: born for one chunk, deliver, finish. Chunk size is chosen to fit one life, so a worker never needs context compaction. **Continuity lives in the field, not in an agent's context.**
4. **Worker prompt: reconciled, then iteratively optimised.**
   - `assemble` deterministically merges role + objective into an immutable base, with one source of truth per block.
   - `tune` builds a model-specific candidate.
   - `select` promotes the winner of a pre-declared measurement.
   - The owner signs against the winner's sha.
   - Each wave returns a score to the prompt: norms that are systematically violated, sections that left no trace.
   - "Better" means fewer target-model tokens + hard floor (closed lists, span, layers, PII) + Pareto gain.
   - The prompt never changes mid-basket. Lessons migrate upward into lenses.
5. **Stigmergic work field.** A chunk is a **need**, not an assignment. Workers claim slots atomically; results live in the environment and survive any worker. A stale claim without a result expires and the chunk reopens. An append-only ledger is the pheromone trail. The number of workers is a free parameter: the field is the same for 1 or 20.
6. **Consensus depth as a run parameter.** Where errors are expensive, N independent slots per chunk; a fact is accepted at ≥⌈2N/3⌉, matched by overlapping spans. Disagreement is kept as a signal of a murky source. Honest limit: N copies of one model ≠ independent verification. Slots can use different models.
7. **Field of facts: workers see their neighbours' work.**
   - The facts already extracted from nearby chunks shape what the next worker extracts. This gives consistent names and vocabulary, no duplicates, and visible contradictions.
   - The snapshot is pinned per chunk (`context_sha256`), so "what the worker saw" is machine-checkable.
   - **A contradiction with the field is a finding, never a reason to stay silent or to overwrite.**
   - Growth path:
     - v1 — whole-area slice;
     - v2 — graph neighbourhoods;
     - v3 — compiled graph: each strongly connected component replaced by its exact boundary operator B = (I−Q)⁻¹R, giving a query-equivalent DAG for fast neighbourhood queries.
8. **Scaling has two layers.** *Correctness* (atomic claims, TTL, results in the environment) and *operational stability* (observability, health, limits, restart, worker count under budget).

## 3. What changes on Snowflake (the key shift)

Snowflake thinks in **sets**, not processes. So the hive lives in **generations (waves)**:
- **A worker is a row.** One `INSERT … SELECT AI_COMPLETE(…) FROM chunks_of_wave` *is* the swarm; Snowflake parallelises it. Locks become idempotent `MERGE` on `(run, chunk, slot)`. A failed call just leaves the chunk open for the next wave.
- **A wave is one snapshot of the field.** All chunks in a wave see the same field, so they are independent and comparable. The field updates between waves. The order dependence that WMLM accepted as "the price of v1" becomes **explicit and reproducible**: the wave number is part of every fact's provenance.
- **The field is tables, not files.** Transactions + Time Travel make "what the worker saw" auditable for free.

## 4. Data model
```
HIVE_RUNS        run_id, operator_lens@sha, model(s), consensus_depth, budget, status
HIVE_WAVES       run_id, wave_no, selection_rule, chunks, cost, field_size_before/after
CHUNK_QUEUE      chunk_id, need_score, status(open|done|silent), wave_no
FIELD_FACTS      fact_id, title_en, prose_en, span_ru, zone, domain, layer, knowledge_state,
                 entity_refs[], emb VECTOR(FLOAT,1024), strength, carriers, first_wave, status
FIELD_EVIDENCE   fact_id, chunk_id, wave_no, slot, relation(asserts|reinforces|contradicts|updates|refines),
                 span_ru, carrier, is_founder
FIELD_SIGNALS    kind(gap|question|contradiction|homonym|entity_unresolved|slot_divergence), about, strength, status
FIELD_SNAPSHOTS  chunk_id, wave_no, fact_ids[], signal_ids[], digest_text, snapshot_sha
SLOT_OUTPUTS     run, chunk, slot, model, prompt_sha, snapshot_sha, raw_json, gate_status
```

## 5. The neighbourhood: what a worker sees (field v2, natively)
| Ring | Content | SQL |
|---|---|---|
| 0 · same document | facts from earlier chunks of this document | `doc_id` |
| 1 · same entities | facts about the clients, managers, products mentioned in the chunk | dictionary/alias match against Entities |
| 2 · semantic neighbours | top-K field facts by similarity to the chunk | `AI_EMBED` + `VECTOR_COSINE_SIMILARITY` + `QUALIFY` |
| 3 · same time / participant | same period, same owner/peer | `day ± 30`, `owner_code` |
| 4 · open signals | questions, gaps, contradictions, homonyms nearby | `FIELD_SIGNALS` |
| + glossary | fixed ru → en terms | `GLOSSARY` |

Budget ~2–3K tokens; weighted by `similarity × layer_weight × strength`, canon first. The snapshot is written **before** the model call, and all slots of a chunk receive the same snapshot.
Verified on the pilot: `snowflake-arctic-embed-l-v2.0` gives 0.66 similarity for two Russian paraphrases of the same rule and 0.35 for an unrelated rule.

## 6. What a worker returns (new vs. WMLM)
A worker does not only add facts. It **references field facts by id** (JSON schema via `response_format`):
- `asserts` — new fact with `span_ru` (verbatim) + EN title/prose;
- `reinforces(fact_id, span)` — independent confirmation; raises strength without a duplicate;
- `contradicts(fact_id, span)` — creates a contradiction; `knowledge_state = contradictory`;
- `updates(fact_id, span, valid_as_of)` — was true, changed; history kept (`superseded`);
- `refines(fact_id)`;
- `signals` — questions, gaps, unresolved entities, suspected homonyms.

Result: **deduplication and consensus become structural.** The hive builds an evidence graph as it works (WMLM's v2 "fact graph", never implemented there).
Gate in the same statement: `CONTAINS(chunk_text, span_ru)`, length ≥ 15, closed enums, referenced ids exist.

## 7. Pheromones, need, evaporation
- **Fact strength** = independent carriers (different speakers/sources; the founder's voice counted separately) × layer weight. Accepted when it passes the threshold and has ≥2 carriers.
- **Chunk need** = unresolved entities + open signals nearby + weak coverage of its neighbourhood, × basket weight. The next wave goes **where the field is weakest or a question is open** (need-first).
- **Evaporation:** strength of unconfirmed candidates and signals decays per wave, so noise that nobody confirms fades.

## 8. Wave cycle (`HIVE_WAVE(run_id)`)
1. **Select** top-B chunks by `need_score` (≤k per document; early waves seeded with canon).
2. **Build neighbourhoods** → `FIELD_SNAPSHOTS`.
3. **Swarm:** `AI_COMPLETE(model, prompt(lens, glossary, digest, chunk), response_format)` into `SLOT_OUTPUTS`.
4. **Gates:** JSON, verbatim span, enums, valid references.
5. **Merge into the field:** new facts + embeddings; reinforcements, contradictions, updates, signals.
6. **Recompute need** of neighbouring chunks; evaporate.
7. **Account:** cost, field growth, new contradictions → `HIVE_WAVES`.
8. **Stop** when the queue is empty, the budget is spent, field growth per wave < ε, or **the mission's evaluation passes** (stop by exam, not by corpus exhaustion).

Orchestration: a Snowflake Task graph (`HIVE_WAVE` → `CONSOLIDATE` every M waves). Continuous learning: Stream on chunks → new chunks enter the queue with high need → periodic "dreaming".
Consolidator (every M waves): per-domain slices (`AI_AGG`), homonyms, owner questions, master values with history.

## 9. Honest limits
- Order dependence remains, but it is explicit (wave in provenance) and managed (canon seeding, need-first). Two orders can be run and compared.
- Early-wave errors could anchor the field. Countermeasures: contradiction is a finding; strength needs independent carriers; unconfirmed claims evaporate.
- A worker sees a neighbourhood, not everything; global coherence is the consolidator's job.

## 10. Hackathon scope
Seed pass over the canon (long context) → 4–6 waves × ~80–100 chunks (KB notes → meetings → chats → calls). N=1 + cross-model judge on a sample. Rings 0/2/4 + glossary (1/3 if time allows). One consolidation at the end.
Demo: **"watch the hive learn"** — per-wave field size, reinforcement vs. new-fact share (saturation), contradictions and owner questions appearing; one fact card with its evidence graph across people and sources.
