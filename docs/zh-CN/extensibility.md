# 适配器、驱动、诊断、实验 DSL 与安全

## 适配器端口

Core 依赖 `ToolchainAdapter`、`BoardAdapter`、`FlashAdapter`、`SerialAdapter`、`UsbMonitorAdapter`、`SimulationAdapter` 和 `PersistenceAdapter` 接口。Arduino CLI 仅实现这些端口；将来增加 PlatformIO 时新增适配器包和能力声明，Core 模块无需修改。请求在启动前做能力协商并拒绝不支持的功能。

## 驱动

运行时驱动是可移植的声明式元数据：电气限制、接线建议、引脚约束、解析规则、实验和人工动作模板。它不是固件库、板支持包，也不是可执行插件。固件库属于生成的固件；BSP 属于工具链；诊断规则将观察映射为发现。

内置示例驱动：

- Built-in LED：常见 Arduino 板的数字输出/可视指示器。
- HC-SR04：5V 供电、`echo` 在 3.3V MCU 上需电平转换，解析 `DIST_CM=`。
- DHT22：温湿度能力、3.3–6V、约两秒最小采样周期。

驱动可从本地 JSON/YAML 加载并验证。

## 实验 DSL

实验必须有固定 `apiVersion`、`id`、`version`、变量和带 ID 的步骤。支持 `compile`、`flash`、`reset`、`wait`、`capture_serial`、`evaluate_diagnostics`、文本/数值/速率断言、`repeat`、`request_human_action`、`collect_evidence` 和 `cleanup`。每个动作和等待都有超时。表达式只能使用小型类型化比较语言，不能在执行引擎中放置自然语言推理。

示例位于 `examples/experiments/`：`blink-led-v1`、`ultrasonic-distance-v1`、`sensor-stream-freeze-v1`。

## 诊断和安全

诊断分离原始观察、规则、发现、置信度、建议。v1 覆盖崩溃指纹、启动循环、输出频率、抖动、冻结值、数值异常、波特率异常和 USB 重连。规则可作为声明式注册项扩展，不修改引擎。

资源分析在操作前检查已声明的电压兼容性、引脚冲突、GPIO/电源预算、舵机/电机外部供电、继电器/感性负载、外部电源和共地。`blocker` 阻止操作，`warning` 要求确认，`info` 只记录。未声明数据不会被猜测。
