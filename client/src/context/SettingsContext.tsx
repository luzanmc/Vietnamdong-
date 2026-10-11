import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client.js';

interface SettingsContextValue {
  musicUrl: string;
  novaToVndRate: number;
  announcement: string;
}

const SettingsContext = createContext<SettingsContextValue>({ musicUrl: '', novaToVndRate: 0, announcement: '' });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsContextValue>({ musicUrl: '', novaToVndRate: 0, announcement: '' });

  useEffect(() => {
    api
      .publicSettings()
      .then((d) => setSettings({ musicUrl: d.music_url, novaToVndRate: d.nova_to_vnd_rate, announcement: d.announcement }))
      .catch(() => {});
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}

export function formatVnd(novaAmount: number, rate: number): string {
  if (!rate) return '';
  return `${Math.round(novaAmount * rate).toLocaleString('vi-VN')}đ`;
}
