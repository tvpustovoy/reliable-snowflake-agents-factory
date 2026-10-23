"""Firn: business coverage map (Streamlit in Snowflake variant).

Purpose: zone mandates ACT/DRAFT/ASK, filters, agent proposals with create buttons.
Inputs: synthetic FAKE table below (zones mirror distill/BUSINESS_MODEL.md).
Outputs: Streamlit app. Run: `streamlit run streamlit_app.py` or `snow streamlit deploy`.
"""
import pandas as pd
import streamlit as st

# Fake coverage, identical in app_runtime/app/page.js: zone -> (subzone, facts, carriers, conflicts)
FAKE = {
    "clients_sales": [("qualification", 18, 4, 1), ("objections", 22, 3, 2), ("closing", 15, 3, 1),
                      ("loss_reasons", 9, 2, 1), ("retention_churn", 7, 2, 1), ("upsell", 6, 2, 0)],
    "founder_rules": [("principles", 8, 2, 0), ("sales_rules", 14, 3, 1), ("decision_rights", 6, 2, 1)],
    "product": [("value_prop", 12, 3, 1), ("features", 20, 2, 1), ("limits_bugs", 9, 3, 3),
                ("client_onboarding", 6, 2, 1), ("roadmap", 3, 1, 0)],
    "money_pricing": [("tariffs", 11, 3, 4), ("discounts_terms", 7, 2, 3), ("payments", 4, 1, 0),
                      ("revenue", 0, 0, 0), ("costs", 2, 1, 0)],
    "team_people": [("roles_ownership", 6, 2, 1), ("hiring_leaving", 3, 1, 0), ("staff_training", 10, 2, 1),
                    ("performance", 2, 1, 1), ("workload", 0, 0, 0)],
    "operations": [("processes", 9, 3, 1), ("tools_crm", 5, 2, 2), ("support_sla", 4, 2, 0)],
    "strategy": [("goals_priorities", 5, 1, 1), ("segments_niches", 8, 3, 1), ("competitors", 3, 2, 1),
                 ("partners", 0, 0, 0)],
    "marketing": [("positioning", 4, 2, 1), ("channels", 0, 0, 0), ("campaigns_content", 0, 0, 0),
                  ("brand_reputation", 2, 1, 0), ("funnel_metrics", 0, 0, 0)],
    "other": [("other", 3, 2, 0)],
}
ZONES = list(FAKE)

# Agent missions compiled from slices of the map: (name, mission, required zones)
AGENTS = [
    ("Chief of Staff", "Founder's deputy across all zones", ZONES[:-1]),
    ("Sales Closer", "Push stalled deals to close", ["clients_sales", "founder_rules", "product"]),
    ("Sales Onboarding Coach", "Train new salespeople the house way", ["team_people", "founder_rules", "operations"]),
    ("Retention Guard", "Spot sleeping clients and win them back", ["clients_sales", "product", "operations"]),
    ("Pricing Advisor", "Recommend tariffs and discounts", ["money_pricing", "strategy"]),
    ("Marketing Analyst", "Find channels that bring paying clients", ["marketing", "strategy"]),
]

RANK = {"ACT": 2, "DRAFT": 1, "ASK": 0}
STYLE = {
    "ACT": ("#2e9d5b", "#e8f6ee", "Agent may act"),
    "DRAFT": ("#c98a0b", "#fdf4e1", "Agent drafts, founder approves"),
    "ASK": ("#d64545", "#fdeaea", "Agent must ask, data is missing"),
}
# Create button per mandate: (label, button type, message after creation)
CREATE = {
    "ACT": ("Create agent", "primary", "Compiled with ACT mandate: acts on its own within its zones."),
    "DRAFT": ("Create with approvals", "secondary", "Compiled with DRAFT mandate: every action goes to the founder for approval."),
    "ASK": ("Create anyway", "secondary", "Compiled with ASK mandate: knowledge is thin, the agent will ask before acting."),
}


def subzone_mandate(facts: int, carriers: int, conflicts: int) -> str:
    # Coverage rule: covered >=5 facts from >=2 carriers; blind 0 -> ASK; conflicts force DRAFT
    if facts == 0:
        return "ASK"
    if facts >= 5 and carriers >= 2 and conflicts / facts < 0.2:
        return "ACT"
    return "DRAFT"


def zone_mandate(g: pd.DataFrame) -> str:
    act, ask = (g.mandate == "ACT").mean(), (g.mandate == "ASK").mean()
    if act >= 0.6 and ask == 0:
        return "ACT"
    return "ASK" if ask >= 0.5 else "DRAFT"


@st.cache_data
def fake_coverage() -> pd.DataFrame:
    rows = [dict(zone=z, subzone=s, facts=f, carriers=c, conflicts=k, mandate=subzone_mandate(f, c, k))
            for z, subs in FAKE.items() for s, f, c, k in subs]
    return pd.DataFrame(rows)


def badge(m: str) -> str:
    fg, bg, _ = STYLE[m]
    return (f"<span style='background:{bg};color:{fg};border:1px solid {fg};border-radius:10px;"
            f"padding:1px 8px;font-size:12px;font-weight:600'>{m}</span>")


st.set_page_config(page_title="Firn: Business Map", layout="wide")
st.title("Firn: what we know about the business")
st.caption("Fake data · zones from BUSINESS_MODEL.md · mandate ACT / DRAFT / ASK")

df = fake_coverage()
zm = {z: zone_mandate(g) for z, g in df.groupby("zone", sort=False)}

# Agent proposals: agent mandate = weakest mandate among its zones
st.subheader("Agents we can compile now")


def agent_rank(a):
    # Strongest mandate first, then the agent with more trusted zones
    zones = a[2]
    return (-min(RANK[zm[z]] for z in zones), -sum(zm[z] == "ACT" for z in zones) / len(zones))


created = st.session_state.setdefault("created", {})
acols = st.columns(3)
for i, (name, mission, zones) in enumerate(sorted(AGENTS, key=agent_rank)):
    m = min((zm[z] for z in zones), key=RANK.get)
    fg, bg, hint = STYLE[m]
    weak = [z for z in zones if zm[z] != "ACT"]
    gaps = df[df.zone.isin(zones) & (df.mandate == "ASK")].subzone.tolist()
    star = "<span style='background:#2e9d5b;color:#fff;border-radius:4px;padding:1px 6px;font-size:11px'>RECOMMENDED</span> " if i == 0 else ""
    col = acols[i % 3]
    col.markdown(
        f"<div style='border-left:5px solid {fg};background:{bg};border-radius:8px;padding:12px;margin-bottom:6px'>"
        f"{star}<b>{name}</b> {badge(m)}<br><span style='color:#555'>{mission}</span><br>"
        f"<small>{hint}</small><br>"
        f"<small><b>Zones:</b> {', '.join(zones) if len(zones) < 5 else 'all'}</small><br>"
        f"<small><b>Holds back:</b> {', '.join(weak) or 'nothing'}</small><br>"
        f"<small><b>Fill next:</b> {', '.join(gaps[:4]) or 'no blind spots'}</small></div>",
        unsafe_allow_html=True)
    label, kind, msg = CREATE[m]
    if col.button(("⚠ " if m == "ASK" else "") + label, key=f"create_{name}", type=kind, use_container_width=True):
        created[name] = m
    if name in created:
        (col.success if m == "ACT" else col.info if m == "DRAFT" else col.warning)(f"{name}: {msg}")
    col.write("")

c1, c2, c3, c4 = st.columns(4)
c1.metric("Facts", int(df.facts.sum()))
c2.metric("Zones trusted to act", f"{sum(m == 'ACT' for m in zm.values())} / {len(zm)}")
c3.metric("Blind subzones", int((df.mandate == "ASK").sum()))
c4.metric("Conflicts", int(df.conflicts.sum()))

f1, f2 = st.columns([2, 3])
pick = f1.multiselect("Zone mandate", list(STYLE), default=list(STYLE))
zones_pick = f2.multiselect("Zones", ZONES, default=ZONES)

st.subheader("Coverage map")
cols = st.columns(3)
shown = [z for z in ZONES if zm[z] in pick and z in zones_pick]
for i, zone in enumerate(shown):
    g = df[df.zone == zone]
    fg, bg, hint = STYLE[zm[zone]]
    rows = "".join(
        f"<div style='display:flex;justify-content:space-between;font-size:14px;padding:2px 0'>"
        f"<span>{badge(r.mandate)} <code>{r.subzone}</code></span>"
        f"<span style='color:#777'>{r.facts} facts · {r.conflicts} conflicts</span></div>"
        for r in g.itertuples())
    cols[i % 3].markdown(
        f"<div style='border:2px solid {fg};background:{bg};border-radius:10px;padding:12px;margin-bottom:12px'>"
        f"<div style='display:flex;justify-content:space-between'><b>{zone}</b>{badge(zm[zone])}</div>"
        f"<small style='color:#666'>{hint}</small><hr style='margin:6px 0'>{rows}</div>",
        unsafe_allow_html=True)
if not shown:
    st.info("No zones match the filter.")

st.subheader("Facts by zone")
st.bar_chart(df[df.zone.isin(shown)].groupby("zone", sort=False)[["facts", "conflicts"]].sum())

with st.expander("Raw table"):
    st.dataframe(df, use_container_width=True, hide_index=True)
