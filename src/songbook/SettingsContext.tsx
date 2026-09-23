/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';


export interface SongSpecificSettings {
  zoomDesktop?: number;
  zoomMobile?: number;
  zoom?: number; // legacy fallback
  [key: string]: unknown;
}

export interface Settings {
  primaryPart: string;
  zoomDesktop: number;
  zoomMobile: number;
  drawMeasureNumbers: boolean;
  keepScreenAwake: boolean;
  compactMode: boolean;
  highContrast: boolean;
  modernKeyChanges: boolean;
  includeArchived: boolean;
  songSettings: Record<string, SongSpecificSettings>;
  zoomLevel?: number; // Kept for backward compatibility
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  getEffectiveZoom: (songId: string, isMobile: boolean) => number;
  hasSongCustomZoom: (songId: string, isMobile: boolean) => boolean;
  updateSongZoom: (songId: string, zoom: number, isMobile: boolean) => void;
  resetSongZoom: (songId: string, isMobile?: boolean) => void;
  pruneOrphanSongSettings: (validSongIds: string[]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('mvet_settings');
    const defaults: Settings = {
      primaryPart: 'All',
      zoomDesktop: 1.0,
      zoomMobile: 0.75,
      drawMeasureNumbers: true,
      keepScreenAwake: true,
      compactMode: false,
      highContrast: false,
      modernKeyChanges: true,
      includeArchived: false,
      songSettings: {},
    };
    
    if (!saved) return defaults;
    
    try {
      const parsed = JSON.parse(saved);
      // Migrate legacy zoomLevel if zoomDesktop is not explicitly saved
      const zoomDesktop = typeof parsed.zoomDesktop === 'number' 
        ? parsed.zoomDesktop 
        : (typeof parsed.zoomLevel === 'number' ? parsed.zoomLevel : defaults.zoomDesktop);
      const zoomMobile = typeof parsed.zoomMobile === 'number'
        ? parsed.zoomMobile
        : defaults.zoomMobile;

      return { 
        ...defaults, 
        ...parsed, 
        zoomDesktop, 
        zoomMobile,
        songSettings: parsed.songSettings || {} 
      };
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

  const getEffectiveZoom = useCallback((songId: string, isMobile: boolean): number => {
    const songEntry = settings.songSettings?.[songId];
    if (songEntry) {
      if (isMobile) {
        if (typeof songEntry.zoomMobile === 'number' && !isNaN(songEntry.zoomMobile)) {
          return songEntry.zoomMobile;
        }
      } else {
        if (typeof songEntry.zoomDesktop === 'number' && !isNaN(songEntry.zoomDesktop)) {
          return songEntry.zoomDesktop;
        }
      }
      // Legacy fallback if single zoom was saved previously
      if (typeof songEntry.zoom === 'number' && !isNaN(songEntry.zoom)) {
        return songEntry.zoom;
      }
    }
    return isMobile ? (settings.zoomMobile ?? 0.75) : (settings.zoomDesktop ?? 1.0);
  }, [settings.songSettings, settings.zoomMobile, settings.zoomDesktop]);

  const hasSongCustomZoom = useCallback((songId: string, isMobile: boolean): boolean => {
    const songEntry = settings.songSettings?.[songId];
    if (!songEntry) return false;
    if (isMobile) {
      return typeof songEntry.zoomMobile === 'number' || typeof songEntry.zoom === 'number';
    } else {
      return typeof songEntry.zoomDesktop === 'number' || typeof songEntry.zoom === 'number';
    }
  }, [settings.songSettings]);

  const updateSongZoom = useCallback((songId: string, zoom: number, isMobile: boolean) => {
    setSettings(prev => {
      const currentSongSettings = prev.songSettings?.[songId] || {};
      const keyToUpdate = isMobile ? 'zoomMobile' : 'zoomDesktop';
      return {
        ...prev,
        songSettings: {
          ...prev.songSettings,
          [songId]: {
            ...currentSongSettings,
            [keyToUpdate]: Math.round(zoom * 100) / 100
          }
        }
      };
    });
  }, []);

  const resetSongZoom = useCallback((songId: string, isMobile?: boolean) => {
    setSettings(prev => {
      if (!prev.songSettings?.[songId]) return prev;
      const currentSongSettings = { ...prev.songSettings[songId] };

      if (isMobile === undefined) {
        // Reset both
        delete currentSongSettings.zoomDesktop;
        delete currentSongSettings.zoomMobile;
        delete currentSongSettings.zoom;
      } else if (isMobile) {
        delete currentSongSettings.zoomMobile;
        delete currentSongSettings.zoom;
      } else {
        delete currentSongSettings.zoomDesktop;
        delete currentSongSettings.zoom;
      }
      
      const newSongSettings = { ...prev.songSettings };
      if (Object.keys(currentSongSettings).length === 0) {
        delete newSongSettings[songId];
      } else {
        newSongSettings[songId] = currentSongSettings;
      }

      return {
        ...prev,
        songSettings: newSongSettings
      };
    });
  }, []);

  const pruneOrphanSongSettings = useCallback((validSongIds: string[]) => {
    setSettings(prev => {
      if (!prev.songSettings) return prev;
      const existingIds = Object.keys(prev.songSettings);
      if (existingIds.length === 0) return prev;

      const validIdSet = new Set(validSongIds);
      let changed = false;
      const filtered: Record<string, SongSpecificSettings> = {};

      for (const id of existingIds) {
        if (validIdSet.has(id)) {
          filtered[id] = prev.songSettings[id];
        } else {
          changed = true;
          console.log(`Pruning orphaned song settings for deleted song: ${id}`);
        }
      }

      if (!changed) return prev;
      return {
        ...prev,
        songSettings: filtered
      };
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSetting, 
      getEffectiveZoom, 
      hasSongCustomZoom,
      updateSongZoom, 
      resetSongZoom, 
      pruneOrphanSongSettings 
    }}>
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
