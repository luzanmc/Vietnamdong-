import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, setMaintenanceHandler } from '../api/client.js';

export interface SettingsContextValue {
  musicUrl: string;
  novaToVndRate: number;
  announcement: string;
  maintenance: boolean;
  maintenanceMessage: string;
  maintenanceEta: string | null;
  refreshSettings: () => Promise<void>;
  setMaintenanceDirect: (m: { maintenance: boolean; message?: string; eta?: string | null }) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  musicUrl: '',
  novaToVndRate: 0,
  announcement: '',
  maintenance: false,
  maintenanceMessage: '',
  maintenanceEta: null,
  refreshSettings: async () => {},
  setMaintenanceDirect: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<{
    musicUrl: string;
    novaToVndRate: number;
    announcement: string;
    maintenance: boolean;
    maintenanceMessage: string;
    maintenanceEta: string | null;
  }>({
    musicUrl: '',
    novaToVndRate: 0,
    announcement: '',
    maintenance: false,
    maintenanceMessage: '',
    maintenanceEta: null,
  });

  const refreshSettings = useCallback(async () => {
    try {
      const d = await api.publicSettings();
      setSettings((prev) => ({
        ...prev,
        musicUrl: d.music_url,
        novaToVndRate: d.nova_to_vnd_rate,
        announcement: d.announcement,
        maintenance: Boolean(d.maintenance),
        maintenanceMessage: d.maintenance_message || '',
        maintenanceEta: d.maintenance_eta || null,
      }));
    } catch {}
  }, []);

  const setMaintenanceDirect = useCallback((m: { maintenance: boolean; message?: string; eta?: string | null }) => {
    setSettings((prev) => ({
      ...prev,
      maintenance: m.maintenance,
      maintenanceMessage: m.message ?? prev.maintenanceMessage,
      maintenanceEta: m.eta !== undefined ? m.eta : prev.maintenanceEta,
    }));
  }, []);

  useEffect(() => {
    refreshSettings();
    setMaintenanceHandler((data) => {
      setSettings((prev) => ({
        ...prev,
        maintenance: true,
        maintenanceMessage: data.message || prev.maintenanceMessage,
        maintenanceEta: data.eta !== undefined ? data.eta : prev.maintenanceEta,
      }));
    });
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider value={{ ...settings, refreshSettings, setMaintenanceDirect }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}

export function formatVnd(novaAmount: number, rate: number): string {
  if (!rate) return '';
  return `${Math.round(novaAmount * rate).toLocaleString('vi-VN')}đ`;
}
