import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const server = resolve(root, "packages/mcp/dist/server.js");
if (!existsSync(server)) { console.error("Build output is missing. Run npm run build first."); process.exit(1); }
spawnSync("codex", ["mcp", "remove", "hardware-agent-runtime"], { stdio: "ignore" });
const result = spawnSync("codex", ["mcp", "add", "hardware-agent-runtime", "--env", `HAR_PROJECT_DIR=${root}`, "--", "node", server], { stdio: "inherit" });
process.exit(result.status ?? 1);
