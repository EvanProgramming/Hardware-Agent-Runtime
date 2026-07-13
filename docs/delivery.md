# MCP API, data delivery, testing, repository plan, and ADRs

## MCP tool surface

| Tool | Input / output | Mutates / pauses | Idempotency and errors |
|---|---|---|---|
| `inspect_environment` | filters → adapters, boards, ports, tool versions | no / no | snapshot; `ADAPTER_UNAVAILABLE` |
| `get_hardware_context` | project ID → revisioned context | no / no | snapshot; `NOT_FOUND` |
| `update_hardware_model` | patch + expected revision → model/context/resource report | yes / no | key + optimistic revision; `MODEL_CONFLICT`, `SAFETY_BLOCKED` |
| `compile_firmware` | source ref, board, profile → artifact/evidence | yes (artifact) / no | content key; `COMPILE_FAILED` |
| `flash_and_observe` | artifact, device, capture profile → flash/observations | yes / no | request key; `FLASH_FAILED`, `DEVICE_AMBIGUOUS` |
| `run_experiment` | definition ref, target → run/result or human request | yes / yes | run key; `EXPERIMENT_*`, `USER_ACTION_REQUIRED` |
| `resume_experiment` | run ID, request token, response → result/request | yes / yes | response key; `STALE_HUMAN_RESPONSE` |
| `simulate_experiment` | definition, simulation config → simulation run/report | yes / no | request key; `SIMULATION_UNSUPPORTED` |
| `get_diagnostics` | context/run/window → findings/evidence | no / no | snapshot; `NOT_FOUND` |
| `get_project_state` | project ID → ProjectState | no / no | snapshot; `NOT_FOUND` |
| `generate_runtime_report` | scope, format → report refs | yes (cached render) / no | content key; `EVIDENCE_MISSING` |

All input/output schemas are JSON Schema; every failure is an `ErrorEnvelope`. Mutation requires project revision where relevant.

## Local persistence

One SQLite database per project, WAL enabled, with tables for aggregates (`projects`, `hardware_models`, `artifacts`, `runs`, `human_requests`, `reports`), append-only `runtime_events`, and content-addressed evidence files under `.har/evidence/<sha256>`. Database rows reference schema version and evidence digest. Atomic transaction commits state change plus event; evidence is fsynced before reference. Retention never deletes evidence referenced by a report.

## Testing strategy

| Level | Without hardware | With hardware |
|---|---|---|
| Unit | state transitions, schema, safety, expression evaluator | — |
| Adapter contracts | fake CLI/serial/USB transcript fixtures | Arduino CLI behavior matrix |
| Engine/diagnostics | deterministic clock, golden events/rules | captured real traces |
| Simulation | component models and parity comparison | compare against fixture rig |
| Integration | SQLite + fake adapters + MCP calls | end-to-end device lab |
| Smoke/CI | compile-only and simulated experiments | pinned board, blink, serial startup, reset |

Contract tests are mandatory for every adapter and driver/rule manifest. Physical tests are quarantined, require an explicit device selector, and never run concurrently on the same fingerprint.

## Proposed repository

Use a TypeScript monorepo: shared schema validation and discriminated command/event types reduce boundary errors, while adapters remain child packages. `packages/core`, `mcp`, `adapters/arduino-cli`, `drivers`, `simulation`, `cli`; `schemas`, `examples/{drivers,experiments,sketches}`, `tests/{unit,contract,integration,hardware}`, `docs`, `tools`. TypeScript is implementation intent only; this architecture phase supplies no runtime code.

## ADR index

| ADR | Context/options | Decision | Tradeoff/consequence |
|---|---|---|---|
| ADR-001 TypeScript | TS vs Python | TypeScript monorepo | strong JSON/MCP typing; native serial wrappers may need isolation |
| ADR-002 Schemas | TS-only vs JSON Schema | JSON Schema canonical; TS generated | cross-language validation; schema maintenance |
| ADR-003 Storage | JSON files vs SQLite | SQLite + evidence files | transactional recovery; migrations required |
| ADR-004 Runtime style | event vs command | command orchestration with append-only events | simple commands plus audit/recovery; event log not full event sourcing |
| ADR-005 Process model | single vs workers | single core; isolated adapter child process optional | easy v1; process protocol for risky tools |
| ADR-006 Interface | MCP-only vs library+wrapper | core library plus MCP/CLI wrappers | testable/reusable; public core API discipline |
| ADR-007 Plugins | dynamic arbitrary code vs manifests | allowlisted declarative manifests; adapters packaged | safer deterministic v1; less third-party flexibility |
| ADR-008 DSL | JSON vs YAML | canonical JSON, YAML accepted then normalized | machine stability; parser/normalization layer |
