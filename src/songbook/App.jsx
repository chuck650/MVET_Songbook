import React, { useState, useEffect } from "react";
import { SettingsProvider, useSettings } from "./SettingsContext";
import SettingsView from "./SettingsView";
import MusicViewer from "./MusicViewer";
import About from "./About";
import { resolvePath } from "../utils/resolvePath";


function AppContent() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browser");
  const [selectedSong, setSelectedSong] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { settings } = useSettings();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    setLoading(true);
    fetch(resolvePath(`/songs.json?v=${Date.now()}`), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setSongs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading songs:", err);
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

  const handleSongSelect = (song) => {
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

  const handleDownload = (e, fileUrl) => {
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
                    <div className="song-card-preview">
                      {song.thumbnail ? (
                        <img src={song.thumbnail} alt={song.title} />
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
                        {song.key && (
                          <span className="key-badge">{song.key}</span>
                        )}
                      </div>
                      <p>{song.arranger || "Veteran Arrangement"}</p>
                      <div className="song-card-actions">
                        {song.files.mscz && (
                          <a
                            href={resolvePath(song.files.mscz)}
                            download
                            className="btn-secondary"
                            onClick={(e) => handleDownload(e, resolvePath(song.files.mscz))}
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
                            onClick={(e) => handleDownload(e, resolvePath(song.files.mxl))}
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
                            onClick={(e) => handleDownload(e, resolvePath(song.files.pdf))}
                          >
                            <img src={resolvePath("/assets/icons/pdf.svg")} className="btn-icon" alt="" />
                            <span>PDF</span>
                          </a>
                        )}
                      </div>
                    </div>
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
