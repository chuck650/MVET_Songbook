/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';


export interface Settings {
  primaryPart: string;
  zoomLevel: number;
  drawMeasureNumbers: boolean;
  keepScreenAwake: boolean;
  compactMode: boolean;
  highContrast: boolean;
  modernKeyChanges: boolean;
  songSettings: Record<string, unknown>;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('mvet_settings');
    const defaults: Settings = {
      primaryPart: 'All',
      zoomLevel: 1.0,
      drawMeasureNumbers: true,
      keepScreenAwake: true,
      compactMode: false,
      highContrast: false,
      modernKeyChanges: true,
      songSettings: {},
    };
    
    if (!saved) return defaults;
    
    try {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem('mvet_settings', JSON.stringify(settings));
    
    // Handle High Contrast Class on Body
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
