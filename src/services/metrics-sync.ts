import {
  DEVICE_ID,
  isSupabaseConfigured,
  METRICS_SYNC_INTERVAL_MS,
} from '@/lib/config';
import {
  loadLastMetricsUploadAt,
  saveLastMetricsUploadAt,
} from '@/lib/device-storage';
import {
  hasMeaningfulSensorData,
  pushSensorSnapshot,
  type SensorSnapshot,
} from '@/services/greenhouse';

export type MetricsReading = SensorSnapshot;

let inFlight: Promise<boolean> | null = null;
let cachedLastUploadAt: number | null | undefined;

async function getLastUploadAt(): Promise<number | null> {
  if (cachedLastUploadAt !== undefined) return cachedLastUploadAt;
  cachedLastUploadAt = await loadLastMetricsUploadAt();
  return cachedLastUploadAt;
}

/**
 * Uploads current BT sensor readings to Supabase at most once per hour.
 * Safe to call often (on STATUS / interval); skips when not due or not configured.
 * Returns true when a row was written.
 */
export async function maybeSyncMetricsHourly(sensors: MetricsReading): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  if (!hasMeaningfulSensorData(sensors)) return false;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const lastAt = await getLastUploadAt();
      const now = Date.now();
      if (lastAt != null && now - lastAt < METRICS_SYNC_INTERVAL_MS) {
        return false;
      }

      const pushed = await pushSensorSnapshot(DEVICE_ID, {
        ...sensors,
        online: true,
      });
      if (!pushed) return false;

      cachedLastUploadAt = now;
      await saveLastMetricsUploadAt(now);
      return true;
    } catch (err) {
      console.warn(
        '[estufa] metrics sync failed',
        err instanceof Error ? err.message : err
      );
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
