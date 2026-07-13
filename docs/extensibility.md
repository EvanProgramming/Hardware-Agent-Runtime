# Adapters, drivers, diagnostics, experiment DSL, and safety

## Adapter ports

```ts
interface ToolchainAdapter { id: string; capabilities(): Capability[]; compile(request: CompileRequest): Promise<CompileResult>; }
interface BoardAdapter { discover(): AsyncIterable<BoardDescriptor>; resolve(selector: BoardSelector): Promise<BoardDescriptor>; }
interface FlashAdapter { flash(request: FlashRequest): Promise<FlashResult>; reset(device: DeviceRef): Promise<void>; }
interface SerialAdapter { open(request: SerialOpenRequest): Promise<SerialSession>; }
interface UsbMonitorAdapter { observe(filter: UsbFilter): AsyncIterable<UsbObservation>; snapshot(): Promise<UsbObservation[]>; }
interface SimulationAdapter { simulate(request: SimulationRequest): Promise<SimulationState>; }
interface PersistenceAdapter { transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>; migrate(target: string): Promise<void>; }
```

The Arduino CLI adapter implements Toolchain/Board/Flash and maps CLI FQBN, upload port, and process logs to portable contracts. A PlatformIO adapter is another package registering the same ports/capabilities; no core module changes. Adapter capability negotiation rejects unsupported requests before a command starts.

## Driver model

Runtime driver metadata is a portable declarative manifest (electrical constraints, pins, parse patterns, experiments). A firmware library is source linked by firmware; a board support package enables a toolchain; an experiment template is executable DSL data; a diagnostic rule maps observations to findings. Drivers compose a base `sensor.distance` capability plus vendor-specific metadata; inheritance only merges metadata with explicit conflict rules. Framework coupling is advertised in `firmwareBindings`, never assumed.

### Example: HC-SR04 manifest

```yaml
apiVersion: har/v1
kind: DriverDefinition
id: sensor.ultrasonic.hc-sr04
version: 1.0.0
capabilities: [distance_cm]
electrical: {supplyVoltageV: {min: 4.5, max: 5.5}, logicLevel: 5V, currentMa: {typical: 15, max: 15}}
wiring: {vcc: 5V, gnd: GND, trig: digital_output, echo: digital_input_5v}
compatibleBoards: [arduino:avr:uno, arduino:avr:nano]
pinConstraints: {trig: {forbid: [0, 1]}, echo: {forbid: [0, 1], levelShiftRequiredBelowV: 5}}
knownIssues: ["Echo is 5V; level-shift for 3.3V MCU", "No echo when object is outside range"]
dataParsing: {pattern: '^DIST_CM=(?<distance>[0-9]+(\\.[0-9]+)?)$', fields: {distance: number}}
experiments: [ultrasonic-distance-v1, ultrasonic-stream-freeze-v1]
humanActionTemplates: [place_target_at_distance]
```

## Deterministic experiment DSL

`apiVersion: har/v1`, immutable `id/version`, explicit variables, and a linear/named-step graph are required. Actions: `compile`, `flash`, `reset`, `serial_capture`, `wait_for`, `assert`, `repeat`, `human_action`, `branch`, `collect_evidence`, `cleanup`. Every wait/action has timeout. Expressions use a small typed comparison language only.

```yaml
# blink-led-v1
apiVersion: har/v1
kind: ExperimentDefinition
id: blink-led-v1
version: 1.0.0
steps:
  - {id: build, type: compile, firmware: blink, timeoutMs: 60000}
  - {id: upload, type: flash, artifactFrom: build, timeoutMs: 30000}
  - {id: boot, type: serial_capture, durationMs: 3000, evidence: startup}
  - {id: confirm, type: human_action, template: observe_led_blink, timeoutMs: 300000}
  - {id: verdict, type: assert, expression: 'human.confirmed == true'}
```

```yaml
# ultrasonic-distance-v1
apiVersion: har/v1
kind: ExperimentDefinition
id: ultrasonic-distance-v1
version: 1.0.0
steps:
  - {id: capture, type: serial_capture, durationMs: 5000, parser: sensor.ultrasonic.hc-sr04}
  - {id: target, type: human_action, template: place_target_at_distance, inputs: {distanceCm: {type: number}}, timeoutMs: 300000}
  - {id: sample, type: serial_capture, durationMs: 3000, parser: sensor.ultrasonic.hc-sr04}
  - {id: range, type: assert, expression: 'abs(sample.distance - human.distanceCm) <= 5'}
```

```yaml
# sensor-stream-freeze-v1
apiVersion: har/v1
kind: ExperimentDefinition
id: sensor-stream-freeze-v1
version: 1.0.0
steps:
  - {id: window, type: serial_capture, durationMs: 30000, parser: sensor.ultrasonic.hc-sr04}
  - {id: cadence, type: assert, expression: 'window.interArrival.maxMs <= 1500'}
  - {id: variation, type: assert, expression: 'window.distance.distinctCount >= 2'}
  - {id: evidence, type: collect_evidence, refs: [window]}
```

## Diagnostics

Observations are immutable raw bytes/events. Rules are versioned, declarative predicates. Findings cite observation IDs, confidence is a rule-calibrated number, and recommendations are non-executing structured suggestions. Registries load signed/allowlisted JSON rules without engine changes. Built-ins cover crash fingerprints, boot-loop count/window, output rate, jitter percentile, frozen value windows, numeric outliers, baud-mismatch byte entropy, and USB disconnect/reconnect correlation.

## Safety gate

Before compile/flash/run, Resource Analyzer checks declared board voltage, pin mode conflicts, aggregate GPIO current, rail budget, motor/servo external supply requirement, relay isolation policy, external supply limits, and common-ground declaration. `block` prevents operation; `warning` is returned and must be acknowledged in a request; `info` is recorded. Missing electrical metadata is a blocker for actuators and a warning for passive/sensor-only experiments.
