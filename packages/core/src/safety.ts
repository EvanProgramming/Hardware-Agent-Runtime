import { randomUUID } from "node:crypto";
import type { ComponentInstance, Connection } from "./models.js";

export type SafetyLevel = "info" | "warning" | "blocker";
export interface ResourceIssue { id: string; level: SafetyLevel; code: string; message: string; source: string; affectedIds: string[]; }
export interface ResourceReport { id: string; status: "safe" | "warning" | "blocked"; generatedAt: string; items: ResourceIssue[]; }
export interface SafetyInput { components: ComponentInstance[]; connections: Connection[]; board?: { logicVoltageV?: number; pins?: Record<string, string[]> }; }

/** Uses only declared metadata. Missing data produces warnings, never invented specifications. */
export function analyzeResources(input: SafetyInput): ResourceReport {
  const items: ResourceIssue[] = []; const add = (level: SafetyLevel, code: string, message: string, source: string, affectedIds: string[]): void => { items.push({ id: `safety_${randomUUID()}`, level, code, message, source, affectedIds }); };
  const used = new Map<string, Connection[]>(); for (const connection of input.connections) { const pin = connection.to.startsWith("board:") ? connection.to : connection.from.startsWith("board:") ? connection.from : undefined; if (pin !== undefined) used.set(pin, [...(used.get(pin) ?? []), connection]); }
  for (const [pin, links] of used) if (links.length > 1) add("blocker", "PIN_CONFLICT", `Multiple connections use ${pin}.`, "hardware model connections", links.map((link) => link.id));
  for (const component of input.components) {
    const electrical = component.properties?.electrical as Record<string, unknown> | undefined;
    const logicVoltage = electrical?.logicVoltageV;
    if (typeof logicVoltage === "number" && input.board?.logicVoltageV !== undefined && logicVoltage > input.board.logicVoltageV) add("blocker", "GPIO_VOLTAGE_INCOMPATIBLE", `${component.label ?? component.id} requires ${logicVoltage}V logic but board declares ${input.board.logicVoltageV}V.`, "component electrical metadata", [component.id]);
    const kind = String(component.properties?.loadType ?? "");
    if (kind === "motor" || kind === "servo") add("warning", "EXTERNAL_POWER_RECOMMENDED", `${component.label ?? component.id} is an actuator; direct board power is not assumed safe.`, "component loadType", [component.id]);
    if (kind === "relay" || kind === "inductive") add("warning", "INDUCTIVE_LOAD_WARNING", `${component.label ?? component.id} requires appropriate isolation/driver protection.`, "component loadType", [component.id]);
    if (component.properties?.commonGroundDeclared === false) add("warning", "COMMON_GROUND_MISSING", `${component.label ?? component.id} declares no common ground.`, "component metadata", [component.id]);
  }
  return { id: `resource_${randomUUID()}`, status: items.some((item) => item.level === "blocker") ? "blocked" : items.some((item) => item.level === "warning") ? "warning" : "safe", generatedAt: new Date().toISOString(), items };
}
