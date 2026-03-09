import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';

export interface Settings {
  theme: 'light' | 'dark';
  baseCurrency: 'AED' | 'GBP' | 'USD' | 'EUR';
}

const defaults: Settings = {
  theme: 'light',
  baseCurrency: 'AED',
};

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSettings: () => {},
});

export function SettingsProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const storageKey = `fintrack_settings_${userId}`;

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') };
    } catch {
      return defaults;
    }
  });

  // Apply theme synchronously before paint to prevent flash
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  function updateSettings(patch: Partial<Settings>) {
    setSettings(prev => ({ ...prev, ...patch }));
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
