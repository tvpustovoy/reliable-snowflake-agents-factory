// Purpose: Agents screen — agents already working in Snowflake (with their evolution) and agents we propose to build.
// Sources: SHOW/DESCRIBE AGENTS in RECPLACE, V_AGENT_GOAL_METRICS, APP.ACTION_PROPOSALS, FIELD_FACTS waves;
// proposed agents = mission catalog in lib/firn/logic.js scored against the live map.
import { CREATE, firn, HINT, rub, short, TRUST_RULE } from "../../lib/firn/logic.js";
import { Action, Badge, Done, Line, Page, TrustLevel } from "../ui.js";

const TAG_CLS = { ACT: "ok", HYPOTHESIS: "warn", ASK: "bad", APPROVE: "n" };

function Working({ a, i }) {
  const panel = "evo-" + i;
  return (
    <div className={"card " + (a.test ? "" : a.mandate)}>
      <div className="head">
        <strong>{a.display}</strong>
        <span><span className={"badge " + (a.test ? "n" : "ok")}>{a.test ? "test" : "working"}</span> {!a.test && <Badge m={a.mandate} />}</span>
      </div>
      <TrustLevel value={a.trustLevel} />
      <small><code>{a.fqn}</code> · {a.versions.join(", ")} · model {a.model}</small>
      <Line k="Tools">{a.tools.map((t) => t.name).join(", ")}</Line>
      {!a.test && <Line k="Holds back">{a.weak.join(", ") || "nothing"}</Line>}
      {a.missions.length > 0 && (
        <div className="table-wrap" style={{ margin: "6px 0" }}>
          <table>
            <tbody>
              {a.missions.map((m) => (
                <tr key={m.mission}><td><b>{m.mission}</b> {m.mission_title}</td>
                  <td><b>{/₽|RUB/.test(m.metric) ? rub(m.current_value) : Number(m.current_value).toLocaleString("en")}</b><br /><small className="muted">{m.metric}</small></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="actions"><button type="button" className="btn" data-toggle={panel}>Show evolution</button></div>
      <div data-panel={panel} hidden>
        <hr />
        <small><b>Evolution</b></small>
        {a.events.map((e, j) => (
          <div key={j} className="row"><span className="muted">{String(e.at).slice(0, 16).replace("T", " ")}</span><span style={{ flex: 1, marginLeft: 8 }}>{e.what}</span></div>
        ))}
        {a.proposals.length > 0 && (
          <>
            <small><b>Proposals made</b></small>
            {a.proposals.map((p) => (
              <div key={p.proposal_id} className="row">
                <span><span className={"badge " + (TAG_CLS[p.tag] || "n")}>{p.tag}</span> {short(p.title, 90)}</span>
                <span className="muted">{rub(p.amount_rub)} · {p.status}</span>
              </div>
            ))}
          </>
        )}
        {a.versions.length <= 1 && <small className="muted">Only one committed version so far — next versions appear here after the map is recompiled.</small>}
      </div>
    </div>
  );
}

export default function AgentsScreen() {
  return (
    <Page title="Agent factory" sub={`Agents already working in Snowflake, and agents the map can compile next. Each gets the mandate its weakest zone allows. ${TRUST_RULE}.`}>
      <h2>Working</h2>
      <section className="grid">
        {firn.working.map((a, i) => <Working key={a.fqn} a={a} i={i} />)}
      </section>

      <h2>Proposed</h2>
      <section className="grid">
        {firn.proposed.map((a, i) => {
          const c = CREATE[a.mandate];
          const key = "agent-" + i;
          return (
            <div key={a.name} className={"card " + a.mandate}>
              {i === 0 && <span className="rec">RECOMMENDED</span>}
              <div className="head"><strong>{a.name}</strong><span><span className="badge n">proposed</span> <Badge m={a.mandate} /></span></div>
              <TrustLevel value={a.trustLevel} />
              <div>{a.mission}</div>
              <small>{HINT[a.mandate]}</small>
              <Line k="Zones">{a.zones.join(", ")}</Line>
              <Line k="Holds back">{a.weak.join(", ") || "nothing"}</Line>
              <Line k="Fill next">{a.gaps.slice(0, 4).join(", ") || "no ASK subzones"}</Line>
              <div className="actions"><Action id={key} cls={a.mandate} label={c.label} msg={`${a.name}: ${c.msg}`} /></div>
              <Done id={key} />
            </div>
          );
        })}
      </section>
    </Page>
  );
}
