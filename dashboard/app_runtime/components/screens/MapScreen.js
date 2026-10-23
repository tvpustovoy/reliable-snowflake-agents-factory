// Purpose: Map screen — what we know about the company and where agents may act.
// Sources: V_COVERAGE + CONFLICTS (per subzone). Mandate rule: lib/firn/logic.js subMandate.
import { firn, HINT, MANDATES, THRESHOLDS } from "../../lib/firn/logic.js";
import { Badge, Chips, Empty, Kpis, Legend, Page } from "../ui.js";

const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");

export default function MapScreen() {
  const k = firn.kpis;
  return (
    <Page title="What we know about the business" sub="Nine zones, 37 subzones. Volume alone does not earn trust: unknowns, hypotheses and serious conflicts do decide.">
      <Legend />
      <Kpis items={[
        ["Proven facts", k.facts.toLocaleString("en")], ["Zones trusted to act", `${k.trustedZones} / ${k.zones}`],
        ["Subzones ACT / ASK", `${k.actSubs} / ${k.askSubs}`], ["Open questions & gaps", k.openSignals.toLocaleString("en")],
      ]} />
      <p className="muted">
        Subzone rule: <b>ASK</b> if open questions per fact &gt; {THRESHOLDS.askUnknownPerFact};
        {" "}<b>DRAFT</b> if hypotheses ≥ {THRESHOLDS.draftHypothesisShare * 100}%, or questions per fact ≥ {THRESHOLDS.draftUnknownPerFact},
        or ≥ {THRESHOLDS.draftHighPer100} high-severity conflicts per 100 facts; else <b>ACT</b>.
      </p>
      <Chips group="m" label="Mandate" values={MANDATES} />
      <Chips group="z" label="Zones" values={firn.zones.map((z) => z.zone)} />
      <section className="grid" data-list="zones">
        {firn.zones.map((z) => (
          <div key={z.zone} className={"card " + z.mandate} data-item="" data-f-m={z.mandate} data-f-z={z.zone}>
            <div className="head"><strong>{z.zone}</strong><Badge m={z.mandate} /></div>
            <small>{HINT[z.mandate]} · {z.facts} facts</small>
            <hr />
            {z.subs.map((s) => (
              <div key={s.name} className="row" title={`hypotheses ${s.hypotheses}, open questions ${s.unknown}, conflicts ${s.conflicts} (${s.high} high)`}>
                <span><Badge m={s.mandate} /> <code>{s.name}</code></span>
                <span className="muted">{s.facts} facts · hyp {pct(s.hypotheses, s.facts)} · ? {(s.unknown / (s.facts || 1)).toFixed(2)}/fact · {s.high} high</span>
              </div>
            ))}
          </div>
        ))}
      </section>
      <Empty list="zones" text="No zones match the filter." />
    </Page>
  );
}
