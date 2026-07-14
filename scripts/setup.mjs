import { spawnSync } from "node:child_process";

const targetIndex = process.argv.indexOf("--target");
const target = targetIndex < 0 ? "esp32" : process.argv[targetIndex + 1];
if (process.argv.includes("--help") || !["esp32", "avr", "both"].includes(target)) {
  console.log("Usage: npm run setup -- --target esp32|avr|both\nDefault target: esp32");
  process.exit(process.argv.includes("--help") ? 0 : 2);
}
const result = spawnSync("arduino-cli", ["version"], { stdio: "ignore" });
if (result.status !== 0) {
  console.error("Arduino CLI is required. Install it first: macOS: brew install arduino-cli; Windows: winget install ArduinoSA.CLI; Linux: see https://arduino.github.io/arduino-cli/latest/installation/");
  process.exit(1);
}
function run(args) { const command = spawnSync("arduino-cli", args, { stdio: "inherit" }); if (command.status !== 0) process.exit(command.status ?? 1); }
run(["core", "update-index"]);
if (target === "esp32" || target === "both") run(["core", "install", "esp32:esp32"]);
if (target === "avr" || target === "both") run(["core", "install", "arduino:avr"]);
console.log(`HAR setup complete for ${target}. Next: npm run mcp:install`);
