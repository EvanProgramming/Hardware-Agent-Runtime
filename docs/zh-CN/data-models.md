# 核心数据模型

机器契约以 [har-v1.schema.json](../../schemas/har-v1.schema.json) 为准。每个文档都有 `apiVersion: "har/v1"` 和稳定 `id`；聚合对象还使用正整数 `revision`。未知字段允许用于前向兼容；未知主版本必须拒绝。破坏性变更使用 `har/v2`，新增字段/枚举值属于次要契约发布。

## 模型族

| 模型 | 关键必填字段 | 关系/用途 |
|---|---|---|
| `ProjectState` | `lifecycle`、`hardwareModelId` | 根聚合，引用硬件模型和活动运行。 |
| `BoardDescriptor` / `PinDefinition` | 适配器、FQBN、引脚；名称、能力 | 由发现适配器产生，连接引用其引脚。 |
| `ComponentInstance` / `Connection` | 驱动、来源；端点、来源 | 表达声明的硬件图。 |
| `FirmwareArtifact` | 摘要、板 FQBN、构建状态 | 不可变编译产物；运行和烧录只引用它。 |
| `HardwareContext` | 项目、模型版本、观察 | 项目图、发现、观察与分析组成的读取模型。 |
| `DiagnosticReport` / `DiagnosticFinding` | 发现；规则、置信度、证据 | 诊断结论必须引用原始证据。 |
| `SerialObservation` / `UsbObservation` | 时间、原始字节；事件、指纹 | 原始串口/USB 观察，不被解析结果替换。 |
| `DriverDefinition` | 版本、能力 | 声明式、可版本固定的驱动元数据。 |
| `ExperimentDefinition` / `Step` / `Run` | 版本、步骤；类型、超时；定义、状态 | 可恢复的确定性实验运行。 |
| `HumanActionRequest` / `Response` | 运行、令牌、过期；请求、令牌、回复 | 单次、不可记录明文令牌的人工操作协议。 |
| `VerificationEvidence` / `Report` | 摘要、来源、来源状态；裁决、证据 | 不可变证据与通过/失败/不确定报告。 |
| `ResourceReport` / `SimulationState` | 安全状态、项目；引擎、状态 | 资源安全与明确标为模拟的数据。 |
| `RuntimeEvent` / `ErrorEnvelope` | 序号、类型、负载；代码、类别、阶段、可重试 | 审计恢复与统一错误系统。 |

## 状态来源

所有状态断言都区分：`user_reported`（用户但未验证的输入）、`runtime_observed`（适配器直接捕获）、`inferred`（有可复现推导和证据）和 `verified`（通过命名规则及证据验证）。这些值不会相互覆盖；硬件上下文应同时保留断言与来源。

常见可选字段包括时间戳、证据 ID、工具链版本、板/端口指纹、诊断严重度、实验光标、变量、报告范围及关联 ID。二进制内容存为内容寻址证据，聚合对象只保存摘要或引用。
