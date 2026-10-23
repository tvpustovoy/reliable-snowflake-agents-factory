// Purpose: Conflicts screen — same thing said differently; resolve it or decide it does not matter.
// Robust = the agent's action is the same whichever side is true, so it may act anyway.
import { firn } from "../../lib/firn/logic.js";
import { Action, Badge, Chips, Done, Empty, Kpis, Page, Quote } from "../ui.js";

export default function ConflictsScreen() {
  const cs = firn.conflicts;
  return (
    <Page title="Conflicts" sub="Where the company says the same thing in different ways. Agents act only when the decision is robust.">
      <Kpis items={[
        ["Open", cs.filter((c) => c.status === "open").length],
        ["Blocking (not robust)", cs.filter((c) => c.status === "open" && !c.robust).length],
        ["Resolved", cs.filter((c) => c.status !== "open").length],
      ]} />
      <Chips group="st" label="Status" values={["open", "resolved"]} />
      <Chips group="r" label="Decision" values={["blocking", "robust"]} />
      <section data-list="conflicts" style={{ display: "grid", gap: 12 }}>
        {cs.map((c) => (
          <div key={c.id} className={"card " + (c.status !== "open" ? "" : c.robust ? "DRAFT" : "ASK")} data-item=""
            data-f-st={c.status === "open" ? "open" : "resolved"} data-f-r={c.robust ? "robust" : "blocking"}>
            <div className="head">
              <strong>{c.id} · {c.topic}</strong>
              <span>
                <span className={"badge " + (c.robust ? "ok" : "bad")}>{c.robust ? "robust" : "blocking"}</span>{" "}
                <span className="badge n">{c.status === "open" ? "open" : "resolved: " + c.resolution}</span>
              </span>
            </div>
            <small>{c.zone} / {c.subzone} · affects {c.affects.join(", ")}</small>
            <small><b>Why it matters:</b> {c.why}</small>
            <div className="sides">
              {c.sideFacts.map((f, i) => (
                <div key={f.id} className="side">
                  <small><b>Side {"AB"[i]}</b> · <a href={"/facts#" + f.id}>{f.id}</a></small>
                  <strong>{f.claim}</strong>
                  <Quote fact={f} />
                </div>
              ))}
            </div>
            {c.status === "open" && (
              <>
                <div className="actions">
                  <Action id={c.id} label="Pick A" close msg={`Decision logged: side A (${c.sides[0]}) is canonical for ${c.topic}.`} />
                  <Action id={c.id} label="Pick B" close msg={`Decision logged: side B (${c.sides[1]}) is canonical for ${c.topic}.`} />
                  <Action id={c.id} label="Merge" close msg="Decision logged: both true in different conditions; merged into one fact." />
                  <Action id={c.id} label="Ask holder" msg="Question sent to the knowledge holder; conflict stays open." />
                </div>
                <Done id={c.id} />
              </>
            )}
          </div>
        ))}
      </section>
      <Empty list="conflicts" />
    </Page>
  );
}
