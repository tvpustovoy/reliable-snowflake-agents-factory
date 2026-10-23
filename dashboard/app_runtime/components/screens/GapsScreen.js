// Purpose: Gaps screen — what the map does not know and which questions to ask the founder.
// Priority = how many agents an answer unblocks.
import { firn } from "../../lib/firn/logic.js";
import { Action, Chips, Done, Empty, Kpis, Line, Page } from "../ui.js";

export default function GapsScreen() {
  const items = [...firn.signals].sort((a, b) =>
    (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.unblocks.length - a.unblocks.length);
  const blind = firn.zones.flatMap((z) => z.subs.filter((s) => s.mandate === "ASK").map((s) => `${z.zone} / ${s.name}`));
  return (
    <Page title="Gaps and questions" sub="Blind spots are shown, never hidden. Answers become the next distillation wave.">
      <Kpis items={[
        ["Blind subzones", blind.length],
        ["Open gaps", items.filter((s) => s.kind === "gap" && s.status === "open").length],
        ["Open questions", items.filter((s) => s.kind === "question" && s.status === "open").length],
      ]} />
      <Chips group="k" label="Kind" values={["gap", "question"]} />
      <Chips group="st" label="Status" values={["open", "answered"]} />
      <section className="grid" data-list="gaps">
        {items.map((s) => (
          <div key={s.id} className={"card " + (s.status === "open" ? (s.kind === "gap" ? "ASK" : "DRAFT") : "")} data-item=""
            data-f-k={s.kind} data-f-st={s.status}>
            <div className="head"><strong>{s.id} · {s.kind}</strong><span className="badge n">{s.status}</span></div>
            <div>{s.text}</div>
            <Line k="Where">{s.zone} / {s.subzone}</Line>
            <Line k="Why it matters">{s.why_matters}</Line>
            <Line k="Unblocks">{s.unblocks.join(", ")}</Line>
            {s.status === "open" && (
              <>
                <div className="actions">
                  <Action id={s.id} label="Ask founder" close msg="Added to the founder's question list for the next wave." />
                </div>
                <Done id={s.id} />
              </>
            )}
          </div>
        ))}
      </section>
      <Empty list="gaps" />
      <h2>All blind subzones</h2>
      <p className="muted">{blind.join(" · ")}</p>
    </Page>
  );
}
