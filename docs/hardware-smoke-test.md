# Arduino Blink hardware smoke test

Use an Arduino Uno-compatible board or ESP32 Dev Module and a data-capable USB cable. Do not select Bluetooth or OS debug serial ports. For ESP32-specific setup and 3.3V safety, see `docs/esp32-setup.md`.

1. Build HAR and register its MCP server as described in `docs/installation.md`.
2. Connect the board, then call `inspect_environment`. Select the board entry that has a recognized FQBN and USB serial port.
3. Call `create_project`, then `update_hardware_model` with the returned project ID and revision. It returns a `ready_to_build` revision.
4. Call `compile_firmware` with `examples/sketches/BlinkHeartbeat`, the project ID, and FQBN `arduino:avr:uno` (Uno) or `esp32:esp32:esp32:UploadSpeed=115200` (ESP32 Dev Module). Both compile paths are locally verified; ESP32 requires its Core to be installed.
5. Call `flash_and_observe` using the current project revision, selected port, the same sketch/FQBN, baud `115200`, and capture window `3000` ms.
6. Expect `STARTUP` and `HEARTBEAT` in the serial preview, then run `examples/experiments/blink-led-v1.yaml`. HAR pauses for the physical LED confirmation; resume with its request token and `{ "confirmed": true }`.
7. Call `generate_runtime_report` with project and run IDs.

If discovery sees no recognized USB board, stop: check the USB cable, board power, driver, and port before attempting flash. HAR intentionally does not auto-select an ambiguous serial device.
