# 02 · The self-evolving organization

*How a company of people and agents remembers what has been verified, compiles that knowledge into its executors, and changes its own rules — without silently rewriting what it exists for. And how this loop runs inside Snowflake.*

**Origin.** Prior art (8Hats, Jul 2026): «Как организация эволюционирует — и где в ней Agents.University», `ai-native-vision/vision-v2/narrative/core-technology/core-technology-report-ru.standalone.html` (canon: `core/world-model-books.md` v0.2–0.3, `core/distillation-compilation-beat.md`, `research/self-evolving-org/`). Related: `8hats-worldmodel/` (Books, engine), dicodex addendum (codex), TARA, Open Digital Employee.
**Built during the hackathon:** the Snowflake-native realisation of the loop for a real company (RecPlace): Books as governed tables, the engine as SQL signals and tasks, the beat as distillation + agent compilation, ratification and evolution as owner acts and versioned agents (§5–§7).

---

## 1. The idea in one paragraph
An organization becomes **self-evolving** when three things exist together:
- a **Model** that remembers only what is verified (five Books);
- an **Engine** that turns the telemetry of real life (conflicts, failures, outcomes) into legitimate changes to that model and to the rules;
- **Institutions** — rules and services an agent or person can rely on even in a crisis.

People set the goals and the boundaries; inside them, the system improves itself. *"Change the system. Preserve the mandate."*
Formula: **Trust = Consistency × Reliability.** Zero in either factor means zero trust.

## 2. Zone I — the Model: five Books + the Engine (+ the Codex)
Books are separated **by mode of validity** (how an entry is verified), not by topic. That is why this is an architecture rather than a list.

| Book | Question | Validity mode | Updated by |
|---|---|---|---|
| **Entities** | Is it who we think it is? Is identity intact? | identity reconciliation | rarely, procedurally (like a constitution) |
| **Knowledge** | Is it true? | provenance to the line | distillation (waves) |
| **Resources** | How much is left? Does the balance close? | income − spending = balance | **accounting — balances are kept, not distilled** |
| **Relationships** | Is the commitment alive? | confirmation by the counterparty | "the counterparty, not us, decides whether an edge is alive" |
| **Workflows** | Does it reproduce within budget and quality? | run: plan ↔ fact + criteria declared before the run | action and measurement |

- **One canon, declarative shadows.** "$15K pilot" is a fact of history in Knowledge and an income line in Resources; the other Books hold a shadow reference, not a copy.
- **The Engine is not a sixth Book.** It holds three things:
  - *constraints* (values, goals, constitution — where to search);
  - *zone of proximal development* (where to search now);
  - *energy-efficiency criteria* (what counts as a find).

  It searches by evolutionary computation: generate variants, test by action, discard failures, keep successes (reference: M. Levin, TAME).
- **Objective function:** energy-efficiency of alignment with reality — the organization keeps finding configurations where "learning to learn" costs less attention, tokens, time and trust.
- **Codex** (addendum v0.3): the third contour next to the Books and the Engine. It holds the enumerated rules of the organization, i.e. who may change what and what counts as evidence. **Triad: Books (content) · Engine (change) · Codex (legitimacy).**

## 3. Zone II — the Bridge: the beat of inhale and exhale
- **Inhale — distillation:** world → model. Extract from experts, environment and experience, generalise, strip context, universalise — with provenance. (Concept 01 is how we inhale at scale.)
- **Exhale — compilation:** model → executor. Express universal knowledge into a specific agent or person at the right level, like a genome expressed into different proteins. **"A small brain is not a cut-off piece of a big one."** An agent needs one reconciled document optimised for this morning, not "ten linked files".
- Neither lives without the other: distillation without compilation hoards knowledge nobody can carry into work; compilation without distillation multiplies the unverified.
- **Red line of the compiler:** the chain claim → source (fact-id) must survive compilation.
- **Certification:** a daily permit to work after self-diagnosis.
- **Access by construction:** knowledge is excluded at build time, not forbidden at model level — "the best way not to leak a secret is not to know it".
- **Third derivative:** act (0) → learn (1) → learn to learn (2) → continuously make learning-to-learn cheaper (3). Provenance at every step makes the loop reproducible *and verifiable*.

Prior measurements (8Hats' own corpus, not RecPlace):
- 527 files → 480 verified facts in ~10 days;
- cross-vendor re-check of 474/474 facts, 84% confirmed verbatim, 0 retroactive deletions;
- first compiler run: −47% time, −46% reading tokens, quality 24/24, 0 fabrications, fact-id preserved 100%.

## 4. Zone III — the Environment (polis): institutions and actors
- **Institutions = rules of the game**, presented as coverage functions rather than departments:
  - Constitution (mission, rights, duties, jurisdiction);
  - Identity & registry;
  - Conflict resolution & audit ("a contradiction is resolved, not voted on");
  - Security & access;
  - Finance & resources;
  - Learning & onboarding (home of the internal university);
  - Reputation & trust;
  - Processes & roles;
  - Infrastructure.
- **Actors:** autonomous agents and human + agent cells.
- **Governed self-development:** the organization may improve its knowledge, workflows, agents, roles and resource allocation. It may **not** silently rewrite its mission, rights or power. Gate order is strict:
  1. goals direct the search;
  2. rights and invariants define admissibility;
  3. authority decides who may approve;
  4. only among changes that passed these gates does efficiency choose the best.
- **Evolution of the environment:** Observe → Propose → Ratify → Enact. Constitutional changes (goals, rights, power) always need human ratification. *Autonomy inside the boundary; human sovereignty at the boundary.*
- Honest hole (from a 72-agent adversarial audit, 31 verified gaps): the third floor of the polis, institutions, has no canonical home yet.

## 5. On the boundary — Agents.University
- An enabler from outside that installs the mechanisms inside and teaches the organization to use them: "installs from outside — a living mechanism stays inside".
- It follows from the canon: **the Workflows Book is class-dependent.** Someone must find once how to train an agent of a given class, then replicate it by compilation. That is why people must be trained individually and agents need not be.
- **It installs:** bootstrap of the five Books and provenance standards, institutions turnkey, point-zero controls.
- **It coaches people, owners included:** how to govern evolution, set goals, keep decisions; onboarding of agents and human + agent cells. In a cell, the updated agent coaches the human on what changed.
- **It gives guidance:** distillation, compilation and certification standards; decision methodology; amendment templates and ratification procedures.
- **Result:** the organization grows its own corporate university, linked to the external one (the "Learning & onboarding" institution).

## 6. Product move: point zero
We do not sell a finished organization, we sell **a seed**: a minimal fact-seed + verification discipline from day one + a connected engine. The asymmetry is intentional: the fullest part of the seed is the engine, the emptiest are the Books. **An organization with empty Books and a living engine fills up; one with full Books and no engine only grows stale.**

## 7. How this runs in Snowflake (what we build)

| Element | Snowflake realisation |
|---|---|
| Five Books | governed tables in `MODEL`, one validity mode each: `FACTS` (provenance gate `CONTAINS`), `ENTITIES` (CRM keys + aliases, reconciliation timestamp), `RESOURCE_LEDGER` (from CRM payments, replayable balance), `EXPECTATIONS` (open → acknowledged → fulfilled only by counterparty evidence), `WORKFLOW_RUNS` (deal = run: canon stages ↔ actual stage events) |
| Declarative shadows | `shadow_of` reference columns; no copies across Books |
| Engine | `ENGINE_SIGNALS` computed by SQL/Tasks: contradictions, broken commitments, workflow deviations, stale master values, eval regressions → routed `data | agent | human` |
| Engine triad | constraints = codex hard articles + goals; ZPD = need scores (concept 01) + open signals; efficiency = cost/quality per cycle in `HIVE_WAVES` and agent runs |
| Codex | `CODEX_ARTICLES` (hard/soft, provenance, proposed → ratified → superseded); hard articles injected verbatim into every compiled agent |
| Inhale | hive distillation (concept 01) |
| Exhale | `COMPILE_AGENT(mission)` → Cortex Agent: instructions (BIOS + role + codex projection), tools (Analyst over semantic view, Search over facts/episodes, custom tools); **projection excludes knowledge by layer/Book at build time** (+ row access / masking policies) |
| Red line | every agent claim carries fact-ids/evidence rows; scorecard checks citation survival |
| Certification | eval + ODE scorecard per agent version; a version that fails is not promoted |
| Observe → Propose → Ratify → Enact | signals (observe) → proposals with evidence (propose) → owner acts in the app (ratify) → recompile / new version (enact); constitutional items (goals, rights, codex hard) only via owner |
| Third derivative | per-cycle cost and quality tracked; prompt and lens optimisation across waves (concept 01 §2.4) |
| Seed (point zero) | for a new company: RAW load → CORE → seed pass over the canon → engine running from day one, Books fill with each wave |

## 8. What this means for Firn
- The **agent factory** is the exhale of the beat. The **map of knowledge** is the inhale. The **engine** is what makes the factory self-improving rather than a one-off build.
- **"Act under conflict"** is the polis rule applied to an agent: act inside the mandate, ask at the boundary, never silently change the mandate.
- **Evolution vN → vN+1** is Observe → Propose → Ratify → Enact applied to agents and to the map, with the owner as ratifier.
- **Onboarding sellers** is Agents.University in miniature: the same model compiled for a human.

## 9. Open questions (to refine here)
- Minimal form of Observe → Propose → Ratify → Enact for point zero vs. a mature polis.
- Ladders: curriculum pointer moves automatically, trust level ratified by owner, growth of authority only via a separate external gate.
- Institutions as a measurable variable: does their presence raise stability and trust? (prior governance A/B: yes at N=18; untested at scale).
- Cross-vendor constitutional audit: can an agent of another vendor audit a governance loop it did not grow up in?
