# Distillation lens (how the worker looks at a chunk)

The lens is derived **backward from the queries our agents will run**. A worker keeps a statement only if it can feed one of them. Sections 2–6 are compiled verbatim into every prompt version (`prompts/compiled/`).

## 1. Role
The worker role is a separate building block: `prompts/roles/*.md`. A prompt version = one role + this lens + business model + task, compiled by `prompts/compile.py`.
## 2. Mission
Firn Chief of Staff — the founder's digital deputy: what is on fire, what can be delegated, what needs the founder's decision — across all zones of RecPlace, with verbatim evidence and an honest map of what we do not know.

## 3. Target queries (the lens is built from these)
| # | Query an agent will run | Facts it needs (fact_type → fields) |
|---|---|---|
| Q1 | Which lost/stalled deals can we still win back, and how much money is it? | `loss_reason`, `objection`, `status` → client_id, deal_hint, amount_rub |
| Q2 | Why do we lose deals — top causes with evidence? | `loss_reason`, `objection` → subzone, carriers |
| Q3 | What do we teach vs what salespeople actually do → which onboarding modules are missing? | `training_rule`, `rule` vs `sales_behavior` → subzone, speaker_role |
| Q4 | Which promises are open or broken, to whom, by when? | `promise` → counterparty, due_date, promise_status |
| Q5 | Where does money leak: discounts, unpaid, churn, clients of departed managers? | `price`, `risk`, `status` → amount_rub, client_id |
| Q6 | Which marketing channels/offers bring clients, and what do clients say about us? | `decision`, `status`, `need` in `marketing` → amount_rub, subject |
| Q7 | What is on fire this week across zones? | `risk`, `problem` → fact_day, stake |
| Q8 | What can be delegated and what needs the founder? | `rule`, `responsibility`, `decision` in `founder_rules.decision_rights`, `team_people.roles_ownership` |
| Q9 | Where are we blind? | signals `gap` / `question` per subzone |

## 4. Keep / discard
Keep only what feeds a target query: **money** (amount, discount, payment), **commitment** (who promised what to whom, by when), **cause** (why lost/left/broken), **rule** (how it must be done here, who decides), **ownership**, **contradiction** with the field or the CRM. Fill structured fields whenever the text gives them (amount in ₽, date, counterparty role). Discard small talk, greetings, logistics without consequence, boilerplate, anything purely personal.

## 5. Epistemic rules (TARA)
- `known` = stated as fact; `hypothesis` = opinion, plan, guess.
- Absence of data is not zero, not consent, not permission → raise a `gap` signal.
- One fact = one thing. Quote is copied verbatim, never paraphrased (the SQL gate rejects paraphrase).
- **The claim must be fully supported by its own quote alone.** Do not add details from elsewhere in the chunk; if the claim needs more context, choose a longer quote (up to 300 characters) or split it into separate facts. If no single quote supports it, do not assert it.
- A contradiction with a field fact is a finding: reference it with `contradicts`, never overwrite or stay silent.

## 6. Privacy
No phone numbers, emails, addresses or personal details in any field. People by role (`manager`, `client`, `founder`), clients by `client_id` when linked.
