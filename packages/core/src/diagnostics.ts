import { randomUUID } from "node:crypto";

export interface SerialSample { id: string; timestampMs: number; text: string; rawBase64?: string; }
export interface DiagnosticFinding { id: string; ruleId: string; severity: "info" | "warning" | "error"; confidence: number; message: string; evidenceIds: string[]; suggestedAction: string; }
export interface DiagnosticReport { id: string; generatedAt: string; findings: DiagnosticFinding[]; summary: { lineCount: number; durationMs: number; printableRatio: number; }; }
export interface SensorRule { pattern: string; field: string; min?: number; max?: number; maxFrozenSamples?: number; maxIntervalMs?: number; }

/** Stateless, evidence-citing rules. It never mutates observations or asserts a physical cause. */
export function diagnoseSerial(samples: readonly SerialSample[], sensorRule?: SensorRule): DiagnosticReport {
  const evidenceIds = samples.map((sample) => sample.id); const joined = samples.map((sample) => sample.text).join("");
  const lines = joined.split(/\r?\n/).filter((line) => line.length > 0); const durationMs = samples.length > 1 ? samples.at(-1)!.timestampMs - samples[0]!.timestampMs : 0;
  const printable = [...joined].filter((char) => char >= " " && char <= "~" || char === "\n" || char === "\r" || char === "\t").length;
  const findings: DiagnosticFinding[] = [];
  const add = (ruleId: string, severity: DiagnosticFinding["severity"], confidence: number, message: string, suggestedAction: string): void => { findings.push({ id: `finding_${randomUUID()}`, ruleId, severity, confidence, message, evidenceIds, suggestedAction }); };
  if (joined.length === 0) add("serial.no_output", "warning", 0.85, "No serial output was detected in the capture window.", "Confirm firmware logging, baud rate, cable, and capture duration.");
  if (joined.length > 0 && printable / joined.length < 0.6) add("serial.suspected_baud_mismatch", "warning", 0.7, "Captured bytes have a high non-printable ratio.", "Verify the configured baud rate against the firmware.");
  const crash: Array<[RegExp, string]> = [[/Guru Meditation|ESP32.*panic/i, "crash.esp32_panic"], [/watchdog|wdt reset/i, "crash.watchdog"], [/brownout/i, "crash.brownout"], [/backtrace|stack trace/i, "crash.stack_trace"], [/assert(?:ion)? failed/i, "crash.assertion"], [/Traceback \(most recent call last\)/i, "crash.micropython"]];
  for (const [pattern, id] of crash) if (pattern.test(joined)) add(id, "error", 0.95, `Crash fingerprint detected: ${id}.`, "Preserve this evidence and inspect the firmware crash output.");
  const bootMarkers = joined.match(/(?:boot|reset|setup complete|starting)/gi)?.length ?? 0;
  if (bootMarkers >= 3) add("serial.suspected_boot_loop", "error", 0.8, `Repeated startup markers (${bootMarkers}) suggest a boot loop.`, "Check power stability and reset/crash evidence.");
  if (samples.length >= 3 && durationMs > 0) {
    const intervals = samples.slice(1).map((sample, index) => sample.timestampMs - samples[index]!.timestampMs); const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const deviation = Math.sqrt(intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length);
    add(deviation / Math.max(mean, 1) > 0.25 ? "serial.irregular_rate" : "serial.stable_rate", "info", 0.8, `Observed ${lines.length} lines; mean sample interval ${Math.round(mean)} ms, jitter ${Math.round(deviation)} ms.`, "Use this timing as a baseline for future captures.");
  }
  if (sensorRule !== undefined) diagnoseSensor(joined, sensorRule, add);
  return { id: `diagnostic_${randomUUID()}`, generatedAt: new Date().toISOString(), findings, summary: { lineCount: lines.length, durationMs, printableRatio: joined.length === 0 ? 1 : printable / joined.length } };
}

function diagnoseSensor(text: string, rule: SensorRule, add: (id: string, severity: DiagnosticFinding["severity"], confidence: number, message: string, action: string) => void): void {
  const regex = new RegExp(rule.pattern, "gm"); const values: number[] = []; let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) { const candidate = Number(match.groups?.[rule.field]); if (Number.isFinite(candidate)) values.push(candidate); }
  if (values.length === 0) { add("sensor.missing_value", "warning", 0.8, "No values matched the supplied sensor extraction rule.", "Verify the parser pattern and firmware output."); return; }
  if (rule.min !== undefined && values.some((value) => value < rule.min!) || rule.max !== undefined && values.some((value) => value > rule.max!)) add("sensor.outlier", "warning", 0.85, "A parsed value is outside the caller-provided range.", "Inspect wiring, calibration, and raw evidence.");
  if (rule.maxFrozenSamples !== undefined && values.length >= rule.maxFrozenSamples && new Set(values).size === 1) add("sensor.frozen_value", "warning", 0.75, "The parsed sensor value did not change in the configured window.", "Change the stimulus and capture another window.");
}
