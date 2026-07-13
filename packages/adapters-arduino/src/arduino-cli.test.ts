import { describe, expect, it } from "vitest";
import { ArduinoCliAdapter } from "./arduino-cli.js";
import type { CommandRunner } from "@carduino/core";

class FakeRunner implements CommandRunner {
  public constructor(private readonly response: { exitCode: number; stdout: string; stderr: string; timedOut: boolean }) {}
  public async run(): Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean }> { return this.response; }
}
describe("ArduinoCliAdapter", () => {
  it("normalizes Arduino board-list JSON without leaking CLI details", async () => {
    const adapter = new ArduinoCliAdapter(new FakeRunner({ exitCode: 0, stderr: "", timedOut: false, stdout: '{"detected_ports":[{"port":{"address":"/dev/cu.usb","protocol":"serial"},"matching_boards":[{"name":"Uno","fqbn":"arduino:avr:uno"}]}]}' }));
    await expect(adapter.discover()).resolves.toEqual([expect.objectContaining({ port: "/dev/cu.usb", fqbn: "arduino:avr:uno" })]);
  });
  it("returns structured compile failures", async () => {
    const adapter = new ArduinoCliAdapter(new FakeRunner({ exitCode: 1, stderr: "bad sketch", timedOut: false, stdout: "" }));
    await expect(adapter.compile({ sketchPath: "blink", fqbn: "arduino:avr:uno" })).resolves.toMatchObject({ success: false, stderr: "bad sketch" });
  });
});
