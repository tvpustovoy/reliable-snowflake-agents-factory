-- RECPLACE.CORE: typed deterministic layer over RAW (no LLM).
-- Rerunnable: CREATE OR REPLACE. Source of truth for design: research/09-plan-and-infra-delta.md

use database RECPLACE;
use schema CORE;

-- 1. CRM clients (CO = company, CT = contact).
--    302 pulse rows have client_key redacted to '[телефон]' (PII masking in dump) -> synthetic key per row.
create or replace table CORE.CLIENTS as
select
  iff(v:client_key::string like '[%]', 'PULSE-' || src_row, v:client_key::string) as client_key,
  v:client_key::string like '[%]'                as synthetic_key,
  regexp_substr(v:client_key::string, '^[A-Z]+') as client_kind,      -- CO | CT | null (redacted)
  regexp_substr(v:client_key::string, '\\d+')    as bitrix_id,
  v:name::string                                 as name,
  v:status::string                               as segment,          -- once, ved_rean, pf_active, loyal, champions...
  nullif(v:risk::string, '')                     as risk,
  nullif(v:tariff::string, '')                   as tariff_line,
  try_to_number(v:mrr::string)                   as mrr,
  try_to_number(v:revenue_total::string)         as revenue_total,
  try_to_number(v:avg_check::string)             as avg_check,
  try_to_number(v:months_paid::string)           as months_paid,
  try_to_date(v:first_paid_at::string)           as first_paid_at,
  try_to_date(v:last_paid_at::string)            as last_paid_at,
  try_to_date(v:last_touch_at::string)           as last_touch_at,
  try_to_date(v:renewal_at::string)              as renewal_at,
  regexp_replace(v:manager_name::string, '\\s*\\(уволен\\)\\s*$', '') as manager_name,
  v:manager_name::string ilike '%(уволен)%'      as manager_left,
  v:source::string                               as source_system,    -- pult | pulse
  nullif(v:raw:city::string, '')                 as city,
  nullif(v:raw:niche::string, '')                as niche,
  nullif(v:raw:pipe::string, '')                 as pipe,
  nullif(v:raw:dealId::string, '')               as last_deal_ext_id,
  v:raw                                          as raw_attrs,
  dump_id
from RAW.CRM_CLIENTS;

-- 2. Deals. stage = 'Pipeline / Stage'.
create or replace table CORE.DEALS as
select
  v:ext_id::string                               as deal_ext_id,
  v:client_id::string                            as client_bitrix_id,
  nullif(v:client_name::string, '')              as client_name,
  trim(split_part(v:stage::string, '/', 1))      as pipeline,
  trim(substr(v:stage::string, position('/' in v:stage::string) + 1)) as stage,
  v:stage::string                                as stage_full,
  v:status::string                               as status,           -- open | won | lost
  try_to_number(v:amount::string)                as amount,
  try_to_date(v:created_at::string)              as created_at,
  try_to_date(v:closed_at::string)               as closed_at,
  try_to_date(v:last_activity_at::string)        as last_activity_at,
  nullif(v:manager::string, '')                  as manager_bitrix_id,
  nullif(v:lost_reason::string, '')              as lost_reason,
  nullif(v:next_step::string, '')                as next_step,
  dump_id
from RAW.CRM_DEALS;

create or replace table CORE.DEAL_STAGE_EVENTS as
select
  v:deal_ext_id::string                          as deal_ext_id,
  try_to_timestamp_tz(v:at::string)              as at,
  trim(split_part(v:stage_label::string, '/', 1)) as pipeline,
  trim(substr(v:stage_label::string, position('/' in v:stage_label::string) + 1)) as stage,
  v:stage_label::string                          as stage_full,
  v:semantic::string                             as semantic,
  nullif(v:manager::string, '')                  as manager_bitrix_id,
  dump_id
from RAW.CRM_DEAL_STAGE_EVENTS;

-- 3. Pipelines/stages observed (canonical order to be ratified by owner).
create or replace view CORE.V_PIPELINE_STAGES as
select pipeline, stage, count(*) deals,
       sum(iff(status = 'won', 1, 0)) won, sum(iff(status = 'lost', 1, 0)) lost, sum(amount) amount
from CORE.DEALS group by 1, 2;

-- 4. Unified source documents: old corpus + Kontur episodes with text.
--    deal/crm episodes carry only CRM-derived summaries -> excluded (CRM tables are the source).
create or replace table CORE.SRC_DOCUMENTS as
with corpus as (
  select
    'corpus:' || m.v:sha256::string               as doc_id,
    'corpus'                                      as origin,
    m.v:basket::string                            as basket,
    m.v:layer::string                             as layer,
    m.v:register::string                          as register,
    m.v:source_kind::string                       as kind,
    null::string                                  as owner_code,
    m.v:description::string                       as title,
    try_to_date(m.v:extracted_at::string)         as day,
    m.v:raw_path::string                          as source_ref,
    t.v:text::string                              as text_body,
    null::string                                  as summary,
    null::string                                  as transcript,
    m.v:sensitive::boolean                        as sensitive,
    m.v:sha256::string                            as source_sha256
  from RAW.CORPUS_MANIFEST m
  left join RAW.CORPUS_TEXTS t on t.v:sha256::string = m.v:sha256::string
  qualify row_number() over (partition by m.v:sha256::string order by m.src_row) = 1
),
episodes as (
  select
    'ep:' || t.v:episode_id::string               as doc_id,
    'kontur'                                      as origin,
    case e.v:kind::string
      when 'note'    then 'k1-knowledge-notes'
      when 'meeting' then 'k2-meetings'
      when 'call'    then 'k3-calls'
      when 'chat'    then 'k4-chats'
      when 'archive' then 'k5-tg-archive'
    end                                           as basket,
    -- authority layers per WMLM lattice; notes are canon CANDIDATES pending owner ratification
    case e.v:kind::string
      when 'note'    then 'working'
      when 'meeting' then 'working'
      when 'call'    then 'transcript'
      else 'working'
    end                                           as layer,
    case when e.v:kind::string = 'note' then 'kb_note_unratified' else 'operational' end as register,
    e.v:kind::string                              as kind,
    nullif(e.v:owner::string, '')                 as owner_code,
    e.v:peer::string                              as title,
    try_to_date(e.v:day::string)                  as day,
    'RAW.EPISODES_TEXT#' || t.v:episode_id::string as source_ref,
    t.v:text::string                              as text_body,
    case when t.v:text::string ilike '%Расшифровка:%'
         then trim(split_part(t.v:text::string, 'Расшифровка:', 1)) end as summary,
    case when t.v:text::string ilike '%Расшифровка:%'
         then trim(substr(t.v:text::string, position('Расшифровка:' in t.v:text::string) + 12)) end as transcript,
    false                                         as sensitive,
    sha2(t.v:text::string)                        as source_sha256
  from RAW.EPISODES_TEXT t
  join RAW.EPISODES e on e.v:id = t.v:episode_id
)
select *, length(text_body) as text_chars,
       length(text_body) between 16000 and 16100 as maybe_truncated
from (select * from corpus union all select * from episodes);

-- 5. Utterances of chats/archive: '[HH:MM] Name (наш|внешний): text'.
--    Needed by culture.md: owner voice counted separately, >=2 carriers threshold.
create or replace table CORE.SRC_UTTERANCES as
with d as (
  select doc_id, owner_code, day,
         regexp_replace(text_body, '\\s*(\\[\\d{1,2}:\\d{2}\\] )', '\x1e\\1') as t
  from CORE.SRC_DOCUMENTS where kind in ('chat', 'archive')
),
s as (
  select d.doc_id, d.owner_code, d.day, f.index as ord, trim(f.value) as u
  from d, lateral split_to_table(d.t, '\x1e') f
  where trim(f.value) <> ''
),
p as (
  select doc_id, ord, day, owner_code,
    regexp_substr(u, '^\\[(\\d{1,2}:\\d{2})\\]', 1, 1, 'e', 1) as hhmm,
    regexp_substr(u, '^\\[\\d{1,2}:\\d{2}\\] (.+?) \\((наш|внешний)\\):', 1, 1, 'e', 1) as speaker,
    regexp_substr(u, '^\\[\\d{1,2}:\\d{2}\\] .+? \\((наш|внешний)\\):', 1, 1, 'e', 1) as side_ru,
    regexp_substr(u, '^\\[\\d{1,2}:\\d{2}\\] .+? \\((наш|внешний)\\): ?(.*)$', 1, 1, 'es', 2) as text,
    u as raw_utterance
  from s
)
select doc_id, ord, day, owner_code, hhmm, speaker,
  case side_ru when 'наш' then 'internal' when 'внешний' then 'external' end as side,
  coalesce(text, raw_utterance) as text,
  -- founder: internal speaker in the founder's own (vk) archive/chats
  (owner_code = 'vk' and side_ru = 'наш') as is_founder
from p;

-- 6. Chunks for distillation (~10K chars windows, 500 overlap).
create or replace table CORE.SRC_CHUNKS as
with g as (select row_number() over (order by seq4()) - 1 as n from table(generator(rowcount => 200)))
select
  d.doc_id || '#c' || lpad(g.n::string, 3, '0') as chunk_id,
  d.doc_id, g.n as ord, d.basket, d.layer, d.kind,
  substr(d.text_body, g.n * 9500 + 1, 10000)    as chunk_text,
  sha2(substr(d.text_body, g.n * 9500 + 1, 10000)) as chunk_sha256
from CORE.SRC_DOCUMENTS d
join g on g.n * 9500 < d.text_chars
where d.text_chars > 0;

-- 7. Resolved carrier: internal 'мы' in team mailboxes = mailbox owner (owner_code).
create or replace view CORE.V_UTTERANCE_CARRIERS as
select u.*,
  case when side = 'internal' and speaker = 'мы' then owner_code
       when side = 'internal' then speaker
       else 'ext:' || coalesce(speaker, '?') end as carrier
from CORE.SRC_UTTERANCES u;
