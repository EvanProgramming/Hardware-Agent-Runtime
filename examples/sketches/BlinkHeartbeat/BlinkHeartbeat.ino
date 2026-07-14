#ifndef LED_BUILTIN
// Generic ESP32 Dev Module variants commonly route an optional onboard LED to GPIO2.
// Serial HEARTBEAT remains the authoritative runtime signal when no LED is present.
#define LED_BUILTIN 2
#endif

const unsigned long intervalMs = 500;
unsigned long previousMs = 0;
bool ledOn = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("STARTUP");
}

void loop() {
  const unsigned long now = millis();
  if (now - previousMs >= intervalMs) {
    previousMs = now;
    ledOn = !ledOn;
    digitalWrite(LED_BUILTIN, ledOn ? HIGH : LOW);
    Serial.println("HEARTBEAT");
  }
}
