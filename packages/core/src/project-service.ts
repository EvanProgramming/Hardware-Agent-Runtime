import { randomUUID } from "node:crypto";
import { HarError } from "./errors.js";
import type { CreateProjectInput, ProjectPatch, ProjectState, RuntimeEvent } from "./models.js";
import { API_VERSION } from "./models.js";
import type { ProjectStore } from "./persistence.js";
import { assertProjectTransition } from "./state-machine.js";

export class ProjectService {
  public constructor(private readonly store: ProjectStore, private readonly clock: () => Date = () => new Date()) {}

  public create(input: CreateProjectInput = {}): ProjectState {
    const now = (input.now ?? this.clock()).toISOString();
    const project: ProjectState = { apiVersion: API_VERSION, kind: "ProjectState", id: input.id ?? `project_${randomUUID()}`, revision: 1, createdAt: now, updatedAt: now, lifecycle: "created", hardwareModelId: input.hardwareModelId ?? "hardware_model_initial", components: [], connections: [] };
    this.store.create(project);
    return project;
  }

  public load(projectId: string): ProjectState {
    const project = this.store.load(projectId);
    if (project !== undefined) return project;
    throw new HarError({ apiVersion: API_VERSION, kind: "ErrorEnvelope", id: `err-project-${randomUUID()}`, code: "PROJECT_NOT_FOUND", category: "runtime_failure", message: `Project ${projectId} was not found.`, stage: "project_load", retryable: false, evidence: [] });
  }

  public patch(projectId: string, expectedRevision: number, patch: ProjectPatch, correlationId?: string): { project: ProjectState; event: RuntimeEvent } {
    const current = this.load(projectId);
    if (current.revision !== expectedRevision) throw new HarError({ apiVersion: API_VERSION, kind: "ErrorEnvelope", id: `err-project-${randomUUID()}`, code: "MODEL_CONFLICT", category: "runtime_failure", message: `Expected revision ${expectedRevision}, found ${current.revision}.`, stage: "project_patch", retryable: true, evidence: [], suggested_next_action: "Reload the project and retry with its current revision." });
    if (patch.lifecycle !== undefined) assertProjectTransition(current.lifecycle, patch.lifecycle);
    const updated: ProjectState = { ...current, ...patch, revision: current.revision + 1, updatedAt: this.clock().toISOString() };
    const event = this.store.save(updated, { apiVersion: API_VERSION, kind: "RuntimeEvent", id: `event_${randomUUID()}`, type: "project.updated", payload: { revision: updated.revision, fields: Object.keys(patch) }, timestamp: updated.updatedAt, aggregateType: "ProjectState", aggregateId: projectId, ...(correlationId === undefined ? {} : { correlationId }) });
    return { project: updated, event };
  }
}
