# Firmware ESP32 — Bluetooth Classic Serial

Controle ao vivo pelo app. **Supabase fica para o futuro** (salvar leituras periódicas e mostrar em gráficos/histórico).

```
Agora:     Sensores/Relés ↔ ESP32 ↔ Bluetooth Serial ↔ App
Futuro:    ESP32/App → Supabase → telas de histórico
```

## Sketch oficial

[`estufa_bt_serial/estufa_bt_serial.ino`](estufa_bt_serial/estufa_bt_serial.ino)

Baseado no seu `BluetoothSerial.h`:
- Nome BT: **EstufaESP32**
- Comandos: `STATUS`, `PUMP ON/OFF`, `LAMP ON/OFF`, `FAN ON/OFF`
- Resposta de status entre `BEGIN_STATUS` e `END_STATUS`

## Como testar

1. Grave o `.ino` no ESP32 (placa com Bluetooth Classic — ESP32 clássico).
2. Serial USB 115200: `Bluetooth iniciado` / `Nome: EstufaESP32`.
3. No **Android**, Configurações → Bluetooth → parear **EstufaESP32**.
4. App (development build):
   ```bash
   npx expo run:android
   ```
5. Tela Offline → Buscar → Conectar.

## Observação iOS

Bluetooth Classic SPP do ESP32 **quase nunca funciona no iPhone** (Apple exige MFi). Use Android para este protocolo.

## Supabase (depois)

Quando for a hora: o ESP32 (ou o app) grava pontos em `sensor_history` de tempos em tempos; as telas Gráficos/Histórico passam a ler o banco. O controle em tempo real continua no Bluetooth.
