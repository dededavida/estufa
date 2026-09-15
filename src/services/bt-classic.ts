import { PermissionsAndroid, Platform } from 'react-native';

import {
  BT_DEVICE_NAME,
  parseStatusBlock,
  type BtStatusPayload,
} from '@/lib/bt-protocol';

export type ScannedBtDevice = {
  id: string;
  name: string;
  address: string;
};

type BtDevice = {
  id: string;
  name?: string | null;
  address: string;
  connected?: boolean;
  connect: (options?: object) => Promise<BtDevice>;
  disconnect: () => Promise<boolean>;
  write: (data: string) => Promise<boolean>;
  onDataReceived: (listener: (event: { data: string }) => void) => { remove: () => void };
};

type BtModule = {
  isBluetoothAvailable: () => Promise<boolean>;
  isBluetoothEnabled: () => Promise<boolean>;
  requestBluetoothEnabled: () => Promise<boolean>;
  getBondedDevices: () => Promise<BtDevice[]>;
  startDiscovery: () => Promise<BtDevice[]>;
  cancelDiscovery: () => Promise<boolean>;
  connectToDevice: (address: string, options?: object) => Promise<BtDevice>;
  onDeviceDisconnected: (listener: (event: { device?: BtDevice }) => void) => { remove: () => void };
};

let RNBluetoothClassic: BtModule | null = null;
let connected: BtDevice | null = null;
let dataSub: { remove: () => void } | null = null;
let disconnectSub: { remove: () => void } | null = null;
let receiveBuffer = '';

function loadModule(): BtModule | null {
  if (Platform.OS === 'web') return null;
  if (RNBluetoothClassic) return RNBluetoothClassic;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RNBluetoothClassic = require('react-native-bluetooth-classic').default as BtModule;
    return RNBluetoothClassic;
  } catch (error) {
    console.warn('[bt] módulo indisponível — use development build no Android', error);
    return null;
  }
}

export function isBtSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function androidApiLevel(): number {
  const version = Platform.Version;
  return typeof version === 'number' ? version : parseInt(String(version), 10);
}

function isPermissionGranted(status: string | undefined): boolean {
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Android 12+ (API 31) requires runtime BLUETOOTH_CONNECT / BLUETOOTH_SCAN.
 * Older APIs need ACCESS_FINE_LOCATION for discovery. Without neverForLocation on
 * BLUETOOTH_SCAN, location is also needed on API 31+ for scanning.
 */
export async function ensureBluetoothPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const api = androidApiLevel();
  const rationale = {
    title: 'Permissão de Bluetooth',
    message:
      'O Estufa Inteligente precisa de Bluetooth (e localização em alguns Androids) para encontrar e conectar à placa ESP32.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Negar',
  };

  if (api >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    const connectOk = isPermissionGranted(result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);
    const scanOk = isPermissionGranted(result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]);
    const locationOk = isPermissionGranted(
      result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
    );

    if (!connectOk || !scanOk) {
      throw new Error(
        'Permissão de Bluetooth negada. Ative Bluetooth nas configurações do app e tente novamente.'
      );
    }
    if (!locationOk) {
      throw new Error(
        'Permissão de localização negada. No Android ela é necessária para buscar dispositivos Bluetooth.'
      );
    }
    return;
  }

  const location = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    rationale
  );
  if (!isPermissionGranted(location)) {
    throw new Error(
      'Permissão de localização negada. Ela é necessária para buscar a estufa via Bluetooth.'
    );
  }
}

export async function ensureBluetoothOn(): Promise<void> {
  const bt = loadModule();
  if (!bt) {
    throw new Error(
      'Bluetooth Classic precisa de development build (npx expo run:android). No iOS, ESP32 SPP costuma não funcionar sem acessório MFi.'
    );
  }

  await ensureBluetoothPermissions();

  const available = await bt.isBluetoothAvailable();
  if (!available) throw new Error('Bluetooth não está disponível neste aparelho.');

  const enabled = await bt.isBluetoothEnabled();
  if (!enabled) {
    const turnedOn = await bt.requestBluetoothEnabled();
    if (!turnedOn) throw new Error('Ative o Bluetooth do celular e tente novamente.');
  }
}

function isEstufaName(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return normalized.includes('estufa') || normalized.includes(BT_DEVICE_NAME.toLowerCase());
}

export async function scanBtDevices(): Promise<ScannedBtDevice[]> {
  const bt = loadModule();
  if (!bt) throw new Error('Bluetooth Classic indisponível neste build.');

  await ensureBluetoothOn();

  const found = new Map<string, ScannedBtDevice>();

  const bonded = await bt.getBondedDevices();
  for (const device of bonded) {
    if (!isEstufaName(device.name)) continue;
    found.set(device.address, {
      id: device.address,
      address: device.address,
      name: device.name || BT_DEVICE_NAME,
    });
  }

  try {
    const discovered = await bt.startDiscovery();
    for (const device of discovered) {
      if (!isEstufaName(device.name)) continue;
      found.set(device.address, {
        id: device.address,
        address: device.address,
        name: device.name || BT_DEVICE_NAME,
      });
    }
  } finally {
    try {
      await bt.cancelDiscovery();
    } catch {
      // ignore
    }
  }

  return Array.from(found.values());
}

/**
 * react-native-bluetooth-classic with delimiter `\n` delivers each line with the
 * delimiter stripped. Re-append `\n` so BEGIN_STATUS…END_STATUS can be parsed.
 */
function appendDelimitedChunk(chunk: string) {
  const normalized = chunk.replace(/\r$/, '');
  receiveBuffer += normalized.endsWith('\n') ? normalized : `${normalized}\n`;

  // Prefer keeping a complete/partial STATUS rather than cutting mid-block.
  if (receiveBuffer.length > 6000) {
    const keepFrom = receiveBuffer.lastIndexOf('BEGIN_STATUS');
    receiveBuffer =
      keepFrom >= 0 ? receiveBuffer.slice(keepFrom) : receiveBuffer.slice(-2500);
  }
}

function tryConsumeStatus(onStatus: (status: BtStatusPayload) => void) {
  const status = parseStatusBlock(receiveBuffer);
  if (!status) return;

  onStatus(status);

  const end = receiveBuffer.lastIndexOf('END_STATUS');
  if (end >= 0) {
    receiveBuffer = receiveBuffer.slice(end + 'END_STATUS'.length);
  }
}

export async function connectBtDevice(
  address: string,
  onStatus: (status: BtStatusPayload) => void,
  onDisconnected: () => void
): Promise<void> {
  const bt = loadModule();
  if (!bt) throw new Error('Bluetooth Classic indisponível neste build.');

  await disconnectBtDevice();
  await ensureBluetoothOn();

  receiveBuffer = '';
  connected = await bt.connectToDevice(address, { delimiter: '\n' });

  dataSub = connected.onDataReceived((event) => {
    appendDelimitedChunk(event.data ?? '');
    tryConsumeStatus(onStatus);
  });

  disconnectSub = bt.onDeviceDisconnected(() => {
    connected = null;
    onDisconnected();
  });

  await writeBtLine('STATUS');
}

export async function writeBtLine(line: string): Promise<void> {
  if (!connected) throw new Error('Nenhuma estufa conectada via Bluetooth');
  const payload = line.endsWith('\n') ? line : `${line}\n`;
  await connected.write(payload);
}

export async function requestStatus(): Promise<void> {
  await writeBtLine('STATUS');
}

export async function disconnectBtDevice(): Promise<void> {
  dataSub?.remove();
  dataSub = null;
  disconnectSub?.remove();
  disconnectSub = null;

  if (!connected) return;
  const device = connected;
  connected = null;
  try {
    await device.disconnect();
  } catch {
    // already disconnected
  }
}
