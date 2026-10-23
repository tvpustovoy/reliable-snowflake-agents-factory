"""Render docs/STATUS.md -> docs/STATUS.html (self-contained, sandbox-safe).

Run: python3 docs/status_html.py
Layout mirrors the delivery status page: logo header, hero boxes (level,
next checkpoint, next step, readiness), ladder cards, outcome table with
badges, checkpoints with the next one highlighted, roadmap, agent placement.
"""
import base64, datetime, html, json, pathlib, re

DOCS = pathlib.Path(__file__).parent
LOGO = DOCS.parent / "media" / "firn-logo-header.png"
e = html.escape
BADGE = {"done": ("🟩", "done"), "wip": ("🟨", "in progress"), "todo": ("⬜", "not started"), "blocked": ("🟥", "blocked")}


def sections(md):
    """'## Title' -> list of body lines."""
    out, cur = {}, None
    for line in md.splitlines():
        if line.startswith("## "):
            cur = line[3:].strip(); out[cur] = []
        elif cur:
            out[cur].append(line)
    return out


def find(secs, prefix):
    return next((v for k, v in secs.items() if k.startswith(prefix)), [])


def table(lines):
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in lines
            if l.startswith("|") and not re.match(r"\|\s*:?-", l)]
    return rows[0] if rows else [], rows[1:]


def inline(s):
    s = e(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    return re.sub(r"[🟩🟨⬜🟥]\s*", "", s)


def state(cell):
    return "done" if "🟩" in cell else "wip" if "🟨" in cell else "blocked" if "🟥" in cell else "todo"


def badge(cell):
    s = state(cell); note = inline(cell).strip()
    return f'<span class="st st-{s}">{BADGE[s][0]} {BADGE[s][1]}</span>' + (f' <span class="muted">{note}</span>' if note else "")


def paragraphs(lines):
    out, buf = [], []
    for l in lines + [""]:
        if l.strip() and not l.startswith(("|", "- ")):
            buf.append(inline(l))
        else:
            if buf: out.append("<p>" + "<br>".join(buf) + "</p>"); buf = []
            if l.startswith("- "): out.append(f"<li>{inline(l[2:])}</li>")
    s = "".join(out)
    return re.sub(r"((?:<li>.*?</li>)+)", r"<ul>\1</ul>", s)


def main():
    md = (DOCS / "STATUS.md").read_text()
    secs = sections(md)
    snap = re.search(r"Snapshot: \*\*([^*]+)\*\*", md)
    snap = snap.group(1) if snap else ""
    where = find(secs, "Where we are")
    _, outcomes = table(find(secs, "Outcomes"))
    _, ladder = table(find(secs, "Defense ladder"))
    _, cps = table(find(secs, "Checkpoints"))
    rm_head, roadmap = table(find(secs, "Roadmap"))
    agent = find(secs, "Where the agent lives")
    buildlog = find(secs, "Build log")

    reached = next((r for r in reversed(ladder) if state(r[-1]) == "done"), None)
    snap_t = re.match(r"(\d\d:\d\d)", snap)
    next_cp = next((r for r in cps if snap_t and r[0] > snap_t.group(1)), None)
    next_step = next((r for r in roadmap if state(r[-1]) != "done"), None)
    green = sum(state(r[-1]) == "done" for r in outcomes)

    logo = ""
    if LOGO.exists():
        logo = f'<img class="logo" alt="Firn logo" src="data:image/png;base64,{base64.b64encode(LOGO.read_bytes()).decode()}">'

    hero = f"""<div class="hero" id="where-we-are">
<div class="box {'' if reached else 'bad'}">Defense level<span class="big">{e(reached[0]) if reached else '—'}</span><span class="muted">{inline(reached[2]) if reached else 'nothing to defend yet'}</span></div>
<div class="box alert">Next checkpoint<span class="big">{e(next_cp[0]) if next_cp else '—'}</span><span class="muted">{inline(next_cp[1]) if next_cp else ''}</span></div>
<div class="box">Next build step<span class="big small">{e(next_step[0]) + ' · ' + inline(next_step[2]) if next_step else 'all built'}</span><span class="muted">{inline(next_step[3]) if next_step else ''}</span></div>
<div class="box">Readiness<span class="big">{green}/{len(outcomes)}</span><span class="muted">outcomes done and demoable</span></div>
</div>"""

    steps = "".join(
        f'<div class="step {"ok" if state(r[-1]) == "done" else "wip" if state(r[-1]) == "wip" else ""}">'
        f'<b>{e(r[0])}</b><div>{inline(r[2])}</div><div class="muted">{inline(r[1])} · {inline(r[3]) or BADGE[state(r[3])][1]}</div></div>'
        for r in ladder)
    out_rows = "".join(f"<tr><td><b>{e(r[0])}</b></td><td>{inline(r[1])}</td><td>{inline(r[2])}</td><td>{inline(r[3])}</td><td>{badge(r[4])}</td></tr>" for r in outcomes)
    cp_rows = "".join(f'<tr class="{"next" if r is next_cp else ""}"><td><b>{e(r[0])}</b></td><td>{inline(r[1])}</td></tr>' for r in cps)
    rm_rows = "".join(f'<tr class="{"next" if r is next_step else ""}"><td><b>{e(r[0])}</b></td><td>{inline(r[1])}</td><td>{inline(r[2])}</td><td>{inline(r[3])}</td><td>{badge(r[4])}</td></tr>' for r in roadmap)

    meta = {
        "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "intent": "Firn hackathon build status for judges (EN copy of the delivery roadmap and outcomes)",
        "dataSources": [{"type": "file", "path": "docs/STATUS.md"},
                        {"type": "query", "sql": "SELECT * FROM RECPLACE.MODEL.V_MONEY_AT_STAKE"}],
        "sections": [{"id": i, "title": t, "producerNotes": "Rendered from docs/STATUS.md by docs/status_html.py"}
                     for i, t in (("where-we-are", "Where we are"), ("ladder", "Defense ladder"), ("outcomes", "Outcomes"),
                                  ("checkpoints", "Checkpoints"), ("roadmap", "Roadmap"), ("agent", "Where the agent lives"))],
    }

    page = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="snowflake-source" content="cortex-agent-authored"><title>Firn — build status</title>
<script type="application/json" id="snowflake-report-metadata">{json.dumps(meta)}</script>
<style>
:root{{color-scheme:light dark;--b:light-dark(#e5e7eb,#334155);--bg2:light-dark(#f8fafc,#0f172a);--mut:light-dark(#64748b,#94a3b8);
--ok:#16a34a;--wip:#eab308;--todo:#94a3b8;--bad:#dc2626}}
*{{box-sizing:border-box}} body{{font-family:-apple-system,system-ui,sans-serif;margin:0 auto;max-width:1280px;padding:clamp(14px,3vw,28px);color:light-dark(#1e293b,#e2e8f0);background:light-dark(#fff,#020617)}}
header{{display:flex;align-items:center;gap:18px;flex-wrap:wrap}} .logo{{height:72px;width:auto;max-width:100%}}
h1{{margin:0 0 4px}} h2{{margin:32px 0 10px;font-size:1.25em}} .muted{{color:var(--mut);font-size:.85em}} a{{color:inherit}}
.tag{{font-style:italic;color:var(--mut)}}
.now{{margin-top:16px;border:1px solid var(--wip);border-left:5px solid var(--wip);border-radius:12px;padding:10px 16px;background:var(--bg2)}} .now p{{margin:6px 0;line-height:1.5}}
.hero{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px}}
.box{{border:1px solid var(--b);border-radius:14px;padding:14px 16px;background:var(--bg2)}} .box .big{{font-size:1.9em;font-weight:700;display:block;margin:2px 0}}
.box .big.small{{font-size:1.05em}} .box.alert{{border-color:var(--wip)}} .box.bad{{border-color:var(--bad)}}
.ladder{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}}
.step{{border:2px solid var(--b);border-radius:12px;padding:12px}} .step b{{font-size:1.3em}}
.step.ok{{border-color:var(--ok);background:light-dark(#f0fdf4,#052e16)}} .step.wip{{border-color:var(--wip)}}
.st{{font-size:.75em;padding:1px 7px;border-radius:999px;background:light-dark(#f1f5f9,#1e293b);white-space:nowrap}}
.tw{{overflow-x:auto}} table{{border-collapse:collapse;width:100%;font-size:.9em}}
th,td{{border-bottom:1px solid var(--b);padding:8px;text-align:left;vertical-align:top}} th{{color:var(--mut);font-weight:600}}
tr.next td{{background:light-dark(#fef9c3,#422006)}}
code{{background:light-dark(#e2e8f0,#1e293b);padding:0 4px;border-radius:4px;font-size:.9em}}
.card{{border:1px solid var(--b);border-radius:14px;padding:6px 18px;background:var(--bg2)}} .card li{{margin:6px 0;line-height:1.5}}
footer{{margin-top:36px}}
</style></head><body>
<header>{logo}<div><h1>Firn — where we are now</h1>
<div class="tag">Know what you know. Act anyway.</div>
<div class="muted">Snapshot {e(snap)} · submission 16:30 PT · Anthropic × Snowflake hackathon, 23 Oct 2026 · aggregates only, no customer texts</div></div></header>

<div class="now">{paragraphs(where)}</div>
{hero}

<h2 id="ladder">Defense ladder — what we can defend right now</h2>
<div class="ladder">{steps}</div>

<h2 id="outcomes">Outcomes for judges (O1–O8)</h2>
<div class="tw"><table><thead><tr><th>#</th><th>What judges should take away</th><th>Evidence</th><th>Snowflake objects</th><th>Status</th></tr></thead><tbody>{out_rows}</tbody></table></div>

<h2 id="checkpoints">Checkpoints (PT)</h2>
<div class="tw"><table><tbody>{cp_rows}</tbody></table></div>

<h2 id="roadmap">Roadmap</h2>
<div class="tw"><table><thead><tr>{''.join(f'<th>{inline(h)}</th>' for h in rm_head)}</tr></thead><tbody>{rm_rows}</tbody></table></div>

<h2 id="agent">Where the agent lives</h2>
<div class="card">{paragraphs(agent)}</div>

<footer class="muted">{paragraphs(buildlog)}Rendered from <code>docs/STATUS.md</code> by <code>docs/status_html.py</code>.</footer>
</body></html>"""
    (DOCS / "STATUS.html").write_text(page)
    print("wrote", DOCS / "STATUS.html", f"· level={reached[0] if reached else '—'} · next cp={next_cp[0] if next_cp else '—'}")


if __name__ == "__main__":
    main()
