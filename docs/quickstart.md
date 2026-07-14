# Quick start

## Prerequisites

Install Git, Node.js 22 or later, and Arduino CLI. Arduino CLI examples: macOS `brew install arduino-cli`; Windows `winget install ArduinoSA.CLI`.

## Install from GitHub

```bash
git clone https://github.com/EvanProgramming/Hardware-Agent-Runtime.git
cd Hardware-Agent-Runtime
npm install
npm run setup -- --target esp32
npm run mcp:install
```

Use `--target avr` for Arduino Uno/Nano, or `--target both` for both boards. ESP32 Core downloads a large toolchain and may take several minutes.

Restart Codex, create a new task, and use `/mcp` to confirm `hardware-agent-runtime` is enabled. On a connected ESP32 Dev Module, ask Codex to inspect the environment and use FQBN `esp32:esp32:esp32:UploadSpeed=115200`.

To remove the global configuration later, run `npm run mcp:remove` from this repository.
