import React, { useState, useEffect } from "react";
import { SettingsProvider, useSettings } from "./SettingsContext";
import SettingsView from "./SettingsView";
import MusicViewer from "./MusicViewer";
import About from "./About";
import { resolvePath } from "../utils/resolvePath";
import { Song } from "../types/songbook";
import { AuthProvider, useAuth } from "./AuthContext";
import { ChoirAuthModal } from "./ChoirAuthModal";


function AppContent() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"browser" | "settings" | "about" | "player">("browser");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [infoSong, setInfoSong] = useState<Song | null>(null);
  const [authModalSong, setAuthModalSong] = useState<Song | null>(null);
  const [pendingSongOpenId, setPendingSongOpenId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activePdfTitle, setActivePdfTitle] = useState<string>("");
  const { settings } = useSettings();
  const { token, isAuthenticated } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const apiBase = import.meta.env.VITE_API_URL || "";
    const catalogUrl = apiBase ? `${apiBase}/api/songs` : resolvePath(`/songs.json?v=${Date.now()}`);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log(`Fetching songs catalog from: ${catalogUrl} (Auth: ${!!token})`);

    fetch(catalogUrl, { 
      headers,
      cache: 'no-store' 
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((data: Song[]) => {
        if (!active) return;
        setSongs(data);
        localStorage.setItem('mvet_cached_songs', JSON.stringify(data));
        setLoading(false);
        
        // Auto-open selected song if we just authenticated
        if (pendingSongOpenId) {
          const unlockedSong = data.find(s => s.id === pendingSongOpenId);
          if (unlockedSong && unlockedSong.files && (unlockedSong.files as any).protected !== true) {
            setSelectedSong(unlockedSong);
            setActiveTab("player");
            window.history.pushState({ songId: unlockedSong.id }, "");
            setPendingSongOpenId(null);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        console.warn("API/Catalog fetch failed, falling back to local songs.json:", err);
        // Fallback to static songs.json
        fetch(resolvePath(`/songs.json?v=${Date.now()}`), { cache: 'no-store' })
          .then((res) => res.json())
          .then((data: Song[]) => {
            if (!active) return;
            setSongs(data);
            localStorage.setItem('mvet_cached_songs', JSON.stringify(data));
            setLoading(false);
          })
          .catch((localErr) => {
            if (!active) return;
            console.error("Local songs.json fetch failed, using offline localStorage fallback:", localErr);
            const cached = localStorage.getItem('mvet_cached_songs');
            if (cached) {
              try {
                setSongs(JSON.parse(cached));
                console.log("Loaded offline library from local storage.");
              } catch (e) {
                console.error("Failed to parse cached songs:", e);
              }
            }
            setLoading(false);
          });
      });

    return () => {
      active = false;
    };
  }, [token, isAuthenticated]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedSong) {
        setSelectedSong(null);
        setActiveTab("browser");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedSong]);

  const handleInfoClick = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    setInfoSong(song);
  };

  const handleSongSelect = (song: Song) => {
    const isProtected = song.files && (song.files as any).protected === true;
    
    if (isProtected) {
      setAuthModalSong(song);
    } else {
      setSelectedSong(song);
      setActiveTab("player");
      // Push state to allow browser back button to close viewer
      window.history.pushState({ songId: song.id }, "");
    }
  };

  const handleBackToLibrary = () => {
    setSelectedSong(null);
    setActiveTab("browser");
    // If we're coming from a pushState, go back in history
    if (window.history.state?.songId) {
      window.history.back();
    }
  };

  const getSongFileUrl = (song: Song, fileUrl: string | undefined, addHash = true) => {
    if (!fileUrl) return "";
    const resolved = resolvePath(fileUrl);
    if (!resolved) return "";
    let url = resolved;
    
    if (addHash && song.hashes?.[fileUrl]) {
      const hash = song.hashes[fileUrl];
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}v=${hash}`;
    }
    
    if (token && import.meta.env.VITE_API_URL) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}token=${encodeURIComponent(token)}`;
    }
    return url;
  };

  const handleDownload = async (e: React.MouseEvent, fileUrl: string, filename: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent card click
    
    if (downloading[fileUrl]) return;

    setDownloading((prev) => ({ ...prev, [fileUrl]: true }));
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log(`Downloading secure resource: ${fileUrl}`);
      const response = await fetch(fileUrl, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke the object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error("Secure JS Download failed, falling back to direct navigation:", error);
      // Direct download fallback
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading((prev) => ({ ...prev, [fileUrl]: false }));
    }
  };

  return (
    <div
      className={`app-container ${selectedSong ? "viewer-mode" : ""} ${settings.highContrast ? "high-contrast" : ""}`}
    >
      {!selectedSong && (
        <nav className={`sidebar ${!isSidebarOpen ? "collapsed" : ""}`}>
          <div className="branding">
            <div className="branding-text">
              <img src={resolvePath("/favicon.png")} alt="MVET Choral Songbook" className="sidebar-logo" />
            </div>
            <button 
              className="sidebar-close-btn"
              onClick={toggleSidebar}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
          <ul className="nav-links">
            <li
              className={activeTab === "browser" ? "active" : ""}
              onClick={() => {
                setActiveTab("browser");
                setIsSidebarOpen(false);
              }}
            >
              <span>📚</span> Library
            </li>
            <li
              className={activeTab === "settings" ? "active" : ""}
              onClick={() => {
                setActiveTab("settings");
                setIsSidebarOpen(false);
              }}
            >
              <span>⚙️</span> Settings
            </li>
            <li
              className={activeTab === "about" ? "active" : ""}
              onClick={() => {
                setActiveTab("about");
                setIsSidebarOpen(false);
              }}
            >
              <span>🛡️</span> About & Legal
            </li>
          </ul>
        </nav>
      )}

      <main className="main-content">
        {!selectedSong && (
          <header className="view-header">
            <button 
              className="sidebar-toggle" 
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              ☰
            </button>
            <div className="header-titles" style={{ flex: 1, marginLeft: '1rem' }}>
              <h2>Choral Songbook</h2>
              <p>Military Voices of East Tennessee</p>
            </div>
          </header>
        )}

        <div className="main-view">
          {activeTab === "browser" && !selectedSong && (
            <div className="library-welcome">
              <div className="hero-banner">
                <img src={resolvePath("/mvet_hero.png")} alt="MVET Patriotic Branding" />
                <div className="hero-overlay">
                  <h3>Honor through Harmony</h3>
                </div>
              </div>
            </div>
          )}

          {activeTab === "browser" && !selectedSong && loading && null}

          {activeTab === "browser" && !selectedSong && !loading && (
            <div className="song-grid">
              {songs.length > 0 ? (
                songs.map((song) => (
                  <div
                    key={song.id}
                    className="song-card"
                    onClick={() => handleSongSelect(song)}
                    title={song.title}
                  >
                    {/* Top Right Badges */}
                    <div className="song-card-badges">
                      {song.key && (
                        <span className="key-badge">{song.key}</span>
                      )}
                      {song.copyrightInfo && (
                        <span className={`copyright-badge ${song.copyrightInfo.type}`}>
                          {song.copyrightInfo.license || (
                            song.copyrightInfo.type === 'public_domain' ? 'Public Domain' :
                            song.copyrightInfo.type === 'copyrighted' ? 'Copyrighted' :
                            song.copyrightInfo.type === 'creative_commons' ? 'Creative Commons' : 'Permissive'
                          )}
                        </span>
                      )}
                    </div>

                    <div className="song-card-preview">
                      {song.thumbnail ? (
                        <img src={resolvePath(song.thumbnail)} alt={song.title} />
                      ) : (
                        <div className="preview-placeholder">
                          <div className="music-staff-lines"></div>
                          <span>{song.title}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="song-card-content">
                      <div className="title-row">
                        <h3>{song.title}</h3>
                      </div>
                      <p>{song.subtitle || "Traditional SATB"}</p>
                      <div className="song-card-actions">
                        {song.files.mscz && (() => {
                          const url = getSongFileUrl(song, song.files.mscz, true);
                          const isLoading = downloading[url];
                          return (
                            <a
                              href={url}
                              download={`${song.title}.mscz`}
                              className={`btn-secondary ${isLoading ? "loading" : ""}`}
                              onClick={(e) => { void handleDownload(e, url, `${song.title}.mscz`); }}
                            >
                              <img src={resolvePath("/assets/icons/mscz.svg")} className="btn-icon" alt="" />
                              <span>{isLoading ? "Downloading..." : "MSCZ"}</span>
                            </a>
                          );
                        })()}
                        {song.files.mxl && (() => {
                          const url = getSongFileUrl(song, song.files.mxl, true);
                          const isLoading = downloading[url];
                          return (
                            <a
                              href={url}
                              download={`${song.title}.mxl`}
                              className={`btn-secondary ${isLoading ? "loading" : ""}`}
                              onClick={(e) => { void handleDownload(e, url, `${song.title}.mxl`); }}
                            >
                              <img src={resolvePath("/assets/icons/mxl.svg")} className="btn-icon icon-mxl" alt="" />
                              <span>{isLoading ? "Downloading..." : "MXL"}</span>
                            </a>
                          );
                        })()}
                        {song.files.pdf && (
                          <button
                            className="btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card select click
                              const url = getSongFileUrl(song, song.files.pdf, true);
                              setActivePdfUrl(url);
                              setActivePdfTitle(song.title);
                            }}
                          >
                            <img src={resolvePath("/assets/icons/pdf.svg")} className="btn-icon" alt="" />
                            <span>PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      className="info-btn card-info-btn-lower"
                      onClick={(e) => handleInfoClick(e, song)}
                      aria-label="View song details and copyright"
                      title="Song details & licensing"
                    >
                      <span className="info-icon-char">i</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No songs found in public/songs/</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && !selectedSong && <SettingsView />}

          {activeTab === "about" && !selectedSong && (
            <About onBack={() => setActiveTab("browser")} />
          )}

          {selectedSong && (
            <MusicViewer song={selectedSong} onBack={handleBackToLibrary} />
          )}
        </div>
      </main>

      {infoSong && (
        <div className="modal-overlay" onClick={() => setInfoSong(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setInfoSong(null)} aria-label="Close modal">
              ✕
            </button>
            <div className="modal-header">
              <h2>{infoSong.title}</h2>
              {infoSong.copyrightInfo && (
                <span className={`copyright-badge large ${infoSong.copyrightInfo.type}`}>
                  {infoSong.copyrightInfo.license || (
                    infoSong.copyrightInfo.type === 'public_domain' ? 'Public Domain' :
                    infoSong.copyrightInfo.type === 'copyrighted' ? 'Copyrighted' :
                    infoSong.copyrightInfo.type === 'creative_commons' ? 'Creative Commons' : 'Permissive'
                  )}
                </span>
              )}
            </div>
            <div className="modal-body">
              <div className="metadata-grid">
                {infoSong.composer && (
                  <div className="metadata-item">
                    <span className="metadata-label">Composer</span>
                    <span className="metadata-value">{infoSong.composer}</span>
                  </div>
                )}
                {infoSong.arranger && (
                  <div className="metadata-item">
                    <span className="metadata-label">Arranger</span>
                    <span className="metadata-value">{infoSong.arranger}</span>
                  </div>
                )}
                {infoSong.engraver && (
                  <div className="metadata-item">
                    <span className="metadata-label">Engraver</span>
                    <span className="metadata-value">{infoSong.engraver}</span>
                  </div>
                )}
                {infoSong.key && (
                  <div className="metadata-item">
                    <span className="metadata-label">Key Signature</span>
                    <span className="metadata-value">{infoSong.key}</span>
                  </div>
                )}
              </div>

              {infoSong.copyrightInfo?.statement && (
                <div className="copyright-statement-section">
                  <h4>Licensing & Legal Status</h4>
                  <p className="copyright-statement">{infoSong.copyrightInfo.statement}</p>
                </div>
              )}

              {infoSong.copyrightInfo?.links && infoSong.copyrightInfo.links.length > 0 && (
                <div className="copyright-links-section">
                  <h4>References & Licensing Records</h4>
                  <ul className="copyright-links-list">
                    {infoSong.copyrightInfo.links.map((link, idx) => (
                      <li key={idx}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="copyright-link">
                          <span>📄</span> {link.length > 55 ? `${link.substring(0, 52)}...` : link}
                          <span className="external-icon">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setInfoSong(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {authModalSong && (
        <ChoirAuthModal
          songTitle={authModalSong.title}
          onClose={() => setAuthModalSong(null)}
          onSuccess={() => {
            // Find the freshly unlocked song from the catalog state (which will update via context token)
            // Or just fetch and load it. Wait, to prevent stale state references, we can load it 
            // after the catalog re-renders, or just open it directly once token is set.
            // When token is updated, songs will be fetched. We can just setselectedSong directly!
            // Wait, if we setSelectedSong immediately, the old "protected: true" song will be active 
            // in selectedSong until we re-assign. It is cleaner to set it!
            // Since we trigger onSuccess after submitPSK finishes, the fetch is already triggered.
            // Let's find the unmasked song from the newly fetched array inside another hook, or just
            // fetch it directly. Actually, the easiest is to do select after state re-fetch, or simply 
            // setselectedSong immediately using a small helper, or ask the user to click again.
            // Let's immediately setselectedSong with a copy of authModalSong, but wait!
            // If selectedSong is set, it will load. Once the catalog re-fetches, selectedSong is already loaded.
            // Wait, does MusicViewer fetch files directly?
            // Yes! MusicViewer downloads files from the URL inside selectedSong.files.osmd.
            // If we set selectedSong to authModalSong, its selectedSong.files.osmd is still "protected: true" (which will fail)!
            // We MUST load the unmasked song!
            // Let's search the songs array after it updates, or better yet, fetch the specific song's 
            // unmasked metadata directly when unlocking, or wait a tick!
            // Wait, if we do a single quick inline fetch for the song data, we can get the unmasked version immediately!
            // Yes! `${apiBase}/api/songs` returns the full catalog. We can just fetch `${apiBase}/api/songs` with the new token
            // and find the song, then select it!
            // Let's do that! That is 100% race-condition free and ultra-robust!
            const apiBase = import.meta.env.VITE_API_URL || "";
            if (apiBase) {
              // Read token from IndexedDB (or we can just fetch it again since we know token is updated)
              // Wait, submitPSK updates token in state, so we can fetch the catalog with it.
              // To make sure we have the token, we can get it from localStorage or our auth storage.
              // The submitPSK updates the state, so it will trigger the AppContent useEffect which refreshes the whole song list.
              // Let's set a small flag 'pendingSongIdToOpen = authModalSong.id'.
              // Then in the useEffect that refreshes songs, if 'pendingSongIdToOpen' matches a song that is now unlocked,
              // we setSelectedSong(unlockedSong) and clear the flag!
              // Oh!!! That is absolute genius! It is 100% automatic, clean, and has zero race conditions!
              setPendingSongOpenId(authModalSong.id);
            }
          }}
        />
      )}

      {activePdfUrl && (
        <div className="pdf-viewer-overlay">
          <header className="view-header pdf-viewer-header">
            <button 
              className="sync-btn back-btn"
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
              onClick={() => setActivePdfUrl(null)}
            >
              ← Back to Library
            </button>
            <div className="header-titles" style={{ marginLeft: "1.5rem" }}>
              <h2>{activePdfTitle}</h2>
              <p>Sheet Music PDF</p>
            </div>
          </header>
          <div className="pdf-viewer-container">
            <iframe 
              src={activePdfUrl} 
              title={`${activePdfTitle} PDF`}
              className="pdf-iframe"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
