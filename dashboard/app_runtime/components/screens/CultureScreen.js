// Purpose: Culture screen — company rules by layer (documented / founder / practice) and where practice breaks them.
// Sources: MODEL.V_NORMS (authority L1_document / L2_founder / L3_practice, violations). Culture as narratives
// and tensions between layers is not extracted yet — this is the rules layer only (see report).
import { firn, LAYERS } from "../../lib/firn/logic.js";
import { Action, Chips, Done, Empty, Kpis, Page } from "../ui.js";

const AUTH_LAYER = Object.fromEntries(LAYERS.map(([l, a]) => [a, l]));

export default function CultureScreen() {
  const st = Object.fromEntries(firn.normStats.map((s) => [s.authority, s]));
  return (
    <Page title="Culture" sub="How things are done here: what is written, what the founder says, what the team practices — and where they disagree.">
      <Kpis items={LAYERS.map(([l, a]) => [`${l} rules`, st[a] ? `${st[a].n} (${st[a].violated} broken)` : "—"])} />

      <h2>Rules by zone and layer</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Zone</th>{LAYERS.map(([l, , hint]) => <th key={l}>{l}<br /><small className="muted">{hint}</small></th>)}<th>Broken in practice</th></tr></thead>
          <tbody>
            {firn.culture.map((c) => (
              <tr key={c.zone}><td>{c.zone}</td>{LAYERS.map(([l]) => <td key={l}>{c.byLayer[l] || "—"}</td>)}
                <td className={c.violated ? "differ" : "agree"}>{c.violated}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Counts are for the rules kept in the snapshot (top per zone). Full totals are in the KPI row.</p>

      <h2>Tensions: rules broken in practice</h2>
      <Chips group="l" label="Layer" values={LAYERS.map(([l]) => l)} />
      <Chips group="z" label="Zone" values={[...new Set(firn.tensions.map((t) => t.zone))]} />
      <section className="grid" data-list="tensions">
        {firn.tensions.map((t) => (
          <div key={t.id} className="card ASK" data-item="" data-f-l={AUTH_LAYER[t.authority]} data-f-z={t.zone}>
            <div className="head"><strong>{t.norm}</strong><span className="badge bad">{t.violations} violation(s)</span></div>
            <small>{t.zone} / {t.subzone} · {AUTH_LAYER[t.authority]} ({t.authority}) · {t.fact_day}</small>
            {t.quote && <div className="quote">&ldquo;{t.quote}&rdquo;</div>}
            {t.quote_orig && <details className="orig"><summary>Original (RU)</summary><div className="quote orig" lang="ru">{t.quote_orig}</div></details>}
            <div className="actions">
              <Action id={t.id} label="Propose codex article" msg="Codex article proposed. It binds agents only after the founder ratifies it (not yet written to Snowflake)." />
            </div>
            <Done id={t.id} />
          </div>
        ))}
      </section>
      <Empty list="tensions" />
    </Page>
  );
}
