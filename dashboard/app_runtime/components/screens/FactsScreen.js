// Purpose: Facts screen — search proven facts and see the verbatim quote behind each.
// Sources: MODEL.FIELD_FACTS (gate_passed; snapshot keeps the strongest per subzone).
import { firn } from "../../lib/firn/logic.js";
import { Chips, Empty, Kpis, Page, Quote } from "../ui.js";

const uniq = (xs) => [...new Set(xs.filter(Boolean))];

export default function FactsScreen() {
  const facts = firn.facts;
  const st = firn.factStats;
  return (
    <Page title="Facts" sub="Every fact is a verbatim quote that passed the SQL gate. Search, filter, check the source.">
      <Kpis items={[
        ["Proven facts", Number(st.total).toLocaleString("en")], ["From documents", Number(st.docs).toLocaleString("en")],
        ["Hypotheses", facts.filter((f) => f.knowledge_state === "hypothesis").length + " shown"], ["Shown here", facts.length],
      ]} />
      <input className="search" data-search="" placeholder="Search claims and quotes…" aria-label="Search facts" />
      <Chips group="z" label="Zone" values={uniq(facts.map((f) => f.zone))} />
      <Chips group="t" label="Type" values={uniq(facts.map((f) => f.fact_type))} />
      <Chips group="k" label="State" values={uniq(facts.map((f) => f.knowledge_state))} />
      <Chips group="s" label="Speaker" values={uniq(facts.map((f) => f.speaker_role))} />
      <section className="grid" data-list="facts">
        {facts.map((f) => (
          <div key={f.id} id={f.id} className="card" data-item="" data-f-z={f.zone} data-f-t={f.fact_type}
            data-f-k={f.knowledge_state} data-f-s={f.speaker_role} data-text={`${f.claim} ${f.quote} ${f.subzone}`}>
            <div className="head">
              <small><code>{f.id}</code> · {f.zone} / {f.subzone}</small>
              <span><span className="badge n">{f.fact_type}</span> <span className={"badge " + (f.knowledge_state === "known" ? "ok" : "warn")}>{f.knowledge_state}</span></span>
            </div>
            <strong>{f.claim}</strong>
            <Quote fact={f} />
          </div>
        ))}
      </section>
      <Empty list="facts" />
    </Page>
  );
}
