import React, { useState } from 'react';
import { useSettings } from './SettingsContext';
import { Song } from '../types/songbook';
import { resolvePath } from '../utils/resolvePath';

interface DownloadItem {
  url: string;
  hash: string;
}

const SettingsView: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [syncProgress, setSyncProgress] = useState<number>(0);

  const parts = ['All', 'Soprano', 'Alto', 'Tenor', 'Bass'];

  const syncLibrary = async () => {
    try {
      setSyncStatus('syncing');
      setSyncProgress(0);
      
      const response = await fetch(resolvePath('/songs.json'));
      const songs: Song[] = await response.json();
      
      // Load local hash manifest to detect changes
      const localHashes = JSON.parse(localStorage.getItem('mvet_synced_hashes') || '{}') as Record<string, string>;
      const newHashes: Record<string, string> = { ...localHashes };
      
      const cache = await caches.open('song-files-cache');
      let completed = 0;
      
      // Flatten all files to download
      const downloadQueue: DownloadItem[] = [];
      songs.forEach(song => {
        // Main files
        if (song.files) {
          Object.entries(song.files).forEach(([_type, url]) => {
            if (url && song.hashes) {
              const serverHash = song.hashes[url];
              if (serverHash && localHashes[url] !== serverHash) {
                downloadQueue.push({ url, hash: serverHash });
              }
            }
          });
        }
        
        // Part files
        if (song.parts) {
          Object.values(song.parts).forEach(part => {
            if (part && part.files) {
              Object.entries(part.files).forEach(([_type, url]) => {
                if (url && song.hashes) {
                  const serverHash = song.hashes[url];
                  if (serverHash && localHashes[url] !== serverHash) {
                    downloadQueue.push({ url, hash: serverHash });
                  }
                }
              });
            }
          });
        }
      });

      if (downloadQueue.length === 0) {
        setSyncProgress(100);
        setSyncStatus('done');
        setTimeout(() => setSyncStatus('idle'), 3000);
        return;
      }

      for (const item of downloadQueue) {
        try {
          await cache.add(item.url);
          newHashes[item.url] = item.hash;
        } catch (e) {
          console.warn(`Could not cache ${item.url}`, e);
        }
        completed++;
        setSyncProgress(Math.round((completed / downloadQueue.length) * 100));
      }
      
      localStorage.setItem('mvet_synced_hashes', JSON.stringify(newHashes));
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('idle');
      alert('Failed to sync library. Please check your connection.');
    }
  };

  return (
    <div className="settings-view">
      <header className="view-header">
        <h2>App Settings</h2>
        <p>Configure your personal songbook and rehearsal preferences.</p>
      </header>

      <section className="settings-section">
        <h3>Offline Storage</h3>
        <div className="setting-control">
          <div className="setting-info">
            <label>Library Offline Sync</label>
            <span>Download all scores for use without internet.</span>
          </div>
          <button 
            className={`sync-btn ${syncStatus}`}
            onClick={() => { void syncLibrary(); }}
            disabled={syncStatus === 'syncing'}
          >
            {syncStatus === 'syncing' ? `Syncing ${syncProgress}%` : 
             syncStatus === 'done' ? '✓ Synced' : 'Sync All Songs'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Rehearsal Preferences</h3>
        <div className="setting-control">
          <div className="setting-info">
            <label>Primary Voice Part</label>
            <span>Automatically solo your part when opening a song.</span>
          </div>
          <select 
            className="glass-select"
            value={settings.primaryPart} 
            onChange={(e) => updateSetting('primaryPart', e.target.value)}
          >
            {parts.map(part => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
        </div>

        <div className="setting-control">
          <div className="setting-info">
            <label>Measure Numbers</label>
            <span>Show measure markings in the score by default.</span>
          </div>
          <button 
            className={`toggle-btn ${settings.drawMeasureNumbers ? 'active' : ''}`}
            onClick={() => updateSetting('drawMeasureNumbers', !settings.drawMeasureNumbers)}
          >
            {settings.drawMeasureNumbers ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="setting-control">
          <div className="setting-info">
            <label>Modern Key Changes</label>
            <span>Hide "spurious" cancellation naturals during key signature changes.</span>
          </div>
          <button 
            className={`toggle-btn ${settings.modernKeyChanges ? 'active' : ''}`}
            onClick={() => updateSetting('modernKeyChanges', !settings.modernKeyChanges)}
          >
            {settings.modernKeyChanges ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Performance Mode</h3>
        <div className="setting-control">
          <div className="setting-info">
            <label>Keep Screen Awake</label>
            <span>Prevent device from sleeping during rehearsals and performances.</span>
          </div>
          <button 
            className={`toggle-btn ${settings.keepScreenAwake ? 'active' : ''}`}
            onClick={() => updateSetting('keepScreenAwake', !settings.keepScreenAwake)}
          >
            {settings.keepScreenAwake ? 'On' : 'Off'}
          </button>
        </div>

        <div className="setting-control">
          <div className="setting-info">
            <label>High Contrast Mode</label>
            <span>Maximum contrast for low-light performance environments.</span>
          </div>
          <button 
            className={`toggle-btn ${settings.highContrast ? 'active' : ''}`}
            onClick={() => updateSetting('highContrast', !settings.highContrast)}
          >
            {settings.highContrast ? 'Active' : 'Inactive'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Display Calibration</h3>
        <div className="setting-control">
          <div className="setting-info">
            <label>Default Zoom</label>
            <span>Base scaling level for all sheet music.</span>
          </div>
          <div className="zoom-controls">
            <button onClick={() => updateSetting('zoomLevel', Math.max(0.5, settings.zoomLevel - 0.1))}>-</button>
            <span>{Math.round(settings.zoomLevel * 100)}%</span>
            <button onClick={() => updateSetting('zoomLevel', Math.min(2.0, settings.zoomLevel + 0.1))}>+</button>
          </div>
        </div>
      </section>
      
      <footer className="settings-footer">
        <p>MVET Songbook v0.1.0 • Built for Veterans</p>
      </footer>
    </div>
  );
};

export default SettingsView;
