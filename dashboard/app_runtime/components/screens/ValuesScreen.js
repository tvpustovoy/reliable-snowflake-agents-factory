// Purpose: Master values screen — price points the company states repeatedly, and how prices changed over time.
// Sources: MODEL.FIELD_FACTS (fact_type = 'price', amount stated in >= 3 facts), MODEL.CONFLICTS
// (kind = 'changed_over_time', zone money_pricing). No dedicated master-values table exists yet.
import { firn, rub } from "../../lib/firn/logic.js";
import { Page } from "../ui.js";

export default function ValuesScreen() {
  return (
    <Page title="Master values" sub="Numbers the company says out loud. Agents should quote a value with its history, not a frozen number.">
      <p className="muted">Derived: amounts named in at least 3 proven price facts. A curated table of values with an owner does not exist yet (see report).</p>
      <section className="grid">
        {firn.masterValues.map((v) => (
          <div key={v.subzone} className="card">
            <div className="head"><strong>{v.subzone}</strong><span className="badge n">{v.points.length} values</span></div>
            <hr />
            {v.points.map((p) => (
              <div key={p.amount_rub} className="row" title={p.example}>
                <b>{rub(p.amount_rub)}</b>
                <span className="muted">{p.n} facts · {p.first_day} → {p.last_day}</span>
              </div>
            ))}
          </div>
        ))}
      </section>

      <h2>How prices changed</h2>
      {firn.priceChanges.length === 0 && <p className="muted">No change-over-time conflicts in money_pricing.</p>}
      <section className="grid">
        {firn.priceChanges.map((c, i) => (
          <div key={i} className={"card " + (Number(c.severity) >= 3 ? "ASK" : "DRAFT")}>
            <small>{c.subzone} · severity {c.severity}</small>
            <div><b>Before:</b> {c.claim_a}</div>
            <div><b>After:</b> {c.claim_b}</div>
            <small>{c.explanation}</small>
          </div>
        ))}
      </section>
    </Page>
  );
}
