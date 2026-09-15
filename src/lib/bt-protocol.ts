export const BT_DEVICE_NAME = 'EstufaESP32';

export type BtStatusPayload = {
  temperature: number | null;
  airHumidity: number | null;
  soilMoisture: number | null;
  soilRaw: number | null;
  light: number | null;
  lightRaw: number | null;
  pump: boolean;
  lamp: boolean;
  fan: boolean;
};

const NUM_ALIASES: Record<keyof Pick<
  BtStatusPayload,
  'temperature' | 'airHumidity' | 'soilMoisture' | 'soilRaw' | 'light' | 'lightRaw'
>, string[]> = {
  temperature: ['temperature', 'temp', 'temperatura'],
  airHumidity: ['airHumidity', 'humidity', 'umidadeAr', 'umidade_ar'],
  soilMoisture: ['soilMoisture', 'soil', 'umidadeSolo', 'umidade_solo', 'soilPercent'],
  soilRaw: ['soilRaw', 'soil_adc', 'soloRaw', 'soloAdc'],
  light: ['light', 'luminosidade', 'lightPercent'],
  lightRaw: ['lightRaw', 'ldrRaw', 'light_adc'],
};

const BOOL_ALIASES: Record<'pump' | 'lamp' | 'fan', string[]> = {
  pump: ['pump', 'bomba'],
  lamp: ['lamp', 'lampada', 'luz'],
  fan: ['fan', 'ventoinha'],
};

function parseNumber(value: string | undefined): number | null {
  if (value == null || value === 'null' || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBool(value: string | undefined): boolean {
  if (value == null) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'ligada';
}

/**
 * Extract key=value pairs from a STATUS block.
 * Tolerates missing newlines (BT Classic delimiter often strips `\n`).
 */
export function extractStatusMap(block: string): Map<string, string> {
  const map = new Map<string, string>();

  // Primary: line-oriented (CRLF / LF)
  for (const line of block.split(/\r?\n/)) {
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) map.set(key, value);
  }

  // Fallback: token scan when lines were concatenated without separators
  // e.g. "BEGIN_STATUStemperature=25.0airHumidity=60soilMoisture=45..."
  const tokenRe =
    /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(null|-?\d+(?:\.\d+)?|true|false)/gi;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(block)) != null) {
    const key = match[1];
    const value = match[2];
    // Prefer regex tokens over a mangled single-line "BEGIN_STATUStemperature=..."
    map.set(key, value);
  }

  return map;
}

function firstNumber(map: Map<string, string>, keys: string[]): number | null {
  for (const key of keys) {
    if (!map.has(key)) continue;
    // First present key wins — including explicit "null" (do not fall through to aliases).
    return parseNumber(map.get(key));
  }
  return null;
}

function firstBool(map: Map<string, string>, keys: string[]): boolean {
  for (const key of keys) {
    if (!map.has(key)) continue;
    return parseBool(map.get(key));
  }
  return false;
}

/**
 * Parse the latest complete BEGIN_STATUS…END_STATUS block from a BT buffer.
 * Ignores chatter such as "Bomba: LIGADA" before/between blocks.
 */
export function parseStatusBlock(raw: string): BtStatusPayload | null {
  const end = raw.lastIndexOf('END_STATUS');
  if (end < 0) return null;

  const start = raw.lastIndexOf('BEGIN_STATUS', end);
  if (start < 0 || end <= start) return null;

  const block = raw.slice(start, end);
  const map = extractStatusMap(block);

  return {
    temperature: firstNumber(map, NUM_ALIASES.temperature),
    airHumidity: firstNumber(map, NUM_ALIASES.airHumidity),
    soilMoisture: firstNumber(map, NUM_ALIASES.soilMoisture),
    soilRaw: firstNumber(map, NUM_ALIASES.soilRaw),
    light: firstNumber(map, NUM_ALIASES.light),
    lightRaw: firstNumber(map, NUM_ALIASES.lightRaw),
    pump: firstBool(map, BOOL_ALIASES.pump),
    lamp: firstBool(map, BOOL_ALIASES.lamp),
    fan: firstBool(map, BOOL_ALIASES.fan),
  };
}

/** Short snippet for on-device diagnostics (Configurações). */
export function statusSnippet(raw: string, maxLen = 160): string | null {
  const end = raw.lastIndexOf('END_STATUS');
  if (end < 0) return null;
  const start = raw.lastIndexOf('BEGIN_STATUS', end);
  if (start < 0) return null;
  const snippet = raw.slice(start, end + 'END_STATUS'.length).replace(/\s+/g, ' ').trim();
  return snippet.length > maxLen ? `${snippet.slice(0, maxLen)}…` : snippet;
}

export function commandForEquipment(
  id: 'bomba' | 'lampada' | 'ventoinha',
  on: boolean
): string {
  if (id === 'bomba') return on ? 'PUMP ON' : 'PUMP OFF';
  if (id === 'lampada') return on ? 'LAMP ON' : 'LAMP OFF';
  return on ? 'FAN ON' : 'FAN OFF';
}
