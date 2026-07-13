# 本地 CI

默认的无硬件 CI 是：

```bash
npm run check
npm test
```

要求真实硬件的测试只有在显式选择开发板时才可运行，绝不自动选择 macOS/Linux/Windows 的系统串口。目标命令是：

```bash
har ci run --project <path> --suite <suite>
```

严格无头模式中，要求人工操作的实验必须标为 **blocked**，绝不能默认为通过。
