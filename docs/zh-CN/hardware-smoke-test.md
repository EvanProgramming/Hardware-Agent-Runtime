# Arduino Blink 真实硬件冒烟测试

使用兼容 Arduino Uno 的开发板或 ESP32 Dev Module，以及支持数据传输的 USB 线。不要选择蓝牙或系统调试串口。ESP32 专用配置与 3.3V 安全说明见 `docs/esp32-setup.md`。

1. 按 `docs/installation.md` 构建并注册 HAR MCP Server。
2. 接入开发板后调用 `inspect_environment`。选择带已识别 FQBN 和 USB 串口的条目。
3. 调用 `create_project`，再用返回的项目 ID、revision 调用 `update_hardware_model`；结果会变为 `ready_to_build`。
4. 调用 `compile_firmware`：`sketchPath` 为 `examples/sketches/BlinkHeartbeat`；Uno 的 `fqbn` 为 `arduino:avr:uno`，ESP32 Dev Module 为 `esp32:esp32:esp32`。Uno 路径已在本机实际编译通过；ESP32 需要先安装 Core。
5. 使用当前项目 revision、选定端口、同一 sketch/FQBN、`115200` 波特率和 `3000` ms 窗口调用 `flash_and_observe`。
6. 串口预览应有 `STARTUP`、`HEARTBEAT`。再运行 `examples/experiments/blink-led-v1.yaml`；HAR 会暂停要求确认 LED 物理闪烁，使用请求 token 和 `{ "confirmed": true }` 恢复。
7. 以项目和运行 ID 调用 `generate_runtime_report`。

如果发现不到已识别 USB 开发板，请停止烧录，检查数据线、供电、驱动和端口。HAR 刻意不会自动选择含糊的串口。
