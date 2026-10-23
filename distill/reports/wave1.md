# Wave 1 report (scouts, empty field)

23.10.2026 13:31–13:42 PT · prompt `distill_plain_v3` (d31ba11aed28) · model `claude-opus-5-5`, temperature 0 · 12 batches × 100 chunks · runner `sql/30_wave.sql` (`HIVE_WAVE`).
Aggregates only — no texts, quotes or names.

| Metric | Value |
|---|---|
| Chunks | 1 121 (CRM-linked 480, sales calls 150, founder insights 150, sales chats 100, founder chats 100, meetings 50, wiki 50, training 22, engagement 19) |
| Wall-clock | 638 s (≈ 53 s per batch of 100) |
| Failed calls | 1 → retried automatically → 0 left |
| Tokens | 4.91M in · 2.53M out |
| Facts | 5 315 · **5 302 pass the verbatim gate and a valid subzone (99.8 %)** |
| Facts per chunk | 4.7 |
| Open signals (gaps / questions) | 2 714 |
| Subzones covered | **37 / 37** (0 thin, 0 blind) |

## Coverage by zone (gated facts)
| Zone | Facts | Subzones covered | Open signals |
|---|---|---|---|
| marketing | 912 | 5/5 | 379 |
| product | 807 | 5/5 | 237 |
| money_pricing | 779 | 5/5 | 541 |
| clients_sales | 778 | 6/6 | 357 |
| operations | 751 | 3/3 | 345 |
| team_people | 513 | 5/5 | 375 |
| strategy | 497 | 4/4 | 236 |
| founder_rules | 228 | 3/3 | 209 |
| other | 37 | 1/1 | 32 |

## Readiness for target queries
| Query | Facts | Key signal |
|---|---|---|
| Q1 win-back deals | 168 | 96 linked to a CRM client |
| Q2 why we lose | 204 | 156 objections / loss reasons / sales behaviour |
| Q3 teach vs do | 584 | 220 sales behaviour facts |
| Q4 promises | 516 | 416 promises |
| Q5 money leaks | 792 | 271 with an amount in ₽ |
| Q6 marketing | 1 264 | 84 with ₽ |
| Q7 on fire | 990 | — |
| Q8 delegate vs founder | 738 | — |
| Q9 blind spots | 46 facts + 2 714 signals | — |

## Done criteria (README §7)
- [x] ≥ 1 500 accepted facts, gate ≥ 85 % — 5 302, 99.8 %
- [x] every zone except `other` ≥ 40 — min 228 (founder_rules)
- [x] Q1–Q3 ≥ 100, Q4 ≥ 30 promises, Q5 ≥ 30 with ₽, Q6 ≥ 30 marketing, Q9 ≥ 50 signals
- [ ] ≥ 200 refs between waves — needs wave 2 (field neighbourhoods)
- [x] PII regex (phones, emails) = 0
- [ ] 10 facts checked by eye — pending (Taras)
