/*
 ============================================================
   ESTUFA INTELIGENTE — ESP32 BLE
 ============================================================

 O celular conecta por Bluetooth Low Energy (BLE).
 Não depende de Wi‑Fi para o controle do app.

 Sensores  → ESP32  → BLE  → App Expo
 App       → BLE    → ESP32 → Relés

 ------------------------------------------------------------
 SENSORES
 ------------------------------------------------------------
 DHT11 ............... GPIO 4
 Solo ................ GPIO 34
 LDR ................. GPIO 35

 ------------------------------------------------------------
 RELÉS
 ------------------------------------------------------------
 Bomba ............... GPIO 26
 Lâmpada ............. GPIO 27
 Ventoinha ........... GPIO 25

 ------------------------------------------------------------
 BLE
 ------------------------------------------------------------
 Nome anunciado: Estufa-01
 Service UUID:   4fafc201-1fb5-459e-8fcc-c5c9c331914b
 Status  UUID:   beb5483e-36e1-4688-b7f5-ea07361b26a8  (notify/read JSON)
 Command UUID:   beb5483e-36e1-4688-b7f5-ea07361b26a9  (write JSON)

 Status JSON exemplo:
 {"device_id":"estufa-01","temperature":28.5,"air_humidity":65,
  "soil_moisture":53,"light":null,"pump":false,"lamp":false,"fan":true}
 (light=null se GPIO 35 flutuante; com LDR estável, light vira 0–100)

 Command JSON exemplo:
 {"pump":true,"lamp":false,"fan":true}
 ============================================================
*/

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include <DHT.h>
#include <ArduinoJson.h>

// ------------------------------------------------------------
// PINOS
// ------------------------------------------------------------
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define SOIL_PIN 34
#define LDR_PIN 35

// LDR ativo: lê GPIO 35, mas só envia % se a leitura for estável (sensor presente).
// Pino solto = ADC instável → light=null (não inventa luminosidade).
#define LDR_SAMPLES 12
#define LDR_NOISE_FLOOR 120
#define LDR_MAX_JITTER 180

#define PUMP_RELAY_PIN 26
#define LAMP_RELAY_PIN 27
#define FAN_RELAY_PIN 25

#define RELAY_ON LOW
#define RELAY_OFF HIGH

// Calibração solo (ajuste depois)
int SOIL_DRY = 3500;
int SOIL_WET = 1200;

// Identidade BLE / app
const char* DEVICE_ID = "estufa-01";
const char* BLE_NAME = "Estufa-01";

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define STATUS_CHAR_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define COMMAND_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a9"

const unsigned long SENSOR_INTERVAL = 2000;
const unsigned long STATUS_NOTIFY_INTERVAL = 2000;

DHT dht(DHT_PIN, DHT_TYPE);

float temperature = NAN;
float airHumidity = NAN;
int soilRaw = 0;
int soilMoisture = 0;
int ldrRaw = 0;
int lightPercent = 0;
bool lightValid = false;

bool pumpState = false;
bool lampState = false;
bool fanState = false;

bool deviceConnected = false;
bool oldDeviceConnected = false;

unsigned long lastSensorRead = 0;
unsigned long lastStatusNotify = 0;

BLEServer* pServer = nullptr;
BLECharacteristic* pStatusCharacteristic = nullptr;
BLECharacteristic* pCommandCharacteristic = nullptr;

void setPump(bool state) {
  if (pumpState == state) return;
  pumpState = state;
  digitalWrite(PUMP_RELAY_PIN, state ? RELAY_ON : RELAY_OFF);
  Serial.print("[BOMBA] ");
  Serial.println(state ? "LIGADA" : "DESLIGADA");
}

void setLamp(bool state) {
  if (lampState == state) return;
  lampState = state;
  digitalWrite(LAMP_RELAY_PIN, state ? RELAY_ON : RELAY_OFF);
  Serial.print("[LAMPADA] ");
  Serial.println(state ? "LIGADA" : "DESLIGADA");
}

void setFan(bool state) {
  if (fanState == state) return;
  fanState = state;
  digitalWrite(FAN_RELAY_PIN, state ? RELAY_ON : RELAY_OFF);
  Serial.print("[VENTOINHA] ");
  Serial.println(state ? "LIGADA" : "DESLIGADA");
}

int getSoilMoisture(int raw) {
  int percent = map(raw, SOIL_DRY, SOIL_WET, 0, 100);
  return constrain(percent, 0, 100);
}

int getLightPercent(int raw) {
  int percent = map(raw, 0, 4095, 0, 100);
  return constrain(percent, 0, 100);
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

void readSensors() {
  float newTemperature = dht.readTemperature();
  float newHumidity = dht.readHumidity();

  if (!isnan(newTemperature)) temperature = newTemperature;
  if (!isnan(newHumidity)) airHumidity = newHumidity;

  soilRaw = analogRead(SOIL_PIN);
  soilMoisture = getSoilMoisture(soilRaw);

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

  Serial.println("========== SENSORES ==========");
  Serial.print("Temp: ");
  Serial.println(isnan(temperature) ? -999 : temperature);
  Serial.print("Ar: ");
  Serial.println(isnan(airHumidity) ? -999 : airHumidity);
  Serial.print("Solo: ");
  Serial.println(soilMoisture);
  Serial.print("Luz: ");
  Serial.println(lightValid ? String(lightPercent) : "null");
  Serial.println("==============================");
}

String buildStatusJson() {
  String json = "{";
  json += "\"device_id\":\"";
  json += DEVICE_ID;
  json += "\",";

  json += "\"temperature\":";
  if (isnan(temperature)) json += "null";
  else json += String(temperature, 1);
  json += ",";

  json += "\"air_humidity\":";
  if (isnan(airHumidity)) json += "null";
  else json += String(airHumidity, 1);
  json += ",";

  json += "\"soil_moisture\":";
  json += String(soilMoisture);
  json += ",";

  json += "\"light\":";
  if (lightValid) json += String(lightPercent);
  else json += "null";
  json += ",";

  json += "\"pump\":";
  json += pumpState ? "true" : "false";
  json += ",";

  json += "\"lamp\":";
  json += lampState ? "true" : "false";
  json += ",";

  json += "\"fan\":";
  json += fanState ? "true" : "false";
  json += "}";
  return json;
}

void notifyStatus() {
  if (!deviceConnected || pStatusCharacteristic == nullptr) return;
  String payload = buildStatusJson();
  pStatusCharacteristic->setValue(payload.c_str());
  pStatusCharacteristic->notify();
  Serial.print("[BLE] status -> ");
  Serial.println(payload);
}

void applyCommandJson(const String& input) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, input);
  if (error) {
    Serial.print("[BLE] JSON invalido: ");
    Serial.println(error.c_str());
    return;
  }

  if (!doc["pump"].isNull()) setPump(doc["pump"] | false);
  if (!doc["lamp"].isNull()) setLamp(doc["lamp"] | false);
  if (!doc["fan"].isNull()) setFan(doc["fan"] | false);

  notifyStatus();
}

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("[BLE] App conectado");
  }

  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    Serial.println("[BLE] App desconectado");
  }
};

class CommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    String value = characteristic->getValue();
    if (value.length() == 0) return;
    Serial.print("[BLE] comando <- ");
    Serial.println(value);
    applyCommandJson(value);
  }
};

void setupBle() {
  BLEDevice::init(BLE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pStatusCharacteristic = pService->createCharacteristic(
    STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusCharacteristic->addDescriptor(new BLE2902());
  pStatusCharacteristic->setValue("{}");

  pCommandCharacteristic = pService->createCharacteristic(
    COMMAND_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pCommandCharacteristic->setCallbacks(new CommandCallbacks());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Anunciando como Estufa-01");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("================================");
  Serial.println("  ESTUFA ONLINE - ESP32 BLE");
  Serial.println("================================");

  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(LAMP_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  digitalWrite(LAMP_RELAY_PIN, RELAY_OFF);
  digitalWrite(FAN_RELAY_PIN, RELAY_OFF);

  // GPIO 34/35 são só entrada analógica — não use pinMode digital neles
  dht.begin();

  Serial.println("LDR AO -> GPIO 35 (light=null se pino flutuante/instável)");

  setupBle();
  readSensors();
  notifyStatus();
}

void loop() {
  unsigned long now = millis();

  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    readSensors();
  }

  if (deviceConnected && now - lastStatusNotify >= STATUS_NOTIFY_INTERVAL) {
    lastStatusNotify = now;
    notifyStatus();
  }

  // Reinicia advertising após desconectar
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Advertising reiniciado");
    oldDeviceConnected = deviceConnected;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(20);
}
