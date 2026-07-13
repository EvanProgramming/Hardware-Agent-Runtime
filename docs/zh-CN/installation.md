# 安装与 Codex MCP 配置

## 前置条件

安装 Node.js 22+、Arduino CLI 和 Git。macOS 可执行：

```bash
brew install arduino-cli
git clone https://github.com/EvanProgramming/Hardware-Agent-Runtime.git
cd Hardware-Agent-Runtime
npm install
npm run build
```

## 添加到 Codex

将构建后的 HAR 注册为本地 STDIO MCP Server：

```bash
codex mcp add carduino -- node "$(pwd)/packages/mcp/dist/server.js"
codex mcp list
```

也可在 `~/.codex/config.toml` 中写入：

```toml
[mcp_servers.carduino]
command = "node"
args = ["/absolute/path/Hardware-Agent-Runtime/packages/mcp/dist/server.js"]
cwd = "/absolute/path/Hardware-Agent-Runtime"
startup_timeout_sec = 20
tool_timeout_sec = 120
```

修改后重启 Codex。默认以进程工作目录作为 HAR 项目根目录；如需指定其他目录，请设置 `HAR_PROJECT_DIR`。

## 安全限制

HAR 不含 LLM，也不替代 AI Agent 或电气安全知识。模拟结果不是物理证据；无法由 HAR 观察的效果必须由人确认。安全警告与阻止项基于已声明的硬件元数据，并非专业电气审核的替代品。
