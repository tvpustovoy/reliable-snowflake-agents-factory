// Purpose: stateless UI kit + page shell shared by app routes and the agent HTML generator.
// No hooks, no event props: interactivity comes from data-* attributes (lib/firn/interact.js).
import { HINT, MANDATES } from "../lib/firn/logic.js";
import { LOGO } from "../lib/firn/logo.js";

export const SCREENS = [
  ["map", "/", "Map"],
  ["conflicts", "/conflicts", "Conflicts"],
  ["facts", "/facts", "Facts"],
  ["agents", "/agents", "Agents"],
  ["gaps", "/gaps", "Gaps"],
  ["evolution", "/evolution", "Evolution"],
  ["values", "/values", "Master values"],
  ["culture", "/culture", "Culture"],
];

export function Nav({ active }) {
  return (
    <nav className="nav">
      <a href="/" className="brand"><img src={LOGO} alt="Firn" /></a>
      {SCREENS.map(([id, href, label]) => (
        <a key={id} href={href} className={id === active ? "on" : ""}>{label}</a>
      ))}
    </nav>
  );
}

// Brand bar for standalone agent HTML, where the tab nav is not rendered
export const BrandBar = ({ label }) => (
  <header className="nav"><span className="brand"><img src={LOGO} alt="Firn" /></span><span className="muted">{label}</span></header>
);

export function Page({ title, sub, children }) {
  return (
    <main data-firn-root="">
      <h1>{title}</h1>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </main>
  );
}

export const Badge = ({ m, kind }) => <span className={"badge " + (kind || m)}>{m}</span>;

export function Legend() {
  return (
    <div className="legend">
      {MANDATES.map((m) => <span key={m}><Badge m={m} /> {HINT[m].toLowerCase()}</span>)}
    </div>
  );
}

export function Kpis({ items }) {
  return (
    <section className="kpis">
      {items.map(([label, value]) => (
        <div key={label} className="card kpi"><div className="label">{label}</div><div className="value">{value}</div></div>
      ))}
    </section>
  );
}

// Filter chips for one group; items carry data-f-<group>="v1 v2"
export function Chips({ group, label, values, off = [] }) {
  return (
    <div className="filters">
      <b>{label}</b>
      {values.map((v) => (
        <button key={v} type="button" className={"chip" + (off.includes(v) ? "" : " on")} data-fg={group} data-fv={v}>{v}</button>
      ))}
    </div>
  );
}

export const Line = ({ k, children }) => <small><b>{k}:</b> {children}</small>;

export function Empty({ list, text = "Nothing matches the filter." }) {
  return <p className="muted" data-empty-for={list} hidden>{text}</p>;
}

// Action button with an inline confirmation slot
export function Action({ id, label, msg, cls = "", close }) {
  return <button type="button" className={"btn " + cls} data-act={id} data-msg={msg} data-close={close ? "1" : undefined}>{label}</button>;
}
export const Done = ({ id }) => <div className="done-msg" data-done={id} hidden />;

export function Quote({ fact }) {
  return (
    <>
      <div className="quote">&ldquo;{fact.quote}&rdquo;</div>
      <small>{fact.speaker_role} · {fact.source.type} <code>{fact.source.ref}</code> · {fact.source.date}
        {fact.verified && <> · <span className="badge ok">quote verified</span></>}</small>
    </>
  );
}
