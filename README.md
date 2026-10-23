# Firn — Snowflake Agents Factory

> **Know what you know. Act anyway.**
> Firn grows business agents inside Snowflake from a company's own messy data —
> agents that show their evidence, map what they don't know, and still act safely under conflicting, incomplete knowledge.

*Anthropic × Snowflake Hackathon, Oct 2026.*

## The problem
Founders want to grow their business with AI, but their knowledge is scattered across CRM, chats and calls. Agents can't be delegated to, because real knowledge is conflicting and incomplete: agents either make things up or wait for clean data that never comes.
**Teams that can trust their agents delegate more. Teams that delegate more capture the most value.**

## How it works
```
feed everything → distill a provable map → compile agents from the map → agents act → outcomes → better map
   (RAW/CORE)      (facts + quotes,          (mandate per domain:        (ACT / ASK /     (rewards,
                    conflicts, gaps)           ACT · DRAFT · ASK)          DRAFT→APPROVE)   evolve vN+1)
```
- **Map of knowledge** — every fact is a verbatim quote verified by SQL; conflicts and gaps computed per business domain.
- **Agent factory** — `COMPILE_AGENT(mission)` turns the map into a Cortex Agent: mandate, rules, tools. One map → many agents.
- **Acting under conflict** — the agent acts when the decision is robust across conflicting versions, asks when it isn't.
- **Evolution** — the business becomes a learning environment: outcomes are rewards, the map and agent are recompiled.

## Built on
Snowflake (Cortex AI_COMPLETE with Claude, Cortex Agents, Cortex Search, Semantic Views, Snowflake Intelligence, Streamlit in Snowflake). Built with Cortex Code.

## Repo layout
| Path | Contents |
|---|---|
| `sql/core` | RAW → CORE normalization |
| `sql/model` | world-model tables, contradictions, gaps, domain map |
| `sql/distill` | distillation procedures (AI_COMPLETE + verbatim gate) |
| `sql/factory` | `COMPILE_AGENT`, `EVOLVE`, missions, releases |
| `sql/app` | semantic view, search services, agents |
| `prompts/` | distillation & compilation prompts + JSON schemas |
| `streamlit/` | map, scorecard, approvals, version timeline |
| `eval/` | replay, calibration, scorecard |
| `sample/` | synthetic demo data only |

## Data & privacy
Pilot customer data (with consent) stays in the Snowflake account. This repo contains **code only**; `sample/` is synthetic.

## Built during the hackathon vs prior art
_TBD: hackathon work list · prior concepts by 8Hats (world-model distillation, agent compilation) re-implemented natively in Snowflake._

## Team
_TBD_
