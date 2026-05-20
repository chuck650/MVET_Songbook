import React, { useState, useEffect } from "react";
import { SettingsProvider, useSettings } from "./SettingsContext";
import SettingsView from "./SettingsView";
import MusicViewer from "./MusicViewer";
import About from "./About";
import { resolvePath } from "../utils/resolvePath";
import { Song } from "../types/songbook";

function AppContent() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"browser" | "settings" | "about" | "player">("browser");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [infoSong, setInfoSong] = useState<Song | null>(null);
  const { settings } = useSettings();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    setLoading(true);
    fetch(resolvePath(`/songs.json?v=${Date.now()}`), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: Song[]) => {
        setSongs(data);
        localStorage.setItem('mvet_cached_songs', JSON.stringify(data));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading songs, attempting offline fallback:", err);
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
  }, []);

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
    setSelectedSong(song);
    setActiveTab("player");
    // Push state to allow browser back button to close viewer
    window.history.pushState({ songId: song.id }, "");
  };

  const handleBackToLibrary = () => {
    setSelectedSong(null);
    setActiveTab("browser");
    // If we're coming from a pushState, go back in history
    if (window.history.state?.songId) {
      window.history.back();
    }
  };

  const handleDownload = (e: React.MouseEvent, _fileUrl: string) => {
    e.stopPropagation(); // Prevent card click
    // The browser will handle the download via the <a> tag's download attribute
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
                        {song.files.mscz && (
                          <a
                            href={resolvePath(song.files.mscz)}
                            download
                            className="btn-secondary"
                            onClick={(e) => handleDownload(e, resolvePath(song.files.mscz || ''))}
                          >
                            <img src={resolvePath("/assets/icons/mscz.svg")} className="btn-icon" alt="" />
                            <span>MSCZ</span>
                          </a>
                        )}
                        {song.files.mxl && (
                          <a
                            href={resolvePath(song.files.mxl)}
                            download
                            className="btn-secondary"
                            onClick={(e) => handleDownload(e, resolvePath(song.files.mxl || ''))}
                          >
                            <img src={resolvePath("/assets/icons/mxl.svg")} className="btn-icon icon-mxl" alt="" />
                            <span>MXL</span>
                          </a>
                        )}
                        {song.files.pdf && (
                          <a
                            href={resolvePath(song.files.pdf)}
                            download
                            className="btn-secondary"
                            onClick={(e) => handleDownload(e, resolvePath(song.files.pdf || ''))}
                          >
                            <img src={resolvePath("/assets/icons/pdf.svg")} className="btn-icon" alt="" />
                            <span>PDF</span>
                          </a>
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
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
