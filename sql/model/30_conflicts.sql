-- Conflicts layer (TARA: a contradiction is a finding, never a reason to stay silent or overwrite).
-- 1) fact vs fact: candidate pairs by embedding similarity inside one subzone (MODEL.CONFLICT_CANDIDATES), judged by LLM
-- 2) fact vs CRM: conversation says lost/churned/won/renewed, CRM says the opposite (deterministic)
-- 3) CRM vs CRM: deal lost on a "deal successful" stage (deterministic)

create or replace table RECPLACE.MODEL.FACT_PAIR_JUDGE as
select c.a_id, c.b_id, c.zone, c.subzone, c.pair_kind, c.sim,
  try_parse_json(regexp_replace(regexp_replace(AI_COMPLETE(model => 'claude-opus-5-5', prompt =>
'Two facts about the same company (RecPlace, B2B SaaS) from different sources. Decide how they relate.
A (' || a.fact_type || ', ' || a.speaker_role || ', ' || coalesce(a.fact_day::string, '?') || '): ' || a.claim || '
B (' || b.fact_type || ', ' || b.speaker_role || ', ' || coalesce(b.fact_day::string, '?') || '): ' || b.claim || '
relation: contradicts (cannot both be true now) | rule_violated (one is a rule, the other shows behaviour that breaks it) | changed_over_time (both were true at different dates) | consistent | duplicate | unrelated.
decision: if contradicts / rule_violated / changed_over_time — which founder decision depends on resolving it (one line, Russian); else null.
severity: 1 low, 2 medium, 3 high (money, client or rule at stake).
explanation: one line in Russian.
Return ONLY JSON: {"relation":"...","decision":"...","severity":n,"explanation":"..."}',
  model_parameters => {'temperature': 0, 'max_tokens': 1500}), '^\\s*```(json)?', ''), '```\\s*$', '')) j
from RECPLACE.MODEL.CONFLICT_CANDIDATES c
join RECPLACE.MODEL.FIELD_FACTS a on a.fact_id = c.a_id
join RECPLACE.MODEL.FIELD_FACTS b on b.fact_id = c.b_id;

-- Retry pairs the judge did not answer in a parsable form (same rule as hive workers); run up to 2 times.
merge into RECPLACE.MODEL.FACT_PAIR_JUDGE t using (
  select c.a_id, c.b_id, try_parse_json(regexp_replace(regexp_replace(AI_COMPLETE(model => 'claude-opus-5-5', prompt =>
'Two facts about the same company (RecPlace, B2B SaaS) from different sources. Decide how they relate.
A (' || a.fact_type || ', ' || a.speaker_role || ', ' || coalesce(a.fact_day::string, '?') || '): ' || a.claim || '
B (' || b.fact_type || ', ' || b.speaker_role || ', ' || coalesce(b.fact_day::string, '?') || '): ' || b.claim || '
relation: contradicts (cannot both be true now) | rule_violated (one is a rule, the other shows behaviour that breaks it) | changed_over_time (both were true at different dates) | consistent | duplicate | unrelated.
decision: if contradicts / rule_violated / changed_over_time — which founder decision depends on resolving it (one line, Russian); else null.
severity: 1 low, 2 medium, 3 high (money, client or rule at stake).
explanation: one line in Russian.
Return ONLY JSON: {"relation":"...","decision":"...","severity":n,"explanation":"..."}',
  model_parameters => {'temperature': 0, 'max_tokens': 1500}), '^\\s*```(json)?', ''), '```\\s*$', '')) j
  from RECPLACE.MODEL.FACT_PAIR_JUDGE c
  join RECPLACE.MODEL.FIELD_FACTS a on a.fact_id = c.a_id
  join RECPLACE.MODEL.FIELD_FACTS b on b.fact_id = c.b_id
  where c.j is null) s
on t.a_id = s.a_id and t.b_id = s.b_id
when matched then update set j = s.j;

create or replace view RECPLACE.MODEL.CONFLICTS as
-- 1) fact vs fact
select 'fact_vs_fact' layer, j:relation::string kind, p.zone, p.subzone, a.client_id,
  p.a_id fact_a, p.b_id fact_b, a.claim claim_a, b.claim claim_b, a.quote quote_a, b.quote quote_b,
  j:decision::string decision_dependency, j:severity::int severity, j:explanation::string explanation, p.sim, null::float amount_rub
from RECPLACE.MODEL.FACT_PAIR_JUDGE p
join RECPLACE.MODEL.FIELD_FACTS a on a.fact_id = p.a_id
join RECPLACE.MODEL.FIELD_FACTS b on b.fact_id = p.b_id
where j:relation::string in ('contradicts', 'rule_violated', 'changed_over_time')
union all
-- 2) fact vs CRM
select 'fact_vs_crm', 'crm_disagrees', f.zone, f.subzone, f.client_id, f.fact_id, null, f.claim,
  'CRM: status=' || c.status || ', MRR=' || coalesce(c.mrr, 0), f.quote, null,
  'Какому источнику верить о статусе клиента и что с ним делать', iff(coalesce(c.mrr, 0) > 0, 3, 2),
  'Разговор: ' || f.deal_hint || '; CRM: ' || c.status, null, c.mrr
from RECPLACE.MODEL.FIELD_FACTS f join RECPLACE.CORE.CRM_CLIENTS c on c.client_id = f.client_id
where f.gate_passed and f.zone_valid and (
  (f.deal_hint in ('lost', 'churned') and c.status in ('champions', 'loyal', 'pf_active', 'ved_now'))
  or (f.deal_hint in ('won', 'renewed') and c.status in ('sleep', 'once')))
union all
-- 3) CRM vs CRM
select 'crm_vs_crm', 'status_conflict', 'clients_sales', 'loss_reasons', null, null, null,
  count(*) || ' сделок в статусе lost на стадии «' || stage || '»', null, null, null,
  'Это проигрыш или успех? От ответа зависит, возвращать ли клиентов и как считать выручку', 3,
  'Статус и стадия в CRM противоречат друг другу', null, sum(amount)
from RECPLACE.CORE.CRM_DEALS where status = 'lost' and stage ilike '%Сделка успешна%' group by stage;

create or replace view RECPLACE.MODEL.V_CONFLICT_MAP as
select layer, kind, zone, count(*) conflicts, count_if(severity = 3) high, count(decision_dependency) with_decision, round(sum(amount_rub)) amount_rub
from RECPLACE.MODEL.CONFLICTS group by 1, 2, 3 order by conflicts desc;
