// Purpose: Agents screen — which agents can be compiled from the map, with which mandate and rules.
// Agent mandate = weakest zone mandate among its zones. Rules = ratified codex articles.
import { CREATE, firn, HINT, MANDATES } from "../../lib/firn/logic.js";
import { Action, Badge, Chips, Done, Empty, Line, Page } from "../ui.js";

export default function AgentsScreen() {
  return (
    <Page title="Agent factory" sub="One map, many agents. Each agent gets the mandate its weakest zone allows.">
      <Chips group="m" label="Mandate" values={MANDATES} />
      <section className="grid" data-list="agents">
        {firn.agents.map((a, i) => {
          const c = CREATE[a.mandate];
          const key = "agent-" + i;
          return (
            <div key={a.name} className={"card " + a.mandate} data-item="" data-f-m={a.mandate}>
              {i === 0 && <span className="rec">RECOMMENDED</span>}
              <div className="head"><strong>{a.name}</strong><Badge m={a.mandate} /></div>
              <div>{a.mission}</div>
              <small>{HINT[a.mandate]}</small>
              <Line k="Zones">{a.all ? "all" : a.zones.join(", ")}</Line>
              <Line k="Holds back">{a.weak.join(", ") || "nothing"}</Line>
              <Line k="Fill next">{a.gaps.slice(0, 4).join(", ") || "no blind spots"}</Line>
              <Line k="Open conflicts">{a.conflicts.join(", ") || "none"}</Line>
              <hr />
              <small><b>Rules (codex):</b></small>
              {a.rules.map((k) => (
                <small key={k.id}><span className={"badge " + (k.kind === "hard" ? "bad" : "n")}>{k.kind}</span>{" "}
                  {k.id} {k.text}{k.status !== "ratified" && <> <span className="badge warn">{k.status}</span></>}</small>
              ))}
              <div className="actions">
                <Action id={key} cls={a.mandate} label={c.label} msg={`${a.name}: ${c.msg}`} />
              </div>
              <Done id={key} />
            </div>
          );
        })}
      </section>
      <Empty list="agents" />
    </Page>
  );
}
