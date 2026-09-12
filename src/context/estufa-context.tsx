import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type EquipmentId = 'bomba' | 'lampada' | 'ventoinha';

type EquipmentState = Record<EquipmentId, boolean>;

type EstufaContextValue = {
  isOnline: boolean;
  setOnline: (value: boolean) => void;
  equipment: EquipmentState;
  toggleEquipment: (id: EquipmentId) => void;
  setEquipment: (id: EquipmentId, value: boolean) => void;
  lastUpdate: string;
  greenhouseName: string;
  deviceId: string;
};

const EstufaContext = createContext<EstufaContextValue | null>(null);

export function EstufaProvider({ children }: { children: ReactNode }) {
  const [isOnline, setOnline] = useState(true);
  const [equipment, setEquipmentState] = useState<EquipmentState>({
    bomba: false,
    lampada: false,
    ventoinha: true,
  });

  const value = useMemo<EstufaContextValue>(
    () => ({
      isOnline,
      setOnline,
      equipment,
      toggleEquipment: (id) => {
        setEquipmentState((prev) => ({ ...prev, [id]: !prev[id] }));
      },
      setEquipment: (id, next) => {
        setEquipmentState((prev) => ({ ...prev, [id]: next }));
      },
      lastUpdate: '12/09/2025 09:41',
      greenhouseName: 'Estufa Principal',
      deviceId: 'estufa-01',
    }),
    [equipment, isOnline]
  );

  return <EstufaContext.Provider value={value}>{children}</EstufaContext.Provider>;
}

export function useEstufa() {
  const ctx = useContext(EstufaContext);
  if (!ctx) {
    throw new Error('useEstufa must be used within EstufaProvider');
  }
  return ctx;
}
