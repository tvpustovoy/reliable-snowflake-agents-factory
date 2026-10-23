"use client";
// Purpose: Firn business coverage map — zone mandates ACT/DRAFT/ASK, filters, agent proposals.
// Inputs: synthetic FAKE table below (zones mirror distill/BUSINESS_MODEL.md).
// Outputs: dashboard page at /. Run: `npm run dev`.
import { useState } from "react";

// Fake coverage, identical in streamlit_sis/streamlit_app.py: zone -> [subzone, facts, carriers, conflicts]
const FAKE = {
  clients_sales: [["qualification", 18, 4, 1], ["objections", 22, 3, 2], ["closing", 15, 3, 1],
    ["loss_reasons", 9, 2, 1], ["retention_churn", 7, 2, 1], ["upsell", 6, 2, 0]],
  founder_rules: [["principles", 8, 2, 0], ["sales_rules", 14, 3, 1], ["decision_rights", 6, 2, 1]],
  product: [["value_prop", 12, 3, 1], ["features", 20, 2, 1], ["limits_bugs", 9, 3, 3],
    ["client_onboarding", 6, 2, 1], ["roadmap", 3, 1, 0]],
  money_pricing: [["tariffs", 11, 3, 4], ["discounts_terms", 7, 2, 3], ["payments", 4, 1, 0],
    ["revenue", 0, 0, 0], ["costs", 2, 1, 0]],
  team_people: [["roles_ownership", 6, 2, 1], ["hiring_leaving", 3, 1, 0], ["staff_training", 10, 2, 1],
    ["performance", 2, 1, 1], ["workload", 0, 0, 0]],
  operations: [["processes", 9, 3, 1], ["tools_crm", 5, 2, 2], ["support_sla", 4, 2, 0]],
  strategy: [["goals_priorities", 5, 1, 1], ["segments_niches", 8, 3, 1], ["competitors", 3, 2, 1], ["partners", 0, 0, 0]],
  marketing: [["positioning", 4, 2, 1], ["channels", 0, 0, 0], ["campaigns_content", 0, 0, 0],
    ["brand_reputation", 2, 1, 0], ["funnel_metrics", 0, 0, 0]],
  other: [["other", 3, 2, 0]],
};
const ZONES = Object.keys(FAKE);

// Agent missions compiled from slices of the map
const AGENTS = [
  ["Chief of Staff", "Founder's deputy across all zones", ZONES.slice(0, -1)],
  ["Sales Closer", "Push stalled deals to close", ["clients_sales", "founder_rules", "product"]],
  ["Sales Onboarding Coach", "Train new salespeople the house way", ["team_people", "founder_rules", "operations"]],
  ["Retention Guard", "Spot sleeping clients and win them back", ["clients_sales", "product", "operations"]],
  ["Pricing Advisor", "Recommend tariffs and discounts", ["money_pricing", "strategy"]],
  ["Marketing Analyst", "Find channels that bring paying clients", ["marketing", "strategy"]],
];

const RANK = { ACT: 2, DRAFT: 1, ASK: 0 };
const STYLE = {
  ACT: { fg: "#2e9d5b", bg: "#e8f6ee", hint: "Agent may act" },
  DRAFT: { fg: "#c98a0b", bg: "#fdf4e1", hint: "Agent drafts, founder approves" },
  ASK: { fg: "#d64545", bg: "#fdeaea", hint: "Agent must ask, data is missing" },
};
// Create button per mandate
const CREATE = {
  ACT: { label: "Create agent", solid: true, msg: "Compiled with ACT mandate: acts on its own within its zones." },
  DRAFT: { label: "Create with approvals", solid: false, msg: "Compiled with DRAFT mandate: every action goes to the founder for approval." },
  ASK: { label: "⚠ Create anyway", solid: false, msg: "Compiled with ASK mandate: knowledge is thin, the agent will ask before acting." },
};

// Coverage rule: covered >=5 facts from >=2 carriers; blind 0 -> ASK; conflicts force DRAFT
function subMandate(facts, carriers, conflicts) {
  if (facts === 0) return "ASK";
  return facts >= 5 && carriers >= 2 && conflicts / facts < 0.2 ? "ACT" : "DRAFT";
}

function zoneMandate(subs) {
  const share = (m) => subs.filter((s) => s.mandate === m).length / subs.length;
  if (share("ACT") >= 0.6 && share("ASK") === 0) return "ACT";
  return share("ASK") >= 0.5 ? "ASK" : "DRAFT";
}

function fakeCoverage() {
  return Object.entries(FAKE).map(([zone, rows]) => {
    const subs = rows.map(([name, facts, carriers, conflicts]) =>
      ({ name, facts, carriers, conflicts, mandate: subMandate(facts, carriers, conflicts) }));
    return { zone, subs, mandate: zoneMandate(subs) };
  });
}

const ZONE_DATA = fakeCoverage();
const BY_ZONE = Object.fromEntries(ZONE_DATA.map((z) => [z.zone, z]));

function Badge({ m }) {
  const s = STYLE[m];
  return (
    <span style={{ background: s.bg, color: s.fg, border: `1px solid ${s.fg}`, borderRadius: 10, padding: "1px 8px", fontSize: 12, fontWeight: 600 }}>
      {m}
    </span>
  );
}

function Chip({ on, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${color || "#9aa4b2"}`, background: on ? color || "#1b2330" : "#fff",
      color: on ? "#fff" : color || "#1b2330", borderRadius: 14, padding: "4px 12px", cursor: "pointer", fontSize: 13,
    }}>{label}</button>
  );
}

export default function Page() {
  const [mandates, setMandates] = useState(Object.keys(STYLE));
  const [zones, setZones] = useState(ZONES);
  const [created, setCreated] = useState({});
  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const all = ZONE_DATA.flatMap((z) => z.subs);
  const agents = AGENTS.map(([name, mission, req]) => {
    const m = req.map((z) => BY_ZONE[z].mandate).reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));
    const weak = req.filter((z) => BY_ZONE[z].mandate !== "ACT");
    const gaps = req.flatMap((z) => BY_ZONE[z].subs.filter((s) => s.mandate === "ASK").map((s) => s.name));
    const trusted = req.filter((z) => BY_ZONE[z].mandate === "ACT").length / req.length;
    return { name, mission, req, m, weak, gaps, trusted };
  }).sort((a, b) => RANK[b.m] - RANK[a.m] || b.trusted - a.trusted);
  const shown = ZONE_DATA.filter((z) => mandates.includes(z.mandate) && zones.includes(z.zone));
  const kpis = [
    ["Facts", all.reduce((s, x) => s + x.facts, 0)],
    ["Zones trusted to act", `${ZONE_DATA.filter((z) => z.mandate === "ACT").length} / ${ZONE_DATA.length}`],
    ["Blind subzones", all.filter((x) => x.mandate === "ASK").length],
    ["Conflicts", all.reduce((s, x) => s + x.conflicts, 0)],
  ];
  const card = { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.08)" };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Firn: what we know about the business</h1>
      <p style={{ color: "#6b7585", marginTop: 0 }}>Fake data · zones from BUSINESS_MODEL.md · mandate ACT / DRAFT / ASK</p>

      <h2>Agents we can compile now</h2>
      <section style={{ ...grid, marginBottom: 24 }}>
        {agents.map((a, i) => {
          const s = STYLE[a.m];
          const c = CREATE[a.m];
          return (
            <div key={a.name} style={{ ...card, borderLeft: `5px solid ${s.fg}`, background: s.bg, display: "flex", flexDirection: "column" }}>
              {i === 0 && <span style={{ alignSelf: "flex-start", background: s.fg, color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 11, marginBottom: 6 }}>RECOMMENDED</span>}
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{a.name}</strong><Badge m={a.m} /></div>
              <div style={{ color: "#555", margin: "4px 0" }}>{a.mission}</div>
              <small>{s.hint}</small>
              <small><b>Zones:</b> {a.req.length < 5 ? a.req.join(", ") : "all"}</small>
              <small><b>Holds back:</b> {a.weak.join(", ") || "nothing"}</small>
              <small style={{ flex: 1 }}><b>Fill next:</b> {a.gaps.slice(0, 4).join(", ") || "no blind spots"}</small>
              <button onClick={() => setCreated({ ...created, [a.name]: true })} style={{
                marginTop: 12, padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                border: `${a.m === "ASK" ? "1px dashed" : "1px solid"} ${s.fg}`,
                background: c.solid ? s.fg : "#fff", color: c.solid ? "#fff" : s.fg,
              }}>{c.label}</button>
              {created[a.name] && <small style={{ marginTop: 8, color: s.fg }}>✓ {c.msg}</small>}
            </div>
          );
        })}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {kpis.map(([label, value]) => (
          <div key={label} style={card}>
            <div style={{ color: "#6b7585", fontSize: 13 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <b style={{ marginRight: 4 }}>Mandate</b>
        {Object.keys(STYLE).map((m) => (
          <Chip key={m} label={m} color={STYLE[m].fg} on={mandates.includes(m)} onClick={() => toggle(mandates, setMandates, m)} />
        ))}
      </section>
      <section style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <b style={{ marginRight: 4 }}>Zones</b>
        {ZONES.map((z) => (
          <Chip key={z} label={z} on={zones.includes(z)} onClick={() => toggle(zones, setZones, z)} />
        ))}
      </section>

      <h2>Coverage map</h2>
      <section style={grid}>
        {shown.map(({ zone, subs, mandate }) => {
          const s = STYLE[mandate];
          return (
            <div key={zone} style={{ ...card, border: `2px solid ${s.fg}`, background: s.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{zone}</strong><Badge m={mandate} /></div>
              <small style={{ color: "#666" }}>{s.hint}</small>
              <hr style={{ margin: "8px 0", border: 0, borderTop: "1px solid #ddd" }} />
              {subs.map((x) => (
                <div key={x.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "3px 0" }}>
                  <span><Badge m={x.mandate} /> <code>{x.name}</code></span>
                  <span style={{ color: "#6b7585" }}>{x.facts} facts · {x.conflicts} conflicts</span>
                </div>
              ))}
            </div>
          );
        })}
        {shown.length === 0 && <p>No zones match the filter.</p>}
      </section>
    </main>
  );
}
