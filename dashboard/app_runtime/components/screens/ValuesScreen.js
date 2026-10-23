// Purpose: Master values screen — numbers the company says out loud (prices, discounts, terms) over time.
// Agents get a reference to the value, not a frozen number.
import { firn } from "../../lib/firn/logic.js";
import { Chips, Empty, Page } from "../ui.js";

export default function ValuesScreen() {
  return (
    <Page title="Master values" sub="Every observation keeps its source. Diverging observations link to a conflict.">
      <Chips group="c" label="Observations" values={["consistent", "diverging"]} />
      <section className="grid" data-list="values">
        {firn.masterValues.map((v) => {
          const distinct = new Set(v.observations.map((o) => o.value)).size;
          const state = distinct > 1 ? "diverging" : "consistent";
          const last = v.observations[v.observations.length - 1];
          return (
            <div key={v.id} className={"card " + (state === "diverging" ? "DRAFT" : "ACT")} data-item="" data-f-c={state}>
              <div className="head"><strong>{v.name}</strong><span className={"badge " + (state === "diverging" ? "warn" : "ok")}>{state}</span></div>
              <div><b style={{ fontSize: 22 }}>{last.value}</b> <span className="muted">{v.unit} · latest</span></div>
              <small><code>{v.id}</code> · owner {v.owner}{v.conflict && <> · conflict <a href={"/conflicts#" + v.conflict}>{v.conflict}</a></>}</small>
              <hr />
              {v.observations.map((o) => (
                <div key={o.date + o.source} className="row">
                  <span>{o.date}</span><b>{o.value}</b><span className="muted"><code>{o.source}</code> · <a href={"/facts#" + o.fact}>{o.fact}</a></span>
                </div>
              ))}
            </div>
          );
        })}
      </section>
      <Empty list="values" />
    </Page>
  );
}
