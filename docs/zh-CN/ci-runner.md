# Hardware CI Runner

本地 CI Runner 运行指定实验，输出 JSON 与 Markdown 报告，不依赖云服务：

```bash
npm run ci -- \
  --project . \
  --suite examples/experiments/blink-led-v1.yaml \
  --sketch examples/sketches/BlinkHeartbeat \
  --fqbn esp32:esp32:esp32:UploadSpeed=115200 \
  --port /dev/cu.usbserial-10
```

退出码：`0` 通过、`1` 失败或不确定、`2` 被阻止。Runner 是严格无头模式：需要人工操作的实验必须标为 blocked，绝不会默认通过。报告默认写入 `.har/reports/`。
