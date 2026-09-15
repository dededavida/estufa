import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { commandForEquipment, type BtStatusPayload } from '@/lib/bt-protocol';
import { DEVICE_ID, METRICS_SYNC_CHECK_MS, STATUS_POLL_MS } from '@/lib/config';
import { loadLastBtAddress, saveLastBtAddress } from '@/lib/device-storage';
import { formatLastUpdate } from '@/lib/format';
import {
  connectBtDevice,
  disconnectBtDevice,
  isBtSupported,
  requestStatus,
  scanBtDevices,
  type ScannedBtDevice,
  writeBtLine,
} from '@/services/bt-classic';
import { maybeSyncMetricsHourly } from '@/services/metrics-sync';

export type EquipmentId = 'bomba' | 'lampada' | 'ventoinha';

export type AvailableDevice = {
  deviceId: string;
  name: string;
  online: boolean;
  lastUpdate: string;
  rssi: number | null;
};

type EquipmentState = Record<EquipmentId, boolean>;

type SensorsState = {
  temperatura: number | null;
  umidadeAr: number | null;
  umidadeSolo: number | null;
  luminosidade: number | null;
  soilRaw: number | null;
  lightRaw: number | null;
};

type EstufaContextValue = {
  loading: boolean;
  refreshing: boolean;
  pairing: boolean;
  scanning: boolean;
  error: string | null;
  isOnline: boolean;
  btSupported: boolean;
  equipment: EquipmentState;
  sensors: SensorsState;
  availableDevices: AvailableDevice[];
  lastUpdate: string;
  greenhouseName: string;
  deviceId: string;
  lastBtAddress: string | null;
  connectingMessage: string | null;
  toggleEquipment: (id: EquipmentId) => Promise<void>;
  setEquipment: (id: EquipmentId, value: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  refreshSensors: () => Promise<void>;
  refreshDevices: () => Promise<AvailableDevice[]>;
  selectDevice: (deviceId: string) => Promise<boolean>;
  retryConnection: () => Promise<boolean>;
  disconnect: () => Promise<void>;
};

const EstufaContext = createContext<EstufaContextValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

/** Reject raw ADC / out-of-range values so they never show as "%". */
function asPercent(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

function statusToEquipment(payload: BtStatusPayload): EquipmentState {
  return {
    bomba: payload.pump,
    lampada: payload.lamp,
    ventoinha: payload.fan,
  };
}

function mergeEquipmentStatus(
  fromDevice: EquipmentState,
  pending: Partial<EquipmentState>
): EquipmentState {
  const next = { ...fromDevice };
  (Object.keys(pending) as EquipmentId[]).forEach((id) => {
    const expected = pending[id];
    if (expected == null) return;
    if (fromDevice[id] === expected) {
      delete pending[id];
      return;
    }
    // Keep optimistic UI until a STATUS confirms the relay state.
    next[id] = expected;
  });
  return next;
}

function toMetricsReading(sensors: SensorsState, equipment: EquipmentState) {
  return {
    temperature: sensors.temperatura,
    airHumidity: sensors.umidadeAr,
    soilMoisture: sensors.umidadeSolo,
    soilRaw: sensors.soilRaw,
    light: sensors.luminosidade,
    lightRaw: sensors.lightRaw,
    pump: equipment.bomba,
    lamp: equipment.lampada,
    fan: equipment.ventoinha,
    online: true as const,
  };
}

export function EstufaProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [deviceId, setDeviceId] = useState(DEVICE_ID);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [lastBtAddress, setLastBtAddress] = useState<string | null>(null);
  const [connectingMessage, setConnectingMessage] = useState<string | null>(null);
  const [lastUpdateIso, setLastUpdateIso] = useState<string | null>(null);
  const [equipment, setEquipmentState] = useState<EquipmentState>({
    bomba: false,
    lampada: false,
    ventoinha: false,
  });
  const [sensors, setSensors] = useState<SensorsState>({
    temperatura: null,
    umidadeAr: null,
    umidadeSolo: null,
    luminosidade: null,
    soilRaw: null,
    lightRaw: null,
  });
  const [availableDevices, setAvailableDevices] = useState<AvailableDevice[]>([]);

  const equipmentRef = useRef(equipment);
  const sensorsRef = useRef(sensors);
  const connectedRef = useRef<string | null>(null);
  const pendingEquipmentRef = useRef<Partial<EquipmentState>>({});

  const applyIncomingStatus = useCallback((payload: BtStatusPayload) => {
    const nextSensors: SensorsState = {
      temperatura: payload.temperature,
      umidadeAr: asPercent(payload.airHumidity),
      umidadeSolo: asPercent(payload.soilMoisture),
      luminosidade: asPercent(payload.light),
      soilRaw: payload.soilRaw,
      lightRaw: payload.lightRaw,
    };
    setSensors(nextSensors);
    sensorsRef.current = nextSensors;

    const merged = mergeEquipmentStatus(
      statusToEquipment(payload),
      pendingEquipmentRef.current
    );
    setEquipmentState(merged);
    equipmentRef.current = merged;
    setLastUpdateIso(nowIso());

    // Fire-and-forget hourly history upload (no UI block).
    void maybeSyncMetricsHourly(toMetricsReading(nextSensors, merged));
  }, []);

  useEffect(() => {
    equipmentRef.current = equipment;
  }, [equipment]);

  useEffect(() => {
    sensorsRef.current = sensors;
  }, [sensors]);

  useEffect(() => {
    connectedRef.current = connectedAddress;
  }, [connectedAddress]);

  const refreshDevices = useCallback(async () => {
    if (!isBtSupported()) {
      setError('Este aparelho precisa do app instalado com Bluetooth (não use o Expo Go).');
      setAvailableDevices([]);
      return [];
    }

    setScanning(true);
    setError(null);
    setConnectingMessage('Buscando estufa…');
    try {
      const devices = await scanBtDevices();
      const mapped: AvailableDevice[] = devices.map((device: ScannedBtDevice) => ({
        deviceId: device.address,
        name: device.name || 'EstufaESP32',
        online: true,
        lastUpdate: formatLastUpdate(nowIso()),
        rssi: null,
      }));
      setAvailableDevices(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível buscar a estufa';
      setError(message);
      setAvailableDevices([]);
      return [];
    } finally {
      setScanning(false);
      setConnectingMessage(null);
    }
  }, []);

  const selectDevice = useCallback(
    async (address: string) => {
      setPairing(true);
      setError(null);
      setConnectingMessage('Conectando…');
      try {
        await connectBtDevice(
          address,
          (payload) => {
            applyIncomingStatus(payload);
            setIsOnline(true);
          },
          () => {
            setIsOnline(false);
            setConnectedAddress(null);
            setError('A conexão caiu. Toque para reconectar.');
          }
        );

        setConnectedAddress(address);
        setLastBtAddress(address);
        setDeviceId(DEVICE_ID);
        setIsOnline(true);
        setLastUpdateIso(nowIso());
        await saveLastBtAddress(address);
        setConnectingMessage(null);
        return true;
      } catch (err) {
        setIsOnline(false);
        setConnectedAddress(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Não deu para conectar. Confira se a estufa está ligada e pareada.'
        );
        return false;
      } finally {
        setPairing(false);
        setConnectingMessage(null);
      }
    },
    [applyIncomingStatus]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      const saved = await loadLastBtAddress();
      if (cancelled) return;
      if (saved) setLastBtAddress(saved);

      if (saved && isBtSupported()) {
        setConnectingMessage('Conectando…');
        const ok = await selectDevice(saved);
        if (cancelled) return;
        if (!ok) {
          setError('Não foi possível reconectar. Busque a estufa de novo.');
        }
      }

      if (!cancelled) {
        setConnectingMessage(null);
        setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
      void disconnectBtDevice();
    };
  }, [selectDevice]);

  useEffect(() => {
    if (!isOnline) return;
    const timer = setInterval(() => {
      void requestStatus().catch(() => undefined);
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [isOnline]);

  // Supabase metrics sync: tick on METRICS_SYNC_CHECK_MS; cadence gated by METRICS_SYNC_INTERVAL_MS.
  useEffect(() => {
    if (!isOnline) return;

    const tick = () => {
      void maybeSyncMetricsHourly(
        toMetricsReading(sensorsRef.current, equipmentRef.current)
      );
    };

    tick();
    const timer = setInterval(tick, METRICS_SYNC_CHECK_MS);
    return () => clearInterval(timer);
  }, [isOnline]);

  const setEquipment = useCallback(async (id: EquipmentId, value: boolean) => {
    const previous = equipmentRef.current;
    const optimistic = { ...previous, [id]: value };
    pendingEquipmentRef.current[id] = value;
    setEquipmentState(optimistic);
    equipmentRef.current = optimistic;

    try {
      await writeBtLine(commandForEquipment(id, value));
      // Small delay so the ESP32 applies the relay before answering STATUS.
      await new Promise((resolve) => setTimeout(resolve, 150));
      await requestStatus();
      setError(null);
    } catch (err) {
      delete pendingEquipmentRef.current[id];
      setEquipmentState(previous);
      equipmentRef.current = previous;
      setError(err instanceof Error ? err.message : 'Falha ao enviar comando');
    }
  }, []);

  const toggleEquipment = useCallback(
    async (id: EquipmentId) => {
      await setEquipment(id, !equipmentRef.current[id]);
    },
    [setEquipment]
  );

  const disconnect = useCallback(async () => {
    await disconnectBtDevice();
    setIsOnline(false);
    setConnectedAddress(null);
    setError(null);
    setConnectingMessage(null);
  }, []);

  const refreshSensors = useCallback(async () => {
    if (!connectedRef.current) {
      throw new Error('Conecte a estufa para atualizar os sensores.');
    }
    await requestStatus();
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (connectedRef.current) {
        await refreshSensors();
      } else {
        await refreshDevices();
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshDevices, refreshSensors]);

  const retryConnection = useCallback(async () => {
    if (connectedRef.current) {
      return selectDevice(connectedRef.current);
    }
    if (lastBtAddress) {
      return selectDevice(lastBtAddress);
    }
    const devices = await refreshDevices();
    if (devices[0]) return selectDevice(devices[0].deviceId);
    return false;
  }, [lastBtAddress, refreshDevices, selectDevice]);

  const value = useMemo<EstufaContextValue>(
    () => ({
      loading,
      refreshing,
      pairing,
      scanning,
      error,
      isOnline,
      btSupported: isBtSupported(),
      equipment,
      sensors,
      availableDevices,
      lastUpdate: formatLastUpdate(lastUpdateIso),
      greenhouseName: 'EstufaESP32',
      deviceId: deviceId || DEVICE_ID,
      lastBtAddress,
      connectingMessage,
      toggleEquipment,
      setEquipment,
      refresh,
      refreshSensors,
      refreshDevices,
      selectDevice,
      retryConnection,
      disconnect,
    }),
    [
      loading,
      refreshing,
      pairing,
      scanning,
      error,
      isOnline,
      equipment,
      sensors,
      availableDevices,
      lastUpdateIso,
      deviceId,
      lastBtAddress,
      connectingMessage,
      toggleEquipment,
      setEquipment,
      refresh,
      refreshSensors,
      refreshDevices,
      selectDevice,
      retryConnection,
      disconnect,
    ]
  );

  return <EstufaContext.Provider value={value}>{children}</EstufaContext.Provider>;
}

export function useEstufa() {
  const ctx = useContext(EstufaContext);
  if (!ctx) throw new Error('useEstufa must be used within EstufaProvider');
  return ctx;
}
