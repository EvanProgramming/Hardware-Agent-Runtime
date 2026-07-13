# Core data models

The canonical machine contract is [har-v1.schema.json](../schemas/har-v1.schema.json). Every document requires `apiVersion: "har/v1"` and stable `id`; aggregate documents additionally use positive integer `revision`. Unknown fields are allowed for forward-compatible readers, but consumers reject an unknown major `apiVersion`. Breaking change means `har/v2`; additive fields and enum additions are minor contract releases. IDs link `ProjectState → HardwareContext/model`, `ComponentInstance/Connection → BoardDescriptor/PinDefinition`, `ExperimentRun → ExperimentDefinition/artifact/evidence`, and reports/findings → evidence.

| Model family | Schema-required semantic fields | Example |
|---|---|---|
| ProjectState | lifecycle, hardwareModelId | `{"apiVersion":"har/v1","kind":"ProjectState","id":"p1","lifecycle":"ready_to_build","hardwareModelId":"m1"}` |
| BoardDescriptor / PinDefinition | adapter/FQBN/pins; name/capabilities | `{"apiVersion":"har/v1","kind":"BoardDescriptor","id":"uno","adapterId":"arduino-cli","platform":"arduino","fqbn":"arduino:avr:uno","pins":[]}` |
| ComponentInstance / Connection | driver/stateOrigin; endpoints/origin | `{"apiVersion":"har/v1","kind":"ComponentInstance","id":"u1","driverId":"sensor.ultrasonic.hc-sr04","stateOrigin":"user_reported"}` |
| FirmwareArtifact / HardwareContext | digest/board/status; project/revision/observations | `{"apiVersion":"har/v1","kind":"FirmwareArtifact","id":"a1","digest":"sha256:x","boardFqbn":"arduino:avr:uno","buildStatus":"compiled"}` |
| DiagnosticReport / Finding | findings; rule/confidence/evidence | `{"apiVersion":"har/v1","kind":"DiagnosticFinding","id":"f1","ruleId":"boot-loop","confidence":0.9,"evidenceIds":["e1"]}` |
| SerialObservation / UsbObservation | timestamp/data/source; event/fingerprint | `{"apiVersion":"har/v1","kind":"UsbObservation","id":"u1","timestamp":"2026-07-13T00:00:00Z","event":"attached","fingerprint":"vid:2341"}` |
| DriverDefinition | version/capabilities | `{"apiVersion":"har/v1","kind":"DriverDefinition","id":"d1","version":"1.0.0","capabilities":["distance_cm"]}` |
| ExperimentDefinition / Step / Run | version/steps; type/timeout; definition/status | `{"apiVersion":"har/v1","kind":"ExperimentRun","id":"r1","definitionId":"blink-led-v1","status":"running"}` |
| Human request / response | run/token/expiry; request/token/response | `{"apiVersion":"har/v1","kind":"HumanActionResponse","id":"hr1","requestId":"hq1","token":"opaque","response":{"confirmed":true}}` |
| Evidence / VerificationReport | digest/source/origin; verdict/evidence | `{"apiVersion":"har/v1","kind":"VerificationReport","id":"vr1","verdict":"passed","evidenceIds":["e1"]}` |
| ResourceReport / SimulationState | safety status/items; engine/status | `{"apiVersion":"har/v1","kind":"ResourceReport","id":"rr1","status":"warning","items":[]}` |
| RuntimeEvent / ErrorEnvelope | sequence/type/payload; code/category/stage/retry/evidence | `{"apiVersion":"har/v1","kind":"ErrorEnvelope","id":"x1","code":"FLASH_PORT_LOST","category":"flash_failure","message":"Port disappeared","stage":"flashing","retryable":true,"evidence":[]}` |

`stateOrigin` is mandatory wherever a state assertion is stored: `user_reported` is unverified user input; `runtime_observed` is a direct adapter capture; `inferred` is a reproducible derivation with cited evidence; `verified` is a successful assertion backed by named evidence and verification rule. These values never overwrite each other; context exposes both assertion and provenance.
