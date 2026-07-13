import type { BoardDescriptor } from "./adapters.js";
import type { DiagnosticReport } from "./diagnostics.js";
import type { ProjectState } from "./models.js";

export interface HardwareContext { project: Pick<ProjectState, "id" | "revision" | "lifecycle" | "components" | "connections" | "activeArtifactId" | "activeRunId">; board?: BoardDescriptor; diagnostics?: DiagnosticReport; recentSerial?: { evidenceId: string; lineCount: number; capturedAt: string }; pendingHumanAction?: { requestId: string; runId: string; expiresAt: string }; detail: "compact" | "detailed"; }
export function buildHardwareContext(project: ProjectState, input: Omit<HardwareContext, "project" | "detail">, detail: "compact" | "detailed" = "compact"): HardwareContext { return { project: { id: project.id, revision: project.revision, lifecycle: project.lifecycle, components: project.components, connections: project.connections, ...(project.activeArtifactId === undefined ? {} : { activeArtifactId: project.activeArtifactId }), ...(project.activeRunId === undefined ? {} : { activeRunId: project.activeRunId }) }, ...input, detail }; }
