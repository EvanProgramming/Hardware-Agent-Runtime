import { describe, expect, it } from "vitest";
import { diagnoseSerial } from "./diagnostics.js";
describe("diagnostics", () => {
  it("retains evidence links for crash and boot loop findings", () => {
    const report = diagnoseSerial([{ id: "s1", timestampMs: 0, text: "boot\nGuru Meditation\nboot\nboot\n" }]);
    expect(report.findings.map((finding) => finding.ruleId)).toContain("crash.esp32_panic"); expect(report.findings.every((finding) => finding.evidenceIds[0] === "s1")).toBe(true);
  });
  it("detects a frozen caller-defined sensor stream", () => {
    const report = diagnoseSerial([{ id: "s1", timestampMs: 0, text: "DIST=3\nDIST=3\nDIST=3\n" }], { pattern: "DIST=(?<distance>\\d+)", field: "distance", maxFrozenSamples: 3 });
    expect(report.findings.map((finding) => finding.ruleId)).toContain("sensor.frozen_value");
  });
});
