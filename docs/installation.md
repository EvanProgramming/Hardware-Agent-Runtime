# Installation and Codex MCP setup

## Prerequisites

Install Node.js 22+, Arduino CLI, and Git. On macOS: `brew install arduino-cli`.

```bash
git clone https://github.com/EvanProgramming/Hardware-Agent-Runtime.git
cd Hardware-Agent-Runtime
npm install
npm run build
```

## Add to Codex

Use the built server as a local STDIO MCP server:

```bash
codex mcp add carduino -- node "$(pwd)/packages/mcp/dist/server.js"
codex mcp list
```

Alternatively add this to `~/.codex/config.toml` (replace the path):

```toml
[mcp_servers.carduino]
command = "node"
args = ["/absolute/path/Hardware-Agent-Runtime/packages/mcp/dist/server.js"]
cwd = "/absolute/path/Hardware-Agent-Runtime"
startup_timeout_sec = 20
tool_timeout_sec = 120
```

Restart Codex after changing configuration. The server uses the process working directory as the HAR project root; set `HAR_PROJECT_DIR` if it must use another project directory.

## Limits and safety

HAR is not an AI agent and contains no LLM. It never treats a simulation as physical proof. A human must confirm effects HAR cannot observe, and electrical warnings/blockers do not replace qualified electrical-safety review.
