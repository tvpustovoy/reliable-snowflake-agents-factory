-- Hive wave runner: selection → batched extraction with retries → gated facts into the field. Progress per batch.
-- Run: call RECPLACE.MODEL.HIVE_WAVE(1, 'distill_plain_v3', 'claude-opus-5-5', 100, 2);
-- Progress: select * from RECPLACE.MODEL.V_WAVE_PROGRESS;

create table if not exists RECPLACE.MODEL.WAVE_INPUT (
  wave_no int, doc_id string, chunk_no int, basket string, stratum string, day date, client_id string, batch_no int);
create table if not exists RECPLACE.MODEL.WAVE_RAW (
  wave_no int, doc_id string, chunk_no int, basket string, batch_no int, prompt_version string, model string,
  response variant, attempts int, done_at timestamp_ltz);
create table if not exists RECPLACE.MODEL.HIVE_WAVES (
  wave_no int, batch_no int, prompt_version string, model string, chunks int, ok int, retried int, still_failed int,
  started_at timestamp_ltz, finished_at timestamp_ltz, seconds number(10,1));
create table if not exists RECPLACE.MODEL.FIELD_FACTS (
  fact_id string, wave_no int, doc_id string, chunk_no int, basket string, client_id string,
  zone string, subzone string, claim string, quote string, speaker_role string, fact_type string, target_q string,
  knowledge_state string, stake string, amount_rub float, due_date string, counterparty string, promise_status string,
  deal_hint string, fact_day date, gate_passed boolean, zone_valid boolean,
  strength float default 1, status string default 'candidate', prompt_version string, created_at timestamp_ltz default current_timestamp());
create table if not exists RECPLACE.MODEL.FIELD_SIGNALS (
  signal_id string, wave_no int, doc_id string, chunk_no int, kind string, zone string, subzone string,
  text string, why_matters string, status string default 'open', created_at timestamp_ltz default current_timestamp());

-- Wave 1 selection (seed): CRM-linked docs + training/engagement + stratified by basket and month. Deterministic.
create or replace procedure RECPLACE.MODEL.SELECT_WAVE1(batch_size int default 100)
returns string language sql as
$$
begin
  delete from RECPLACE.MODEL.WAVE_INPUT where wave_no = 1;
  insert into RECPLACE.MODEL.WAVE_INPUT (wave_no, doc_id, chunk_no, basket, stratum, day, client_id)
  with c as (
    select k.doc_id, k.chunk_no, coalesce(d.basket_mapped, d.basket) basket, d.day, l.client_id, length(k.chunk_text) len,
      iff(l.client_id is not null, 'crm_linked', coalesce(d.basket_mapped, d.basket)) stratum
    from RECPLACE.CORE.DOCUMENT_CHUNKS k
    join RECPLACE.CORE.DOCUMENTS d using (doc_id)
    left join (select doc_id, any_value(client_id) client_id from RECPLACE.CORE.DOC_CRM_LINKS group by 1) l using (doc_id)
    where coalesce(d.noise_flag, false) = false and d.dup_of_doc_id is null and length(k.chunk_text) >= 300
      and coalesce(d.basket_mapped, d.basket) <> '99-public-context'),
  q as (select *, row_number() over (partition by stratum, date_trunc(month, day) order by hash(doc_id, chunk_no)) rn_m,
               row_number() over (partition by stratum order by hash(doc_id, chunk_no)) rn from c),
  quota as (select * from values ('crm_linked', 600), ('01-sales-training', 50), ('90-engagement-context', 50),
      ('03-founder-insights', 150), ('04-sales-calls', 150), ('05-sales-chats', 100), ('06-founder-chats', 100),
      ('07-team-meetings', 50), ('02-product-kb-wiki', 50) as t(stratum, n))
  select 1, q.doc_id, q.chunk_no, q.basket, q.stratum, q.day, q.client_id
  from q join quota using (stratum)
  qualify row_number() over (partition by q.stratum order by q.rn_m, q.rn) <= any_value(quota.n) over (partition by q.stratum);
  update RECPLACE.MODEL.WAVE_INPUT w set batch_no = s.b from (
    select doc_id, chunk_no, ceil(row_number() over (order by hash(doc_id, chunk_no)) / :batch_size) b
    from RECPLACE.MODEL.WAVE_INPUT where wave_no = 1) s
  where w.wave_no = 1 and w.doc_id = s.doc_id and w.chunk_no = s.chunk_no;
  return (select count(*) || ' chunks, ' || count(distinct batch_no) || ' batches' from RECPLACE.MODEL.WAVE_INPUT where wave_no = 1);
end;
$$;

-- Extract one batch (idempotent: skips chunks already done), retry failed, then merge gated facts and signals into the field.
create or replace procedure RECPLACE.MODEL.HIVE_WAVE(wave_no int, prompt_version string, model string,
  batch_size int default 100, max_retries int default 2)
returns string language sql as
$$
declare t0 timestamp_ltz; nb int; b int default 1; n int; failed int; retried int; i int;
begin
  select max(batch_no) into :nb from RECPLACE.MODEL.WAVE_INPUT where wave_no = :wave_no;
  while (b <= nb) do
    t0 := current_timestamp(); retried := 0; i := 0;
    insert into RECPLACE.MODEL.WAVE_RAW
    select :wave_no, doc_id, chunk_no, basket, :b, :prompt_version, :model,
      object_construct('usage', d:usage, 'raw_text', d:choices[0]:messages::string,
        'parsed', try_parse_json(regexp_replace(regexp_replace(d:choices[0]:messages::string, '^\\s*```(json)?', ''), '```\\s*$', ''))),
      1, current_timestamp()
    from (select w.doc_id, w.chunk_no, w.basket,
            AI_COMPLETE(model => :model,
              prompt => replace(replace(replace(replace(replace(p.prompt_text,
                '{field}', '(empty — wave 1)'), '{basket}', w.basket), '{day}', coalesce(w.day::string, 'unknown')),
                '{client_id}', coalesce(w.client_id, 'none')), '{chunk_text}', k.chunk_text),
              model_parameters => {'temperature': 0, 'max_tokens': 8192}, show_details => true) d
          from RECPLACE.MODEL.WAVE_INPUT w
          join RECPLACE.CORE.DOCUMENT_CHUNKS k on k.doc_id = w.doc_id and k.chunk_no = w.chunk_no
          join RECPLACE.MODEL.PROMPT_VERSIONS p on p.version = :prompt_version
          where w.wave_no = :wave_no and w.batch_no = :b
            and not exists (select 1 from RECPLACE.MODEL.WAVE_RAW r where r.wave_no = :wave_no and r.doc_id = w.doc_id and r.chunk_no = w.chunk_no));
    n := sqlrowcount;
    while (i < max_retries) do
      select count(*) into :failed from RECPLACE.MODEL.WAVE_RAW where wave_no = :wave_no and batch_no = :b and response:parsed is null;
      if (failed = 0) then break; end if;
      merge into RECPLACE.MODEL.WAVE_RAW t using (
        select r.doc_id, r.chunk_no,
          AI_COMPLETE(model => :model,
            prompt => replace(replace(replace(replace(replace(p.prompt_text,
              '{field}', '(empty — wave 1)'), '{basket}', w.basket), '{day}', coalesce(w.day::string, 'unknown')),
              '{client_id}', coalesce(w.client_id, 'none')), '{chunk_text}', k.chunk_text),
            model_parameters => {'temperature': 0, 'max_tokens': 8192}, show_details => true) d
        from RECPLACE.MODEL.WAVE_RAW r
        join RECPLACE.MODEL.WAVE_INPUT w on w.wave_no = r.wave_no and w.doc_id = r.doc_id and w.chunk_no = r.chunk_no
        join RECPLACE.CORE.DOCUMENT_CHUNKS k on k.doc_id = r.doc_id and k.chunk_no = r.chunk_no
        join RECPLACE.MODEL.PROMPT_VERSIONS p on p.version = :prompt_version
        where r.wave_no = :wave_no and r.batch_no = :b and r.response:parsed is null) s
      on t.wave_no = :wave_no and t.doc_id = s.doc_id and t.chunk_no = s.chunk_no
      when matched then update set attempts = t.attempts + 1, done_at = current_timestamp(),
        response = object_construct('usage', s.d:usage, 'raw_text', s.d:choices[0]:messages::string,
          'parsed', try_parse_json(regexp_replace(regexp_replace(s.d:choices[0]:messages::string, '^\\s*```(json)?', ''), '```\\s*$', '')));
      retried := retried + failed; i := i + 1;
    end while;
    select count(*) into :failed from RECPLACE.MODEL.WAVE_RAW where wave_no = :wave_no and batch_no = :b and response:parsed is null;

    -- merge into the field: facts with the verbatim gate, signals
    delete from RECPLACE.MODEL.FIELD_FACTS f using RECPLACE.MODEL.WAVE_INPUT w
      where f.wave_no = :wave_no and w.wave_no = :wave_no and w.batch_no = :b and f.doc_id = w.doc_id and f.chunk_no = w.chunk_no;
    insert into RECPLACE.MODEL.FIELD_FACTS (fact_id, wave_no, doc_id, chunk_no, basket, client_id, zone, subzone, claim, quote,
      speaker_role, fact_type, target_q, knowledge_state, stake, amount_rub, due_date, counterparty, promise_status, deal_hint,
      fact_day, gate_passed, zone_valid, prompt_version)
    select uuid_string(), :wave_no, r.doc_id, r.chunk_no, r.basket, w.client_id,
      a.value:zone::string, a.value:subzone::string, a.value:claim::string, a.value:quote::string,
      a.value:speaker_role::string, a.value:fact_type::string, a.value:target_q::string, a.value:knowledge_state::string,
      a.value:stake::string, try_to_double(a.value:amount_rub::string), a.value:due_date::string, a.value:counterparty::string,
      a.value:promise_status::string, a.value:deal_hint::string, w.day,
      length(a.value:quote::string) >= 15
        and contains(regexp_replace(k.chunk_text, '\\s+', ' '), regexp_replace(a.value:quote::string, '\\s+', ' ')),
      exists (select 1 from RECPLACE.MODEL.ZONES z where z.zone = a.value:zone::string and z.subzone = a.value:subzone::string),
      :prompt_version
    from RECPLACE.MODEL.WAVE_RAW r
    join RECPLACE.MODEL.WAVE_INPUT w on w.wave_no = r.wave_no and w.doc_id = r.doc_id and w.chunk_no = r.chunk_no
    join RECPLACE.CORE.DOCUMENT_CHUNKS k on k.doc_id = r.doc_id and k.chunk_no = r.chunk_no,
    lateral flatten(input => r.response:parsed:asserts) a
    where r.wave_no = :wave_no and r.batch_no = :b;
    delete from RECPLACE.MODEL.FIELD_SIGNALS s using RECPLACE.MODEL.WAVE_INPUT w
      where s.wave_no = :wave_no and w.wave_no = :wave_no and w.batch_no = :b and s.doc_id = w.doc_id and s.chunk_no = w.chunk_no;
    insert into RECPLACE.MODEL.FIELD_SIGNALS (signal_id, wave_no, doc_id, chunk_no, kind, zone, subzone, text, why_matters)
    select uuid_string(), :wave_no, r.doc_id, r.chunk_no, g.value:kind::string, g.value:zone::string, g.value:subzone::string,
      g.value:text::string, g.value:why_matters::string
    from RECPLACE.MODEL.WAVE_RAW r, lateral flatten(input => r.response:parsed:signals) g
    where r.wave_no = :wave_no and r.batch_no = :b;

    delete from RECPLACE.MODEL.HIVE_WAVES where wave_no = :wave_no and batch_no = :b;
    insert into RECPLACE.MODEL.HIVE_WAVES
    select :wave_no, :b, :prompt_version, :model, (select count(*) from RECPLACE.MODEL.WAVE_INPUT where wave_no = :wave_no and batch_no = :b),
      (select count(*) from RECPLACE.MODEL.WAVE_RAW where wave_no = :wave_no and batch_no = :b and response:parsed is not null),
      :retried, :failed, :t0, current_timestamp(), timestampdiff(millisecond, :t0, current_timestamp()) / 1000;
    b := b + 1;
  end while;
  return 'wave ' || wave_no || ': ' || nb || ' batches done';
end;
$$;

create or replace view RECPLACE.MODEL.V_WAVE_PROGRESS as
select i.wave_no,
  count(*) chunks_total,
  count(r.doc_id) chunks_done,
  round(100 * count(r.doc_id) / count(*), 1) pct_done,
  count_if(r.doc_id is not null and r.response:parsed is null) chunks_failed,
  (select count(*) from RECPLACE.MODEL.FIELD_FACTS f where f.wave_no = i.wave_no) facts,
  (select count_if(gate_passed and zone_valid) from RECPLACE.MODEL.FIELD_FACTS f where f.wave_no = i.wave_no) facts_gated,
  (select count(*) from RECPLACE.MODEL.FIELD_SIGNALS s where s.wave_no = i.wave_no) signals,
  (select count(distinct zone || '/' || subzone) from RECPLACE.MODEL.FIELD_FACTS f where f.wave_no = i.wave_no and gate_passed and zone_valid) subzones,
  (select max(finished_at) from RECPLACE.MODEL.HIVE_WAVES h where h.wave_no = i.wave_no) last_batch_at,
  (select round(avg(seconds), 1) from RECPLACE.MODEL.HIVE_WAVES h where h.wave_no = i.wave_no) avg_batch_s
from RECPLACE.MODEL.WAVE_INPUT i
left join RECPLACE.MODEL.WAVE_RAW r on r.wave_no = i.wave_no and r.doc_id = i.doc_id and r.chunk_no = i.chunk_no
group by i.wave_no;

-- Coverage over the business model: every subzone, including blind ones.
create or replace view RECPLACE.MODEL.V_COVERAGE as
with f as (select zone, subzone, count(*) facts, count(distinct doc_id) sources, count_if(knowledge_state = 'hypothesis') hypotheses
           from RECPLACE.MODEL.FIELD_FACTS where gate_passed and zone_valid group by 1, 2),
s as (select zone, subzone, count(*) signals from RECPLACE.MODEL.FIELD_SIGNALS where status = 'open' group by 1, 2)
select z.zone, z.subzone, coalesce(f.facts, 0) facts, coalesce(f.sources, 0) sources, coalesce(f.hypotheses, 0) hypotheses,
  coalesce(s.signals, 0) open_signals,
  case when coalesce(f.facts, 0) >= 5 and coalesce(f.sources, 0) >= 2 then 'covered' when coalesce(f.facts, 0) > 0 then 'thin' else 'blind' end status
from RECPLACE.MODEL.ZONES z left join f using (zone, subzone) left join s using (zone, subzone)
order by z.zone, z.subzone;
