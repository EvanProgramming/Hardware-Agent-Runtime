# Hardware Agent Runtime

Hardware Agent Runtime（HAR）v1.0 是本地优先运行时与架构仓库。它让外部 AI 编程代理能够安全地编译、烧录、观测、实验并验证真实嵌入式硬件。

HAR **不是** AI Agent，不包含 LLM。首个目标是通过 Arduino CLI 支持 Arduino；适配器架构为 PlatformIO、ESP-IDF、Zephyr、RP2040、STM32 与 MicroPython 保留扩展路径。

从 GitHub 安装请参阅[快速开始](docs/zh-CN/quickstart.md)。

## 状态

本仓库包含已批准的架构，以及可运行的本地 MVP：SQLite/WAL 状态存储、Arduino CLI 适配器、串口诊断、元数据驱动、可暂停/恢复的确定性实验、安全分析、模拟、验证报告、CLI 与本地 STDIO MCP Server。

## v1.0 发布状态

HAR v1.0 已达到支持范围内的发布状态。ESP32 Dev Module 已完成真实硬件全链路验证：发现、编译、烧录、USB/串口恢复、启动输出捕获、诊断、LED 人工确认、实验恢复和持久化的通过验证报告。详见 [发布验证记录](docs/v1-release.md)。

## 阅读顺序

1. [系统边界与架构](docs/zh-CN/architecture.md)
2. [数据契约](docs/zh-CN/data-models.md) 与机器可读的 [JSON Schema](schemas/har-v1.schema.json)
3. [运行时、状态机与恢复](docs/zh-CN/runtime.md)
4. [适配器、驱动、诊断与安全](docs/zh-CN/extensibility.md)
5. [MCP API、测试、仓库规划与 ADR](docs/zh-CN/delivery.md)
6. [安装与 Codex MCP 配置](docs/zh-CN/installation.md)

## 设计原则

- 本地优先：每个项目一个数据库，不依赖云服务。
- Core 决定运行时状态；适配器只负责平台与工具交互。
- 证据不可变且可追溯；推断绝不覆盖观察。
- 实验定义是确定性数据，不嵌入自然语言推理。
- 不安全的硬件操作会在调用工具前被阻止。

英文原文仍保留，JSON Schema 与代码中的 API 名称不翻译。
