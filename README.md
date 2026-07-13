# Carduino

Carduino is the architecture repository for Hardware Agent Runtime (HAR) v1.0: a local-first runtime that lets external AI coding agents safely compile, flash, observe, experiment with, and verify real embedded hardware.

简体中文版：[README.zh-CN.md](README.zh-CN.md)；其余中文文档位于 [docs/zh-CN/](docs/zh-CN/README.md)。

HAR is **not** an AI agent and contains no LLM. The first target is Arduino through Arduino CLI; adapters preserve a path to PlatformIO, ESP-IDF, Zephyr, RP2040, STM32, and MicroPython.

## Status

This repository contains both the approved architecture and its runnable local-first MVP implementation.

## MVP implementation

The repository now includes a local TypeScript MVP: SQLite/WAL state storage, Arduino CLI adapter, serial diagnostics, metadata-only drivers, deterministic experiments with persisted human-action pauses, safety analysis, simulation, verification reports, CLI, and a local STDIO MCP server. See [installation and Codex MCP setup](docs/installation.md).

## Reading order

1. [System boundary and architecture](docs/architecture.md)
2. [Data contracts](docs/data-models.md) and [JSON Schema](schemas/har-v1.schema.json)
3. [Execution, state machines, and recovery](docs/runtime.md)
4. [Adapters, drivers, diagnostics, and safety](docs/extensibility.md)
5. [MCP API, testing, repository plan, and ADRs](docs/delivery.md)

## Design principles

- Local-first, one project database, no cloud dependency.
- Core owns decisions about runtime state; adapters own platform/tool interactions.
- Evidence is immutable and attributable; inference never overwrites observation.
- Experiment definitions are deterministic data, never embedded natural-language reasoning.
- Unsafe hardware operations are blocked before tool invocation.

## Proposed implementation layout

```text
packages/core/       domain, orchestration, state machines, safety
packages/mcp/        MCP server and input/output validation
packages/adapters/   Arduino CLI initially; future platform adapters
packages/drivers/    portable driver metadata and diagnostic rules
packages/sim/        deterministic simulation backend
packages/cli/        local operator CLI and CI entry point
schemas/             versioned JSON Schema contracts
examples/            drivers, experiments, Arduino sketches
docs/                architecture decisions and implementation plan
```
