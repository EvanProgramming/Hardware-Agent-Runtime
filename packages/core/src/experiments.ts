import { randomUUID } from "node:crypto";
import { HarError } from "./errors.js";
import type { ProjectStore } from "./persistence.js";

export type ExperimentStatus = "pending" | "running" | "waiting_for_human" | "resumed" | "passed" | "failed" | "aborted" | "timed_out";
export type ExperimentStepType = "compile" | "flash" | "reset" | "wait" | "capture_serial" | "evaluate_diagnostics" | "assert_text" | "assert_numeric_range" | "assert_update_rate" | "repeat" | "request_human_action" | "collect_evidence" | "cleanup";
export interface ExperimentStep { id: string; type: ExperimentStepType; timeoutMs: number; contains?: string; actionType?: "confirmation" | "single_choice" | "multiple_choice" | "numeric_input" | "text_input" | "observation" | "wiring_confirmation" | "safety_confirmation" | "physical_action_completion"; instruction?: string; }
export interface ExperimentDefinition { apiVersion: "har/v1"; kind: "ExperimentDefinition"; id: string; version: string; steps: ExperimentStep[]; }
export interface HumanActionRequest { id: string; runId: string; token: string; actionType: NonNullable<ExperimentStep["actionType"]>; instruction: string; expiresAt: string; }
export interface ExperimentRun { id: string; definitionId: string; status: ExperimentStatus; cursor: number; serialText: string; evidenceIds: string[]; pendingRequest?: HumanActionRequest; error?: string; }

export class ExperimentEngine {
  public constructor(private readonly store: ProjectStore, private readonly now: () => Date = () => new Date()) {}
  public start(definition: ExperimentDefinition, serialText = ""): ExperimentRun { const run: ExperimentRun = { id: `run_${randomUUID()}`, definitionId: definition.id, status: "running", cursor: 0, serialText, evidenceIds: [] }; return this.advance(definition, run); }
  public resume(definition: ExperimentDefinition, runId: string, token: string, response: Record<string, unknown>): ExperimentRun {
    const run = this.load(runId); if (run.status !== "waiting_for_human" || run.pendingRequest?.token !== token) throw this.error("STALE_HUMAN_RESPONSE", "This human response does not match a pending request.");
    if (new Date(run.pendingRequest.expiresAt) < this.now()) { const { pendingRequest: _request, ...withoutRequest } = run; const timedOut: ExperimentRun = { ...withoutRequest, status: "timed_out" }; this.store.saveRecord("experiment_runs", timedOut); return timedOut; }
    if (run.pendingRequest.actionType === "confirmation" && typeof response.confirmed !== "boolean") throw this.error("INVALID_HUMAN_RESPONSE", "Confirmation requires a boolean confirmed field.");
    const { pendingRequest: _request, ...withoutRequest } = run; return this.advance(definition, { ...withoutRequest, status: "resumed", cursor: run.cursor + 1, evidenceIds: [...run.evidenceIds, `human_${randomUUID()}`] });
  }
  private advance(definition: ExperimentDefinition, initial: ExperimentRun): ExperimentRun {
    let run = { ...initial, status: "running" as const };
    while (run.cursor < definition.steps.length) {
      const step = definition.steps[run.cursor]!;
      if (step.type === "request_human_action") { const request: HumanActionRequest = { id: `human_request_${randomUUID()}`, runId: run.id, token: randomUUID(), actionType: step.actionType ?? "confirmation", instruction: step.instruction ?? "Perform the requested physical action.", expiresAt: new Date(this.now().getTime() + step.timeoutMs).toISOString() }; const paused: ExperimentRun = { ...run, status: "waiting_for_human", pendingRequest: request }; this.store.saveRecord("experiment_runs", paused); return paused; }
      if (step.type === "assert_text" && (step.contains === undefined || !run.serialText.includes(step.contains))) { const failed: ExperimentRun = { ...run, status: "failed", error: `Step ${step.id} did not find expected text.` }; this.store.saveRecord("experiment_runs", failed); return failed; }
      run = { ...run, cursor: run.cursor + 1, evidenceIds: step.type === "collect_evidence" || step.type === "capture_serial" ? [...run.evidenceIds, `evidence_${randomUUID()}`] : run.evidenceIds };
      this.store.saveRecord("experiment_runs", run);
    }
    const complete: ExperimentRun = { ...run, status: "passed" }; this.store.saveRecord("experiment_runs", complete); return complete;
  }
  private load(runId: string): ExperimentRun { const run = this.store.loadRecord<ExperimentRun>("experiment_runs", runId); if (run !== undefined) return run; throw this.error("EXPERIMENT_NOT_FOUND", `Experiment run ${runId} was not found.`); }
  private error(code: string, message: string): HarError { return new HarError({ apiVersion: "har/v1", kind: "ErrorEnvelope", id: `err-experiment-${randomUUID()}`, code, category: "experiment_failure", message, stage: "experiment", retryable: false, evidence: [] }); }
}
