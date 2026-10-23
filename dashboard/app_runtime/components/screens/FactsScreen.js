// Purpose: Facts screen — search the knowledge map and see the verbatim proof behind each fact.
import { firn } from "../../lib/firn/logic.js";
import { Badge, Chips, Empty, Page, Quote } from "../ui.js";

const uniq = (xs) => [...new Set(xs)];

export default function FactsScreen() {
  const facts = firn.facts;
  return (
    <Page title="Facts" sub="Every fact is a verbatim quote from a source. Search, filter, follow the links.">
      <input className="search" data-search="" placeholder="Search claims and quotes…" aria-label="Search facts" />
      <Chips group="z" label="Zone" values={uniq(facts.map((f) => f.zone))} />
      <Chips group="t" label="Type" values={uniq(facts.map((f) => f.fact_type))} />
      <Chips group="s" label="Source" values={uniq(facts.map((f) => f.source.type))} />
      <Chips group="k" label="State" values={uniq(facts.map((f) => f.knowledge_state))} />
      <section className="grid" data-list="facts">
        {facts.map((f) => {
          const inbound = facts.filter((o) => o.refs.some((r) => r.fact_id === f.id));
          const conflict = firn.conflicts.find((c) => c.sides.includes(f.id));
          return (
            <div key={f.id} id={f.id} className="card" data-item="" data-f-z={f.zone} data-f-t={f.fact_type}
              data-f-s={f.source.type} data-f-k={f.knowledge_state} data-text={`${f.id} ${f.claim} ${f.quote} ${f.subzone}`}>
              <div className="head">
                <small><code>{f.id}</code> · {f.zone} / {f.subzone}</small>
                <span className="badge n">{f.fact_type}</span>
              </div>
              <strong>{f.claim}</strong>
              <Quote fact={f} />
              {(f.refs.length > 0 || inbound.length > 0 || conflict) && <hr />}
              {f.refs.map((r) => <small key={r.fact_id}><b>{r.relation}</b> <a href={"#" + r.fact_id}>{r.fact_id}</a>: {firn.factsById[r.fact_id].claim}</small>)}
              {inbound.map((o) => <small key={o.id}><b>referenced by</b> <a href={"#" + o.id}>{o.id}</a></small>)}
              {conflict && <small><b>in conflict</b> {conflict.id}: {conflict.topic} <Badge m={conflict.status} kind={conflict.status === "open" ? "bad" : "ok"} /></small>}
            </div>
          );
        })}
      </section>
      <Empty list="facts" />
    </Page>
  );
}
