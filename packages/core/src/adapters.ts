export interface CommandResult { exitCode: number; stdout: string; stderr: string; timedOut: boolean; }
export interface CommandRunner { run(command: string, args: readonly string[], timeoutMs: number): Promise<CommandResult>; }
export interface BoardDescriptor { id: string; adapterId: string; platform: string; fqbn?: string; port: string; protocol?: string; label?: string; fingerprint: string; }
export interface CompileRequest { sketchPath: string; fqbn: string; buildPath?: string; timeoutMs?: number; }
export interface CompileResult { success: boolean; fqbn: string; stdout: string; stderr: string; estimatedFlashBytes?: number; estimatedRamBytes?: number; }
export interface FlashRequest { sketchPath: string; fqbn: string; port: string; timeoutMs?: number; }
export interface FlashResult { success: boolean; fqbn: string; port: string; stdout: string; stderr: string; }
export interface SerialCapture { port: string; baudRate: number; openedAt: string; closedAt: string; rawBase64: string; text: string; }
export interface ToolchainAdapter { readonly id: string; inspect(): Promise<{ installed: boolean; version?: string }>; compile(request: CompileRequest): Promise<CompileResult>; }
export interface BoardDiscoveryAdapter { discover(): Promise<BoardDescriptor[]>; }
export interface FlashAdapter { flash(request: FlashRequest): Promise<FlashResult>; }
export interface SerialAdapter { capture(port: string, baudRate: number, durationMs: number): Promise<SerialCapture>; }
export interface UsbMonitorAdapter { snapshot(): Promise<BoardDescriptor[]>; }
export interface SimulationAdapter { readonly id: string; }
