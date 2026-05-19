import React, { useState, useEffect, useRef, useCallback } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { useSettings } from "./SettingsContext";
import { useWebAudio } from "./useWebAudio";
import { resolvePath } from "../utils/resolvePath";
import { Song } from "../types/songbook";

interface MusicViewerProps {
  song: Song;
  onBack: () => void;
}

interface ActiveTrack {
  type: 'video' | 'audio';
  url: string;
  partName: string;
}

interface RehearsalPart {
  key: string;
  name: string;
  files: {
    mxl?: string;
    mp3?: string;
    flac?: string;
    mp4?: string;
    [key: string]: string | undefined;
  };
}

const MusicViewer: React.FC<MusicViewerProps> = ({ song, onBack }) => {
  const { settings } = useSettings();
  const [activePartKey, setActivePartKey] = useState<string>("All");
  const [audioFormat, setAudioFormat] = useState<"flac" | "mp3">("flac");
  const [loading, setLoading] = useState<boolean>(true);

  // Performance Navigation States
  const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(false);
  const [currentX, setCurrentX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  // Rehearsal Tracks
  const [activeTrack, setActiveTrack] = useState<ActiveTrack | null>(null);

  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Web Audio isolator hooks
  const webAudio = useWebAudio(
    activeTrack?.type === 'audio' ? activeTrack.url : undefined,
    true // Autoplay on load
  );

  // Wake Lock Ref
  const wakeLockRef = useRef<unknown>(null);

  // Performance scrolling configurations
  const dragStartX = useRef<number>(0);
  const dragStartScroll = useRef<number>(0);
  const lastX = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const velocity = useRef<number>(0);
  const animationFrame = useRef<number>();

  // Extract rehearsal parts
  const rehearsalParts: RehearsalPart[] = [];
  if (song.parts) {
    Object.entries(song.parts).forEach(([key, val]) => {
      if (val) {
        rehearsalParts.push({
          key,
          name: val.name,
          files: val.files
        });
      }
    });
  }

  // Handle Screen Wake Lock
  useEffect(() => {
    if (!settings.keepScreenAwake) {
      if (wakeLockRef.current) {
        try {
          (wakeLockRef.current as { release: () => void }).release();
        } catch (e) {
          // ignore
        }
        wakeLockRef.current = null;
      }
      return;
    }

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const wl = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }).wakeLock.request('screen');
          wakeLockRef.current = wl;
          console.log("Wake Lock acquired successfully.");
        } catch (err) {
          console.warn("Wake Lock failed to acquire:", err);
        }
      }
    };

    void requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        try {
          (wakeLockRef.current as { release: () => void }).release();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [settings.keepScreenAwake]);

  // Set default isolator voice part from global settings
  useEffect(() => {
    if (settings.primaryPart && settings.primaryPart !== "All") {
      const match = rehearsalParts.find(p => p.name.toLowerCase() === settings.primaryPart.toLowerCase());
      if (match) {
        setActivePartKey(match.key);
      }
    }
  }, [settings.primaryPart, song]);

  // Handle Performance Mode Key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPerformanceMode(false);
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        goToNextPage(currentX);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        goToPrevPage(currentX);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPerformanceMode, currentX]);

  // Load XML Score
  const loadScore = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true);

    // Clean prior rendering context
    containerRef.current.innerHTML = "";
    osmdRef.current = null;

    try {
      const targetMxl = activePartKey === "All" 
        ? song.files.osmd || song.files.mxl
        : song.parts?.[activePartKey]?.files?.mxl || song.files.osmd || song.files.mxl;

      if (!targetMxl) {
        throw new Error("No notation file found.");
      }

      console.log(`OSMD: Loading notation score: ${targetMxl}`);
      
      const response = await fetch(resolvePath(targetMxl));
      const arrayBuffer = await response.arrayBuffer();

      const osmd = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        drawSubtitle: false,
        drawComposer: false,
        drawCredits: false,
        drawPartNames: true,
        drawMeasureNumbers: settings.drawMeasureNumbers,
        coloringEnabled: true,
        alignRhythm: true,
        fillEmptyMeasuresWithWholeRests: true,
        backend: "svg"
      } as any);

      // Spurious volta cancellations override
      const rules = (osmd as any).rules || (osmd as any).EnginePlayBackRules;
      if (rules) {
        rules.DrawingDoubleKeySignatureChange = settings.modernKeyChanges;
        rules.FingeringPosition = 2; // Above note
      }

      await osmd.load(arrayBuffer as unknown as string);
      
      // Calibrate Zoom scale
      osmd.Zoom = settings.zoomLevel;
      osmd.render();

      osmdRef.current = osmd;
      setLoading(false);
      
      // Reset Performance positioning
      setCurrentX(0);
      if (wrapperRef.current) {
        wrapperRef.current.scrollLeft = 0;
      }
    } catch (err) {
      console.error("OSMD Loading Error:", err);
      setLoading(false);
    }
  }, [activePartKey, song, settings.drawMeasureNumbers, settings.modernKeyChanges, settings.zoomLevel]);

  useEffect(() => {
    void loadScore();
  }, [loadScore]);

  // Safe Navigation calculations
  const getMaxScroll = (): number => {
    if (!containerRef.current || !wrapperRef.current) return 0;
    const padding = 150; // Viewport padding protection
    return Math.max(0, containerRef.current.scrollWidth - wrapperRef.current.clientWidth + padding);
  };

  const goToNextPage = (curr: number) => {
    if (!wrapperRef.current) return;
    const maxScroll = getMaxScroll();
    const stride = wrapperRef.current.clientWidth * 0.85; // 85% viewport glide
    const nextVal = Math.min(maxScroll, curr + stride);
    glideTo(nextVal);
  };

  const goToPrevPage = (curr: number) => {
    const stride = wrapperRef.current?.clientWidth ? wrapperRef.current.clientWidth * 0.85 : 400;
    const nextVal = Math.max(0, curr - stride);
    glideTo(nextVal);
  };

  // Smooth scroll animator loop
  const glideTo = (target: number) => {
    if (animationFrame.current !== undefined) cancelAnimationFrame(animationFrame.current);
    
    let start: number | null = null;
    const duration = 250; // Milliseconds transition
    const initX = currentX;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const t = Math.min(progress / duration, 1);
      
      // Ease out Cubic glide
      const ease = 1 - Math.pow(1 - t, 3);
      const val = initX + (target - initX) * ease;
      
      setCurrentX(val);
      if (wrapperRef.current) {
        wrapperRef.current.scrollLeft = val;
      }

      if (t < 1) {
        animationFrame.current = requestAnimationFrame(step);
      } else {
        setCurrentX(target);
      }
    };
    animationFrame.current = requestAnimationFrame(step);
  };

  // Performance Scrolling gesture tracking
  const handleGestureStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPerformanceMode) return;
    if (animationFrame.current !== undefined) cancelAnimationFrame(animationFrame.current);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartX.current = clientX;
    dragStartScroll.current = currentX;
    lastX.current = clientX;
    lastTime.current = performance.now();
    velocity.current = 0;
  };

  const handleGestureMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = dragStartX.current - clientX;
    const now = performance.now();
    const dt = now - lastTime.current;
    
    if (dt > 0) {
      velocity.current = -(clientX - lastX.current) / dt;
    }
    
    lastX.current = clientX;
    lastTime.current = now;

    const maxScroll = getMaxScroll();
    const nextVal = Math.max(0, Math.min(maxScroll, dragStartScroll.current + deltaX));
    setCurrentX(nextVal);
    if (wrapperRef.current) {
      wrapperRef.current.scrollLeft = nextVal;
    }
  };

  const handleGestureEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    // Apply inertia scroll if velocity was fast enough
    if (Math.abs(velocity.current) > 0.15) {
      const inertiaDelta = velocity.current * 150; // inertia stride
      const maxScroll = getMaxScroll();
      const target = Math.max(0, Math.min(maxScroll, currentX + inertiaDelta));
      glideTo(target);
    }
  };

  // Video and Audio Track Playback coordinators
  const handlePlayTrack = (type: 'video' | 'audio', part: RehearsalPart) => {
    const fileUrl = part.files[audioFormat === 'flac' ? 'flac' : 'mp3'] || part.files.mp3 || part.files.flac;
    if (type === 'video' && part.files.mp4) {
      setActiveTrack({
        type: 'video',
        url: resolvePath(part.files.mp4),
        partName: part.name
      });
    } else if (type === 'audio' && fileUrl) {
      setActiveTrack({
        type: 'audio',
        url: resolvePath(fileUrl),
        partName: part.name
      });
    }
  };

  return (
    <div className={`music-viewer ${isPerformanceMode ? "performance-mode" : ""}`}>
      <header className="viewer-header">
        <button onClick={onBack} className="btn-back">← Library</button>
        <div className="header-titles">
          <h3>{song.title}</h3>
          <p>{activePartKey === "All" ? "Full SATB Score" : `${song.parts?.[activePartKey]?.name || "Solo"} Rehearsal`}</p>
        </div>
        <button 
          className={`performance-toggle ${isPerformanceMode ? "active" : ""}`}
          onClick={() => {
            setIsPerformanceMode(true);
            // Hide tracks sidebar when transitioning to performance view
            setActiveTrack(null);
          }}
          title="Enter Performance Mode"
        >
          🎭 Performance Mode
        </button>
      </header>

      {!isPerformanceMode && (
        <aside className="rehearsal-aside glass">
          <div className="aside-scrollable">
            <section className="drawer-section">
              <h5>Focus Part Isolation</h5>
              <div className="btn-group-vertical">
                <button 
                  className={`part-select-btn ${activePartKey === 'All' ? 'active' : ''}`}
                  onClick={() => setActivePartKey('All')}
                >
                  Full Score (SATB)
                </button>
                {rehearsalParts.map((part) => (
                  <button 
                    key={part.key} 
                    className={`part-select-btn ${activePartKey === part.key ? 'active' : ''}`}
                    onClick={() => setActivePartKey(part.key)}
                  >
                    {part.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="drawer-section">
              <div className="section-header-row">
                <h5>Rehearsal Tracks</h5>
                <div className="format-toggle">
                  <button 
                    className={audioFormat === 'flac' ? 'active' : ''} 
                    onClick={() => setAudioFormat('flac')}
                  >FLAC</button>
                  <button 
                    className={audioFormat === 'mp3' ? 'active' : ''} 
                    onClick={() => setAudioFormat('mp3')}
                  >MP3</button>
                </div>
              </div>
              <div className="tracks-table-container">
                <table className="tracks-table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Video</th>
                      <th>Audio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rehearsalParts.map((part) => {
                      const hasVideo = part.files?.mp4;
                      const hasAudio = part.files?.mp3 || part.files?.flac;
                      if (!hasVideo && !hasAudio) return null;

                      return (
                        <tr key={part.key}>
                          <td className="part-name-cell">{part.name}</td>
                          <td>
                            {hasVideo && (
                              <div className="track-btns">
                                <button className="track-btn play" onClick={() => handlePlayTrack('video', part)}>▶</button>
                                <a href={resolvePath(part.files.mp4)} download className="track-btn download">⬇</a>
                              </div>
                            )}
                          </td>
                          <td>
                            {hasAudio && (
                              <div className="track-btns">
                                <button className="track-btn play" onClick={() => handlePlayTrack('audio', part)}>▶</button>
                                <a 
                                  href={`${resolvePath(part.files[audioFormat] || part.files.flac || part.files.mp3)}?v=${song.hashes?.[part.files[audioFormat] || part.files.flac || part.files.mp3 || ''] || '1'}`} 
                                  download 
                                  className="track-btn download"
                                >⬇</a>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </aside>
      )}

      {activeTrack?.type === 'video' && (
        <div className="video-overlay" onClick={() => setActiveTrack(null)}>
          <div className="video-container-modal" onClick={e => e.stopPropagation()}>
            <div className="video-header-modal">
              <h5>{activeTrack.partName} Rehearsal</h5>
              <button onClick={() => setActiveTrack(null)}>×</button>
            </div>
            <video controls autoPlay className="main-video-player">
              <source src={activeTrack.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {loading && <div className="viewer-overlay"><div className="loader">Loading...</div></div>}
      
      <div 
        ref={wrapperRef} 
        className={`osmd-scroll-wrapper ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleGestureStart}
        onMouseMove={handleGestureMove}
        onMouseUp={handleGestureEnd}
        onMouseLeave={handleGestureEnd}
        onTouchStart={handleGestureStart}
        onTouchMove={handleGestureMove}
        onTouchEnd={handleGestureEnd}
      >
        <div 
          ref={containerRef} 
          className={`osmd-container ${isPerformanceMode ? 'performance-score' : ''}`}
          style={{ '--performance-x': `-${currentX}px` } as React.CSSProperties} 
        />
        
        {isPerformanceMode && (
          <div className="performance-overlay">
            <div className="performance-title">{song.title}</div>
            
            <button 
              className="performance-exit-btn" 
              onClick={(e) => {
                e.stopPropagation();
                setIsPerformanceMode(false);
              }}
              title="Exit Performance Mode"
            >
              ×
            </button>
            
            <div className="performance-nav-pill glass">
              <button 
                className="nav-pill-btn prev" 
                onClick={(e) => { e.stopPropagation(); goToPrevPage(currentX); }}
                title="Previous Measures"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <div className="nav-pill-divider"></div>
              <button 
                className="nav-pill-btn next" 
                onClick={(e) => { e.stopPropagation(); goToNextPage(currentX); }}
                title="Next Measures"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTrack?.type === 'audio' && (
        <div className="rehearsal-player audio-min-player">
          <div className="player-controls">
            <div className="player-info-mini">
              <span className="part-label">{activeTrack.partName}</span>
              <button className="close-player" onClick={() => { webAudio.pause(); setActiveTrack(null); }}>×</button>
            </div>
            
            <div className="player-main-ctrls">
              <div className={`equalizer-mini ${webAudio.isPlaying ? 'active' : ''}`}>
                <div className="eq-bar" style={{ height: webAudio.isPlaying ? `${Math.max(10, webAudio.amplitude * 100)}%` : '10%' }} />
                <div className="eq-bar" style={{ height: webAudio.isPlaying ? `${Math.max(15, webAudio.amplitude * 80)}%` : '15%' }} />
                <div className="eq-bar" style={{ height: webAudio.isPlaying ? `${Math.max(20, webAudio.amplitude * 120)}%` : '5%' }} />
              </div>

              <button className="play-btn" onClick={() => webAudio.isPlaying ? webAudio.pause() : webAudio.play()} disabled={webAudio.isLoading}>
                {webAudio.isLoading ? <div className="spinner-mini" /> : webAudio.isPlaying ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5V19L19 12L8 5Z"/></svg>
                )}
              </button>
            </div>

            <div className="player-progress">
              <span className="time-display">{Math.floor(webAudio.currentTime/60)}:{Math.floor(webAudio.currentTime%60).toString().padStart(2,'0')}</span>
              <input type="range" min="0" max={webAudio.duration || 100} step="0.1" value={webAudio.currentTime} onChange={(e) => webAudio.seek(parseFloat(e.target.value))} />
              <span className="time-display">{Math.floor(webAudio.duration/60)}:{Math.floor(webAudio.duration%60).toString().padStart(2,'0')}</span>
            </div>

            <div className="volume-control">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="vol-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              <input 
                type="range" min="0" max="1" step="0.01" defaultValue="1" 
                onChange={(e) => webAudio.setVolume(parseFloat(e.target.value))} 
              />
            </div>
          </div>
        </div>
      )}

      <footer className="viewer-footer">
        <div className="footer-center">
          {(song.arranger || song.engraver || song.key || song.mtime) && (
            <div className="metadata-pill">
              {song.arranger && <span>Arranger: {song.arranger}</span>}
              {song.engraver && <><span className="dot">•</span><span>Engraver: {song.engraver}</span></>}
              {song.key && <><span className="dot">•</span><span>Key: {song.key}</span></>}
              {song.mtime && <><span className="dot">•</span><span>Updated: {song.mtime}</span></>}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default MusicViewer;
