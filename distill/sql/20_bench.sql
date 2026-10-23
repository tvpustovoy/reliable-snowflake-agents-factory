-- Prompt × model benchmark for hive workers (wave-1 conditions: empty field).
-- Same 20 chunks (MODEL.BENCH_INPUT) for every run; prompts from MODEL.PROMPT_VERSIONS (immutable).
create table if not exists RECPLACE.MODEL.BENCH_RUNS (
  run_id string, prompt_version string, model string, chunks int,
  started_at timestamp_ltz, finished_at timestamp_ltz, seconds number(10,1));
create table if not exists RECPLACE.MODEL.BENCH_RAW (
  run_id string, doc_id string, chunk_no int, basket string, chunk_text string, response variant);

-- A call is a worker. A worker that did not report a parsable result (NULL, truncated, network error) is retried:
-- failed rows stay "open" and are re-called up to max_retries times; attempts are recorded per row.
-- use_temperature = false for models that reject it (claude-sonnet-5-5 returns NULL with temperature here).
alter table RECPLACE.MODEL.BENCH_RAW add column if not exists attempts int;
alter table RECPLACE.MODEL.BENCH_RUNS add column if not exists retried int;
alter table RECPLACE.MODEL.BENCH_RUNS add column if not exists still_failed int;

-- Rendered prompt per (prompt_version, chunk): runtime placeholders only.
create or replace view RECPLACE.MODEL.V_BENCH_PROMPTS as
select p.version prompt_version, b.doc_id, b.chunk_no, b.basket, b.chunk_text,
  replace(replace(replace(replace(replace(p.prompt_text,
    '{field}', '(empty — wave 1)'), '{basket}', b.basket), '{day}', coalesce(b.day::string, 'unknown')),
    '{client_id}', coalesce(b.client_id, 'none')), '{chunk_text}', b.chunk_text) prompt
from RECPLACE.MODEL.BENCH_INPUT b, RECPLACE.MODEL.PROMPT_VERSIONS p;

create or replace procedure RECPLACE.MODEL.BENCH_RUN(run_id string, prompt_version string, model string,
  use_temperature boolean default true, max_retries int default 2)
returns string language sql as
$$
declare t0 timestamp_ltz; t1 timestamp_ltz; n int; failed int; retried int default 0; i int default 0;
begin
  delete from RECPLACE.MODEL.BENCH_RAW where run_id = :run_id;
  delete from RECPLACE.MODEL.BENCH_RUNS where run_id = :run_id;
  t0 := current_timestamp();
  -- Schema is compiled into the prompt (claude-opus-5-5 returns NULL with response_format here), so all runs use the same mode.
  insert into RECPLACE.MODEL.BENCH_RAW (run_id, doc_id, chunk_no, basket, chunk_text, response, attempts)
  select :run_id, doc_id, chunk_no, basket, chunk_text,
    object_construct('usage', d:usage, 'raw_text', d:choices[0]:messages::string,
      'structured_output', array_construct(object_construct('raw_message',
        try_parse_json(regexp_replace(regexp_replace(d:choices[0]:messages::string, '^\\s*```(json)?', ''), '```\\s*$', ''))))), 1
  from (select doc_id, chunk_no, basket, chunk_text,
          AI_COMPLETE(model => :model, prompt => prompt,
            model_parameters => iff(:use_temperature, {'temperature': 0, 'max_tokens': 8192}::object, {'max_tokens': 8192}::object),
            show_details => true) d
        from RECPLACE.MODEL.V_BENCH_PROMPTS where prompt_version = :prompt_version);
  n := sqlrowcount;
  while (i < max_retries) do
    select count(*) into :failed from RECPLACE.MODEL.BENCH_RAW
      where run_id = :run_id and response:structured_output[0]:raw_message is null;
    if (failed = 0) then break; end if;
    merge into RECPLACE.MODEL.BENCH_RAW t using (
      select q.doc_id, q.chunk_no,
        AI_COMPLETE(model => :model, prompt => q.prompt,
          model_parameters => iff(:use_temperature, {'temperature': 0, 'max_tokens': 8192}::object, {'max_tokens': 8192}::object),
          show_details => true) d
      from RECPLACE.MODEL.V_BENCH_PROMPTS q
      join RECPLACE.MODEL.BENCH_RAW r on r.doc_id = q.doc_id and r.chunk_no = q.chunk_no
      where q.prompt_version = :prompt_version and r.run_id = :run_id and r.response:structured_output[0]:raw_message is null) s
    on t.run_id = :run_id and t.doc_id = s.doc_id and t.chunk_no = s.chunk_no
    when matched then update set attempts = t.attempts + 1,
      response = object_construct('usage', s.d:usage, 'raw_text', s.d:choices[0]:messages::string,
        'structured_output', array_construct(object_construct('raw_message',
          try_parse_json(regexp_replace(regexp_replace(s.d:choices[0]:messages::string, '^\\s*```(json)?', ''), '```\\s*$', '')))));
    retried := retried + failed;
    i := i + 1;
  end while;
  select count(*) into :failed from RECPLACE.MODEL.BENCH_RAW
    where run_id = :run_id and response:structured_output[0]:raw_message is null;
  t1 := current_timestamp();
  insert into RECPLACE.MODEL.BENCH_RUNS (run_id, prompt_version, model, chunks, started_at, finished_at, seconds, retried, still_failed)
  select :run_id, :prompt_version, :model, :n, :t0, :t1, timestampdiff(millisecond, :t0, :t1) / 1000, :retried, :failed;
  return run_id || ': ' || n || ' chunks in ' || (timestampdiff(millisecond, t0, t1) / 1000) || ' s, retried ' || retried || ', still failed ' || failed;
end;
$$;

-- Facts with the SQL gate (verbatim quote, whitespace-normalized, ≥ 15 chars) and validity checks.
create or replace view RECPLACE.MODEL.V_BENCH_FACTS as
select r.run_id, r.doc_id, r.chunk_no, r.basket, a.index fact_no,
  a.value:zone::string zone, a.value:subzone::string subzone, a.value:claim::string claim, a.value:quote::string quote,
  a.value:fact_type::string fact_type, a.value:target_q::string target_q, a.value:knowledge_state::string knowledge_state,
  a.value:speaker_role::string speaker_role, a.value:stake::string stake,
  a.value:amount_rub amount_rub, a.value:due_date::string due_date, a.value:counterparty::string counterparty,
  a.value:promise_status::string promise_status, a.value:deal_hint::string deal_hint,
  length(a.value:quote::string) >= 15
    and contains(regexp_replace(r.chunk_text, '\\s+', ' '), regexp_replace(a.value:quote::string, '\\s+', ' ')) gate_passed,
  exists (select 1 from RECPLACE.MODEL.ZONES z where z.zone = a.value:zone::string and z.subzone = a.value:subzone::string) zone_valid
from RECPLACE.MODEL.BENCH_RAW r,
  lateral flatten(input => r.response:structured_output[0]:raw_message:asserts) a;

create or replace view RECPLACE.MODEL.V_BENCH_SUMMARY as
with f as (select * from RECPLACE.MODEL.V_BENCH_FACTS),
raw as (select run_id, count(*) chunks, count_if(response:structured_output[0]:raw_message is null) failed,
          sum(response:usage:prompt_tokens) in_tok, sum(response:usage:completion_tokens) out_tok,
          sum(array_size(response:structured_output[0]:raw_message:signals)) signals
        from RECPLACE.MODEL.BENCH_RAW group by 1)
select b.run_id, b.prompt_version, b.model, b.seconds, raw.chunks, raw.failed, raw.in_tok, raw.out_tok,
  count(f.fact_no) facts, count_if(f.gate_passed) facts_gated,
  round(100 * count_if(f.gate_passed) / nullif(count(f.fact_no), 0), 1) gate_pct,
  round(100 * count_if(f.zone_valid) / nullif(count(f.fact_no), 0), 1) zone_valid_pct,
  count(distinct f.zone || '/' || f.subzone) subzones, count(distinct f.target_q) target_qs,
  count_if(f.fact_type in ('objection', 'loss_reason', 'sales_behavior')) demo_sales,
  count_if(f.fact_type in ('training_rule', 'rule')) demo_rules,
  count_if(f.amount_rub is not null and not is_null_value(f.amount_rub)) with_amount,
  count_if(f.fact_type = 'promise') promises, raw.signals,
  round(count(f.fact_no) / raw.chunks, 2) facts_per_chunk
from RECPLACE.MODEL.BENCH_RUNS b join raw using (run_id) left join f using (run_id)
group by 1, 2, 3, 4, 5, 6, 7, 8, raw.signals;
