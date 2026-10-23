// Purpose: Culture screen — where codified, declared, said and done disagree (cultural tensions).
// Rules (research/08): owner voice counted separately; two non-owner carriers for "candidate";
// a tension is the main product; codex articles become binding only when ratified.
import { firn, LAYER_HINT, LAYERS } from "../../lib/firn/logic.js";
import { Action, Chips, Done, Empty, Kpis, Line, Page } from "../ui.js";

const LEG = ["observed", "candidate", "disputed", "ratified"];
const LEG_CLS = { observed: "n", candidate: "warn", disputed: "bad", ratified: "ok" };

// Cell class: layer present and the norm has a tension -> "differ" for layers that break it
function cellCls(t, layer) {
  const cell = t.layers[layer];
  if (!cell) return "none";
  if (!t.tension) return "agree";
  return layer === "manifested" || layer === "practiced" || layer === "latent" ? "differ" : "agree";
}

export default function CultureScreen() {
  const ts = firn.culture;
  return (
    <Page title="Culture" sub="Not norms but evidence. The main signal is a tension: a norm that layers disagree on.">
      <Kpis items={[
        ["Norms tracked", ts.length],
        ["Tensions", ts.filter((t) => t.tension).length],
        ["Codex ratified", firn.codex.filter((k) => k.status === "ratified").length],
        ["Codex proposed", firn.codex.filter((k) => k.status === "proposed").length],
      ]} />

      <h2>Norms × layers</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Norm</th>{LAYERS.map((l) => <th key={l}>{l}<br /><small className="muted">{LAYER_HINT[l]}</small></th>)}<th>Legitimacy</th></tr>
          </thead>
          <tbody>
            {ts.map((t) => (
              <tr key={t.id}>
                <td><b>{t.id}</b> {t.norm}</td>
                {LAYERS.map((l) => <td key={l} className={cellCls(t, l)}>{t.layers[l]?.value || "—"}</td>)}
                <td><span className={"badge " + LEG_CLS[t.legitimacy]}>{t.legitimacy}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Green: layer agrees with the norm. Red: layer contradicts it. Owner-only statements stay in “declared”.</p>

      <h2>Tensions</h2>
      <Chips group="l" label="Legitimacy" values={LEG} />
      <Chips group="z" label="Zone" values={[...new Set(ts.map((t) => t.zone))]} />
      <section className="grid" data-list="tensions">
        {ts.map((t) => {
          const k = t.codex && firn.codexById[t.codex];
          return (
            <div key={t.id} className={"card " + (t.tension ? "ASK" : "ACT")} data-item="" data-f-l={t.legitimacy} data-f-z={t.zone}>
              <div className="head"><strong>{t.id} · {t.norm}</strong><span className={"badge " + LEG_CLS[t.legitimacy]}>{t.legitimacy}</span></div>
              <small>{t.zone}</small>
              {t.tension ? <div><b>Tension:</b> {t.tension}</div> : <div>All layers agree.</div>}
              <hr />
              {LAYERS.filter((l) => t.layers[l]).map((l) => (
                <Line key={l} k={l}>{t.layers[l].value} <code>{t.layers[l].source}</code> · {t.layers[l].carriers} carrier(s)</Line>
              ))}
              <hr />
              {k ? (
                <small><b>Codex {k.id}</b> <span className={"badge " + (k.kind === "hard" ? "bad" : "n")}>{k.kind}</span> {k.text} <span className="badge n">{k.status}</span></small>
              ) : (
                <>
                  <div className="actions">
                    <Action id={t.id} label="Propose codex article" msg="Codex article proposed (policy_proposal). It binds agents only after the owner ratifies it." />
                  </div>
                  <Done id={t.id} />
                </>
              )}
              {k && k.status === "proposed" && (
                <>
                  <div className="actions">
                    <Action id={t.id} cls="ACT" label="Ratify" close msg={`${k.id} ratified: added to the rules of every agent that uses it.`} />
                  </div>
                  <Done id={t.id} />
                </>
              )}
            </div>
          );
        })}
      </section>
      <Empty list="tensions" />
    </Page>
  );
}
