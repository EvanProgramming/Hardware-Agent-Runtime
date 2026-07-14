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

  /** Establishes a declared hardware model and moves a new/planning project to ready_to_build. */
  public prepareHardware(projectId: string, expectedRevision: number, patch: Pick<ProjectPatch, "components" | "connections">): ProjectState {
    let revision = expectedRevision;
    let project = this.load(projectId);
    if (project.lifecycle === "created") project = this.patch(projectId, revision++, { lifecycle: "hardware_planning" }).project;
    if (project.lifecycle !== "hardware_planning" && project.lifecycle !== "ready_to_build") throw new HarError({ apiVersion: API_VERSION, kind: "ErrorEnvelope", id: `err-project-${randomUUID()}`, code: "INVALID_STATE_TRANSITION", category: "runtime_failure", message: `Cannot prepare hardware while project is ${project.lifecycle}.`, stage: "hardware_model", retryable: false, evidence: [] });
    project = this.patch(projectId, revision, patch).project;
    return project.lifecycle === "hardware_planning" ? this.patch(projectId, project.revision, { lifecycle: "ready_to_build" }).project : project;
  }

  public saveRecord<T extends { id: string }>(collection: string, value: T): void { this.store.saveRecord(collection, value); }
  public loadRecord<T>(collection: string, id: string): T | undefined { return this.store.loadRecord<T>(collection, id); }
}
