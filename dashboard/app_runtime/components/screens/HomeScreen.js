// Purpose: Home screen — the founder's front page: digital employees (at work + who to hire next), money on the table,
// goals, what the agent proposes. Sources: SHOW AGENTS, V_MONEY_AT_STAKE, ORG_GOALS, V_AGENT_GOAL_METRICS, ACTION_PROPOSALS.
import { CREATE, firn, HINT, rub, short, TRUST_RULE } from "../../lib/firn/logic.js";
import { Action, Badge, Done, Kpis, Page, TrustLevel } from "../ui.js";

const TAG_CLS = { ACT: "ok", HYPOTHESIS: "warn", ASK: "bad", APPROVE: "n" };
const ALIGN_CLS = { aligned: "ok", partly: "warn", conflicting: "bad" };

export default function HomeScreen() {
  const k = firn.kpis;
  const inbox = firn.proposals.filter((p) => p.status !== "approved" && p.status !== "rejected")
    .sort((a, b) => b.amount_rub - a.amount_rub);
  const top = firn.money.slice().sort((a, b) => b.amount_rub - a.amount_rub);
  const rec = firn.proposed[0];
  const cos = firn.working.find((a) => !a.test);
  const staff = firn.working.filter((a) => !a.test);
  const tests = firn.working.filter((a) => a.test);
  return (
    <Page title="Where we are" sub={`Digital employees, money on the table, goals · ${firn.live ? "live data from Snowflake" : "synthetic sample"}`}>
      <h2>Digital employees</h2>
      <p className="muted">{staff.length} at work in Snowflake{tests.length ? ` (+${tests.length} in testing)` : ""} · {firn.proposed.length} proposed to hire next. {TRUST_RULE}.</p>
      <section className="grid">
        {[...staff, ...tests].map((a) => (
          <div key={a.fqn} className={"card " + (a.test ? "" : a.mandate)}>
            <div className="head"><strong>{a.display}</strong>
              <span><span className={"badge " + (a.test ? "n" : "ok")}>{a.test ? "in testing" : "at work"}</span> {!a.test && <Badge m={a.mandate} />}</span></div>
            <TrustLevel value={a.trustLevel} />
            <small>{a.missions.length ? a.missions.map((m) => m.mission).join(", ") + " missions" : "no missions yet"} · {a.proposals.length} proposals · {a.tools.length} tools</small>
            {!a.test && <small>{HINT[a.mandate]}</small>}
            <small><a href="/agents">History and evolution</a></small>
          </div>
        ))}
        {rec && (
          <div className={"card " + rec.mandate}>
            <span className="rec">HIRE NEXT</span>
            <div className="head"><strong>{rec.name}</strong><Badge m={rec.mandate} /></div>
            <TrustLevel value={rec.trustLevel} />
            <div>{rec.mission}.</div>
            <small>Zones: {rec.zones.join(", ")} · {HINT[rec.mandate]}</small>
            <div className="actions"><Action id="home-hire" cls={rec.mandate} label={CREATE[rec.mandate].label} msg={`${rec.name}: ${CREATE[rec.mandate].msg}`} /></div>
            <Done id="home-hire" />
          </div>
        )}
      </section>
      {firn.proposed.length > 1 && <p className="muted">Then: {firn.proposed.slice(1, 4).map((p) => `${p.name} (${p.mandate})`).join(" · ")} · <a href="/agents">all proposals</a></p>}

      <h2>Key numbers</h2>
      <Kpis items={[
        ["Recoverable money at stake", rub(k.recoverable)],
        ["Proven facts", `${k.facts.toLocaleString("en")} from ${k.docs.toLocaleString("en")} docs`],
        ["Subzones agents may act in", `${k.actSubs} / ${k.subzones}`],
        ["Contradictions (high)", `${k.conflicts} (${k.highConflicts})`],
      ]} />

      <h2>Money on the table</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Bucket</th><th>Meaning</th><th>Deals</th><th>₽</th></tr></thead>
          <tbody>
            {top.map((m) => (
              <tr key={m.bucket}><td><code>{m.bucket.slice(0, 2)}</code></td><td>{m.meaning}</td><td>{m.deals.toLocaleString("en")}</td><td><b>{rub(m.amount_rub)}</b></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Decision inbox</h2>
      <p className="muted">{inbox.length} proposals from {cos ? cos.display : "the agent"} wait for a person. Approved so far: {firn.proposals.filter((p) => p.status === "approved").length}.</p>
      <section className="grid">
        {inbox.slice(0, 6).map((p) => (
          <div key={p.proposal_id} className="card">
            <div className="head"><span className={"badge " + (TAG_CLS[p.tag] || "n")}>{p.tag}</span><small>{p.mission} · {p.owner_role}</small></div>
            <strong>{p.title}</strong>
            <small><b>At stake:</b> {rub(p.amount_rub)} · review {String(p.review_date || "").slice(0, 10)}</small>
            <small>{short(p.evidence, 160)}</small>
          </div>
        ))}
      </section>

      <h2>Goals</h2>
      <section className="grid">
        {firn.goals.map((g) => (
          <div key={g.goal_id} className="card">
            <div className="head"><strong>{g.goal_id} · {g.title}</strong><span className={"badge " + (ALIGN_CLS[g.alignment] || "n")}>{g.alignment}</span></div>
            <small>horizon {g.horizon} · {g.evidence_count} evidence</small>
            <small><b>Target:</b> {g.target_text || <span className="badge bad">no numeric target</span>}</small>
          </div>
        ))}
      </section>

      <h2>Agent missions</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Mission</th><th>Metric</th><th>Now</th><th>Owner</th></tr></thead>
          <tbody>
            {firn.missions.map((m) => (
              <tr key={m.mission}><td><b>{m.mission}</b> {m.mission_title}</td><td>{m.metric}</td>
                <td><b>{/₽|RUB/.test(m.metric) ? rub(m.current_value) : Number(m.current_value).toLocaleString("en")}</b></td><td>{m.owner}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

    </Page>
  );
}
