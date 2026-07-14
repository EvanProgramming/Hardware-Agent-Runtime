# ESP32 Dev Module 配置

HAR 支持标准 ESP32 Dev Module 的 Arduino CLI FQBN：`esp32:esp32:esp32`。连接或编译前先安装 ESP32 Arduino Core：

```bash
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli core list
```

ESP32 Core 会下载数百 MB 的编译工具链。请让命令完整执行一次；中断下载通常可从 Arduino CLI 缓存继续。

使用同一份 `examples/sketches/BlinkHeartbeat`，但将 `fqbn` 设为 `esp32:esp32:esp32:UploadSpeed=115200`。接板后先调用 `inspect_environment`，选择发现的 USB 串口。若上传连接阶段卡住，请在开始连接时按住 **BOOT**，待连接后松开；是否需要取决于开发板与 USB 转串口芯片。部分 CH340 USB 串口链路在默认 921600 上传速率下不稳定，先使用 115200 更安全。

ESP32 GPIO 是 **3.3V**。绝不能将 5V 信号直接接到 ESP32 GPIO。特别是 HC-SR04 的 `ECHO` 必须通过合适的电平转换器或电阻分压。很多 Dev Module 支持 `LED_BUILTIN`，但有些板没有板载 LED 或 LED 引脚不同；应结合串口 `HEARTBEAT` 和人工确认，不要假设一定可见闪烁。

Arduino 适配器不会硬编码 AVR 行为：发现、编译和上传均使用所选 FQBN。本项目已在 CH340 端口上的 ESP32-D0WD-V3 以 115200 上传速率完成编译和烧录验证，并在烧录后观察到串口 `HEARTBEAT` 输出。
