"""COMPILE_AGENT: compile a Cortex Agent spec from a role (ROLE.md) + the company map in Snowflake.

  role (founder-defined)  -> instructions: root functions + competency model
  map (V_DOMAIN_MAP)      -> mandate per zone: act / act-as-hypothesis / ask-first
  norms (V_NORMS L1, L2)  -> codex: top norms per subzone with authority
  tools                   -> knowledge search, business analyst, propose_action

Usage: python3 compile_agent.py <role_dir> [--connection anthropic-snowflake-hackathon-jwt]
Writes <role_dir>/agent_spec.yaml (deploy with: cortex agent-studio agent-deploy --file-path ... --fqn ...).
"""
import json, pathlib, re, subprocess, sys

role_dir = pathlib.Path(sys.argv[1]).resolve()
conn = sys.argv[sys.argv.index("--connection") + 1] if "--connection" in sys.argv else "anthropic-snowflake-hackathon-jwt"

def sql(q):
    out = subprocess.run(["snow", "sql", "-c", conn, "--format", "json", "-q", q], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

role = (role_dir / "ROLE.md").read_text()
root = re.search(r"## 1\. Root of the prompt.*?\n(.*?)\n## 2", role, re.S).group(1).strip()
competency = re.search(r"## 2\. Competency model.*?\n(.*?)\n## 3", role, re.S).group(1).strip()
boundaries = re.search(r"## 4\. Boundaries\n(.*)$", role, re.S).group(1).strip()

zones = sql("select zone, facts, covered, subzones, hypothesis_pct, unknown_per_fact from RECPLACE.MODEL.V_DOMAIN_MAP order by facts desc")
mandate = []
for z in zones:
    hyp, unk = float(z["HYPOTHESIS_PCT"] or 0), float(z["UNKNOWN_PER_FACT"] or 0)
    mode = "ACT" if hyp < 20 and unk < 0.5 else ("ACT-AS-HYPOTHESIS" if hyp < 30 and unk < 0.8 else "ASK-FIRST")
    mandate.append(f"- {z['ZONE']}: {mode} ({z['FACTS']} proven facts, {z['COVERED']}/{z['SUBZONES']} subzones covered, "
                   f"{hyp:.0f}% hypotheses, {unk:.2f} open questions per fact)")

norms = sql("""select subzone, authority, norm from (
  select subzone, authority, norm, row_number() over (partition by subzone order by authority, violations desc, length(norm)) rn
  from RECPLACE.MODEL.V_NORMS where authority in ('L1_document', 'L2_founder')) where rn <= 2 order by subzone, authority""")
codex = [f"- [{n['AUTHORITY']}] {n['SUBZONE']}: {n['NORM']}" for n in norms]

goals = sql("select goal_id, title, horizon, coalesce(target_text, 'target not stated') target, alignment, evidence_count, note from RECPLACE.MODEL.ORG_GOALS order by goal_id")
org_goals = [f"- {g['GOAL_ID']} {g['TITLE']} (horizon {g['HORIZON']}; target: {g['TARGET']}; alignment founder/team: {g['ALIGNMENT']}; {g['EVIDENCE_COUNT']} evidence facts). Unclear: {g['NOTE']}" for g in goals]
mgoals = sql("select mission, mission_title, serves_goals, metric, current_value from RECPLACE.MODEL.V_AGENT_GOAL_METRICS order by mission")
agent_goals = [f"- {m['MISSION']} {m['MISSION_TITLE']} -> serves {m['SERVES_GOALS']}; metric: {m['METRIC']}; now: {m['CURRENT_VALUE']}" for m in mgoals]

instructions = f"""{root}

COMPETENCY MODEL (missions -> tasks -> subtasks). For any request, identify the mission and task, then gather what the task relies on:
{competency}

ORGANISATION GOALS (distilled from facts, MODEL.ORG_GOALS; goals are hypotheses until the founder confirms them — flag misalignment):
{chr(10).join(org_goals)}

YOUR GOALS (missions -> organisation goals -> metric, MODEL.V_AGENT_GOAL_METRICS). Rank proposals by how much they move these:
{chr(10).join(agent_goals)}

MANDATE BY ZONE (compiled from the knowledge map; how freely you may act in each zone):
{chr(10).join(mandate)}

COMPANY CODEX (governing norms, L1 documents > L2 founder > L3 practice; search for more with knowledge_search, filter kind=norm):
{chr(10).join(codex)}

HOW TO DECIDE THE TAG (TARA):
- ACT: the action is right under every conflicting version of the facts and inside the zone mandate.
- HYPOTHESIS: cheap and reversible; state the signal you will watch and the review date.
- ASK: the answer depends on a conflict or an unknown and being wrong is expensive; ask a named role one precise question.
- APPROVE: money, discounts, irreversible steps, people decisions or a norm change; prepare it as a draft for the founder.
Absence of data is not zero, consent or permission.

BOUNDARIES:
{boundaries}"""

response = """Answer in the user's language (Russian by default). Structure: 1) short answer; 2) what it rests on — facts with quotes in «», norm with authority level, money from CRM; mark each claim known ✓ / hypothesis ~ / unknown ⚠ / conflict ⚡; 3) what we do not know; 4) proposed actions with tag, owner role, ₽ at stake, loss limit, review date. When you propose actions, record each one with propose_action. Never show phone numbers or emails; refer to people by role."""

spec = {
    "models": {"orchestration": "claude-opus-5-5"},
    "instructions": {"orchestration": instructions, "response": response},
    "tools": [
        {"tool_spec": {"type": "cortex_search", "name": "knowledge_search",
            "description": "Search the proven company knowledge of RecPlace: facts with verbatim quotes, norms (rules with authority L1 document / L2 founder / L3 practice), conflicts between sources and open questions. Filter by kind (fact, norm, conflict, open_question), zone, subzone, fact_type, authority, client_id. Use for any 'what is true / how do we do it / why' question and to cite evidence."}},
        {"tool_spec": {"type": "cortex_analyst_text_to_sql", "name": "business_analyst",
            "description": "Query money, clients and deals from the CRM ledger and the knowledge map: client status and MRR, deals by stage and status, days since last activity, managers who left, money at stake by bucket (B1-B6), coverage by zone/subzone, conflict counts. Use for any number, list of clients or deals, or money question."}},
        {"tool_spec": {"type": "generic", "name": "propose_action",
            "description": "Record one proposed action for human review (governed write-back; nothing is executed). Call once per action you propose.",
            "input_schema": {"type": "object", "properties": {
                "mission": {"type": "string", "description": "M1, M2, M3 or M4 from the competency model"},
                "title": {"type": "string", "description": "Short title"},
                "action": {"type": "string", "description": "What exactly to do"},
                "owner_role": {"type": "string", "description": "Who does it, by role (founder, head of sales, seller, agent)"},
                "tag": {"type": "string", "description": "ACT, HYPOTHESIS, ASK or APPROVE"},
                "amount_rub": {"type": "number", "description": "Money at stake in RUB (0 if none)"},
                "evidence": {"type": "string", "description": "Facts/norms/CRM numbers it rests on, with quotes"},
                "conflicts": {"type": "string", "description": "Conflicts or unknowns that affect it"},
                "loss_limit": {"type": "string", "description": "Maximum acceptable loss / stop condition"},
                "review_date": {"type": "string", "description": "When to review the result, YYYY-MM-DD"}},
              "required": ["mission", "title", "action", "owner_role", "tag", "amount_rub", "evidence", "conflicts", "loss_limit", "review_date"]}}},
    ],
    "tool_resources": {
        "knowledge_search": {"search_service": "RECPLACE.MODEL.FIRN_KNOWLEDGE_SEARCH", "id_column": "KID", "max_results": 8},
        "business_analyst": {"semantic_view": "RECPLACE.MODEL.FIRN_BUSINESS",
            "execution_environment": {"type": "warehouse", "warehouse": "DEFAULT_WH"}},
        "propose_action": {"type": "procedure", "identifier": "RECPLACE.APP.PROPOSE_ACTION",
            "execution_environment": {"type": "warehouse", "warehouse": "DEFAULT_WH"}},
    },
}

def to_yaml(o, ind=0):
    pad = "  " * ind
    if isinstance(o, dict):
        return "\n".join(f"{pad}{k}:" + (("\n" + to_yaml(v, ind + 1)) if isinstance(v, (dict, list)) else " " + to_yaml(v, 0)) for k, v in o.items())
    if isinstance(o, list):
        return "\n".join(f"{pad}-" + (("\n" + to_yaml(v, ind + 1)) if isinstance(v, (dict, list)) else " " + to_yaml(v, 0)) for v in o)
    if isinstance(o, str):
        return json.dumps(o, ensure_ascii=False)
    return json.dumps(o)

(role_dir / "agent_spec.yaml").write_text("# Compiled by sql/factory/compile_agent.py from ROLE.md + the knowledge map. Do not edit by hand.\n" + to_yaml(spec) + "\n")
print(f"compiled: {len(mandate)} zones in mandate, {len(codex)} codex norms, instructions {len(instructions)} chars")
