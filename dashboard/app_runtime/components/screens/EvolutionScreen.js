// Purpose: Evolution screen — how the map and agent mandates change from version to version.
import { firn } from "../../lib/firn/logic.js";
import { Badge, Page } from "../ui.js";

export default function EvolutionScreen() {
  const vs = firn.versions;
  const agents = Object.keys(vs[vs.length - 1].mandates);
  return (
    <Page title="Evolution" sub="Outcomes and answers feed the next version of the map and the agents.">
      <section className="timeline">
        {vs.map((v, i) => {
          const prev = vs[i - 1];
          return (
            <div key={v.id} className="card">
              <div className="head"><strong>{v.id}</strong><small>{v.date}</small></div>
              <div className="row"><span>Facts</span><b>{v.facts}{prev && <span className="muted"> (+{v.facts - prev.facts})</span>}</b></div>
              <div className="row"><span>Coverage</span><b>{Math.round(v.coverage * 100)}%</b></div>
              <div className="bar"><span style={{ width: v.coverage * 100 + "%" }} /></div>
              <div className="row"><span>Conflicts open / resolved</span><b>{v.conflicts_open} / {v.conflicts_resolved}</b></div>
              <hr />
              {v.changes.map((c) => <small key={c}>• {c}</small>)}
            </div>
          );
        })}
      </section>

      <h2>Agent mandates by version</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Agent</th>{vs.map((v) => <th key={v.id}>{v.id}</th>)}</tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a}>
                <td>{a}</td>
                {vs.map((v, i) => {
                  const m = v.mandates[a];
                  const up = i > 0 && m !== vs[i - 1].mandates[a];
                  return <td key={v.id}><Badge m={m} />{up && <span className="muted"> changed</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
