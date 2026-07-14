import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { parse } from "yaml";
import { ArduinoCliAdapter } from "@carduino/arduino-cli";
import { ExperimentEngine, FlashAndObserveService, generateVerificationReport, ProjectService, renderVerificationMarkdown, SqliteProjectStore } from "@carduino/core";
import type { ExperimentDefinition, ExperimentRun } from "@carduino/core";

interface Args { project: string; suite: string[]; sketch?: string; fqbn?: string; port?: string; reportDir: string; }
function args(): Args {
  const values = process.argv; const read = (name: string): string | undefined => { const index = values.lastIndexOf(name); return index < 0 ? undefined : values[index + 1]; };
  const project = read("--project"); const suite = read("--suite")?.split(",").filter(Boolean);
  if (project === undefined || suite === undefined || suite.length === 0) throw new Error("Usage: har ci run --project <path> --suite <experiment.yaml[,experiment.yaml]> [--sketch <path> --fqbn <fqbn> --port <port>] [--report-dir <path>]");
  return { project: resolve(project), suite: suite.map((path) => resolve(path)), ...(read("--sketch") === undefined ? {} : { sketch: resolve(read("--sketch")!) }), ...(read("--fqbn") === undefined ? {} : { fqbn: read("--fqbn")! }), ...(read("--port") === undefined ? {} : { port: read("--port")! }), reportDir: resolve(read("--report-dir") ?? join(project, ".har", "reports")) };
}

async function main(): Promise<void> {
  const input = args(); const store = new SqliteProjectStore(join(input.project, ".har", "project.sqlite")); const projects = new ProjectService(store); const arduino = new ArduinoCliAdapter();
  try {
    // Each CI invocation owns an isolated run project; an interrupted hardware run is never silently reused.
    let project = projects.create({ id: `ci_${Date.now()}` });
    if (project.lifecycle === "created") project = projects.prepareHardware(project.id, project.revision, { components: [], connections: [] });
    let serialText = ""; let hardwareOutcome: unknown;
    if (input.sketch !== undefined && input.fqbn !== undefined && input.port !== undefined) {
      const result = await new FlashAndObserveService(projects, { toolchain: arduino, flash: arduino, serial: arduino, usb: arduino, boards: arduino }).execute({ projectId: project.id, expectedRevision: project.revision, sketchPath: input.sketch, fqbn: input.fqbn, port: input.port, baudRate: 115200, captureDurationMs: 3000 });
      hardwareOutcome = { status: result.status, stage: result.stage, diagnostics: result.diagnostics }; serialText = result.serial?.text ?? ""; project = projects.load(project.id);
    } else if (input.sketch !== undefined && input.fqbn !== undefined) {
      const compile = await arduino.compile({ sketchPath: input.sketch, fqbn: input.fqbn }); hardwareOutcome = { status: compile.success ? "compiled" : "compile_failed", compile: { success: compile.success, fqbn: compile.fqbn, estimatedFlashBytes: compile.estimatedFlashBytes, estimatedRamBytes: compile.estimatedRamBytes } };
    }
    const engine = new ExperimentEngine(store); const reports = input.suite.map((path) => { const definition = parse(readFileSync(path, "utf8")) as ExperimentDefinition; const hasHumanStep = definition.steps.some((step) => step.type === "request_human_action"); const run: ExperimentRun = hasHumanStep ? { id: `ci_blocked_${randomUUID()}`, definitionId: definition.id, status: "waiting_for_human", cursor: 0, serialText, evidenceIds: [] } : engine.start(definition, serialText); if (hasHumanStep) store.saveRecord("experiment_runs", run); return generateVerificationReport({ projectId: project.id, hardwareModelRevision: project.revision, run, requirementId: definition.id }); });
    const verdict = reports.some((report) => report.verdict === "failed") ? "failed" : reports.some((report) => report.verdict === "blocked") ? "blocked" : reports.every((report) => report.verdict === "passed") ? "passed" : "inconclusive";
    if (input.port !== undefined && project.lifecycle === "experimenting") project = projects.patch(project.id, project.revision, { lifecycle: verdict === "blocked" ? "blocked" : verdict === "failed" ? "failed" : "verifying" }).project;
    if (project.lifecycle === "verifying" && verdict === "passed") project = projects.patch(project.id, project.revision, { lifecycle: "completed" }).project;
    const result = { projectId: project.id, generatedAt: new Date().toISOString(), hardwareOutcome, verdict, reports };
    mkdirSync(input.reportDir, { recursive: true }); writeFileSync(join(input.reportDir, "har-ci-report.json"), `${JSON.stringify(result, null, 2)}\n`); writeFileSync(join(input.reportDir, "har-ci-report.md"), `# HAR CI report\n\n- Verdict: **${verdict}**\n\n${reports.map(renderVerificationMarkdown).join("\n")}`);
    console.log(JSON.stringify({ verdict, jsonReport: join(input.reportDir, "har-ci-report.json"), markdownReport: join(input.reportDir, "har-ci-report.md"), suites: input.suite.map((path) => basename(path)) }, null, 2));
    process.exitCode = verdict === "passed" ? 0 : verdict === "blocked" ? 2 : 1;
  } finally { store.close(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
