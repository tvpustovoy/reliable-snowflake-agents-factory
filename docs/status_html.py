"""Render docs/STATUS.md -> docs/STATUS.html (self-contained, sandbox-safe).

Run: python3 docs/status_html.py
Supports the subset of Markdown used in STATUS.md: headings, paragraphs,
bullet lists, pipe tables, **bold**, `code`, [links](url).
"""
import datetime, html, json, pathlib, re

DOCS = pathlib.Path(__file__).parent
STATUS_MARK = {"🟩": "done", "🟨": "wip", "⬜": "todo", "🟥": "blocked"}


def inline(text):
    out = html.escape(text, quote=False)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                 lambda m: f'<a href="{m.group(2).replace(".md", ".html") if m.group(2).endswith("STATUS.md") else m.group(2)}">{m.group(1)}</a>', out)
    for mark, cls in STATUS_MARK.items():
        out = out.replace(mark, f'<span class="dot {cls}" aria-label="{cls}"></span>')
    return out


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def render(md):
    lines, body, i, sections = md.splitlines(), [], 0, []
    while i < len(lines):
        line = lines[i]
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, data = rows[0], [r for r in rows[1:] if not set("".join(r)) <= set("-: ")]
            body.append('<div class="table-wrap"><table><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in head)
                        + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in data)
                        + "</tbody></table></div>")
            continue
        if line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:])}</li>"); i += 1
            body.append("<ul>" + "".join(items) + "</ul>")
            continue
        m = re.match(r"(#{1,3}) (.*)", line)
        if m:
            level, title = len(m.group(1)), m.group(2)
            sid = slug(title)
            if level == 2:
                sections.append({"id": sid, "title": title})
            body.append(f'<h{level} id="{sid}">{inline(title)}</h{level}>')
        elif line.strip():
            para = [line]
            while i + 1 < len(lines) and lines[i + 1].strip() and not re.match(r"(#|\||- )", lines[i + 1]):
                i += 1; para.append(lines[i])
            body.append("<p>" + "<br>".join(inline(p) for p in para) + "</p>")
        i += 1
    return "\n".join(body), sections


def main():
    md = (DOCS / "STATUS.md").read_text()
    body, sections = render(md)
    meta = {
        "generated": datetime.date.today().isoformat(),
        "intent": "Firn hackathon build status for judges (EN copy of the delivery roadmap and outcomes)",
        "dataSources": [{"type": "file", "path": "docs/STATUS.md"},
                        {"type": "query", "sql": "SELECT * FROM RECPLACE.MODEL.V_MONEY_AT_STAKE"}],
        "sections": [dict(s, producerNotes="Rendered from docs/STATUS.md; edit the .md and re-run docs/status_html.py.") for s in sections],
    }
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="snowflake-source" content="cortex-agent-authored">
<title>Firn — build status</title>
<script type="application/json" id="snowflake-report-metadata">
{json.dumps(meta, ensure_ascii=False, indent=2)}
</script>
<style>
:root {{ color-scheme: light dark; --ice: light-dark(#0b6bcb, #6cb6ff); }}
body {{ font-family: -apple-system, system-ui, "Segoe UI", sans-serif; line-height: 1.5;
  max-width: 1040px; width: 100%; box-sizing: border-box; margin: 0 auto;
  padding: clamp(16px, 4vw, 32px); color: light-dark(#1f2937, #e5e7eb);
  background: light-dark(#ffffff, #0f141a); }}
h1 {{ font-size: clamp(26px, 5vw, 36px); margin: 0 0 4px; color: light-dark(#0f172a, #f1f5f9); }}
h1 + p {{ color: light-dark(#4b5563, #9ca3af); margin-top: 0; }}
h2 {{ margin-top: 32px; padding-bottom: 6px; border-bottom: 2px solid var(--ice); color: light-dark(#0f172a, #f1f5f9); }}
h2#where-we-are + p {{ background: light-dark(#eef6ff, #132235); border-left: 4px solid var(--ice);
  padding: 12px 16px; border-radius: 6px; }}
a {{ color: var(--ice); }}
code {{ font-family: ui-monospace, Menlo, monospace; font-size: .88em; padding: 1px 5px; border-radius: 4px;
  background: light-dark(#f1f5f9, #1e293b); }}
.table-wrap {{ overflow-x: auto; margin: 12px 0; }}
table {{ border-collapse: collapse; width: 100%; font-size: 14px; }}
th, td {{ border: 1px solid light-dark(#d1d5db, #334155); padding: 6px 10px; text-align: left; vertical-align: top; }}
th {{ background: light-dark(#f3f4f6, #1e293b); font-weight: 600; }}
.dot {{ display: inline-block; width: .8em; height: .8em; border-radius: 3px; vertical-align: -1px; margin-right: 4px; }}
.dot.done {{ background: #16a34a; }} .dot.wip {{ background: #eab308; }}
.dot.todo {{ background: light-dark(#e5e7eb, #475569); }} .dot.blocked {{ background: #dc2626; }}
footer {{ margin-top: 40px; font-size: 13px; color: light-dark(#6b7280, #9ca3af); }}
</style>
</head>
<body>
{body}
<footer>Rendered from <code>docs/STATUS.md</code> by <code>docs/status_html.py</code>.</footer>
</body>
</html>
"""
    (DOCS / "STATUS.html").write_text(page)
    print("wrote", DOCS / "STATUS.html")


if __name__ == "__main__":
    main()
