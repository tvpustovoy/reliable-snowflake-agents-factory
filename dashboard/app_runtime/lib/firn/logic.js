// Purpose: Firn trust rules + view model shared by the app and the agent HTML generator.
// Inputs: lib/firn/live/active.json — chosen by scripts/select-data.mjs (live snapshot or synthetic sample).
// Outputs: `firn` view model. Run: imported by components/** and scripts/build-agent-html.mjs.
import raw from "./live/active.json";

// English-first: <field>_en (AI_TRANSLATE at export) becomes the field, the original stays as <field>_orig
function english(v) {
  if (Array.isArray(v)) return v.map(english);
  if (!v || typeof v !== "object") return v;
  const o = {};
  for (const [k, x] of Object.entries(v)) if (!k.endsWith("_en")) o[k] = english(x);
  for (const [k, x] of Object.entries(v)) if (k.endsWith("_en") && x) { const f = k.slice(0, -3); o[f + "_orig"] = v[f]; o[f] = x; }
  return o;
}
const data = english(raw);

export const MANDATES = ["ACT", "DRAFT", "ASK"];
export const RANK = { ACT: 2, DRAFT: 1, ASK: 0 };
export const HINT = {
  ACT: "Agent may act",
  DRAFT: "Agent drafts, founder approves",
  ASK: "Agent must ask, knowledge is thin or contested",
};
export const CREATE = {
  ACT: { label: "Create agent", msg: "Compiled with ACT mandate: acts on its own within its zones." },
  DRAFT: { label: "Create with approvals", msg: "Compiled with DRAFT mandate: every action goes to the founder for approval." },
  ASK: { label: "\u26a0 Create anyway", msg: "Compiled with ASK mandate: knowledge is thin, the agent will ask before acting." },
};
// Culture layers map onto norm authority levels in MODEL.V_NORMS
export const LAYERS = [
  ["codified", "L1_document", "documents, wiki, training"],
  ["declared", "L2_founder", "what the founder says"],
  ["practiced", "L3_practice", "what the team does and says"],
];
export const THRESHOLDS = { askUnknownPerFact: 1, draftHypothesisShare: 0.35, draftUnknownPerFact: 0.5, draftHighPer100: 5 };

// Proposed agents: missions we can compile from the map. Working agents come from Snowflake (SHOW AGENTS).
const CATALOG = [
  ["Product Expert", "Answer clients and sellers about features, limits and onboarding", ["product"]],
  ["Sales Closer", "Push stalled deals near payment to close", ["clients_sales", "founder_rules", "product"]],
  ["Retention Guard", "Save clients of departed managers and overdue renewals", ["clients_sales", "product", "operations"]],
  ["Sales Onboarding Coach", "Teach new sellers the house way from teach-vs-do gaps", ["team_people", "founder_rules", "operations"]],
  ["Pricing Advisor", "Recommend tariffs and discounts within the price policy", ["money_pricing", "strategy"]],
  ["Partner Desk", "Run distributors and white-label partners", ["strategy", "money_pricing", "clients_sales"]],
  ["Marketing Analyst", "Find channels that bring paying clients", ["marketing", "strategy"]],
];

const n = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const weakest = (ms) => ms.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));

// Subzone mandate on real coverage: everything is "covered" by volume, so trust is decided by
// how much is unknown, hypothetical or seriously contested per fact.
export function subMandate(s) {
  const facts = n(s.facts);
  if (facts === 0) return "ASK";
  const unknown = n(s.open_signals) / facts;
  const hyp = n(s.hypotheses) / facts;
  const highPer100 = (n(s.high) / facts) * 100;
  if (unknown > THRESHOLDS.askUnknownPerFact) return "ASK";
  if (hyp >= THRESHOLDS.draftHypothesisShare || unknown >= THRESHOLDS.draftUnknownPerFact || highPer100 >= THRESHOLDS.draftHighPer100) return "DRAFT";
  return "ACT";
}
export function zoneMandate(subs) {
  const share = (m) => subs.filter((s) => s.mandate === m).length / subs.length;
  if (share("ACT") >= 0.6 && share("ASK") === 0) return "ACT";
  return share("ASK") >= 0.5 ? "ASK" : "DRAFT";
}

function build() {
  const subs = data.coverage.map((s) => ({
    zone: s.zone, name: s.subzone, facts: n(s.facts), sources: n(s.sources), hypotheses: n(s.hypotheses),
    unknown: n(s.open_signals), conflicts: n(s.conflicts), high: n(s.high), violated: n(s.violated), status: s.status,
    mandate: subMandate(s),
  }));
  const zoneNames = [...new Set(subs.map((s) => s.zone))];
  const zones = zoneNames.map((zone) => {
    const zs = subs.filter((s) => s.zone === zone);
    return { zone, subs: zs, mandate: zoneMandate(zs), facts: zs.reduce((a, s) => a + s.facts, 0) };
  }).sort((a, b) => b.facts - a.facts);
  const byZone = Object.fromEntries(zones.map((z) => [z.zone, z]));
  const coreZones = zoneNames.filter((z) => z !== "other");

  const reach = (req) => {
    const ok = req.filter((z) => byZone[z]);
    return {
      zones: ok, mandate: weakest(ok.map((z) => byZone[z].mandate)),
      weak: ok.filter((z) => byZone[z].mandate !== "ACT"),
      gaps: ok.flatMap((z) => byZone[z].subs.filter((s) => s.mandate === "ASK").map((s) => `${z}/${s.name}`)),
      trusted: ok.filter((z) => byZone[z].mandate === "ACT").length / ok.length,
    };
  };

  // Working agents (live in Snowflake) with their evolution
  const proposals = data.proposals.map((p) => ({ ...p, amount_rub: n(p.amount_rub) }));
  const wave = data.factStats.wave || [];
  const working = data.agentsLive.map((a) => {
    const test = /^test/i.test(a.comment || "");
    const mine = proposals.filter((p) => p.agent === a.name);
    const missions = data.missions.filter((m) => m.agent === a.name);
    const events = [
      ...wave.map((w) => ({ at: w.finished || w.started, what: `Knowledge wave ${w.wave_no}: ${n(w.n).toLocaleString("en")} facts (${w.prompt_version})` })),
      { at: a.created_on, what: `Created ${a.default_version ? `(${a.versions.join(", ")})` : ""} · model ${a.model || "?"} · tools: ${a.tools.map((t) => t.name).join(", ")}` },
      ...(mine.length ? [{ at: mine[0].created_at, what: `First proposal: ${mine[0].title}` },
        { at: mine[mine.length - 1].created_at, what: `${mine.length} proposals so far, ${mine.filter((p) => p.status === "approved").length} approved` }] : []),
    ].filter((e) => e.at).sort((x, y) => String(x.at).localeCompare(String(y.at)));
    return {
      ...a, test, missions, proposals: mine, events,
      ...(test ? { zones: [], mandate: "ASK", weak: [], gaps: [], trusted: 0 } : reach(coreZones)),
    };
  });
  const workingNames = new Set(working.map((a) => a.display));
  const proposed = CATALOG.filter(([name]) => !workingNames.has(name)).map(([name, mission, req]) => ({ name, mission, ...reach(req) }))
    .sort((a, b) => RANK[b.mandate] - RANK[a.mandate] || b.trusted - a.trusted);

  const conflicts = data.conflicts.map((c) => ({
    ...c, id: `C-${String(c.n).padStart(3, "0")}`, severity: n(c.severity), amount_rub: n(c.amount_rub),
    blocking: n(c.severity) >= 3,
  }));

  // Master values: amounts the company states repeatedly (>= 3 price facts), plus price changes over time
  const valueGroups = {};
  for (const p of data.prices) (valueGroups[p.subzone] ||= []).push({ ...p, amount_rub: n(p.amount_rub), n: n(p.n) });
  const masterValues = Object.entries(valueGroups).map(([subzone, points]) => ({ subzone, points: points.sort((a, b) => b.n - a.n) }));

  // Culture from norms: authority level = layer; violations = practice breaks the rule
  const culture = zoneNames.map((zone) => {
    const ns = data.norms.filter((x) => x.zone === zone);
    return { zone, norms: ns, byLayer: Object.fromEntries(LAYERS.map(([l, a]) => [l, ns.filter((x) => x.authority === a).length])),
      violated: ns.filter((x) => n(x.violations) > 0).length };
  }).filter((c) => c.norms.length);
  const tensions = data.norms.filter((x) => n(x.violations) > 0).map((x) => ({ ...x, violations: n(x.violations) }));

  const money = data.money.map((m) => ({ ...m, amount_rub: n(m.amount_rub), deals: n(m.deals) }));
  const recoverable = money.filter((m) => /^B(1|2|4|6)_/.test(m.bucket)).reduce((a, m) => a + m.amount_rub, 0);

  const kpis = {
    facts: n(data.factStats.total), docs: n(data.factStats.docs),
    trustedZones: zones.filter((z) => z.mandate === "ACT").length, zones: zones.length,
    subzones: subs.length, actSubs: subs.filter((s) => s.mandate === "ACT").length, askSubs: subs.filter((s) => s.mandate === "ASK").length,
    conflicts: data.conflictMap.reduce((a, c) => a + n(c.conflicts), 0) || conflicts.length,
    highConflicts: data.conflictMap.reduce((a, c) => a + n(c.high), 0) || conflicts.filter((c) => c.blocking).length,
    openSignals: data.signalCounts.reduce((a, c) => a + n(c.n), 0) || data.signals.length,
    recoverable,
  };

  return {
    meta: data.meta, live: data.meta.mode === "live", zones, byZone, zoneNames, subs, working, proposed, conflicts,
    conflictMap: data.conflictMap, facts: data.facts, factStats: data.factStats, signals: data.signals,
    signalCounts: data.signalCounts, money, goals: data.goals, missions: data.missions, vertical: data.vertical,
    proposals, traces: data.traces, norms: data.norms, normStats: data.normStats, culture, tensions,
    masterValues, priceChanges: data.priceChanges, crm: data.crm, kpis,
  };
}

export const firn = build();

export const rub = (v) => (v === null || v === undefined ? "—" : Math.round(Number(v)).toLocaleString("ru-RU").replace(/\u00a0/g, " ") + " \u20bd");
export const short = (s, len = 220) => (!s ? "" : s.length > len ? s.slice(0, len - 1) + "\u2026" : s);
