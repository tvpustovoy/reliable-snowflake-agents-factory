// Purpose: Evolution screen — how the company model and the agents were built, step by step.
// Sources: FIELD_FACTS (waves, prompt versions), ORG_GOALS.built_at, agent created_on/versions, ACTION_PROPOSALS, TRACES.
// There is one distillation wave so far, so this is a build timeline, not yet a version diff.
import { firn } from "../../lib/firn/logic.js";
import { Page } from "../ui.js";

export default function EvolutionScreen() {
  const ev = [];
  for (const w of firn.factStats.wave || []) {
    ev.push({ at: w.started, what: `Distillation wave ${w.wave_no} started (prompt ${w.prompt_version})` });
    ev.push({ at: w.finished, what: `Wave ${w.wave_no} finished: ${Number(w.n).toLocaleString("en")} facts extracted` });
  }
  for (const a of firn.working) ev.push({ at: a.created_on, what: `Agent ${a.display} created (${a.versions.join(", ")})` });
  for (const t of firn.traces) ev.push({ at: t.at, what: `${t.event.replace(/_/g, " ")} by ${t.role}` });
  ev.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const waves = (firn.factStats.wave || []).length;
  return (
    <Page title="Evolution" sub="How the map and the agents came to be. Outcomes and answers will feed the next version.">
      <section className="kpis">
        <div className="card kpi"><div className="label">Distillation waves</div><div className="value">{waves}</div></div>
        <div className="card kpi"><div className="label">Agent versions</div><div className="value">{firn.working.reduce((a, x) => a + x.versions.length, 0)}</div></div>
        <div className="card kpi"><div className="label">Proposals</div><div className="value">{firn.proposals.length}</div></div>
        <div className="card kpi"><div className="label">Decisions taken</div><div className="value">{firn.proposals.filter((p) => p.decided_at).length}</div></div>
      </section>
      {waves <= 1 && <p className="muted">One wave and one agent version so far: version-to-version comparison (coverage, conflicts, mandates) appears after the next wave. See the data report.</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>What happened</th></tr></thead>
          <tbody>{ev.map((e, i) => <tr key={i}><td>{String(e.at).slice(0, 16).replace("T", " ")}</td><td>{e.what}</td></tr>)}</tbody>
        </table>
      </div>
    </Page>
  );
}
