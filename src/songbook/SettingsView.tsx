import React, { useState, useEffect } from "react";
import { useSettings } from "./SettingsContext";
import { Song } from "../types/songbook";
import { resolvePath, getApiUrl } from "../utils/resolvePath";
import { useAuth } from "./AuthContext";

interface DownloadItem {
  url: string;
  hash: string;
}

const SettingsView: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done">(
    "idle",
  );
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const { token, psk, isAuthenticated, isVerifying, error, submitPSK, logout } =
    useAuth();
  const [accessKeyInput, setAccessKeyInput] = useState(psk || "");

  useEffect(() => {
    if (psk) {
      setAccessKeyInput(psk);
    }
  }, [psk]);

  const parts = ["All", "Soprano", "Alto", "Tenor", "Bass"];

  const syncLibrary = async () => {
    try {
      setSyncStatus("syncing");
      setSyncProgress(0);

      const apiBase = getApiUrl();
      const catalogUrl = apiBase
        ? `${apiBase}/api/v1/songs`
        : resolvePath(`/songs.json?v=${Date.now()}`);

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(catalogUrl, { headers });
      const songs: Song[] = await response.json();

      // Load local hash manifest to detect changes
      const localHashes = JSON.parse(
        localStorage.getItem("mvet_synced_hashes") || "{}",
      ) as Record<string, string>;
      const newHashes: Record<string, string> = { ...localHashes };

      const cache = await caches.open("song-files-cache");
      let completed = 0;

      // Determine if we should sync copyrighted songs based on auth credentials
      const shouldSyncCopyrighted = isAuthenticated && !!token;

      // Flatten all files to download
      const downloadQueue: DownloadItem[] = [];
      songs.forEach((song) => {
        const isCopyrighted = song.copyrightInfo?.type === "copyrighted";
        if (isCopyrighted && !shouldSyncCopyrighted) {
          console.log(
            `Skipping offline sync for copyrighted song "${song.title}" (unauthenticated)`,
          );
          return;
        }

        // Main files
        if (song.files) {
          Object.entries(song.files).forEach(([_type, url]) => {
            if (url && typeof url === "string" && song.hashes) {
              const serverHash = song.hashes[url];
              if (serverHash && localHashes[url] !== serverHash) {
                downloadQueue.push({ url, hash: serverHash });
              }
            }
          });
        }

        // Part files
        if (song.parts) {
          Object.values(song.parts).forEach((part) => {
            if (part && part.files) {
              Object.entries(part.files).forEach(([_type, url]) => {
                if (url && typeof url === "string" && song.hashes) {
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
        setSyncStatus("done");
        setTimeout(() => setSyncStatus("idle"), 3000);
        return;
      }

      for (const item of downloadQueue) {
        try {
          const resolvedUrl = resolvePath(item.url);
          const hash = item.hash;
          const separator = resolvedUrl.includes("?") ? "&" : "?";
          const finalUrl = `${resolvedUrl}${separator}v=${hash}`;

          if (token && apiBase && (resolvedUrl.includes("/api/songs/") || resolvedUrl.includes("/api/v1/songs/"))) {
            // Service Worker intercepts and appends header dynamically.
            // No URL parameter query addition needed here.
          }

          await cache.add(finalUrl);
          newHashes[item.url] = item.hash;
        } catch (e) {
          console.warn(`Could not cache ${item.url}`, e);
        }
        completed++;
        setSyncProgress(Math.round((completed / downloadQueue.length) * 100));
      }

      localStorage.setItem("mvet_synced_hashes", JSON.stringify(newHashes));
      setSyncStatus("done");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      console.error("Sync failed:", err);
      setSyncStatus("idle");
      alert("Failed to sync library. Please check your connection.");
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
            onClick={() => {
              void syncLibrary();
            }}
            disabled={syncStatus === "syncing"}
          >
            {syncStatus === "syncing"
              ? `Syncing ${syncProgress}%`
              : syncStatus === "done"
                ? "✓ Synced"
                : "Sync All Songs"}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Choir Access Credentials</h3>

        {isAuthenticated ? (
          <div
            className="setting-control"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
              }}
            >
              <div className="setting-info">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  <span>🛡️</span> Access Granted (Choir Member)
                </label>
                <span>
                  Your device is successfully authorized for secure
                  arrangements.
                </span>
              </div>
              <button
                className="sync-btn"
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                }}
                onClick={() => {
                  void logout();
                  setAccessKeyInput("");
                }}
              >
                Revoke Access
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitPSK(accessKeyInput);
            }}
            className="setting-control"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div
                className="setting-info"
                style={{ flex: 1, minWidth: "200px" }}
              >
                <label>Enter Access Key</label>
                <span>Enter the preshared key to unlock protected scores.</span>
              </div>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <input
                  type="password"
                  placeholder="Enter PSK..."
                  value={accessKeyInput}
                  onChange={(e) => setAccessKeyInput(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    outline: "none",
                    fontSize: "0.9rem",
                  }}
                />
                <button
                  type="submit"
                  className="sync-btn"
                  disabled={isVerifying}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {isVerifying ? "Verifying..." : "Unlock"}
                </button>
              </div>
            </div>
            {error && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#f87171",
                  marginTop: "0.25rem",
                }}
              >
                ❌ {error}
              </span>
            )}
          </form>
        )}
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
            onChange={(e) => updateSetting("primaryPart", e.target.value)}
          >
            {parts.map((part) => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-control">
          <div className="setting-info">
            <label>Measure Numbers</label>
            <span>Show measure markings in the score by default.</span>
          </div>
          <button
            className={`toggle-btn ${settings.drawMeasureNumbers ? "active" : ""}`}
            onClick={() =>
              updateSetting("drawMeasureNumbers", !settings.drawMeasureNumbers)
            }
          >
            {settings.drawMeasureNumbers ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="setting-control">
          <div className="setting-info">
            <label>Modern Key Changes</label>
            <span>
              Hide "spurious" cancellation naturals during key signature
              changes.
            </span>
          </div>
          <button
            className={`toggle-btn ${settings.modernKeyChanges ? "active" : ""}`}
            onClick={() =>
              updateSetting("modernKeyChanges", !settings.modernKeyChanges)
            }
          >
            {settings.modernKeyChanges ? "On" : "Off"}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Performance Mode</h3>
        <div className="setting-control">
          <div className="setting-info">
            <label>Keep Screen Awake</label>
            <span>
              Prevent device from sleeping during rehearsals and performances.
            </span>
          </div>
          <button
            className={`toggle-btn ${settings.keepScreenAwake ? "active" : ""}`}
            onClick={() =>
              updateSetting("keepScreenAwake", !settings.keepScreenAwake)
            }
          >
            {settings.keepScreenAwake ? "On" : "Off"}
          </button>
        </div>

        <div className="setting-control">
          <div className="setting-info">
            <label>High Contrast Mode</label>
            <span>
              Maximum contrast for low-light performance environments.
            </span>
          </div>
          <button
            className={`toggle-btn ${settings.highContrast ? "active" : ""}`}
            onClick={() =>
              updateSetting("highContrast", !settings.highContrast)
            }
          >
            {settings.highContrast ? "Active" : "Inactive"}
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
            <button
              type="button"
              className="zoom-btn"
              disabled={(settings.zoomLevel || 1.0) <= 0.5}
              onClick={() =>
                updateSetting(
                  "zoomLevel",
                  Math.max(
                    0.5,
                    Math.round(((settings.zoomLevel || 1.0) - 0.1) * 20) / 20,
                  ),
                )
              }
            >
              −
            </button>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={settings.zoomLevel || 1.0}
              onChange={(e) =>
                updateSetting("zoomLevel", parseFloat(e.target.value))
              }
              className="zoom-slider"
            />
            <button
              type="button"
              className="zoom-btn"
              disabled={(settings.zoomLevel || 1.0) >= 2.0}
              onClick={() =>
                updateSetting(
                  "zoomLevel",
                  Math.min(
                    2.0,
                    Math.round(((settings.zoomLevel || 1.0) + 0.1) * 20) / 20,
                  ),
                )
              }
            >
              +
            </button>
            <span className="zoom-value">
              {Math.round((settings.zoomLevel || 1.0) * 100)}%
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
