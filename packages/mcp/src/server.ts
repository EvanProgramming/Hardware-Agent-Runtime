import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ArduinoCliAdapter } from "@carduino/arduino-cli";
import { DriverRegistry, ExperimentEngine, generateVerificationReport, ProjectService, SimpleSimulationAdapter, SqliteProjectStore } from "@carduino/core";
import { parse } from "yaml";
import { readFileSync } from "node:fs";

const text = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
function runtime(root: string) { const store = new SqliteProjectStore(join(root, ".har", "project.sqlite")); return { store, projects: new ProjectService(store), experiments: new ExperimentEngine(store), arduino: new ArduinoCliAdapter() }; }
export function createHarMcpServer(root = process.env.HAR_PROJECT_DIR ?? process.cwd()): McpServer {
  const server = new McpServer({ name: "carduino", version: "0.1.0" }, { instructions: "HAR controls local embedded tooling and records evidence. It is not an AI agent. Never claim a physical result without evidence or a human confirmation." });
  server.registerTool("inspect_environment", { description: "Inspect Arduino CLI and connected board candidates.", inputSchema: {} }, async () => { const r = runtime(root); try { return text({ arduinoCli: await r.arduino.inspect(), boards: await r.arduino.discover() }); } finally { r.store.close(); } });
  server.registerTool("create_project", { description: "Create a persisted HAR project.", inputSchema: { id: z.string().optional() } }, async ({ id }) => { const r = runtime(root); try { return text(r.projects.create(id === undefined ? {} : { id })); } finally { r.store.close(); } });
  server.registerTool("get_project_state", { description: "Load project state.", inputSchema: { projectId: z.string() } }, async ({ projectId }) => { const r = runtime(root); try { return text(r.projects.load(projectId)); } finally { r.store.close(); } });
  server.registerTool("list_drivers", { description: "List installed declarative hardware drivers.", inputSchema: { directory: z.string().optional() } }, async ({ directory }) => { const registry = new DriverRegistry(); registry.loadDirectory(directory ?? join(root, "examples", "drivers")); return text(registry.list()); });
  server.registerTool("simulate_experiment", { description: "Run deterministic behavioral simulation; results are explicitly simulated.", inputSchema: { ledOn: z.boolean().optional(), numericName: z.string().optional(), numericValue: z.number().optional() } }, async ({ ledOn, numericName, numericValue }) => text(new SimpleSimulationAdapter().simulate({ digitalInputs: ledOn === undefined ? {} : { LED_BUILTIN: ledOn }, numericStreams: numericName === undefined || numericValue === undefined ? {} : { [numericName]: [numericValue] } })));
  server.registerTool("run_experiment", { description: "Run a deterministic experiment and return a persisted human-action request when it pauses.", inputSchema: { definitionPath: z.string(), serialText: z.string().optional() } }, async ({ definitionPath, serialText }) => { const r = runtime(root); try { const definition = parse(readFileSync(definitionPath, "utf8")); return text(r.experiments.start(definition, serialText ?? "")); } finally { r.store.close(); } });
  server.registerTool("resume_experiment", { description: "Resume a persisted experiment after a schema-valid human response.", inputSchema: { definitionPath: z.string(), runId: z.string(), token: z.string(), confirmed: z.boolean() } }, async ({ definitionPath, runId, token, confirmed }) => { const r = runtime(root); try { return text(r.experiments.resume(parse(readFileSync(definitionPath, "utf8")), runId, token, { confirmed })); } finally { r.store.close(); } });
  server.registerTool("generate_runtime_report", { description: "Generate evidence-based JSON verification output for a persisted experiment run.", inputSchema: { projectId: z.string(), runId: z.string() } }, async ({ projectId, runId }) => { const r = runtime(root); try { const project = r.projects.load(projectId); const run = r.store.loadRecord<Parameters<typeof generateVerificationReport>[0]["run"]>("experiment_runs", runId); if (run === undefined) throw new Error("Experiment run not found"); return text(generateVerificationReport({ projectId, hardwareModelRevision: project.revision, run })); } finally { r.store.close(); } });
  return server;
}
if (import.meta.url === `file://${process.argv[1]}`) { const server = createHarMcpServer(); await server.connect(new StdioServerTransport()); }
