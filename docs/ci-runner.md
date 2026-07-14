# Hardware CI runner

Run the local CI runner with selected experiment files. It writes JSON and Markdown reports and has no cloud dependency.

```bash
npm run ci -- \
  --project . \
  --suite examples/experiments/blink-led-v1.yaml \
  --sketch examples/sketches/BlinkHeartbeat \
  --fqbn esp32:esp32:esp32:UploadSpeed=115200 \
  --port /dev/cu.usbserial-10
```

Exit codes: `0` passed, `1` failed/inconclusive, `2` blocked. The runner is intentionally strict and headless: any experiment requiring a human action is marked blocked, never passed. Reports default to `.har/reports/`.
