-- Semantic view for Firn Chief of Staff: money, clients, deals (CRM ledger) + knowledge map (coverage, conflicts).
create or replace semantic view RECPLACE.MODEL.FIRN_BUSINESS
  tables (
    clients as RECPLACE.CORE.CRM_CLIENTS primary key (client_id)
      comment = 'CRM clients: status, MRR, manager, renewal. Ledger — money is recorded, not distilled.',
    deals as RECPLACE.CORE.CRM_DEALS primary key (deal_id)
      comment = 'CRM deals: amount, pipeline stage, status (open/won/lost), last activity, manager.',
    money as RECPLACE.MODEL.V_MONEY_AT_STAKE primary key (bucket)
      comment = 'Money at stake by actionable bucket: B1 contradictory lost-as-won, B2 lost without reason, B3 lost with reason, B4 stalled one step from payment, B5 stalled network pipeline, B6 MRR of clients whose manager left.',
    domains as RECPLACE.MODEL.V_DOMAIN_MAP primary key (zone)
      comment = 'Knowledge map per business zone: proven facts, sources, hypotheses, open signals, covered subzones.',
    coverage as RECPLACE.MODEL.V_COVERAGE primary key (zone, subzone)
      comment = 'Coverage per subzone: covered / thin / blind.',
    conflict_map as RECPLACE.MODEL.V_CONFLICT_MAP primary key (layer, kind, zone)
      comment = 'Contradictions by layer (fact_vs_fact, fact_vs_crm, crm_vs_crm), kind and zone.',
    org_goals as RECPLACE.MODEL.ORG_GOALS primary key (goal_id)
      comment = 'Organisation goals G1..G6 distilled from founder facts; alignment = how consistently the company states the goal.',
    missions as RECPLACE.MODEL.V_AGENT_GOAL_METRICS primary key (mission)
      comment = 'Agent missions M1..M4, which org goals they serve, metric and its current value.',
    proposals as RECPLACE.APP.ACTION_PROPOSALS primary key (proposal_id)
      comment = 'Governed write-back: actions proposed by the agent, tag ACT/HYPOTHESIS/ASK/APPROVE, status and decision.'
  )
  facts (
    clients.mrr as mrr comment = 'Monthly recurring revenue, RUB',
    clients.revenue_total as revenue_total comment = 'Total revenue from the client, RUB',
    deals.amount as amount comment = 'Deal amount, RUB',
    deals.days_since_activity as datediff(day, last_activity_at, current_date()) comment = 'Days since last activity on the deal',
    money.bucket_amount as amount_rub comment = 'Money at stake in the bucket, RUB',
    money.bucket_deals as deals comment = 'Deals in the bucket',
    domains.zone_facts as facts comment = 'Proven facts in the zone',
    domains.zone_signals as open_signals comment = 'Open questions / gaps in the zone',
    domains.zone_hypothesis_pct as hypothesis_pct comment = 'Share of facts that are hypotheses, %',
    coverage.subzone_facts as facts comment = 'Proven facts in the subzone',
    conflict_map.conflict_count as conflicts comment = 'Number of conflicts',
    conflict_map.conflict_high as high comment = 'High-severity conflicts',
    conflict_map.conflict_amount as amount_rub comment = 'Money involved in the conflicts, RUB',
    org_goals.goal_evidence as evidence_count comment = 'Facts supporting the goal',
    missions.mission_value as current_value comment = 'Current value of the mission metric',
    proposals.proposal_amount as amount_rub comment = 'Money the proposal is about, RUB'
  )
  dimensions (
    clients.client_id as client_id,
    clients.client_status as status comment = 'Client segment/status: champions, loyal, sleep, once, pf_active, ved_now, ...',
    clients.manager_name as manager_name comment = 'Assigned manager',
    clients.manager_fired as manager_fired comment = 'True if the assigned manager has left',
    clients.niche as niche,
    clients.city as city,
    clients.tariff as tariff,
    clients.renewal_at as renewal_at,
    clients.last_paid_at as last_paid_at,
    deals.deal_id as deal_id,
    deals.stage as stage comment = 'Pipeline / stage, e.g. "Сделки / Выставить счёт"',
    deals.deal_status as status comment = 'open, won, lost',
    deals.manager_id as manager_id,
    deals.created_at as created_at,
    deals.closed_at as closed_at,
    deals.last_activity_at as last_activity_at,
    money.bucket as bucket,
    money.meaning as meaning,
    domains.zone as zone,
    coverage.cov_zone as zone,
    coverage.subzone as subzone,
    coverage.coverage_status as status comment = 'covered, thin, blind',
    conflict_map.layer as layer,
    conflict_map.kind as kind,
    conflict_map.conflict_zone as zone,
    org_goals.goal_id as goal_id,
    org_goals.goal_title as title,
    org_goals.horizon as horizon,
    org_goals.alignment as alignment comment = 'aligned, partly, conflicting',
    org_goals.target_text as target_text,
    missions.mission as mission,
    missions.mission_title as mission_title,
    missions.serves_goals as serves_goals,
    missions.metric as metric,
    proposals.proposal_mission as mission,
    proposals.proposal_title as title,
    proposals.tag as tag comment = 'ACT, HYPOTHESIS, ASK, APPROVE',
    proposals.proposal_status as status comment = 'proposed, approved, rejected',
    proposals.owner_role as owner_role,
    proposals.proposal_created_at as created_at
  )
  metrics (
    clients.total_mrr as sum(clients.mrr) comment = 'Total MRR, RUB',
    clients.client_count as count(clients.client_id),
    deals.deal_count as count(deals.deal_id),
    deals.total_amount as sum(deals.amount) comment = 'Total deal amount, RUB',
    money.money_at_stake as sum(money.bucket_amount) comment = 'Total money at stake, RUB',
    domains.total_facts as sum(domains.zone_facts),
    conflict_map.total_conflicts as sum(conflict_map.conflict_count),
    proposals.proposal_count as count(proposals.proposal_id),
    proposals.proposed_rub as sum(proposals.proposal_amount) comment = 'Money covered by agent proposals, RUB'
  )
  comment = 'Firn Chief of Staff: money, clients and deals from CRM plus the proven knowledge map, goal vertical and agent decision ledger of RecPlace.';
