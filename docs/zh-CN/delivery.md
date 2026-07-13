# MCP API、持久化、测试、仓库规划与 ADR

## MCP 高层工具

面向 Agent 的工具包括 `inspect_environment`、`create_project`、`get_project_state`、`get_hardware_context`、`update_hardware_model`、`list_drivers`、`compile_firmware`、`flash_and_observe`、`get_diagnostics`、`run_experiment`、`resume_experiment`、`simulate_experiment` 和 `generate_runtime_report`。它们必须校验输入、返回结构化输出或 `ErrorEnvelope`、为创建的对象返回 ID，并默认不返回无限日志。

写操作使用项目版本和幂等键；人工步骤允许暂停；读操作为快照。MCP 是 Core library 的包装层，不承担领域逻辑。

## 本地持久化与测试

每项目一个 SQLite 数据库，开启 WAL；状态改变和运行时事件在一个事务内提交；大型原始证据使用 `.har/evidence/<sha256>` 内容寻址存储。恢复依赖持久化项目/运行 ID，而非 Agent 会话。

测试分为：状态机/Schema/安全的单元测试；适配器契约与伪 CLI/串口/USB 记录；诊断金样本；模拟；SQLite+伪适配器集成；以及显式选择设备的真实硬件 smoke test。没有硬件的环境默认跳过物理测试。

## ADR 摘要

1. TypeScript monorepo：共享 MCP/JSON 类型，必要时隔离原生串口封装。
2. JSON Schema 为跨语言规范，TypeScript 类型可由其生成。
3. SQLite 加证据文件：提供事务恢复，代价是迁移管理。
4. 命令编排加追加事件：保持简单审计，不做完整事件溯源。
5. 单 Core 进程；风险适配器可用子进程隔离。
6. Core library + MCP/CLI 包装，而非仅 MCP。
7. 仅允许白名单声明式插件/清单。
8. JSON 为规范 DSL，YAML 可输入后归一化。
