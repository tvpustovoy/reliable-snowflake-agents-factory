// Purpose: Conflicts screen — where the company says the same thing differently, and which decision it blocks.
// Sources: MODEL.CONFLICTS (top per zone×kind in the snapshot), MODEL.V_CONFLICT_MAP (totals).
import { firn, rub } from "../../lib/firn/logic.js";
import { Action, Chips, Done, Empty, Kpis, Page } from "../ui.js";

const LAYER = { fact_vs_fact: "fact vs fact", fact_vs_crm: "fact vs CRM", crm_vs_crm: "CRM vs CRM" };

export default function ConflictsScreen() {
  const cs = firn.conflicts;
  const k = firn.kpis;
  return (
    <Page title="Conflicts" sub="Each conflict names the decision it blocks. An agent never picks a side silently.">
      <Kpis items={[
        ["Conflicts in the map", k.conflicts], ["High severity", k.highConflicts],
        ["Rule violated", firn.conflictMap.filter((c) => c.kind === "rule_violated").reduce((a, c) => a + Number(c.conflicts), 0) || "—"],
        ["Shown here", cs.length],
      ]} />
      <Chips group="sv" label="Severity" values={["3", "2", "1"]} />
      <Chips group="k" label="Kind" values={[...new Set(cs.map((c) => c.kind))]} />
      <Chips group="z" label="Zone" values={[...new Set(cs.map((c) => c.zone))]} />
      <section data-list="conflicts" style={{ display: "grid", gap: 12 }}>
        {cs.map((c) => (
          <div key={c.id} className={"card " + (c.blocking ? "ASK" : "DRAFT")} data-item="" data-f-sv={String(c.severity)} data-f-k={c.kind} data-f-z={c.zone}
            data-text={`${c.claim_a} ${c.claim_b} ${c.decision_dependency}`}>
            <div className="head">
              <strong>{c.id} · {c.kind.replace(/_/g, " ")}</strong>
              <span><span className={"badge " + (c.blocking ? "bad" : "warn")}>severity {c.severity}</span> <span className="badge n">{LAYER[c.layer] || c.layer}</span></span>
            </div>
            <small>{c.zone} / {c.subzone}{c.amount_rub ? <> · <b>{rub(c.amount_rub)}</b></> : null}</small>
            <div><b>Decision it blocks:</b> {c.decision_dependency}</div>
            <div className="sides">
              {[["A", c.claim_a, c.quote_a, c.quote_a_orig], ["B", c.claim_b, c.quote_b, c.quote_b_orig]].map(([s, claim, quote, orig]) => (
                <div key={s} className="side">
                  <small><b>Side {s}</b></small>
                  <strong>{claim}</strong>
                  {quote && <div className="quote">&ldquo;{quote}&rdquo;</div>}
                  {orig && <details className="orig"><summary>Original (RU)</summary><div className="quote orig" lang="ru">{orig}</div></details>}
                </div>
              ))}
            </div>
            <small><b>Why:</b> {c.explanation}</small>
            <div className="actions">
              <Action id={c.id} label="Pick A" close msg="Decision noted: side A is canonical (not yet written to Snowflake)." />
              <Action id={c.id} label="Pick B" close msg="Decision noted: side B is canonical (not yet written to Snowflake)." />
              <Action id={c.id} label="Both true (merge)" close msg="Noted: both hold in different conditions." />
              <Action id={c.id} label="Ask holder" msg="Question queued for the knowledge holder; conflict stays open." />
            </div>
            <Done id={c.id} />
          </div>
        ))}
      </section>
      <Empty list="conflicts" />
    </Page>
  );
}
