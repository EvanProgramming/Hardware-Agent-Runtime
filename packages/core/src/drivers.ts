import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { parse } from "yaml";
import { HarError } from "./errors.js";

export interface DriverDefinition { apiVersion: "har/v1"; kind: "DriverDefinition"; id: string; version: string; capabilities: string[]; electrical?: Record<string, unknown>; compatibleBoards?: string[]; pinConstraints?: Record<string, unknown>; wiring?: Record<string, unknown>; requiredFirmwareLibraries?: string[]; knownIssues?: string[]; dataParsing?: Record<string, unknown>; experimentTemplates?: string[]; humanActionTemplates?: string[]; }
export class DriverRegistry {
  private readonly drivers = new Map<string, DriverDefinition>();
  public loadDirectory(directory: string): void { for (const name of readdirSync(directory)) if ([".json", ".yaml", ".yml"].includes(extname(name))) this.loadText(readFileSync(join(directory, name), "utf8"), name); }
  public loadText(content: string, source = "inline"): void { const value: unknown = source.endsWith(".json") ? JSON.parse(content) : parse(content); if (!isDriver(value)) throw new HarError({ apiVersion: "har/v1", kind: "ErrorEnvelope", id: `err-driver-${crypto.randomUUID()}`, code: "INVALID_DRIVER", category: "runtime_failure", message: `Driver ${source} does not meet the v1 metadata contract.`, stage: "driver_load", retryable: false, evidence: [] }); this.drivers.set(value.id, value); }
  public list(): DriverDefinition[] { return [...this.drivers.values()].sort((a, b) => a.id.localeCompare(b.id)); }
  public get(id: string): DriverDefinition | undefined { return this.drivers.get(id); }
}
function isDriver(value: unknown): value is DriverDefinition { if (typeof value !== "object" || value === null) return false; const candidate = value as Record<string, unknown>; return candidate.apiVersion === "har/v1" && candidate.kind === "DriverDefinition" && typeof candidate.id === "string" && typeof candidate.version === "string" && Array.isArray(candidate.capabilities) && candidate.capabilities.every((item) => typeof item === "string"); }
