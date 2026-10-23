// Purpose: pull a live Firn snapshot from Snowflake into lib/firn/live/current.json (gitignored).
// Inputs: objects listed in docs/DATA_MAP.md (RECPLACE.CORE / MODEL / APP), via `snow sql` with a
//   non-interactive connection (default: anthropic-snowflake-hackathon-jwt; override FIRN_CONN).
// Outputs: lib/firn/live/current.json — contains company text (quotes, client codes): NEVER commit.
// Run: npm run export-live   (then npm run dev / npm run agent-html pick it up automatically)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CONN = process.env.FIRN_CONN || "anthropic-snowflake-hackathon-jwt";
const OUT = path.resolve("lib/firn/live/current.json");
// Translation cache (gitignored with the snapshot): original text -> English, so reruns translate only new strings
const TR_CACHE = path.resolve("lib/firn/live/translations.json");
// FIRN_TRANSLATE=off skips translation, =estimate prints AI_COUNT_TOKENS for the missing strings and stops
const TR_MODE = process.env.FIRN_TRANSLATE || "on";
const TR_FIELDS = ["claim", "claim_a", "claim_b", "quote", "quote_a", "quote_b", "decision_dependency", "explanation",
  "norm", "text", "why_matters", "example", "title", "statement", "note", "mission_title", "target_text", "meaning", "action",
  "evidence", "conflicts", "loss_limit", "metric_hint"];

function q(sql) {
  const out = execFileSync("snow", ["sql", "-c", CONN, "--format", "json", "-q", sql], { maxBuffer: 256 * 1024 * 1024 }).toString();
  const rows = JSON.parse(out.slice(out.indexOf("[")));
  // lower-case keys, numbers that came back as strings stay strings: callers cast
  return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v])));
}

// Phones, emails and long digit runs are removed from any free text before it lands on disk
const redact = (s) => (typeof s !== "string" ? s : s
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
  .replace(/(\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g, "[phone]")
  .replace(/\b\d{10,}\b/g, "[number]")
  .replace(/(pulse:name:)[^\s(),.;:]+(\s[^\s(),.;:]+)?/gi, "$1[name]"));
const clean = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, redact(v)])));
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

console.log("exporting via connection", CONN);

const coverage = q(`
  with c as (
    select zone, subzone, count(*) conflicts, count_if(severity = 3) high, count_if(kind = 'rule_violated') violated
    from RECPLACE.MODEL.CONFLICTS group by 1, 2)
  select v.zone, v.subzone, v.facts, v.sources, v.hypotheses, v.open_signals, v.status,
         coalesce(c.conflicts, 0) conflicts, coalesce(c.high, 0) high, coalesce(c.violated, 0) violated
  from RECPLACE.MODEL.V_COVERAGE v left join c using (zone, subzone) order by v.zone, v.subzone`);

const domain = q(`select zone, facts, sources, known, hypotheses, hypothesis_pct, clients, open_signals, gaps, unknown_per_fact
  from RECPLACE.MODEL.V_DOMAIN_MAP order by facts desc`);

const money = q(`select bucket, meaning, deals, amount_rub, clients_matched, clients_with_facts, loss_facts
  from RECPLACE.MODEL.V_MONEY_AT_STAKE order by bucket`);

const goals = q(`select goal_id, title, statement, horizon, target_text, alignment, evidence_count, latest_evidence_day, metric_hint, note
  from RECPLACE.MODEL.ORG_GOALS order by goal_id`);

const missions = q(`select agent, mission, mission_title, metric, current_value, owner, serves_goals
  from RECPLACE.MODEL.V_AGENT_GOAL_METRICS order by mission`);

const vertical = q(`select goal_id, mission, proposals, proposals_rub from RECPLACE.MODEL.V_GOAL_VERTICAL order by goal_id, mission`);

const proposals = clean(q(`select proposal_id, created_at, agent, mission, title, action, owner_role, tag, amount_rub,
    left(evidence::string, 600) evidence, left(conflicts::string, 400) conflicts, loss_limit, review_date, status, decided_by, decided_at
  from RECPLACE.APP.ACTION_PROPOSALS order by created_at`));

const traces = q(`select at, actor, role, event, object_id from RECPLACE.APP.TRACES order by at`);

const agentsLive = q(`show agents in database RECPLACE`).map((a) => {
  const fqn = `RECPLACE.${a.schema_name}.${a.name}`;
  const d = q(`describe agent ${fqn}`)[0] || {};
  let spec = {};
  try { spec = JSON.parse(d.agent_spec || "{}"); } catch { /* keep empty */ }
  return {
    fqn, name: a.name, display: JSON.parse(a.profile || "{}").display_name || a.name, comment: a.comment,
    created_on: a.created_on, model: spec.models?.orchestration || null,
    tools: (spec.tools || []).map((t) => ({ name: t.tool_spec?.name, type: t.tool_spec?.type })),
    versions: JSON.parse(d.versions || "[]"), default_version: d.default_version_name,
  };
});

const conflicts = clean(q(`
  select row_number() over (order by severity desc, coalesce(amount_rub, 0) desc, zone) n,
         layer, kind, zone, subzone, severity, client_id, claim_a, claim_b, left(quote_a, 400) quote_a, left(quote_b, 400) quote_b,
         decision_dependency, explanation, amount_rub
  from RECPLACE.MODEL.CONFLICTS
  qualify row_number() over (partition by zone, kind order by severity desc, coalesce(amount_rub, 0) desc) <= 6
  order by n`));

const conflictMap = q(`select layer, kind, zone, conflicts, high, with_decision, amount_rub from RECPLACE.MODEL.V_CONFLICT_MAP order by conflicts desc`);

const facts = clean(q(`
  select left(fact_id, 8) id, zone, subzone, claim, left(quote, 500) quote, fact_type, knowledge_state, speaker_role, basket,
         fact_day, amount_rub, strength, client_id
  from RECPLACE.MODEL.FIELD_FACTS where gate_passed
  qualify row_number() over (partition by zone, subzone order by strength desc nulls last, fact_day desc nulls last) <= 12
  order by zone, subzone`));

const factStats = {
  total: num(q(`select count(*) n from RECPLACE.MODEL.FIELD_FACTS where gate_passed`)[0].n),
  docs: num(q(`select count(distinct doc_id) n from RECPLACE.MODEL.FIELD_FACTS where gate_passed`)[0].n),
  wave: q(`select wave_no, prompt_version, count(*) n, min(created_at) started, max(created_at) finished
           from RECPLACE.MODEL.FIELD_FACTS group by 1, 2 order by 1`),
  by_type: q(`select fact_type, knowledge_state, count(*) n from RECPLACE.MODEL.FIELD_FACTS where gate_passed group by 1, 2 order by n desc`),
  by_basket: q(`select basket, count(*) n from RECPLACE.MODEL.FIELD_FACTS where gate_passed group by 1 order by n desc`),
};

const signals = clean(q(`
  select left(signal_id, 8) id, kind, zone, subzone, text, why_matters, status
  from RECPLACE.MODEL.FIELD_SIGNALS where status = 'open'
  qualify row_number() over (partition by zone, kind order by length(why_matters) desc nulls last) <= 6
  order by zone, kind`));
const signalCounts = q(`select zone, kind, count(*) n from RECPLACE.MODEL.FIELD_SIGNALS where status = 'open' group by 1, 2 order by 1, 2`);

const norms = clean(q(`
  select left(norm_id, 8) id, zone, subzone, norm, left(quote, 400) quote, authority, violations, fact_day, basket
  from RECPLACE.MODEL.V_NORMS
  qualify row_number() over (partition by zone order by violations desc, authority) <= 10
  order by violations desc, authority`));
const normStats = q(`select authority, count(*) n, count_if(violations > 0) violated, sum(violations) violations
  from RECPLACE.MODEL.V_NORMS group by 1 order by 1`);

// Master values candidates: amounts that the company states repeatedly in price facts
const prices = clean(q(`
  with p as (
    select subzone, amount_rub, claim, fact_day, speaker_role
    from RECPLACE.MODEL.FIELD_FACTS
    where gate_passed and fact_type = 'price' and amount_rub > 0)
  select subzone, amount_rub, count(*) n, min(fact_day) first_day, max(fact_day) last_day,
         array_agg(distinct speaker_role) speakers, left(any_value(claim), 220) example
  from p group by 1, 2 having count(*) >= 3 order by n desc limit 40`));
const priceChanges = clean(q(`
  select subzone, claim_a, claim_b, left(explanation, 300) explanation, severity
  from RECPLACE.MODEL.CONFLICTS where kind = 'changed_over_time' and zone = 'money_pricing'
  order by severity desc limit 20`));

const clients = q(`select count(*) clients, count_if(status ilike 'active%' or mrr > 0) active, sum(mrr) mrr,
    count_if(manager_fired and mrr > 0) orphaned, sum(iff(manager_fired, mrr, 0)) orphaned_mrr
  from RECPLACE.CORE.CRM_CLIENTS`)[0];
const deals = q(`select count(*) deals, count_if(status = 'open') open, count_if(status = 'won') won, count_if(status = 'lost') lost,
    sum(iff(status = 'open', amount, 0)) open_amount from RECPLACE.CORE.CRM_DEALS`)[0];

const snapshot = {
  meta: { mode: "live", generated: new Date().toISOString(), source: "RECPLACE (see docs/DATA_MAP.md)", connection: CONN },
  coverage, domain, money, goals, missions, vertical, proposals, traces, agentsLive,
  conflicts, conflictMap, facts, factStats, signals, signalCounts, norms, normStats, prices, priceChanges,
  crm: { clients, deals },
};
// English layer: every Cyrillic string in TR_FIELDS gets a sibling <field>_en; originals stay verbatim (SQL-gate evidence)
function translate(snap) {
  const cache = fs.existsSync(TR_CACHE) ? JSON.parse(fs.readFileSync(TR_CACHE, "utf8")) : {};
  const rows = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const f of TR_FIELDS) if (typeof v[f] === "string" && /[А-Яа-яЁё]/.test(v[f])) rows.push([v, f]);
      Object.values(v).forEach(walk);
    }
  };
  walk(snap);
  const missing = [...new Set(rows.map(([o, f]) => o[f]))].filter((s) => !(s in cache) && !s.includes("$$"));
  const values = (batch) => batch.map((s, i) => `(${i}, $$${s}$$)`).join(",");
  const batches = [];
  for (let i = 0; i < missing.length; i += 40) batches.push(missing.slice(i, i + 40));
  if (TR_MODE === "estimate") {
    let tokens = 0;
    for (const b of batches) tokens += num(q(`select sum(ai_count_tokens('ai_translate', t, 'ru', 'en')) n from values ${values(b)} v(i, t)`)[0].n);
    console.log(`translation estimate: ${missing.length} new strings, ~${tokens} input tokens (output ~1:1 on top)`);
    process.exit(0);
  }
  batches.forEach((b, k) => {
    for (const r of q(`select i, ai_translate(t, 'ru', 'en') en from values ${values(b)} v(i, t)`)) if (r.en) cache[b[Number(r.i)]] = r.en;
    process.stdout.write(`\rtranslated ${Math.min((k + 1) * 40, missing.length)}/${missing.length}`);
  });
  if (batches.length) process.stdout.write("\n");
  fs.mkdirSync(path.dirname(TR_CACHE), { recursive: true });
  fs.writeFileSync(TR_CACHE, JSON.stringify(cache, null, 1));
  for (const [o, f] of rows) if (cache[o[f]]) o[`${f}_en`] = redact(cache[o[f]]);
  snap.meta.translated = { strings: rows.length, model: "AI_TRANSLATE ru->en" };
}
if (TR_MODE !== "off") translate(snapshot);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 1));
console.log("wrote", path.relative(process.cwd(), OUT), (fs.statSync(OUT).size / 1024).toFixed(0) + " KB",
  `· facts ${facts.length}/${factStats.total} · conflicts ${conflicts.length} · norms ${norms.length} · signals ${signals.length}`);
