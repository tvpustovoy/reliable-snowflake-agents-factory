// Standalone output for Snowflake App Runtime; tracing root pinned to this app.
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  images: { unoptimized: true },
};
