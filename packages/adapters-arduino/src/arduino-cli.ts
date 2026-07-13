import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { SerialPort } from "serialport";
import type { BoardDescriptor, BoardDiscoveryAdapter, CommandResult, CommandRunner, CompileRequest, CompileResult, FlashAdapter, FlashRequest, FlashResult, SerialAdapter, SerialCapture, ToolchainAdapter, UsbMonitorAdapter } from "@carduino/core";
import { HarError } from "@carduino/core";

export class SpawnCommandRunner implements CommandRunner {
  public run(command: string, args: readonly string[], timeoutMs: number): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: false, windowsHide: true });
      let stdout = ""; let stderr = ""; let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
      child.on("error", (error) => { clearTimeout(timer); reject(error); });
      child.on("close", (code) => { clearTimeout(timer); resolve({ exitCode: code ?? -1, stdout, stderr, timedOut }); });
    });
  }
}

interface ArduinoBoardList { detected_ports?: Array<{ port?: { address?: string; protocol?: string; label?: string }; matching_boards?: Array<{ name?: string; fqbn?: string }> }> }

/** All Arduino CLI invocation is contained in this adapter. Arguments are never shell-built. */
export class ArduinoCliAdapter implements ToolchainAdapter, BoardDiscoveryAdapter, FlashAdapter, UsbMonitorAdapter, SerialAdapter {
  public readonly id = "arduino-cli";
  public constructor(private readonly runner: CommandRunner = new SpawnCommandRunner(), private readonly command = "arduino-cli") {}

  public async inspect(): Promise<{ installed: boolean; version?: string }> {
    try {
      const result = await this.runner.run(this.command, ["version"], 5_000);
      return result.exitCode === 0 ? { installed: true, version: result.stdout.trim() } : { installed: false };
    } catch { return { installed: false }; }
  }

  public async discover(): Promise<BoardDescriptor[]> {
    const result = await this.run(["board", "list", "--format", "json"], "board_discovery");
    let parsed: ArduinoBoardList;
    try { parsed = JSON.parse(result.stdout) as ArduinoBoardList; } catch { throw this.error("ARDUINO_CLI_INVALID_JSON", "Arduino CLI returned invalid board-list JSON.", "board_discovery", false, result.stderr); }
    return (parsed.detected_ports ?? []).flatMap((entry, index) => {
      const port = entry.port?.address;
      if (port === undefined) return [];
      const board = entry.matching_boards?.[0];
      return [{ id: `arduino-port-${index}`, adapterId: this.id, platform: "arduino", ...(board?.fqbn === undefined ? {} : { fqbn: board.fqbn }), port, ...(entry.port?.protocol === undefined ? {} : { protocol: entry.port.protocol }), ...(board?.name === undefined ? { ...(entry.port?.label === undefined ? {} : { label: entry.port.label }) } : { label: board.name }), fingerprint: `${entry.port?.protocol ?? "serial"}:${port}` }];
    });
  }
  public snapshot(): Promise<BoardDescriptor[]> { return this.discover(); }

  public async compile(request: CompileRequest): Promise<CompileResult> {
    const args = ["compile", "--fqbn", request.fqbn, "--format", "json", ...(request.buildPath === undefined ? [] : ["--build-path", request.buildPath]), request.sketchPath];
    const result = await this.run(args, "compile", request.timeoutMs ?? 120_000, true);
    const usage = parseMemoryUsage(result.stdout);
    return { success: result.exitCode === 0, fqbn: request.fqbn, stdout: result.stdout, stderr: result.stderr, ...(usage.flash === undefined ? {} : { estimatedFlashBytes: usage.flash }), ...(usage.ram === undefined ? {} : { estimatedRamBytes: usage.ram }) };
  }

  public async flash(request: FlashRequest): Promise<FlashResult> {
    const result = await this.run(["upload", "--fqbn", request.fqbn, "-p", request.port, request.sketchPath], "flash", request.timeoutMs ?? 90_000, true);
    return { success: result.exitCode === 0, fqbn: request.fqbn, port: request.port, stdout: result.stdout, stderr: result.stderr };
  }

  public capture(port: string, baudRate: number, durationMs: number): Promise<SerialCapture> {
    return new Promise((resolve, reject) => {
      const openedAt = new Date().toISOString(); const chunks: Buffer[] = [];
      const serial = new SerialPort({ path: port, baudRate, autoOpen: false });
      const done = (): void => {
        const bytes = Buffer.concat(chunks); const closedAt = new Date().toISOString();
        serial.close((error) => error == null ? resolve({ port, baudRate, openedAt, closedAt, rawBase64: bytes.toString("base64"), text: bytes.toString("utf8") }) : reject(this.error("SERIAL_CLOSE_FAILED", error.message, "serial_capture", true)));
      };
      serial.on("data", (chunk: Buffer) => chunks.push(chunk));
      serial.open((error) => { if (error !== null) { reject(this.error("SERIAL_OPEN_FAILED", error.message, "serial_capture", true)); return; } setTimeout(done, durationMs); });
    });
  }

  private async run(args: string[], stage: string, timeoutMs = 15_000, allowFailure = false): Promise<CommandResult> {
    let result: CommandResult;
    try { result = await this.runner.run(this.command, args, timeoutMs); } catch (error) { throw this.error("ARDUINO_CLI_UNAVAILABLE", "Arduino CLI could not be started.", stage, true, error instanceof Error ? error.message : undefined); }
    if (result.timedOut) throw this.error("ARDUINO_CLI_TIMEOUT", `Arduino CLI timed out during ${stage}.`, stage, true, result.stderr);
    if (!allowFailure && result.exitCode !== 0) throw this.error("ARDUINO_CLI_FAILED", `Arduino CLI failed during ${stage}.`, stage, false, result.stderr);
    return result;
  }
  private error(code: string, message: string, stage: string, retryable: boolean, underlying_tool_error?: string): HarError { return new HarError({ apiVersion: "har/v1", kind: "ErrorEnvelope", id: `err-arduino-${crypto.randomUUID()}`, code, category: "toolchain_failure", message, stage, retryable, evidence: [], ...(underlying_tool_error === undefined ? {} : { underlying_tool_error }) }); }
}

function parseMemoryUsage(output: string): { flash?: number; ram?: number } {
  const flash = /(?:Sketch uses|Program size:)\s*([\d,]+)\s*bytes/i.exec(output)?.[1];
  const ram = /(?:Global variables use|Data size:)\s*([\d,]+)\s*bytes/i.exec(output)?.[1];
  return { ...(flash === undefined ? {} : { flash: Number(flash.replaceAll(",", "")) }), ...(ram === undefined ? {} : { ram: Number(ram.replaceAll(",", "")) }) };
}
