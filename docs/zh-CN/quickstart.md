# 快速开始

## 前置条件

安装 Git、Node.js 22 或更高版本，以及 Arduino CLI。Arduino CLI 示例：macOS 使用 `brew install arduino-cli`；Windows 使用 `winget install ArduinoSA.CLI`。

## 从 GitHub 安装

```bash
git clone https://github.com/EvanProgramming/Hardware-Agent-Runtime.git
cd Hardware-Agent-Runtime
npm install
npm run setup -- --target esp32
npm run mcp:install
```

Arduino Uno/Nano 使用 `--target avr`；同时安装两类板卡使用 `--target both`。ESP32 Core 会下载较大的工具链，可能需要数分钟。

重启 Codex，新建任务后用 `/mcp` 确认 `hardware-agent-runtime` 已启用。接入 ESP32 Dev Module 后，请 Codex 检查环境，并使用 FQBN `esp32:esp32:esp32:UploadSpeed=115200`。

以后如需移除全局配置，在仓库目录执行 `npm run mcp:remove`。
