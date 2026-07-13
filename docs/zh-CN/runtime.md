# 运行时执行、状态机与恢复

## 状态机

| 对象 | 有效状态/转换 | 规则 |
|---|---|---|
| 项目 | `created → hardware_planning → waiting_for_user|ready_to_build`；随后 `compiling → flashing → observing → experimenting|verifying → completed` | 活动状态可到 `blocked` 或 `failed`；非法转换返回 `INVALID_STATE_TRANSITION`。 |
| 实验 | `pending → running → waiting_for_human → resumed → running → passed|failed|aborted|timed_out` | 终态无出边；恢复必须使用匹配的待处理请求。 |
| 设备连接 | `unknown → discovered → connected → flashing → rebooting → serial_available` | 活动连接可变为 `disconnected` 或 `error`；只能在 connected 时烧录。 |

每次转换都记录前后状态、参与者、关联 ID、上下文版本与单调递增序号。超时产生明确事件而不是隐式改变状态。

## 核心流程

**编译与烧录**：验证请求、状态、安全报告与设备租约；工具链生成内容寻址的固件产物；烧录后 USB 监视器关联重枚举，串口捕获启动窗口；结果包含产物摘要、板/端口、观察与诊断。

**自动诊断**：串口和 USB 服务追加原始观察。规则引擎按固定版本评估窗口，输出引用观察 ID 的发现、置信度和建议，而不修改证据。

**人工实验**：到 `human_action` 时先持久化随机令牌、输入契约、过期时间和运行光标，再返回等待请求。恢复请求必须带匹配令牌及符合 Schema 的回复。

**模拟与真实设备**：同一实验定义可用 `simulation` 或 `hardware` 目标执行。模拟观察标记 `simulated`，真实观察标记 `runtime`；比较报告只能说明一致、分歧或不可比较。

**本地硬件 CI**：固定固件、明确设备和非交互实验；收集 JSON 与 Markdown 报告。没有夹具回复的人工步骤必须标记 blocked。

## 恢复

每个项目使用 SQLite WAL。命令在回复前持久化幂等键与结果；启动时把遗留活动操作标为中断、重新扫描 USB、但不会自动重新打开串口或重试中断烧录。会话重启按项目/运行 ID 恢复，不依赖 AI Agent 的记忆。
