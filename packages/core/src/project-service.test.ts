import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HarError, ProjectService, SqliteProjectStore } from "./index.js";

const folders: string[] = [];
function createService(): { service: ProjectService; store: SqliteProjectStore } {
  const dir = mkdtempSync(join(tmpdir(), "har-core-")); folders.push(dir);
  const store = new SqliteProjectStore(join(dir, "project.sqlite"));
  return { store, service: new ProjectService(store, () => new Date("2026-07-13T00:00:00Z")) };
}
afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }); });

describe("ProjectService", () => {
  it("persists a project and its mutation event atomically", () => {
    const { service, store } = createService(); const project = service.create({ id: "demo" });
    const result = service.patch(project.id, 1, { lifecycle: "hardware_planning" });
    expect(store.load("demo")?.revision).toBe(2); expect(result.event.sequence).toBe(1); expect(store.events("demo")).toHaveLength(1);
    store.close();
  });
  it("rejects stale revisions and invalid lifecycle transitions", () => {
    const { service, store } = createService(); service.create({ id: "demo" });
    expect(() => service.patch("demo", 2, {})).toThrow(HarError);
    expect(() => service.patch("demo", 1, { lifecycle: "flashing" })).toThrow(/Cannot transition/);
    store.close();
  });
  it("prepares a new project for build with a durable hardware model", () => {
    const { service, store } = createService(); const project = service.create({ id: "demo" });
    const prepared = service.prepareHardware(project.id, project.revision, { components: [], connections: [] });
    expect(prepared.lifecycle).toBe("ready_to_build"); expect(prepared.revision).toBe(4);
    store.close();
  });
});
