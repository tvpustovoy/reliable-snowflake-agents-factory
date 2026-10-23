// Purpose: Firn trust rules shared by the app and the agent HTML generator.
// Inputs: lib/firn/data.json (synthetic, shaped like RECPLACE.MODEL). Outputs: derived model `firn`.
// Run: imported by app/** and scripts/build-agent-html.mjs.
import data from "./data.json";

export const MANDATES = ["ACT", "DRAFT", "ASK"];
export const RANK = { ACT: 2, DRAFT: 1, ASK: 0 };
export const HINT = {
  ACT: "Agent may act",
  DRAFT: "Agent drafts, founder approves",
  ASK: "Agent must ask, data is missing",
};
export const CREATE = {
  ACT: { label: "Create agent", msg: "Compiled with ACT mandate: acts on its own within its zones." },
  DRAFT: { label: "Create with approvals", msg: "Compiled with DRAFT mandate: every action goes to the founder for approval." },
  ASK: { label: "\u26a0 Create anyway", msg: "Compiled with ASK mandate: knowledge is thin, the agent will ask before acting." },
};
export const LAYERS = ["codified", "declared", "manifested", "practiced", "latent"];
export const LAYER_HINT = {
  codified: "wiki, scripts, policies",
  declared: "what the owner says",
  manifested: "what the team says (non-owners)",
  practiced: "what CRM shows is done",
  latent: "inferred, unspoken",
};

// Coverage rule: covered >=5 facts from >=2 carriers; blind 0 -> ASK; conflicts force DRAFT
export function subMandate(facts, carriers, conflicts) {
  if (facts === 0) return "ASK";
  return facts >= 5 && carriers >= 2 && conflicts / facts < 0.2 ? "ACT" : "DRAFT";
}

export function zoneMandate(subs) {
  const share = (m) => subs.filter((s) => s.mandate === m).length / subs.length;
  if (share("ACT") >= 0.6 && share("ASK") === 0) return "ACT";
  return share("ASK") >= 0.5 ? "ASK" : "DRAFT";
}

const weakest = (ms) => ms.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));

// Culture legitimacy: owner voice alone stays "declared"; two non-owner carriers needed for
// "candidate"; a tension between layers makes it "disputed"; a ratified codex article wins.
export function legitimacy(t, codexById) {
  if (t.codex && codexById[t.codex]?.status === "ratified") return "ratified";
  if (t.tension) return "disputed";
  const nonOwner = ["manifested", "practiced"].reduce((n, l) => n + (t.layers[l]?.carriers || 0), 0);
  return nonOwner >= 2 ? "candidate" : "observed";
}

function build() {
  const zones = Object.entries(data.zones).map(([zone, rows]) => {
    const subs = rows.map(([name, facts, carriers, conflicts]) =>
      ({ name, facts, carriers, conflicts, mandate: subMandate(facts, carriers, conflicts) }));
    return { zone, subs, mandate: zoneMandate(subs) };
  });
  const byZone = Object.fromEntries(zones.map((z) => [z.zone, z]));
  const zoneNames = zones.map((z) => z.zone);
  const factsById = Object.fromEntries(data.facts.map((f) => [f.id, f]));
  const codexById = Object.fromEntries(data.codex.map((k) => [k.id, k]));

  const agents = data.agents.map((a) => {
    const req = a.zones === "ALL" ? zoneNames.filter((z) => z !== "other") : a.zones;
    return {
      ...a, all: a.zones === "ALL", zones: req,
      mandate: weakest(req.map((z) => byZone[z].mandate)),
      weak: req.filter((z) => byZone[z].mandate !== "ACT"),
      gaps: req.flatMap((z) => byZone[z].subs.filter((s) => s.mandate === "ASK").map((s) => s.name)),
      trusted: req.filter((z) => byZone[z].mandate === "ACT").length / req.length,
      rules: a.rules.map((id) => codexById[id]).filter(Boolean),
      conflicts: data.conflicts.filter((c) => c.status === "open" && c.affects.includes(a.name)).map((c) => c.id),
    };
  }).sort((a, b) => RANK[b.mandate] - RANK[a.mandate] || b.trusted - a.trusted);

  const conflicts = data.conflicts.map((c) => ({ ...c, sideFacts: c.sides.map((id) => factsById[id]) }));
  const culture = data.culture.map((t) => ({ ...t, legitimacy: legitimacy(t, codexById) }));
  const allSubs = zones.flatMap((z) => z.subs);
  const kpis = {
    facts: allSubs.reduce((s, x) => s + x.facts, 0),
    trustedZones: zones.filter((z) => z.mandate === "ACT").length,
    zones: zones.length,
    blind: allSubs.filter((x) => x.mandate === "ASK").length,
    conflictsOpen: conflicts.filter((c) => c.status === "open").length,
  };

  return {
    company: data.company, version: data.version, zones, byZone, zoneNames, agents, conflicts,
    facts: data.facts, factsById, signals: data.signals, masterValues: data.master_values,
    versions: data.versions, culture, codex: data.codex, codexById, kpis,
  };
}

export const firn = build();
