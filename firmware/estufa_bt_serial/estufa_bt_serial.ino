#include "BluetoothSerial.h"
#include <DHT.h>

BluetoothSerial SerialBT;

// =========================
// PINOS
// =========================

#define DHT_PIN 4
#define DHT_TYPE DHT11

#define SOIL_PIN 34  // ADC1 — AO do sensor de solo
#define LDR_PIN 35   // ADC1 — AO do LDR (divisor com resistor)

// LDR ativo: lê GPIO 35, mas só envia % se a leitura for estável (sensor presente).
// Pino solto = ADC instável → light=null (não inventa luminosidade).
#define LDR_SAMPLES 12
#define LDR_NOISE_FLOOR 120   // média abaixo disso → desconectado / curto
#define LDR_MAX_JITTER 180    // max-min entre amostras; flutuante costuma variar muito

#define PUMP_RELAY_PIN 26
#define LAMP_RELAY_PIN 27
#define FAN_RELAY_PIN 25

// Relé normalmente ACTIVE LOW
#define RELAY_ON LOW
#define RELAY_OFF HIGH

DHT dht(DHT_PIN, DHT_TYPE);

// =========================
// CALIBRAÇÃO DO SOLO (ADC 12-bit: 0–4095)
// Capacitivo típico: seco/no ar = valor ALTO, molhado = valor BAIXO.
// Faixa ampla por padrão para o % não “grudar” em 0 ou 100.
// Ajuste fino com Serial Monitor (115200) olhando soilRaw=.
// =========================

int SOIL_DRY = 3600;  // leitura no ar / solo bem seco
int SOIL_WET = 1200;  // leitura bem molhado / na água

// =========================
// ESTADOS
// =========================

bool pumpState = false;
bool lampState = false;
bool fanState = false;

float temperature = NAN;
float airHumidity = NAN;

int soilRaw = 0;
int soilMoisture = 0;

int ldrRaw = 0;
int lightPercent = 0;
bool lightValid = false;

// hasClient() às vezes falha em alguns cores — marcamos ao receber qualquer comando.
bool clientSeen = false;

unsigned long lastAutoStatusMs = 0;
const unsigned long AUTO_STATUS_MS = 2000;

// =========================
// FUNÇÕES
// =========================

int readAveragedAdc(int pin, int samples = 8) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / samples);
}

// Média + jitter: pino flutuante oscila; LDR com divisor fica estável.
bool readLdrStable(int pin, int *outAvg) {
  long sum = 0;
  int minV = 4095;
  int maxV = 0;

  for (int i = 0; i < LDR_SAMPLES; i++) {
    int v = analogRead(pin);
    sum += v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    delay(2);
  }

  int avg = (int)(sum / LDR_SAMPLES);
  int jitter = maxV - minV;
  *outAvg = avg;

  if (avg < LDR_NOISE_FLOOR) return false;
  if (jitter > LDR_MAX_JITTER) return false;
  return true;
}

int getSoilPercent(int raw) {
  // map com extremos invertidos (seco alto → 0%, molhado baixo → 100%)
  if (SOIL_DRY == SOIL_WET) {
    return 0;
  }
  int percent = map(raw, SOIL_DRY, SOIL_WET, 0, 100);
  return constrain(percent, 0, 100);
}

int getLightPercent(int raw) {
  int percent = map(raw, 0, 4095, 0, 100);
  return constrain(percent, 0, 100);
}

void readSoilAndLight() {
  // Solo primeiro — não depende do DHT (que pode bloquear ~250 ms).
  soilRaw = readAveragedAdc(SOIL_PIN);
  soilMoisture = getSoilPercent(soilRaw);

  int avg = 0;
  if (readLdrStable(LDR_PIN, &avg)) {
    ldrRaw = avg;
    lightValid = true;
    lightPercent = getLightPercent(avg);
  } else {
    ldrRaw = avg;
    lightValid = false;
    lightPercent = 0;
  }
}

void readDht() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // Mantém última leitura válida se o DHT falhar nesta rodada.
  if (!isnan(temp)) {
    temperature = temp;
  }
  if (!isnan(hum)) {
    airHumidity = hum;
  }
}

void readSensors() {
  readSoilAndLight();
  readDht();
}

void setPump(bool state) {
  pumpState = state;
  digitalWrite(PUMP_RELAY_PIN, state ? RELAY_ON : RELAY_OFF);
  SerialBT.print("Bomba: ");
  SerialBT.println(state ? "LIGADA" : "DESLIGADA");
}

void setLamp(bool state) {
  lampState = state;
  digitalWrite(LAMP_RELAY_PIN, state ? RELAY_ON : RELAY_OFF);
  SerialBT.print("Lampada: ");
  SerialBT.println(state ? "LIGADA" : "DESLIGADA");
}

void setFan(bool state) {
  fanState = state;
  digitalWrite(FAN_RELAY_PIN, state ? RELAY_ON : RELAY_OFF);
  SerialBT.print("Ventoinha: ");
  SerialBT.println(state ? "LIGADA" : "DESLIGADA");
}

void sendStatus() {
  // Solo sempre atualizado mesmo se o DHT travar/falhar depois.
  readSoilAndLight();
  readDht();

  // Debug no USB Serial — confirme se o AO muda ao molhar o sensor
  Serial.print("soilRaw=");
  Serial.print(soilRaw);
  Serial.print(" soil%=");
  Serial.print(soilMoisture);
  Serial.print(" ldrRaw=");
  Serial.print(ldrRaw);
  Serial.print(" light=");
  Serial.println(lightValid ? String(lightPercent) : "null");

  SerialBT.println("BEGIN_STATUS");

  SerialBT.print("temperature=");
  if (isnan(temperature)) {
    SerialBT.println("null");
  } else {
    SerialBT.println(temperature, 1);
  }

  SerialBT.print("airHumidity=");
  if (isnan(airHumidity)) {
    SerialBT.println("null");
  } else {
    SerialBT.println(airHumidity, 1);
  }

  SerialBT.print("soilMoisture=");
  SerialBT.println(soilMoisture);

  SerialBT.print("soilRaw=");
  SerialBT.println(soilRaw);

  SerialBT.print("light=");
  if (lightValid) {
    SerialBT.println(lightPercent);
  } else {
    SerialBT.println("null");
  }

  // lightRaw sempre enviado p/ debug (mesmo com light=null)
  SerialBT.print("lightRaw=");
  SerialBT.println(ldrRaw);

  SerialBT.print("pump=");
  SerialBT.println(pumpState ? "true" : "false");

  SerialBT.print("lamp=");
  SerialBT.println(lampState ? "true" : "false");

  SerialBT.print("fan=");
  SerialBT.println(fanState ? "true" : "false");

  SerialBT.println("END_STATUS");
}

void handleBluetooth() {
  if (!SerialBT.available()) {
    return;
  }

  String command = SerialBT.readStringUntil('\n');
  command.trim();
  command.toUpperCase();

  if (command.length() == 0) {
    return;
  }

  clientSeen = true;

  if (command == "STATUS") {
    sendStatus();
  } else if (command == "PUMP ON") {
    setPump(true);
    sendStatus();
  } else if (command == "PUMP OFF") {
    setPump(false);
    sendStatus();
  } else if (command == "LAMP ON") {
    setLamp(true);
    sendStatus();
  } else if (command == "LAMP OFF") {
    setLamp(false);
    sendStatus();
  } else if (command == "FAN ON") {
    setFan(true);
    sendStatus();
  } else if (command == "FAN OFF") {
    setFan(false);
    sendStatus();
  } else {
    SerialBT.println("Comando desconhecido");
  }
}

void setup() {
  Serial.begin(115200);

  // ADC full-scale ~3.3V (importante p/ AO do sensor de solo)
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_PIN, ADC_11db);

  // Bluetooth Classic Serial (SPP)
  SerialBT.begin("EstufaESP32");

  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(LAMP_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);

  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  digitalWrite(LAMP_RELAY_PIN, RELAY_OFF);
  digitalWrite(FAN_RELAY_PIN, RELAY_OFF);

  // GPIO 34/35 são só entrada analógica — não use pinMode digital neles
  dht.begin();

  Serial.println("Bluetooth iniciado");
  Serial.println("Nome: EstufaESP32");
  Serial.println("Solo AO -> GPIO 34");
  Serial.println("LDR AO -> GPIO 35 (light=null se pino flutuante/instável)");
  SerialBT.println("EstufaESP32 pronta");

  // Primeira leitura de solo no boot (mesmo sem cliente BT)
  readSoilAndLight();
  Serial.print("boot soilRaw=");
  Serial.print(soilRaw);
  Serial.print(" soil%=");
  Serial.print(soilMoisture);
  Serial.print(" ldrRaw=");
  Serial.print(ldrRaw);
  Serial.print(" light=");
  Serial.println(lightValid ? String(lightPercent) : "null");

  lastAutoStatusMs = millis();
}

void loop() {
  handleBluetooth();

  unsigned long now = millis();
  if (now - lastAutoStatusMs >= AUTO_STATUS_MS) {
    lastAutoStatusMs = now;
    // STATUS sob comando sempre funciona; auto-envio se houver cliente.
    if (SerialBT.hasClient() || clientSeen) {
      sendStatus();
    }
  }

  delay(20);
}
