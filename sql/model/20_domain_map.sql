-- Step 3: money at stake (CRM, ledger — not distilled) + domain map (field facts) for the Chief of Staff.
-- Money buckets are actionable groups for Q1/Q5; each bucket links to field facts about the same clients.

create or replace view RECPLACE.MODEL.V_MONEY_AT_STAKE as
-- CRM_DEALS and CRM_CLIENTS come from different CRM dumps: deals link to clients by normalized name.
with cmap as (select lower(trim(name)) nm, any_value(client_id) client_id from RECPLACE.CORE.CRM_CLIENTS group by 1),
d as (
  select deal_id, cmap.client_id, amount, stage, status, manager_id, last_activity_at,
    case
      when status = 'lost' and stage ilike '%Сделка успешна%' then 'B1_contradictory_lost_as_won'
      when status = 'lost' and stage in ('Сделки / Отказ', 'Сделки / Новые', 'Ключевые клиенты / Нет ответа ( больше месяца)') then 'B2_lost_without_reason'
      when status = 'lost' and stage ilike 'Ключевые клиенты /%' then 'B3_lost_with_reason'
      when status = 'open' and stage in ('Сделки / Выставить счёт', 'Сделки / Счёт отправлен', 'Сделки / Отправлено КП', 'Сделки / Продление')
           and datediff(day, last_activity_at, current_date) > 30 then 'B4_stalled_near_money'
      when status = 'open' and stage in ('Сети / Отвал — вернуться с пилотом', 'Сети / Ищем ЛПР')
           and datediff(day, last_activity_at, current_date) > 30 then 'B5_stalled_networks_pipeline'
    end bucket
  from RECPLACE.CORE.CRM_DEALS x left join cmap on cmap.nm = lower(trim(x.client_name))),
f as (select client_id, count(*) facts, count_if(fact_type in ('loss_reason', 'objection')) loss_facts
      from RECPLACE.MODEL.FIELD_FACTS where gate_passed and zone_valid and client_id is not null group by 1)
select bucket,
  case bucket
    when 'B1_contradictory_lost_as_won' then 'Lost in CRM but sitting on a "deal successful" stage — status conflict, check and recover'
    when 'B2_lost_without_reason' then 'Lost with no recorded reason — candidates to win back; cause unknown (gap)'
    when 'B3_lost_with_reason' then 'Lost with an explicit reason (price, features, competitor)'
    when 'B4_stalled_near_money' then 'Open, one step from payment (invoice / proposal / renewal), no activity > 30 days'
    when 'B5_stalled_networks_pipeline' then 'Network pipeline (estimated value), no activity > 30 days'
  end meaning,
  count(*) deals, round(sum(amount)) amount_rub, count(distinct d.client_id) clients_matched,
  count(distinct iff(f.client_id is not null, d.client_id, null)) clients_with_facts, coalesce(sum(f.loss_facts), 0) loss_facts
from d left join f on f.client_id = d.client_id::string
where bucket is not null group by 1, 2
union all
select 'B6_departed_manager_mrr', 'Monthly revenue of active clients whose manager left — retention risk',
  count(*), round(sum(c.mrr)), count(*), count(f.client_id), coalesce(sum(f.loss_facts), 0)
from RECPLACE.CORE.CRM_CLIENTS c left join f on f.client_id = c.client_id::string
where c.manager_fired and c.mrr > 0
order by 1;

-- Domain map: per zone — what we know, how solid, where we are blind or conflicted.
create or replace view RECPLACE.MODEL.V_DOMAIN_MAP as
with f as (select zone, count(*) facts, count(distinct doc_id) sources, count_if(knowledge_state = 'known') known,
             count_if(knowledge_state = 'hypothesis') hypotheses, count(distinct client_id) clients
           from RECPLACE.MODEL.FIELD_FACTS where gate_passed and zone_valid group by 1),
c as (select zone, count(*) subzones, count_if(status = 'covered') covered, count_if(status = 'thin') thin, count_if(status = 'blind') blind
      from RECPLACE.MODEL.V_COVERAGE group by 1),
s as (select zone, count(*) open_signals, count_if(kind = 'gap') gaps from RECPLACE.MODEL.FIELD_SIGNALS where status = 'open' group by 1)
select c.zone, c.subzones, c.covered, c.thin, c.blind, coalesce(f.facts, 0) facts, coalesce(f.sources, 0) sources,
  coalesce(f.known, 0) known, coalesce(f.hypotheses, 0) hypotheses,
  round(100 * f.hypotheses / nullif(f.facts, 0), 1) hypothesis_pct, coalesce(f.clients, 0) clients,
  coalesce(s.open_signals, 0) open_signals, coalesce(s.gaps, 0) gaps,
  round(coalesce(s.open_signals, 0) / nullif(f.facts, 0), 2) unknown_per_fact
from c left join f using (zone) left join s using (zone)
order by facts desc;
