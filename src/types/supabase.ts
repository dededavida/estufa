export type GreenhouseStatusRow = {
  device_id: string;
  temperature: number | null;
  air_humidity: number | null;
  soil_moisture: number | null;
  soil_raw: number | null;
  light: number | null;
  light_raw: number | null;
  pump: boolean;
  lamp: boolean;
  fan: boolean;
  online: boolean;
  updated_at: string;
};

export type GreenhouseCommandsRow = {
  device_id: string;
  pump: boolean;
  lamp: boolean;
  fan: boolean;
  updated_at: string;
};

export type SensorHistoryRow = {
  id: number;
  device_id: string;
  temperature: number | null;
  air_humidity: number | null;
  soil_moisture: number | null;
  light: number | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      greenhouse_status: {
        Row: GreenhouseStatusRow;
        Insert: Partial<GreenhouseStatusRow> & { device_id: string };
        Update: Partial<GreenhouseStatusRow>;
        Relationships: [];
      };
      greenhouse_commands: {
        Row: GreenhouseCommandsRow;
        Insert: Partial<GreenhouseCommandsRow> & { device_id: string };
        Update: Partial<GreenhouseCommandsRow>;
        Relationships: [];
      };
      sensor_history: {
        Row: SensorHistoryRow;
        Insert: Omit<SensorHistoryRow, 'id' | 'created_at'> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<SensorHistoryRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
