# ESP32 Dev Module setup

HAR supports Arduino CLI FQBN `esp32:esp32:esp32` for a standard ESP32 Dev Module. Install the ESP32 Arduino Core before connecting or compiling:

```bash
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli core list
```

The ESP32 Core downloads a large compiler toolchain (hundreds of MB). Let the command complete once; interrupted downloads can normally resume from Arduino CLI's cache.

Use the same `examples/sketches/BlinkHeartbeat` sketch, but set `fqbn` to `esp32:esp32:esp32`. After connecting the board, use `inspect_environment` and select the detected USB serial port. If upload waits on a connection, hold **BOOT** while it starts connecting, then release it; this is board/USB-bridge dependent.

ESP32 GPIO is 3.3V. Never connect a 5V signal directly to an ESP32 GPIO. In particular, HC-SR04 `ECHO` must pass through a suitable level shifter or resistor divider. `LED_BUILTIN` is supported by many Dev Module variants, but some boards have no onboard LED or wire it to a different pin; use serial `HEARTBEAT` plus human confirmation rather than assuming a visible LED.

The Arduino adapter does not hardcode AVR behavior: discovery, compile and upload use the selected FQBN. Real upload and serial-recovery validation remains pending until the physical ESP32 is connected.
