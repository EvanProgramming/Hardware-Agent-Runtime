import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FlashAndObserveService } from "./flash-observe.js";
import { ProjectService } from "./project-service.js";
import { SqliteProjectStore } from "./persistence.js";
const dirs: string[] = []; afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
describe("FlashAndObserveService", () => it("returns diagnostics rather than raw CLI output alone", async () => {
  const dir = mkdtempSync(join(tmpdir(), "har-flash-")); dirs.push(dir); const store = new SqliteProjectStore(join(dir, "project.sqlite")); const projects = new ProjectService(store); const project = projects.create({ id: "p" });
  let revision = 1; for (const lifecycle of ["hardware_planning", "ready_to_build"] as const) { projects.patch("p", revision++, { lifecycle }); }
  const result = await new FlashAndObserveService(projects, { toolchain: { id: "fake", inspect: async () => ({ installed: true }), compile: async () => ({ success: true, fqbn: "uno", stdout: "", stderr: "" }) }, flash: { flash: async () => ({ success: true, fqbn: "uno", port: "fake", stdout: "", stderr: "" }) }, serial: { capture: async () => ({ port: "fake", baudRate: 115200, openedAt: "", closedAt: "", rawBase64: "", text: "HEARTBEAT\n" }) }, usb: { snapshot: async () => [] }, boards: { discover: async () => [] } }).execute({ projectId: project.id, expectedRevision: revision, sketchPath: "blink", fqbn: "uno", port: "fake" });
  expect(result.status).toBe("completed"); expect(result.diagnostics?.summary.lineCount).toBe(1); store.close();
}));
