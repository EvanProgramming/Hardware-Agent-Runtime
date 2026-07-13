import { HarError } from "./errors.js";
import type { ProjectLifecycle } from "./models.js";

const transitions: Readonly<Record<ProjectLifecycle, readonly ProjectLifecycle[]>> = {
  created: ["hardware_planning"], hardware_planning: ["waiting_for_user", "ready_to_build", "blocked", "failed"],
  waiting_for_user: ["hardware_planning", "ready_to_build", "blocked", "failed"], ready_to_build: ["compiling", "blocked", "failed"],
  compiling: ["ready_to_build", "flashing", "failed", "blocked"], flashing: ["observing", "failed", "blocked"],
  observing: ["experimenting", "verifying", "ready_to_build", "failed", "blocked"], experimenting: ["waiting_for_user", "verifying", "failed", "blocked"],
  verifying: ["completed", "failed", "blocked"], completed: [], failed: ["ready_to_build", "hardware_planning"], blocked: ["ready_to_build", "experimenting", "hardware_planning"]
};

export function assertProjectTransition(from: ProjectLifecycle, to: ProjectLifecycle): void {
  if (from === to || transitions[from].includes(to)) return;
  throw new HarError({ apiVersion: "har/v1", kind: "ErrorEnvelope", id: `err-transition-${crypto.randomUUID()}`, code: "INVALID_STATE_TRANSITION", category: "runtime_failure", message: `Cannot transition project from ${from} to ${to}.`, stage: "state_transition", retryable: false, evidence: [], suggested_next_action: "Reload project state and choose a valid lifecycle transition." });
}
