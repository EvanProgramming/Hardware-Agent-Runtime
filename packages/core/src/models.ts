/** Canonical v1 domain types. These deliberately do not depend on MCP or adapters. */
export const API_VERSION = "har/v1" as const;

export type StateOrigin = "user_reported" | "runtime_observed" | "inferred" | "verified";
export type ProjectLifecycle =
  | "created" | "hardware_planning" | "waiting_for_user" | "ready_to_build"
  | "compiling" | "flashing" | "observing" | "experimenting" | "verifying"
  | "completed" | "failed" | "blocked";

export interface ProjectState {
  apiVersion: typeof API_VERSION;
  kind: "ProjectState";
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lifecycle: ProjectLifecycle;
  hardwareModelId: string;
  components: ComponentInstance[];
  connections: Connection[];
  activeRunId?: string;
  activeArtifactId?: string;
  blockers?: string[];
}

export interface ComponentInstance {
  apiVersion: typeof API_VERSION;
  kind: "ComponentInstance";
  id: string;
  driverId: string;
  stateOrigin: StateOrigin;
  label?: string;
  properties?: Record<string, unknown>;
}

export interface Connection {
  apiVersion: typeof API_VERSION;
  kind: "Connection";
  id: string;
  from: string;
  to: string;
  stateOrigin: StateOrigin;
  signal?: string;
}

export interface RuntimeEvent {
  apiVersion: typeof API_VERSION;
  kind: "RuntimeEvent";
  id: string;
  sequence: number;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  aggregateType: "ProjectState";
  aggregateId: string;
  correlationId?: string;
}

export interface CreateProjectInput { id?: string; hardwareModelId?: string; now?: Date; }
export interface ProjectPatch {
  components?: ComponentInstance[];
  connections?: Connection[];
  lifecycle?: ProjectLifecycle;
  blockers?: string[];
}
