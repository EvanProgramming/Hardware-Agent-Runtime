import { join } from "node:path";
import { ProjectService, SqliteProjectStore } from "@carduino/core";

function usage(): never { console.error("Usage: har project create <directory> [id] | har project show <directory> <id>"); process.exit(2); }
const [, , group, action, directory, projectId] = process.argv;
if (group !== "project" || directory === undefined) usage();
const store = new SqliteProjectStore(join(directory, ".har", "project.sqlite"));
const projects = new ProjectService(store);
try {
  if (action === "create") console.log(JSON.stringify(projects.create(projectId === undefined ? {} : { id: projectId }), null, 2));
  else if (action === "show" && projectId !== undefined) console.log(JSON.stringify(projects.load(projectId), null, 2));
  else usage();
} finally { store.close(); }
