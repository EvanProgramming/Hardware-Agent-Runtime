import { join } from "node:path";
import { DriverRegistry, ProjectService, SqliteProjectStore } from "@carduino/core";
import { ArduinoCliAdapter } from "@carduino/arduino-cli";

function usage(): never { console.error("Usage: har project create <directory> [id] | har project show <directory> <id> | har environment | har board list | har drivers list [directory] | har compile <sketch> <fqbn> | har flash <sketch> <fqbn> <port> | har serial capture <port> <baud> <durationMs>"); process.exit(2); }
const [, , group, action, ...rest] = process.argv;

async function main(): Promise<void> {
  if (group === "project") {
    const [directory, projectId] = rest; if (directory === undefined) usage();
    const store = new SqliteProjectStore(join(directory, ".har", "project.sqlite")); const projects = new ProjectService(store);
    try {
      if (action === "create") console.log(JSON.stringify(projects.create(projectId === undefined ? {} : { id: projectId }), null, 2));
      else if (action === "show" && projectId !== undefined) console.log(JSON.stringify(projects.load(projectId), null, 2)); else usage();
    } finally { store.close(); }
    return;
  }
  const arduino = new ArduinoCliAdapter();
  if (group === "environment") console.log(JSON.stringify({ arduinoCli: await arduino.inspect() }, null, 2));
  else if (group === "board" && action === "list") console.log(JSON.stringify(await arduino.discover(), null, 2));
  else if (group === "drivers" && action === "list") { const registry = new DriverRegistry(); registry.loadDirectory(rest[0] ?? join(process.cwd(), "examples", "drivers")); console.log(JSON.stringify(registry.list(), null, 2)); }
  else if (group === "compile" && action !== undefined) console.log(JSON.stringify(await arduino.compile({ sketchPath: action, fqbn: rest[0] ?? usage() }), null, 2));
  else if (group === "flash" && action !== undefined) console.log(JSON.stringify(await arduino.flash({ sketchPath: action, fqbn: rest[0] ?? usage(), port: rest[1] ?? usage() }), null, 2));
  else if (group === "serial" && action === "capture") console.log(JSON.stringify(await arduino.capture(rest[0] ?? usage(), Number(rest[1] ?? usage()), Number(rest[2] ?? usage())), null, 2));
  else usage();
}
main().catch((error: unknown) => { console.error(JSON.stringify(error instanceof Error && "envelope" in error ? (error as { envelope: unknown }).envelope : { message: error instanceof Error ? error.message : String(error) }, null, 2)); process.exitCode = 1; });
