# Runtime execution, state machines, and recovery

## State machines

| Machine | Valid transitions | Invalid-transition rule |
|---|---|---|
| Project | `created→hardware_planning→waiting_for_user|ready_to_build`; `ready_to_build→compiling→flashing→observing→experimenting|verifying`; `experimenting→waiting_for_user→experimenting`; `verifying→completed`; active states may `→blocked|failed`; blocked may `→ready_to_build|experimenting` | Reject with `INVALID_STATE_TRANSITION`; no partial side effect before transition lease |
| Experiment | `pending→running→waiting_for_human→resumed→running`; `running|resumed→passed|failed|aborted|timed_out` | terminal states have no outgoing transition; resume requires matching pending request |
| Device link | `unknown→discovered→connected→flashing→rebooting→serial_available`; any active link `→disconnected|error`; disconnected `→discovered` | flash only from connected; serial window only from serial_available |

Every transition is transactionally appended with `from`, `to`, actor, correlation ID, context revision, and monotonic sequence. Timeouts produce a terminal event rather than an implicit state change.

## Flows

### A. Compile and flash

1. Agent submits immutable source reference, board selector, compile profile, idempotency key.
2. MCP validates schema; orchestrator checks project state, safety report, resource report, and exclusive device lease.
3. Toolchain adapter compiles into a content-addressed `FirmwareArtifact`; all stdout/stderr become evidence.
4. Flash adapter flashes the resolved device. USB monitor correlates disconnect/re-enumeration by device fingerprint, then serial capture records the startup window.
5. HAR emits `FlashResult` with artifact digest, selected board/port, observed lifecycle, capture evidence, diagnostics, and next project state.

### B. Automatic diagnosis

Serial and USB services append raw observations. The diagnostics engine evaluates version-pinned declarative rules over an observation window, creates findings with cited observation IDs and calibrated confidence, and returns both findings and untouched evidence.

### C. Human-in-the-loop experiment

The engine executes deterministic automatic steps until a `human_action` step. It persists a cryptographically random request token, input contract, expiry, and run cursor before returning `waiting_for_human`. An agent relays the request. `resume_experiment` accepts only the token and schema-valid response; it appends the response and continues exactly at the next step.

### D. Simulation to real

The engine selects `simulation` or `hardware` execution target for the same versioned definition. Simulation observations carry `source: simulated`; physical observations carry `source: runtime`. A comparison report aligns named assertions and declares agreement, divergence, or not-comparable—never treats a simulated pass as physical verification.

### E. Hardware CI

CI creates an isolated run, compiles pinned firmware, flashes only an explicitly selected lab device, runs non-interactive experiments, gathers observations/findings, and writes JSON plus rendered Markdown report. Human steps cause `CI_HUMAN_ACTION_UNSUPPORTED` unless a fixture response is declared.

## Recovery

SQLite uses WAL and one transaction per command transition. Commands store idempotency key and outcome before reply. On boot, recovery marks abandoned active operations `interrupted`, rescans USB, reopens no serial capture automatically, and returns resumable runs only after validating their context/artifact revisions. Interrupted flashing is never retried automatically; HAR requires rediscovery and an explicit flash request. Session restarts recover through project/run IDs, not agent memory.
