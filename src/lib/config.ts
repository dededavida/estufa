export const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID ?? 'estufa-01';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  '';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 &&
  !SUPABASE_URL.includes('SEU_PROJETO') &&
  SUPABASE_ANON_KEY.length > 0 &&
  !SUPABASE_ANON_KEY.includes('COLOQUE_SUA_CHAVE');

/** Polling de STATUS via Bluetooth Classic */
export const STATUS_POLL_MS = 3_000;

/** Fallback de polling do histórico quando Realtime não está disponível */
export const SENSOR_SYNC_MS = 30_000;

/** Intervalo mínimo entre uploads de métricas ao Supabase (1 hora). */
export const METRICS_SYNC_INTERVAL_MS = 3_600_000;

/** Quão frequente checar se já passou o intervalo desde o último upload. */
export const METRICS_SYNC_CHECK_MS = 60_000;
