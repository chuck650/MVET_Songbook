import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('mvet_settings');
    const defaults = {
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
    } catch (e) {
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

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
