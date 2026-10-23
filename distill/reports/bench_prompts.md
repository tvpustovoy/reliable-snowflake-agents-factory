# Benchmark: worker prompt × model (wave-1 conditions)

Date 23.10.2026 · data: same 20 chunks (`MODEL.BENCH_INPUT`, 7 baskets, ≈ 54K chars) · empty field · temperature 0 · max_tokens 8192.
Prompts (immutable, `prompts/compiled/`): `distill_bee_v2` (role = forager-bee metaphor) and `distill_plain_v2` (role = plain task statement); everything else identical. Models: `claude-opus-5-5`, `claude-sonnet-5`.
Reproduce: `sql/20_bench.sql` → `call MODEL.BENCH_RUN(run_id, prompt_version, model)`; results `MODEL.V_BENCH_SUMMARY`, `MODEL.BENCH_JUDGE`.

## Speed and volume
| Run | Time, s | Out tokens | Facts | Gated % | Valid zone % | Subzones (of 37) | Q1–Q9 hit | Sales facts¹ | Rules² | With ₽ | Promises | Signals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bee × opus-5.5 | **32.8** | 47.0K | **110** | **100.0** | **100.0** | **32** | 9 | **16** | 22 | 10 | 8 | **54** |
| plain × opus-5.5 | 34.9 | 46.6K | 107 | **100.0** | **100.0** | 30 | 9 | 13 | 21 | 10 | 7 | 50 |
| bee × sonnet-5 | 58.4 | 74.0K | 103 | 96.1 | 94.2 | **32** | 9 | 9 | **29** | 8 | 7 | 52 |
| plain × sonnet-5 | 79.0 | 73.5K | 94 | 98.9 | 85.1 | 29 | 9 | 8 | 25 | 8 | 8 | 48 |

¹ objection / loss_reason / sales_behavior — the demo query Q1–Q3. ² training_rule / rule. Input ≈ 85.8K tokens in every run.

## Quality (LLM judge, 25 random facts per run, 1–5)
Judge: `claude-opus-5-5`, temperature 0. Caveat: the judge is the same family as one of the candidates.

| Run | Faithful | Atomic | Useful | Zone ok | Overall |
|---|---|---|---|---|---|
| plain × opus-5.5 | **3.44** | 3.76 | **3.64** | **4.08** | **3.73** |
| bee × sonnet-5 | 3.08 | **3.79** | 3.54 | 4.04 | 3.61 |
| plain × sonnet-5 | 3.08 | 3.68 | 3.60 | 4.00 | 3.59 |
| bee × opus-5.5 | 2.92 | 3.75 | 3.58 | 4.04 | 3.57 |

Differences in quality are within noise for n = 25 (≈ ±0.3). **Model** differences in speed and validity are large and consistent; **prompt** differences are small.

## Findings
1. **Opus-5.5 is ~2× faster than Sonnet-5** here (33–35 s vs 58–79 s per 20 chunks) and uses ~37 % fewer output tokens; Sonnet-5 spends tokens on hidden reasoning (at max_tokens 4096 it truncated 4–7 of 20 answers).
2. **Opus-5.5 has a perfect gate and zones** (100 % / 100 %); Sonnet-5 invents subzones in 6–15 % of facts.
3. **Bee vs plain:** with Opus the bee role gives slightly more facts, sales facts, subzones and signals but lower judged faithfulness; with Sonnet the bee role improves volume, zone validity and speed. No decisive winner → the metaphor does not hurt; keep it as the default for the narrative, re-check on a larger sample.
4. **Main quality problem is shared by all runs — faithfulness ≈ 3/5.** The gate only proves the quote exists; claims add details from the rest of the chunk (judge notes: "not in quote", "inferred", "bundled"). Fix for the next prompt version: *the claim must be supported by the quote alone*; allow quotes up to 300 chars or 2 quotes per fact; add a second gate (cheap judge) for claim ⊆ quote.
5. **Infra note:** `claude-opus-5-5` returns NULL with `response_format` in this account; the schema is therefore compiled into the prompt text and parsed with `TRY_PARSE_JSON` for all runs.

## Added: claude-sonnet-5-5 (same 20 chunks, same prompts v2, max_tokens 8192)
`claude-sonnet-5-5` (PUPR, AWS_GLOBAL) returns NULL when `temperature` is passed in this account, so it ran **without temperature** (default sampling) — less reproducible than the other runs.

| Run | Time, s | Facts | Gated % | Valid zone % | Subzones | Sales facts | Rules | With ₽ | Signals | Avg out tok | Chars/out tok | Faithful | Atomic | Useful | Zone ok | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bee × opus-5.5 | 32.8 | **110** | **100** | **100** | **32** | **16** | 22 | 10 | **54** | 2 350 | 1.59 | 2.92 | 3.75 | 3.58 | 4.04 | 3.57 |
| plain × opus-5.5 | 34.9 | 107 | **100** | **100** | 30 | 13 | 21 | 10 | 50 | 2 328 | 1.55 | **3.44** | **3.76** | 3.64 | 4.08 | **3.73** |
| bee × sonnet-5 | 58.4 | 103 | 96.1 | 94.2 | **32** | 9 | **29** | 8 | 52 | 3 698 | 0.99 | 3.08 | 3.79 | 3.54 | 4.04 | 3.61 |
| plain × sonnet-5 | 79.0 | 94 | 98.9 | 85.1 | 29 | 8 | 25 | 8 | 48 | 3 675 | 0.94 | 3.08 | 3.68 | 3.60 | 4.00 | 3.59 |
| bee × sonnet-5.5 | **22.8** | 87 | 96.6 | **100** | 27 | 13 | 24 | **11** | 47 | 1 582 | 1.95 | 2.79 | 3.08 | 3.71 | 4.21 | 3.45 |
| plain × sonnet-5.5 | 33.3 | 89 | 98.9 | **100** | 24 | 13 | 21 | 9 | 46 | **1 485** | **2.11** | 3.13 | 3.21 | **3.75** | **4.33** | 3.60 |

**Sonnet-5.5 vs Opus-5.5.** Sonnet-5.5 is the fastest and most token-frugal (≈ 1.5K out tokens/call, no visible reasoning overhead; 2× more text per token than Sonnet-5) and places zones very well (zone_ok 4.2–4.3, 100 % valid). But it extracts **~20 % fewer facts and fewer subzones** (24–27 vs 30–32) and its facts are **less atomic** (3.1–3.2 vs 3.75: it bundles several statements into one claim). For a coverage map, more atomic facts across more subzones matters more than ~10 s per wave.

## v3: faithfulness rule (Opus-5.5 only)
Change in LENS §5 and task: *the claim must be fully supported by its own quote alone*; quotes up to 300 chars. Compiled as `distill_bee_v3` (0e5f984b2c47) and `distill_plain_v3` (d31ba11aed28). Runs used the retrying procedure (max 2 retries): 0 retries needed.

| Run | Time, s | Facts | Gated % | Subzones | Sales facts | Rules | Avg quote | Faithful | Faithful ≥ 4 (of 25) | Atomic | Useful | Zone ok | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bee × opus v2 | 32.8 | 110 | 100 | 32 | 16 | 22 | 79 | 2.92 | 6 | 3.75 | 3.58 | 4.04 | 3.57 |
| **bee × opus v3** | 43.5 | 105 | 100 | 32 | 15 | 24 | 92 | 3.72 | 16 | 3.92 | 3.56 | 3.92 | 3.78 |
| plain × opus v2 | 34.9 | 107 | 100 | 30 | 13 | 21 | 75 | 3.44 | 11 | 3.76 | 3.64 | 4.08 | 3.73 |
| **plain × opus v3** | 36.5 | 105 | 100 | **33** | 15 | 22 | 95 | **4.04** | **20** | **4.08** | 3.52 | 4.04 | **3.92** |

v3 fixes the main weakness: faithfulness +0.6–0.8 (facts scored ≥ 4 go from 6–11 to 16–20 of 25), atomicity also improves, volume and coverage almost unchanged (−2…−5 facts, subzones 32–33). Plain role is slightly ahead of the bee role again, still within noise.

## Decision for wave 1
Model **claude-opus-5-5** (best coverage: most facts, subzones and sales facts; gate and zones 100 %; reproducible at temperature 0). Sonnet-5.5 is the fallback if wall-clock becomes the bottleneck; Sonnet-5 is not recommended (slow, invents subzones). Prompt: **`distill_plain_v3`** (best faithfulness and overall); `distill_bee_v3` is an equivalent alternative if the narrative needs the hive metaphor in the prompt.
Projection for wave 1 (≈ 1 200 chunks, Opus): ≈ 6 600 facts; time is set by Snowflake parallelism, not the corpus (20 chunks ran in ~33 s as one statement).
