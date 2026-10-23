-- Agent tools for Firn Chief of Staff (ROLE.md): norms, knowledge search, proposals + traces.

-- Norms with authority: L1 formal documents > L2 founder's word > L3 practice.
create or replace view RECPLACE.MODEL.V_NORMS as
select f.fact_id norm_id, f.zone, f.subzone, f.claim norm, f.quote, f.doc_id, f.basket, f.fact_day,
  case when f.basket in ('01-sales-training', '02-product-kb-wiki') then 'L1_document'
       when f.basket in ('03-founder-insights', '06-founder-chats') or f.speaker_role = 'founder' then 'L2_founder'
       else 'L3_practice' end authority,
  (select count(*) from RECPLACE.MODEL.CONFLICTS c where c.kind = 'rule_violated' and (c.fact_a = f.fact_id or c.fact_b = f.fact_id)) violations
from RECPLACE.MODEL.FIELD_FACTS f
where f.gate_passed and f.zone_valid and f.fact_type in ('rule', 'training_rule');

-- One searchable corpus: facts, norms, conflicts, open questions — each row says what kind of knowledge it is and what it rests on.
create or replace table RECPLACE.MODEL.KNOWLEDGE_CORPUS as
select f.fact_id kid,
  iff(f.fact_type in ('rule', 'training_rule'), 'norm', 'fact') kind,
  f.zone, f.subzone, f.fact_type, f.knowledge_state,
  iff(f.fact_type in ('rule', 'training_rule'), n.authority, null) authority,
  f.client_id, f.basket source_basket, f.fact_day::string day, f.amount_rub,
  f.claim || ' | Quote: "' || f.quote || '" | Why it matters: ' || coalesce(f.stake, '') text
from RECPLACE.MODEL.FIELD_FACTS f left join RECPLACE.MODEL.V_NORMS n on n.norm_id = f.fact_id
where f.gate_passed and f.zone_valid
union all
select 'conflict:' || coalesce(fact_a, '') || ':' || coalesce(fact_b, '') || ':' || row_number() over (order by zone),
  'conflict', zone, subzone, kind, 'contradictory', null, client_id, layer, null, amount_rub,
  'CONFLICT (' || kind || '): A: ' || coalesce(claim_a, '') || ' | B: ' || coalesce(claim_b, '') ||
  ' | Decision that depends on it: ' || coalesce(decision_dependency, '') || ' | ' || coalesce(explanation, '')
from RECPLACE.MODEL.CONFLICTS
union all
select signal_id, 'open_question', zone, subzone, kind, 'unknown', null, null, null, null, null,
  'OPEN QUESTION (' || kind || '): ' || text || ' | Why it matters: ' || coalesce(why_matters, '')
from RECPLACE.MODEL.FIELD_SIGNALS where status = 'open';

create or replace cortex search service RECPLACE.MODEL.FIRN_KNOWLEDGE_SEARCH
  on text
  attributes kind, zone, subzone, fact_type, knowledge_state, authority, client_id, source_basket
  warehouse = DEFAULT_WH
  target_lag = '1 day'
  as select kid, text, kind, zone, subzone, fact_type, knowledge_state, authority, client_id, source_basket, day, amount_rub
     from RECPLACE.MODEL.KNOWLEDGE_CORPUS;

-- Governed write-back: the agent only proposes; a person approves. Every step is traced.
create schema if not exists RECPLACE.APP;
create table if not exists RECPLACE.APP.ACTION_PROPOSALS (
  proposal_id string default uuid_string(), created_at timestamp_ltz default current_timestamp(),
  agent string, mission string, title string, action string, owner_role string, tag string,
  amount_rub float, evidence string, conflicts string, loss_limit string, review_date string,
  status string default 'proposed', decided_by string, decided_at timestamp_ltz);
create table if not exists RECPLACE.APP.TRACES (
  trace_id string default uuid_string(), at timestamp_ltz default current_timestamp(),
  actor string, role string, event string, object_id string, payload variant);

create or replace procedure RECPLACE.APP.PROPOSE_ACTION(
  mission string, title string, action string, owner_role string, tag string,
  amount_rub float, evidence string, conflicts string, loss_limit string, review_date string)
returns string language sql execute as caller as
$$
declare pid string default uuid_string(); t string;
begin
  t := upper(tag);
  if (t not in ('ACT', 'HYPOTHESIS', 'ASK', 'APPROVE')) then
    return 'rejected: tag must be ACT, HYPOTHESIS, ASK or APPROVE';
  end if;
  insert into RECPLACE.APP.ACTION_PROPOSALS (proposal_id, agent, mission, title, action, owner_role, tag, amount_rub,
    evidence, conflicts, loss_limit, review_date, status)
  values (:pid, 'FIRN_CHIEF_OF_STAFF', :mission, :title, :action, :owner_role, :t, :amount_rub,
    :evidence, :conflicts, :loss_limit, :review_date, iff(:t = 'ACT', 'proposed', 'awaiting_' || lower(:t)));
  insert into RECPLACE.APP.TRACES (actor, role, event, object_id, payload)
  select current_user(), current_role(), 'proposal_created', :pid,
    object_construct('tag', :t, 'title', :title, 'amount_rub', :amount_rub, 'mission', :mission);
  return 'proposal ' || pid || ' recorded as ' || t;
end;
$$;

create or replace procedure RECPLACE.APP.DECIDE_PROPOSAL(proposal_id string, decision string)
returns string language sql execute as caller as
$$
begin
  update RECPLACE.APP.ACTION_PROPOSALS set status = lower(:decision), decided_by = current_user(), decided_at = current_timestamp()
    where proposal_id = :proposal_id;
  insert into RECPLACE.APP.TRACES (actor, role, event, object_id, payload)
  select current_user(), current_role(), 'proposal_' || lower(:decision), :proposal_id, object_construct('decision', :decision);
  return 'proposal ' || proposal_id || ': ' || decision;
end;
$$;
