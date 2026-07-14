import { randomUUID } from "node:crypto";
import type { BoardDiscoveryAdapter, CompileRequest, FlashAdapter, SerialAdapter, ToolchainAdapter, UsbMonitorAdapter } from "./adapters.js";
import { diagnoseSerial, type DiagnosticReport } from "./diagnostics.js";
import type { ProjectService } from "./project-service.js";

export interface FlashAndObserveRequest { projectId: string; expectedRevision: number; sketchPath: string; fqbn: string; port: string; baudRate?: number; captureDurationMs?: number; }
export interface FlashAndObserveResult { operationId: string; status: "completed" | "failed"; stage: "compile" | "flash" | "observe" | "complete"; compile: Awaited<ReturnType<ToolchainAdapter["compile"]>>; flash?: Awaited<ReturnType<FlashAdapter["flash"]>>; usbBefore?: Awaited<ReturnType<UsbMonitorAdapter["snapshot"]>>; usbAfter?: Awaited<ReturnType<UsbMonitorAdapter["snapshot"]>>; serial?: { evidenceId: string; text: string; rawBase64: string }; diagnostics?: DiagnosticReport; retryable: boolean; suggestedNextActions: string[]; }

/** High-level vertical slice. Adapters own I/O; this class only sequences typed outcomes. */
export class FlashAndObserveService {
  public constructor(private readonly projects: ProjectService, private readonly adapters: { toolchain: ToolchainAdapter; flash: FlashAdapter; serial: SerialAdapter; usb: UsbMonitorAdapter; boards: BoardDiscoveryAdapter }) {}
  public async execute(request: FlashAndObserveRequest): Promise<FlashAndObserveResult> {
    let revision = request.expectedRevision;
    this.projects.patch(request.projectId, revision++, { lifecycle: "compiling" });
    const compile = await this.adapters.toolchain.compile({ sketchPath: request.sketchPath, fqbn: request.fqbn });
    if (!compile.success) { this.projects.patch(request.projectId, revision, { lifecycle: "failed" }); return this.persist(request.projectId, { operationId: `operation_${randomUUID()}`, status: "failed", stage: "compile", compile, retryable: false, suggestedNextActions: ["Correct compile errors and submit a new compile request."] }); }
    this.projects.patch(request.projectId, revision++, { lifecycle: "flashing" });
    const usbBefore = await this.adapters.usb.snapshot(); const flash = await this.adapters.flash.flash({ sketchPath: request.sketchPath, fqbn: request.fqbn, port: request.port });
    if (!flash.success) { this.projects.patch(request.projectId, revision, { lifecycle: "failed" }); return this.persist(request.projectId, { operationId: `operation_${randomUUID()}`, status: "failed", stage: "flash", compile, flash, usbBefore, retryable: true, suggestedNextActions: ["Check board selection, cable, and bootloader, then retry flash."] }); }
    this.projects.patch(request.projectId, revision++, { lifecycle: "observing" });
    const usbAfter = await this.adapters.usb.snapshot();
    try {
      const capture = await this.adapters.serial.capture(request.port, request.baudRate ?? 115200, request.captureDurationMs ?? 3_000); const evidenceId = `serial_${randomUUID()}`;
      const diagnostics = diagnoseSerial([{ id: evidenceId, timestampMs: Date.now(), text: capture.text, rawBase64: capture.rawBase64 }]);
      this.projects.patch(request.projectId, revision, { lifecycle: "experimenting" });
      return this.persist(request.projectId, { operationId: `operation_${randomUUID()}`, status: "completed", stage: "complete", compile, flash, usbBefore, usbAfter, serial: { evidenceId, text: capture.text, rawBase64: capture.rawBase64 }, diagnostics, retryable: false, suggestedNextActions: ["Review diagnostics or run an experiment."] });
    } catch {
      this.projects.patch(request.projectId, revision, { lifecycle: "failed" });
      return this.persist(request.projectId, { operationId: `operation_${randomUUID()}`, status: "failed", stage: "observe", compile, flash, usbBefore, usbAfter, retryable: true, suggestedNextActions: ["Confirm the serial port and baud rate, then capture again."] });
    }
  }
  private persist(projectId: string, result: FlashAndObserveResult): FlashAndObserveResult { this.projects.saveRecord("flash_runs", { id: result.operationId, projectId, result }); this.projects.saveRecord("flash_latest", { id: projectId, result }); return result; }
}
