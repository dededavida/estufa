import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import type { EquipmentId } from '@/context/estufa-context';

export type SensorKey = 'temperatura' | 'umidadeAr' | 'umidadeSolo' | 'luminosidade';
type IconName = ComponentProps<typeof Ionicons>['name'];

export const SENSOR_META: Record<
  SensorKey,
  { label: string; unit: string; color: string; icon: IconName }
> = {
  temperatura: {
    label: 'Temperatura',
    unit: '°C',
    color: '#F87171',
    icon: 'thermometer-outline',
  },
  umidadeAr: {
    label: 'Umidade do Ar',
    unit: '%',
    color: '#60A5FA',
    icon: 'water-outline',
  },
  umidadeSolo: {
    label: 'Umidade do Solo',
    unit: '%',
    color: '#4ADE80',
    icon: 'leaf-outline',
  },
  luminosidade: {
    label: 'Luminosidade',
    unit: '%',
    color: '#FBBF24',
    icon: 'sunny-outline',
  },
};

export const CURRENT_SENSORS: Record<SensorKey, { value: number; sparkline: number[] }> = {
  temperatura: {
    value: 28.5,
    sparkline: [24, 25, 26, 27, 28, 29, 28, 27, 28, 29, 28.5],
  },
  umidadeAr: {
    value: 65,
    sparkline: [60, 62, 61, 63, 64, 66, 65, 64, 65, 66, 65],
  },
  umidadeSolo: {
    value: 53,
    sparkline: [48, 49, 50, 51, 52, 54, 53, 52, 53, 54, 53],
  },
  luminosidade: {
    value: 71,
    sparkline: [40, 48, 55, 62, 68, 72, 74, 73, 72, 71, 71],
  },
};

export const CHART_SERIES: Record<SensorKey, number[]> = {
  temperatura: [
    24.2, 23.8, 23.1, 23.5, 24.8, 26.1, 27.4, 28.9, 30.2, 31.5, 32.4, 31.8, 30.5, 29.2, 28.4, 27.8,
    27.1, 26.5, 26.8, 27.2, 27.9, 28.3, 28.0, 27.6,
  ],
  umidadeAr: [
    70, 69, 68, 67, 66, 64, 62, 60, 58, 57, 56, 58, 60, 62, 64, 65, 66, 67, 68, 67, 66, 65, 65, 64,
  ],
  umidadeSolo: [
    55, 54, 54, 53, 53, 52, 51, 50, 50, 49, 48, 48, 49, 50, 51, 52, 53, 53, 54, 54, 53, 53, 53, 52,
  ],
  luminosidade: [
    5, 5, 8, 15, 28, 42, 55, 68, 78, 85, 90, 92, 91, 88, 82, 74, 62, 48, 32, 18, 10, 6, 5, 5,
  ],
};

export const CHART_STATS: Record<SensorKey, { avg: number; min: number; max: number }> = {
  temperatura: { avg: 27.8, min: 23.1, max: 32.4 },
  umidadeAr: { avg: 64.2, min: 56.0, max: 70.0 },
  umidadeSolo: { avg: 51.8, min: 48.0, max: 55.0 },
  luminosidade: { avg: 49.5, min: 5.0, max: 92.0 },
};

export type HistoryRow = {
  time: string;
  temperatura: number;
  umidadeAr: number;
  umidadeSolo: number;
  luminosidade: number;
};

export const HISTORY_ROWS: HistoryRow[] = [
  { time: '09:40', temperatura: 28.5, umidadeAr: 65, umidadeSolo: 53, luminosidade: 71 },
  { time: '09:30', temperatura: 28.2, umidadeAr: 66, umidadeSolo: 53, luminosidade: 69 },
  { time: '09:20', temperatura: 27.9, umidadeAr: 66, umidadeSolo: 54, luminosidade: 67 },
  { time: '09:10', temperatura: 27.6, umidadeAr: 67, umidadeSolo: 54, luminosidade: 64 },
  { time: '09:00', temperatura: 27.3, umidadeAr: 67, umidadeSolo: 54, luminosidade: 61 },
  { time: '08:50', temperatura: 27.0, umidadeAr: 68, umidadeSolo: 55, luminosidade: 58 },
  { time: '08:40', temperatura: 26.8, umidadeAr: 68, umidadeSolo: 55, luminosidade: 54 },
  { time: '08:30', temperatura: 26.5, umidadeAr: 69, umidadeSolo: 55, luminosidade: 50 },
  { time: '08:20', temperatura: 26.2, umidadeAr: 69, umidadeSolo: 56, luminosidade: 46 },
  { time: '08:10', temperatura: 25.9, umidadeAr: 70, umidadeSolo: 56, luminosidade: 41 },
  { time: '08:00', temperatura: 25.6, umidadeAr: 70, umidadeSolo: 56, luminosidade: 36 },
  { time: '07:50', temperatura: 25.3, umidadeAr: 71, umidadeSolo: 57, luminosidade: 30 },
];

export const EQUIPMENT_META: Record<
  EquipmentId,
  {
    id: EquipmentId;
    shortLabel: string;
    label: string;
    description: string;
    icon: IconName;
    color: string;
  }
> = {
  bomba: {
    id: 'bomba',
    shortLabel: 'Bomba',
    label: "Bomba d'água",
    description: 'Responsável pela irrigação das plantas',
    icon: 'water-outline',
    color: '#60A5FA',
  },
  lampada: {
    id: 'lampada',
    shortLabel: 'Lâmpada',
    label: 'Lâmpada',
    description: 'Controle da iluminação artificial',
    icon: 'bulb-outline',
    color: '#FBBF24',
  },
  ventoinha: {
    id: 'ventoinha',
    shortLabel: 'Ventoinha',
    label: 'Ventoinha',
    description: 'Controla a circulação de ar e temperatura',
    icon: 'aperture-outline',
    color: '#60A5FA',
  },
};

export const TIME_RANGES = ['1h', '6h', '7 dias', '24h'] as const;
export type TimeRange = (typeof TIME_RANGES)[number];
