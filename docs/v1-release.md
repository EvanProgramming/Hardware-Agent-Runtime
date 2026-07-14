# HAR v1.0 release validation

## Release scope

HAR v1.0 is a local-first Hardware Agent Runtime for external coding agents. It contains no LLM and does not make product decisions. The release surface includes the Core library, Arduino CLI adapter, local CLI, SQLite/WAL persistence, diagnostics, driver registry, deterministic experiments, human-action resume, safety/resource analysis, simulation, reporting, STDIO MCP server, and local headless CI runner.

## Real-hardware validation

Validated on 2026-07-14 with:

- Board: ESP32-D0WD-V3 ESP32 Dev Module
- USB bridge: CH340 (`1A86:7523`)
- Port: `/dev/cu.usbserial-10`
- FQBN: `esp32:esp32:esp32:UploadSpeed=115200`
- Firmware: `examples/sketches/BlinkHeartbeat`

Observed results:

1. Board discovery found the USB serial device.
2. ESP32 Core 3.3.10 compiled the sketch (285116 bytes flash, 22092 bytes RAM).
3. The 115200 upload wrote and hash-verified all ESP32 flash segments.
4. USB port remained available after reset.
5. Serial observation captured eight `HEARTBEAT` lines at 115200 baud.
6. Diagnostics produced no findings.
7. Human confirmation verified the physical LED blink.
8. Project `esp32-v1-release` reached `completed`; experiment and verification report both reached `passed`.

The default 921600 ESP32 upload speed was unstable on this CH340 link; the supported, validated setting is `UploadSpeed=115200`.

## Remaining operational limits

- Real hardware tests are necessarily board/cable/environment specific; use the supplied smoke test before a new board family.
- ESP32 GPIO is 3.3V; level-shift 5V signals such as HC-SR04 ECHO.
- The local CI runner intentionally marks human-required experiments blocked in headless mode.
- PlatformIO, ESP-IDF, Zephyr, STM32, RP2040, and MicroPython remain adapter-extension targets rather than validated v1 backends.
