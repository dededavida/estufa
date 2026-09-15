import { getSupabase } from '@/lib/supabase';
import type {
  GreenhouseCommandsRow,
  GreenhouseStatusRow,
  SensorHistoryRow,
} from '@/types/supabase';

export type EquipmentCommands = {
  pump: boolean;
  lamp: boolean;
  fan: boolean;
};

/** Snapshot vivo (Bluetooth STATUS) para sync com Supabase */
export type SensorSnapshot = {
  temperature: number | null;
  airHumidity: number | null;
  soilMoisture: number | null;
  soilRaw: number | null;
  light: number | null;
  lightRaw: number | null;
  pump: boolean;
  lamp: boolean;
  fan: boolean;
  online?: boolean;
};

export function hasMeaningfulSensorData(snapshot: SensorSnapshot): boolean {
  return (
    snapshot.temperature != null ||
    snapshot.airHumidity != null ||
    snapshot.soilMoisture != null ||
    snapshot.light != null
  );
}

/**
 * Upsert em `greenhouse_status` + insert em `sensor_history`.
 * Sem config Supabase: no-op (não lança).
 */
export async function pushSensorSnapshot(
  deviceId: string,
  snapshot: SensorSnapshot
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  if (!hasMeaningfulSensorData(snapshot)) return false;

  const now = new Date().toISOString();

  const { error: statusError } = await supabase.from('greenhouse_status').upsert(
    {
      device_id: deviceId,
      temperature: snapshot.temperature,
      air_humidity: snapshot.airHumidity,
      soil_moisture: snapshot.soilMoisture,
      soil_raw: snapshot.soilRaw,
      light: snapshot.light,
      light_raw: snapshot.lightRaw,
      pump: snapshot.pump,
      lamp: snapshot.lamp,
      fan: snapshot.fan,
      online: snapshot.online ?? true,
      updated_at: now,
    },
    { onConflict: 'device_id' }
  );

  if (statusError) {
    console.warn('[estufa] pushSensorSnapshot status', statusError.message);
    throw statusError;
  }

  const { error: historyError } = await supabase.from('sensor_history').insert({
    device_id: deviceId,
    temperature: snapshot.temperature,
    air_humidity: snapshot.airHumidity,
    soil_moisture: snapshot.soilMoisture,
    light: snapshot.light,
    created_at: now,
  });

  if (historyError) {
    console.warn('[estufa] pushSensorSnapshot history', historyError.message);
    throw historyError;
  }

  return true;
}

export async function fetchDevices(): Promise<GreenhouseStatusRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('greenhouse_status')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[estufa] fetchDevices', error.message);
    throw error;
  }

  return data ?? [];
}

export async function fetchStatus(deviceId: string): Promise<GreenhouseStatusRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('greenhouse_status')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) {
    console.warn('[estufa] fetchStatus', error.message);
    throw error;
  }

  return data;
}

export async function fetchCommands(deviceId: string): Promise<GreenhouseCommandsRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('greenhouse_commands')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) {
    console.warn('[estufa] fetchCommands', error.message);
    throw error;
  }

  return data;
}

export async function upsertCommands(deviceId: string, commands: EquipmentCommands): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado. Preencha o arquivo .env');
  }

  const { error } = await supabase.from('greenhouse_commands').upsert(
    {
      device_id: deviceId,
      pump: commands.pump,
      lamp: commands.lamp,
      fan: commands.fan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'device_id' }
  );

  if (error) {
    console.warn('[estufa] upsertCommands', error.message);
    throw error;
  }
}

export async function fetchSensorHistory(
  deviceId: string,
  limit = 50
): Promise<SensorHistoryRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sensor_history')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[estufa] fetchSensorHistory', error.message);
    throw error;
  }

  return data ?? [];
}

export async function fetchHistorySince(
  deviceId: string,
  sinceIso: string,
  limit = 500
): Promise<SensorHistoryRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sensor_history')
    .select('*')
    .eq('device_id', deviceId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.warn('[estufa] fetchHistorySince', error.message);
    throw error;
  }

  return data ?? [];
}

export async function fetchHistoryForDay(deviceId: string, day: Date): Promise<SensorHistoryRow[]> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sensor_history')
    .select('*')
    .eq('device_id', deviceId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.warn('[estufa] fetchHistoryForDay', error.message);
    throw error;
  }

  return data ?? [];
}
