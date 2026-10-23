-- Agent goals: role missions (agents/chief_of_staff/ROLE.md) → organisation goals (MODEL.ORG_GOALS) → metric with a SQL baseline.
-- Mapping is the founder's call; this is the initial proposal, reviewed by Taras on 23.10.2026.
truncate table RECPLACE.MODEL.AGENT_GOALS;
insert into RECPLACE.MODEL.AGENT_GOALS values
 ('FIRN_CHIEF_OF_STAFF', 'M1', 'Source of truth about the company', 'G1,G2,G3,G4,G5,G6',
  'Subzones covered by proven knowledge (of 37)',
  'select count_if(status = ''covered'') from RECPLACE.MODEL.V_COVERAGE', 'founder'),
 ('FIRN_CHIEF_OF_STAFF', 'M2', 'Money and clients (digital head of sales)', 'G1,G6',
  'Recoverable money at stake, ₽ (B1 contradictory + B2 no reason + B4 stalled near payment + B6 departed-manager MRR)',
  'select sum(amount_rub) from RECPLACE.MODEL.V_MONEY_AT_STAKE where bucket in (''B1_contradictory_lost_as_won'',''B2_lost_without_reason'',''B4_stalled_near_money'',''B6_departed_manager_mrr'')', 'head of sales'),
 ('FIRN_CHIEF_OF_STAFF', 'M3', 'Propose actions toward goals, money first', 'G1,G3,G4',
  'Approved proposals, ₽ at stake',
  'select coalesce(sum(amount_rub), 0) from RECPLACE.APP.ACTION_PROPOSALS where status = ''approved''', 'founder'),
 ('FIRN_CHIEF_OF_STAFF', 'M4', 'Teach the company', 'G1,G5',
  'Open rule violations (teach vs do gaps)',
  'select count(*) from RECPLACE.MODEL.CONFLICTS where kind = ''rule_violated''', 'head of sales');

create or replace view RECPLACE.MODEL.V_AGENT_GOAL_METRICS as
select agent, mission, mission_title, serves_goals, metric, owner,
  case mission
    when 'M1' then (select count_if(status = 'covered') from RECPLACE.MODEL.V_COVERAGE)
    when 'M2' then (select sum(amount_rub) from RECPLACE.MODEL.V_MONEY_AT_STAKE where bucket in ('B1_contradictory_lost_as_won','B2_lost_without_reason','B4_stalled_near_money','B6_departed_manager_mrr'))
    when 'M3' then (select coalesce(sum(amount_rub), 0) from RECPLACE.APP.ACTION_PROPOSALS where status = 'approved')
    when 'M4' then (select count(*) from RECPLACE.MODEL.CONFLICTS where kind = 'rule_violated')
  end current_value
from RECPLACE.MODEL.AGENT_GOALS;
