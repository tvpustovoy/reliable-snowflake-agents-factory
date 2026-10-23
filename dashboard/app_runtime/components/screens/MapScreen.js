// Purpose: Map screen — what we know about the company and where agents may act.
import { firn, HINT, MANDATES } from "../../lib/firn/logic.js";
import { Badge, Chips, Empty, Kpis, Legend, Page } from "../ui.js";

export default function MapScreen() {
  const k = firn.kpis;
  const rec = firn.agents[0];
  return (
    <Page title="What we know about the business" sub={`${firn.company} · map ${firn.version} · synthetic data`}>
      <Legend />
      <Kpis items={[
        ["Facts", k.facts], ["Zones trusted to act", `${k.trustedZones} / ${k.zones}`],
        ["Blind subzones", k.blind], ["Open conflicts", k.conflictsOpen],
      ]} />
      <div className={"card " + rec.mandate}>
        <span className="rec">RECOMMENDED AGENT</span>
        <div className="head"><strong>{rec.name}</strong><Badge m={rec.mandate} /></div>
        <div>{rec.mission}. {HINT[rec.mandate]}. Zones: {rec.zones.join(", ")}.</div>
        <small><a href="/agents">Open the agent factory</a></small>
      </div>

      <h2 id="map">Coverage map</h2>
      <Chips group="m" label="Mandate" values={MANDATES} />
      <Chips group="z" label="Zones" values={firn.zoneNames} />
      <section className="grid" data-list="zones">
        {firn.zones.map((z) => (
          <div key={z.zone} className={"card " + z.mandate} data-item="" data-f-m={z.mandate} data-f-z={z.zone}>
            <div className="head"><strong>{z.zone}</strong><Badge m={z.mandate} /></div>
            <small>{HINT[z.mandate]}</small>
            <hr />
            {z.subs.map((s) => (
              <div key={s.name} className="row">
                <span><Badge m={s.mandate} /> <code>{s.name}</code></span>
                <span className="muted">{s.facts} facts · {s.carriers} carriers · {s.conflicts} conflicts</span>
              </div>
            ))}
          </div>
        ))}
      </section>
      <Empty list="zones" text="No zones match the filter." />
    </Page>
  );
}
