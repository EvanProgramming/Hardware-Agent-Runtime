import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { HarError } from "./errors.js";
import type { ProjectState, RuntimeEvent } from "./models.js";

export interface ProjectStore {
  create(project: ProjectState): void;
  load(projectId: string): ProjectState | undefined;
  save(project: ProjectState, event: Omit<RuntimeEvent, "sequence">): RuntimeEvent;
  events(projectId: string): RuntimeEvent[];
  close(): void;
}

/** SQLite persistence with one transaction for aggregate mutation and its audit event. */
export class SqliteProjectStore implements ProjectStore {
  private readonly db: Database.Database;

  public constructor(filename: string) {
    mkdirSync(dirname(filename), { recursive: true });
    this.db = new Database(filename);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runtime_events (project_id TEXT NOT NULL, sequence INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(project_id, sequence));");
  }

  public create(project: ProjectState): void {
    const result = this.db.prepare("INSERT OR IGNORE INTO projects(id, value) VALUES (?, ?)").run(project.id, JSON.stringify(project));
    if (result.changes !== 1) throw this.notFound("PROJECT_ALREADY_EXISTS", `Project ${project.id} already exists.`, false);
  }

  public load(projectId: string): ProjectState | undefined {
    const row = this.db.prepare("SELECT value FROM projects WHERE id = ?").get(projectId) as { value: string } | undefined;
    return row === undefined ? undefined : JSON.parse(row.value) as ProjectState;
  }

  public save(project: ProjectState, event: Omit<RuntimeEvent, "sequence">): RuntimeEvent {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (this.load(project.id) === undefined) throw this.notFound("PROJECT_NOT_FOUND", `Project ${project.id} does not exist.`, false);
      const row = this.db.prepare("SELECT COALESCE(MAX(sequence), 0) AS sequence FROM runtime_events WHERE project_id = ?").get(project.id) as { sequence: number };
      const persisted: RuntimeEvent = { ...event, sequence: row.sequence + 1 };
      this.db.prepare("UPDATE projects SET value = ? WHERE id = ?").run(JSON.stringify(project), project.id);
      this.db.prepare("INSERT INTO runtime_events(project_id, sequence, value) VALUES (?, ?, ?)").run(project.id, persisted.sequence, JSON.stringify(persisted));
      this.db.exec("COMMIT");
      return persisted;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  public events(projectId: string): RuntimeEvent[] {
    return (this.db.prepare("SELECT value FROM runtime_events WHERE project_id = ? ORDER BY sequence").all(projectId) as { value: string }[]).map((row) => JSON.parse(row.value) as RuntimeEvent);
  }
  public close(): void { this.db.close(); }

  private notFound(code: string, message: string, retryable: boolean): HarError {
    return new HarError({ apiVersion: "har/v1", kind: "ErrorEnvelope", id: `err-store-${crypto.randomUUID()}`, code, category: "runtime_failure", message, stage: "persistence", retryable, evidence: [] });
  }
}
