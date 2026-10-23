// Purpose: Gaps screen — what the map does not know, per zone, and the questions to ask.
// Sources: MODEL.FIELD_SIGNALS (kind gap / question; counts per zone + a sample in the snapshot).
import { firn } from "../../lib/firn/logic.js";
import { Action, Chips, Done, Empty, Kpis, Line, Page } from "../ui.js";

export default function GapsScreen() {
  const counts = {};
  for (const c of firn.signalCounts) (counts[c.zone] ||= {})[c.kind] = Number(c.n);
  const unblocks = (zone) => [...firn.working.filter((a) => !a.test).map((a) => a.display), ...firn.proposed.filter((a) => a.zones.includes(zone)).map((a) => a.name)];
  const ask = firn.subs.filter((s) => s.mandate === "ASK");
  return (
    <Page title="Gaps and questions" sub="Blind spots are shown, never hidden. Answers become the next distillation wave.">
      <Kpis items={[
        ["Open gaps", firn.signalCounts.filter((c) => c.kind === "gap").reduce((a, c) => a + Number(c.n), 0) || "—"],
        ["Open questions", firn.signalCounts.filter((c) => c.kind === "question").reduce((a, c) => a + Number(c.n), 0) || "—"],
        ["ASK subzones", ask.length], ["Shown here", firn.signals.length],
      ]} />
      {ask.length > 0 && <p><b>Subzones where agents must ask:</b> {ask.map((s) => `${s.zone}/${s.name}`).join(" · ")}</p>}
      {Object.keys(counts).length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Zone</th><th>Gaps</th><th>Questions</th></tr></thead>
            <tbody>{Object.entries(counts).map(([z, c]) => <tr key={z}><td>{z}</td><td>{c.gap || 0}</td><td>{c.question || 0}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <h2>Sample to work on</h2>
      <Chips group="k" label="Kind" values={["gap", "question"]} />
      <Chips group="z" label="Zone" values={[...new Set(firn.signals.map((s) => s.zone))]} />
      <section className="grid" data-list="gaps">
        {firn.signals.map((s) => (
          <div key={s.id} className={"card " + (s.kind === "gap" ? "ASK" : "DRAFT")} data-item="" data-f-k={s.kind} data-f-z={s.zone}>
            <div className="head"><strong>{s.kind}</strong><small>{s.zone} / {s.subzone}</small></div>
            <div>{s.text}</div>
            {s.why_matters && <Line k="Why it matters">{s.why_matters}</Line>}
            <Line k="Unblocks">{unblocks(s.zone).join(", ")}</Line>
            <div className="actions"><Action id={s.id} label="Ask founder" close msg="Added to the founder's question list for the next wave (not yet written to Snowflake)." /></div>
            <Done id={s.id} />
          </div>
        ))}
      </section>
      <Empty list="gaps" />
    </Page>
  );
}
