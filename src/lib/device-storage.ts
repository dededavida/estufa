import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_BT_ADDRESS_KEY = '@estufa/last_bt_address';
const LAST_METRICS_UPLOAD_KEY = '@estufa/last_metrics_upload_at';

export async function loadLastBtAddress(): Promise<string | null> {
  try {
    const saved = await AsyncStorage.getItem(LAST_BT_ADDRESS_KEY);
    if (saved && saved.trim().length > 0) return saved.trim();
  } catch {
    // ignore
  }
  return null;
}

export async function saveLastBtAddress(address: string): Promise<void> {
  await AsyncStorage.setItem(LAST_BT_ADDRESS_KEY, address);
}

export async function clearLastBtAddress(): Promise<void> {
  await AsyncStorage.removeItem(LAST_BT_ADDRESS_KEY);
}

export async function loadLastMetricsUploadAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_METRICS_UPLOAD_KEY);
    if (!raw) return null;
    const ms = Number(raw);
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  } catch {
    return null;
  }
}

export async function saveLastMetricsUploadAt(ms: number): Promise<void> {
  await AsyncStorage.setItem(LAST_METRICS_UPLOAD_KEY, String(ms));
}
