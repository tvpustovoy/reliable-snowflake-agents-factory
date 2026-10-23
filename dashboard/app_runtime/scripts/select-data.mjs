// Purpose: pick the data source before dev/build/agent-html. Live snapshot wins if present.
// Inputs: lib/firn/live/current.json (gitignored, from export-live) or lib/firn/sample.json (synthetic).
// Outputs: lib/firn/live/active.json (gitignored) — the only file the app imports.
import fs from "node:fs";

const live = "lib/firn/live/current.json";
const src = process.env.FIRN_DATA === "sample" || !fs.existsSync(live) ? "lib/firn/sample.json" : live;
fs.mkdirSync("lib/firn/live", { recursive: true });
fs.copyFileSync(src, "lib/firn/live/active.json");
console.log("firn data:", src);
