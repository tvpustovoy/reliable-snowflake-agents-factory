# 03 · TARA — acting under uncertainty, contradiction and limited resources

*A language of action and directed evolution for multi-agent systems (people, digital agents, organizations). It keeps the unknown unknown, the contradiction visible and the cost of a step explicit — and still lets the system agree on the next step.*

**Origin.** Prior art: TARA white paper 0.4 (4 Oct 2026, concept by Taras Pustovoy, TARA Institute for Consciousness and Agency), `tara-language/` (`sources/TARA_White_Paper_RU.pdf`, `model/concepts.json`). TARA defines general primitives; Open Digital Employee (concept 04) is their first concretisation for digital employees. No TARA compiler or runtime exists.
**Built during the hackathon:** TARA primitives realised as fields, tables and agent rules in Snowflake for the Firn agents (§4).

---

## 1. Manifesto (10 statements, condensed)
1. **Uncertainty is the starting condition.** Action does not wait for full knowledge; partial clarification is not presented as final certainty.
2. **The unknown has the right to stay unknown.** Lack of knowledge, lack of choice, contradictory information and closed information are distinct, and none becomes a fact, consent or permission automatically.
3. **Resources are finite; a choice has a price.** Time, money, attention, energy, compute. The cost of coordination, recovery and support is part of the price of a step.
4. **Contradictions are part of the model.** Conflict can be a meaningful signal. Acceptable conditions for the next step are enough to move; full unity of views is not required.
5. **Each participant has their own future.** A shared outcome graph is a temporary agreement about part of the future.
6. **The result includes a state.** Preserving participants' abilities, autonomy and quality of relationships can be part of the result.
7. **Clarification through organised action.** Find the next admissible step, set its boundaries, budget and stop conditions, observe consequences.
8. **Errors need detection and recovery.** Notice the divergence → stop the affected action → clarify consequences → restore cooperation.
9. **Goals and methods can be revised.** Separate an interest from fixation on one form of it; keep the grounds and the conditions of revision with every decision.
10. **Cooperation preserves participants' boundaries.** Authority, voluntariness, the right to object; if no acceptable joint step exists, propose a pause, a different composition or an end.

## 2. Primitives (candidate core, `model/concepts.json`)
| Primitive | Meaning | Gap TARA names honestly |
|---|---|---|
| **Participant** | an actor with its own position, capabilities, boundaries | membership vs role vs authority |
| **Desired state** | a participant's partial, revisable picture of the desired change | different desired states don't reduce to one metric |
| **Interest** | what a participant seeks to gain or keep; the method may change | ownership and disclosure of interests |
| **Uncertainty** | incompleteness of knowledge; unknown ≠ unchosen ≠ contradictory ≠ closed | explicit knowledge states, grounds, freshness; one confidence number is not enough |
| **Resource** | limited capacity incl. time, attention, money, expertise, compute; available vs already promised | reserves, loss limits, no double-promising |
| **Constraint** | admissibility condition of a step; not overridden by high utility | link to an enforceable stop/review mechanism |
| **Commitment** | an accepted promise of contribution or result under conditions; revising the future keeps the history | parties, acceptance, deadline, acceptance criteria, lifecycle |
| **Next step** | a feasible admissible action with contribution, resources, observable consequences, loss limits, review moment | a contract of an agreed step |
| **Experience** | situation → action → consequences → evaluations; an episode becomes a precedent after discussing its applicability | different evaluations, objections, transfer limits |
| **Directed evolution** | revising capabilities, relations and rules from experience, preserving grounds, authority and commitments | an admission process for improvements; a new version doesn't prove improvement |

## 3. Knowledge states and "five poisons"
**States a system must keep apart** (white paper, p. 4):

| State | How to work with it |
|---|---|
| unknown | record the gap and its effect on the possible step |
| not yet chosen | offer options or an experience that helps decide |
| contradictory | keep the sources and check the divergence |
| participants want different things | discuss conditions of cooperation and distribution of consequences |
| not disclosed | respect the boundary, find a solution with available information |

**Absence of data must never become zero, consent or permission.** A gap blocks only the actions for which it is critical.

**Interaction distortions (applied analogy of the "five poisons")** — what a language must help notice:

| Distortion | Business analogue | What the system must support |
|---|---|---|
| ignorance / not-seeing | an assumption is taken for fact; one's own limits of knowledge go unnoticed | explicit unknowns, provenance, alternative explanations, comprehension checks |
| attachment | fixation on an outcome, metric, role or method despite new grounds | interest ≠ method; alternatives; conditions of revision and exit |
| aversion | disagreement turns into a fight with the other side | expressing boundaries and objections; de-escalation; search for an admissible step |
| pride | authority substitutes for grounds; feedback not accepted | separation of authority and justification; right to contest; checking decisions |
| envy | rivalry for recognition, influence, gain | visible interests and contributions; discussed rules of distribution and competition |

Boundary of the analogy: uncertainty ≠ ignorance (you can see the limits of knowledge clearly); contradiction ≠ anger; competition for a truly scarce resource ≠ envy.

## 4. How Firn uses TARA in Snowflake
| TARA | Firn / Snowflake |
|---|---|
| knowledge states | `knowledge_state` on every fact, master value and agent claim: `known · unknown · not_chosen · contradictory · divergent_interests · undisclosed · changed` |
| "absence ≠ zero/consent/permission" | hard rule in agent instructions + eval checks (an agent that answers "0" or "allowed" from missing data fails) |
| uncertainty, visibly | `V_EPISTEMIC_MAP`: per Book × domain what is known, contested, unchosen, closed — shown, not hidden |
| contradiction as signal | `CONTRADICTIONS` with both sides and sources; agent names both sides; acting under conflict = act when the decision is robust across versions, ask when not |
| participant + interest | `PARTICIPANT_INTERESTS` (founder, sales lead, sellers, clients, partners); conflicts of interest shown, not averaged |
| next step | the **"3 actions" contract**: who · interest · contribution & resource · expected observable signal (SQL metric) · loss limit / stop condition · review_at · blocking unknowns (`ACTION_PROPOSALS`) |
| resource, no double-promising | actions checked against already-committed capacity (e.g. founder load) |
| commitment | accepted action → `EXPECTATIONS` (Relationships Book); history never rewritten |
| experience | executed step → outcome record; becomes a precedent only after review of applicability |
| errors & recovery | `ENGINE_SIGNALS`: detect divergence → stop affected action → clarify → restore |
| directed evolution | agent vN → vN+1 only after measured improvement (scorecard), owner ratifies; "a new version doesn't prove improvement" |
| five poisons | lens for "what in our culture hurts us": candidate tensions with evidence, ≥2 carriers, the founder's voice counted separately, presented as questions to the owner, never as judgement of people |

## 5. Why it matters for the demo
*"Our agent knows what it knows — and shows you the edge of what it doesn't."* A map of unknowns and an action contract with loss limits and review dates are what make delegation to an agent rational under real, imperfect knowledge.
