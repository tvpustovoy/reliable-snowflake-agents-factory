# 05 · Open Human Context — the person side

*"A person changes. Their goals conflict. Their memory is selective. Their understanding of themselves is revised. Sometimes they lose access to their own ways of coping with what is happening."*

**Origin.** Prior art: Open Human Context (OHC) 0.1.0-draft.2, `open-human-context-specification/` (spec Apache-2.0, docs CC BY 4.0; name and `urn:ohc:` namespace provisional; not yet published). OHC is the person-side companion of ODE (concept 04); it has an internal TARA bridge.
**Built during the hackathon:** OHC principles applied to *company* knowledge and to the people inside a company (founder, sellers, clients) in Snowflake (§4).

---

## 1. What OHC is — and is not
An open, file-based format for the context a person shares with agents and services. It keeps **records about a person, each with its origin**: primary sources, the experiences they tell of, how those were understood then and later, what is stated now, the frameworks of description used, the ways of coping tried and whether they helped, and the permissions under which any of it may be used.
- The person holds the context (or chooses who does). Agents receive **projections** under permission, propose changes, report back. The person can confirm, correct, contest, export, erase.
- **An ODE package never contains a person's context;** it references a projection the person granted.
- Not: a psychological theory or "true model", a diagnosis, agent behaviour, an authorization system, a score or ranking of a person, a hosted service.

Two principles: **Preserve experience. Evolve interpretations.** · **Help humans remember what they know when they need it most.**

## 2. Five clauses → five mechanisms
| Clause | Mechanism |
|---|---|
| A person changes | nothing is current by default; records never change, a change is a new record that `supersedes`; two time axes; **freshness computed at use, never stored** |
| Goals conflict | contradictory claims coexist; a `Tension` records a conflict that matters and **who decides it**; nothing averaged or auto-resolved |
| Memory is selective | primary material kept by reference + hash; an `Episode` carries several dated accounts; readings carry counter-evidence; return to the exact span of the original |
| Self-understanding is revised | `Interpretation`s are separate, attributed records on the knowledge-time axis (`heldDuring`): "how did I understand this then?" is a query |
| Loss of access to coping | `Practice` + `Outcome` records; an authorised `RecallCue` lets an agent hand them back, with alternatives and a brake against self-confirmation |

**Experience first:** sources and episodes (what happened) are separate from readings (what was made of it). **Evidence never depends on a reading** (layer rule G1); a new reading never rewrites what happened.

## 3. One record, six axes; governance
Status is never one word:
- **origin** — declared · observed · inferred · derived · imported · attested (set once);
- **endorsement** — the person's stance, incl. *contested* (dispute kept open, nothing deleted);
- **epistemic status** — from "as reported" to "frame-relative";
- **admission** — active context vs. still a proposal;
- **freshness** — usable as current? computed at use;
- **disclosure** — sensitivity, categories, handling, audience.

Display labels (stated, confirmed, hypothesis, pending, stale, disputed) are **derived**; every status change is an appended `Review`.
Rules worth reusing: an agent's reading is never `declared` — it is `inferred`, starts as a proposal and a hypothesis, and needs a separate **`infer` permission** with purpose and consent; permission to *use* ≠ permission to *infer*.
Governance: a `Grant` names one grantee, purposes, records, actions, mode, expiry (≤1 year; ≤180 days for inference or special categories). What leaves is a **projection** (one grantee, one purpose, one moment); **no existence oracles** ("not disclosed" regardless of whether anything exists); per-grantee aliases; salted hash-chained disclosure log of ids, never content. Verbatim originals released in tiers (none → index → summary → cited excerpts → verbatim with step-up confirmation).
Conformance: **L0** minimal · **L1** grounded (grounds, hashes, reviews, layer rules) · **L2** governed (grants, projections, event chain, lock).

## 4. How Firn uses OHC in Snowflake
OHC is about persons, but its architecture is exactly what a **company** world model needs — and it governs how the people inside the company appear in it.

| OHC principle | Firn / Snowflake |
|---|---|
| Preserve experience, evolve interpretations | `CORE.SRC_DOCUMENTS` / `SRC_UTTERANCES` (experience, immutable, hashed) are separate from `FACTS` (verbatim spans) and from syntheses, narratives, culture hypotheses (readings). A new reading never rewrites a fact or a source. = WMLM "corpus said ≠ agent consolidated" |
| Six status axes | facts carry `origin` (declared by owner / observed in CRM / inferred by worker), `endorsement` (owner confirmed / contested), `knowledge_state` (TARA), `admission` (candidate vs accepted), freshness computed at query (`valid_as_of` + window by kind), `disclosure` (layer, sensitivity) — labels derived in views |
| Tension + who decides | `CONTRADICTIONS` / `FORKS` name the decider (owner); never averaged |
| supersedes, two time axes | master values and facts: `updates` → `superseded`, history kept; "what did the company believe in August?" is a query |
| Readings by agents need `infer` | culture, "five poisons" and seller-related readings are `inferred` hypotheses, admitted only via owner review; **no scores or rankings of people** |
| Projection, not copy | each compiled agent gets a projection of the world model for its purpose (row access / masking by layer, Book, sensitivity); **no existence oracles** in agent answers about restricted areas |
| Person-side context of employees | for seller onboarding/coaching: a seller's own context (goals, boundaries, preferences, progress) can be held as an OHC context under the seller's grant; the ODE agent references the projection, the company model does not absorb it |
| Disclosure log | access to sources and quotes logged by id (Snowflake access history + our event table) |
| Verbatim tiers | agents show summaries and cited spans; full originals only to authorised roles |

**Why it matters:** trust in a company agent requires the same discipline as trust in a personal one — know where every statement came from, keep conflicts open until the right person decides, and let interpretations evolve without corrupting evidence.
