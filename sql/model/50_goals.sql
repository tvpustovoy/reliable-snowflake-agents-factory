-- Goal vertical of the world model: organisation goals (distilled from facts) → agent goals (role missions) → metrics (SQL baselines).
-- How it is computed is documented in distill/GOALS.md.

-- 1) Organisation goals: consolidate strategy/goals_priorities facts (+ revenue / segment facts by the founder) into 3-6 goals.
create or replace table RECPLACE.MODEL.ORG_GOALS_RAW as
with ev as (
  select fact_id, fact_day, speaker_role, knowledge_state, claim
  from RECPLACE.MODEL.FIELD_FACTS
  where gate_passed and zone_valid
    and ((zone = 'strategy' and subzone = 'goals_priorities')
      or (speaker_role = 'founder' and zone in ('strategy', 'money_pricing') and fact_type in ('decision', 'status', 'need'))))
select AI_COMPLETE(model => 'claude-opus-5-5', prompt =>
'You consolidate the CURRENT goals of a company (RecPlace, B2B SaaS, geomarketing for small businesses) from evidence facts.
Each line: [fact_id] date | speaker_role | known/hypothesis | claim.
Rules: 3-6 goals; prefer recent (2026) and founder-stated facts; a goal must be supported by >= 2 facts; if facts disagree about a goal, say so.
For each goal: goal_id (G1..), title (Russian, <= 12 words), statement (Russian, 1-2 sentences), horizon (e.g. "Q4 2026" or "unknown"),
metric_hint (what number would show progress, e.g. "MRR, ₽/month"), target_text (target as stated in facts, or null if never stated),
alignment (aligned | partly | conflicting — do founder and team state it the same way?), evidence_ids (array of fact_ids), note (Russian, what is unclear).
EVIDENCE:
' || listagg('[' || fact_id || '] ' || coalesce(fact_day::string, '?') || ' | ' || speaker_role || ' | ' || knowledge_state || ' | ' || claim, '\n')
       within group (order by fact_day desc nulls last) || '
Return ONLY JSON: {"goals":[{...}]}',
  model_parameters => {'temperature': 0, 'max_tokens': 6000}) raw,
  count(*) evidence_facts, current_timestamp() built_at
from (select * from ev order by fact_day desc nulls last limit 220);

create or replace table RECPLACE.MODEL.ORG_GOALS as
select g.value:goal_id::string goal_id, g.value:title::string title, g.value:statement::string statement,
  g.value:horizon::string horizon, g.value:metric_hint::string metric_hint, g.value:target_text::string target_text,
  g.value:alignment::string alignment, g.value:note::string note, g.value:evidence_ids evidence_ids,
  array_size(g.value:evidence_ids) evidence_count,
  (select max(f.fact_day) from RECPLACE.MODEL.FIELD_FACTS f where array_contains(f.fact_id::variant, g.value:evidence_ids)) latest_evidence_day,
  r.built_at
from RECPLACE.MODEL.ORG_GOALS_RAW r,
  lateral flatten(input => try_parse_json(regexp_replace(regexp_replace(r.raw, '^\\s*```(json)?', ''), '```\\s*$', '')):goals) g;

-- 2) Agent goals: the role missions (ROLE.md) and which organisation goals they serve, with a measurable metric.
create or replace table RECPLACE.MODEL.AGENT_GOALS (
  agent string, mission string, mission_title string, serves_goals string, metric string, metric_sql string, owner string);
-- filled by sql/model/51_agent_goals_seed.sql after ORG_GOALS is reviewed (goal ids are generated)

-- 3) Vertical for dashboards: organisation goal → agent mission → metric → proposals of the agent.
create or replace view RECPLACE.MODEL.V_GOAL_VERTICAL as
select o.goal_id, o.title org_goal, o.horizon, o.target_text, o.alignment, o.evidence_count, o.latest_evidence_day,
  a.agent, a.mission, a.mission_title, a.metric,
  (select count(*) from RECPLACE.APP.ACTION_PROPOSALS p where p.mission = a.mission) proposals,
  (select round(sum(p.amount_rub)) from RECPLACE.APP.ACTION_PROPOSALS p where p.mission = a.mission) proposals_rub
from RECPLACE.MODEL.ORG_GOALS o
left join RECPLACE.MODEL.AGENT_GOALS a on array_contains(o.goal_id::variant, split(a.serves_goals, ','))
order by o.goal_id, a.mission;
