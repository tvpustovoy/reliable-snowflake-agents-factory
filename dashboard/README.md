# dashboard/ — Firn dashboards (first pass, synthetic data)

Purpose: compare two ways to host the Firn dashboard inside Snowflake, plus the
same view as an HTML report an agent can return in Snowflake CoWork.
Inputs: none yet — all data is synthetic and inlined. Target source later:
`RECPLACE.MODEL` (zones, facts, conflicts).
Outputs: a local web app per variant; one standalone HTML file.

| Folder | Variant | Run locally |
|---|---|---|
| `streamlit_sis/` | Streamlit in Snowflake (`snow streamlit deploy`) | `python3 -m venv .venv && .venv/bin/pip install streamlit pandas && .venv/bin/streamlit run streamlit_app.py` |
| `app_runtime/` | Snowflake App Runtime, Next.js | `npm install && npm run dev` → http://localhost:3000 |
| `agent_html/` | Sandbox-safe HTML report for a Cortex Agent answer | open `firn_map.html` in a browser |

Logic shared by all three (kept in sync by hand in this pass):
- Subzone mandate: ASK if 0 facts; ACT if ≥5 facts from ≥2 carriers and conflicts/facts < 0.2; else DRAFT.
- Zone mandate: ACT if ≥60% subzones ACT and none ASK; ASK if ≥50% ASK; else DRAFT.
- Agent mandate = weakest mandate among its required zones; create button differs per mandate
  (Create agent / Create with approvals / Create anyway).
