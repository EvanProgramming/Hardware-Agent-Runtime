import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { DriverRegistry } from "./drivers.js";
describe("DriverRegistry", () => {
  it("loads JSON and YAML metadata-only drivers", () => {
    const registry = new DriverRegistry();
    registry.loadDirectory(join(dirname(fileURLToPath(import.meta.url)), "../../../examples/drivers"));
    expect(registry.list().map((driver) => driver.id)).toEqual(["board.builtin-led", "sensor.temperature-humidity.dht22", "sensor.ultrasonic.hc-sr04"]);
  });
});
