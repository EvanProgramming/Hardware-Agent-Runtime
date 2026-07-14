# HAR v1.0 发布验证

## 发布范围

HAR v1.0 是供外部编程 Agent 使用的本地优先 Hardware Agent Runtime，不含 LLM，也不做产品决策。发布内容包括 Core library、Arduino CLI 适配器、本地 CLI、SQLite/WAL 持久化、诊断、驱动注册表、确定性实验、人工操作恢复、安全/资源分析、模拟、报告、STDIO MCP Server 和本地无头 CI Runner。

## 真实硬件验证

于 2026-07-14 使用以下环境完成验证：

- 开发板：ESP32-D0WD-V3 ESP32 Dev Module
- USB 转串口：CH340（`1A86:7523`）
- 端口：`/dev/cu.usbserial-10`
- FQBN：`esp32:esp32:esp32:UploadSpeed=115200`
- 固件：`examples/sketches/BlinkHeartbeat`

观察到的结果：

1. 板卡发现找到了 USB 串口设备。
2. ESP32 Core 3.3.10 编译成功（Flash 285116 bytes、RAM 22092 bytes）。
3. 115200 上传写入全部 ESP32 Flash 分段并完成 hash 校验。
4. 复位后 USB 端口仍可用。
5. 115200 串口窗口捕获到 8 条 `HEARTBEAT`。
6. 诊断没有发现异常。
7. 人工确认板载 LED 正在闪烁。
8. 项目 `esp32-v1-release` 到达 `completed`；实验和验证报告均为 `passed`。

本 CH340 链路在默认 921600 ESP32 上传速率下不稳定；已支持并验证的设置为 `UploadSpeed=115200`。

## 仍需注意的运行限制

- 真实硬件测试必然与开发板、数据线和环境相关；新板型应先运行冒烟测试。
- ESP32 GPIO 为 3.3V；HC-SR04 ECHO 等 5V 信号必须电平转换。
- 本地 CI Runner 在无头模式下会将要求人工操作的实验标为 blocked。
- PlatformIO、ESP-IDF、Zephyr、STM32、RP2040 与 MicroPython 仍是适配器扩展目标，不属于已验证的 v1 后端。
