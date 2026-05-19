import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { useSettings } from './SettingsContext';
import { useWebAudio } from './useWebAudio';
import { resolvePath } from '../utils/resolvePath';
import { Song, RehearsalFiles } from '../types/songbook';

interface ActiveTrack {
  type: 'audio' | 'video';
  url: string;
  partName: string;
}

interface RehearsalPart {
  key: string;
  name: string;
  files: RehearsalFiles;
}

interface MusicViewerProps {
  song: Song;
  onBack: () => void;
}

const MusicViewer: React.FC<MusicViewerProps> = ({ song, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { settings, updateSetting } = useSettings();
  
  const [activePartKey, setActivePartKey] = useState<string>('full');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [audioFormat, setAudioFormat] = useState<'flac' | 'mp3'>('flac');
  const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(false);
  const drawMeasureNumbers = settings.drawMeasureNumbers ?? true;

  // Media Player State
  const [activeTrack, setActiveTrack] = useState<ActiveTrack | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(window.innerWidth <= 600 ? 0.75 : 1.0);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const webAudio = useWebAudio(activeTrack?.type === 'audio' ? activeTrack.url : undefined, true);
  const [measureMap, setMeasureMap] = useState<Array<{ index: number; x: number }>>([]);
  const [currentX, setCurrentX] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, { 
        autoResize: true, 
        drawTitle: false, 
        drawLyrics: true, 
        coloringEnabled: true, 
        followCursor: false,
        drawPartNames: false,
        drawPartAbbreviations: false,
        renderSingleHorizontalStaffline: isPerformanceMode
      });
    }

    const osmd = osmdRef.current;
    
    // Set all EngravingRules before loading to ensure they are respected during parsing
    osmd.EngravingRules.RenderPartNames = false;
    osmd.EngravingRules.RenderPartAbbreviations = false;

    try {
      if (!osmd) return;

      // Set performance-specific options
      if (isPerformanceMode) {
        // High-resolution baseline for Performance Mode
        const optimalZoom = 0.8;
        (osmd as any).Zoom = optimalZoom;
        
        osmd.setOptions({
          drawTitle: false,
          drawSubtitle: false,
          drawComposer: false,
          drawCredits: false,
          drawLyrics: true,
          drawPartNames: false,
          drawPartAbbreviations: false,
          renderSingleHorizontalStaffline: true,
          drawPageBackground: false, 
          drawPageBackgrounds: false, // Cover all variations
          drawPageShadows: false,     // Specifically kill shadows
          pageBackgroundColor: 'transparent' 
        } as any);
      } else {
        (osmd as any).Zoom = zoomLevel;
        osmd.setOptions({
          drawTitle: false,      // Suppress redundant title since we display it in the header
          drawSubtitle: false,
          drawComposer: false,
          drawCredits: false,    // Suppress arranger/lyricist credits to prevent overlapping with system text
          drawLyrics: true,
          drawPartNames: false,
          drawPartAbbreviations: false,
          renderSingleHorizontalStaffline: false
        });
      }
    } catch (e) {
      console.error("OSMD Option Update Error:", e);
    }
    
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const mRelative = activePartKey === 'full' 
          ? (song.files.osmd || song.files.mxl) 
          : song.parts?.[activePartKey]?.files?.mxl || song.files.mxl;
        
        if (!mRelative) {
          throw new Error("No MusicXML file specified");
        }

        // Cache-buster using hash to ensure sanitization is applied
        const hash = song.hashes?.[mRelative] || Date.now();
        const m = `${resolvePath(mRelative)}?v=${hash}`;
        
        await osmd.load(m);
        osmd.setOptions({ drawMeasureNumbers: !!drawMeasureNumbers });
        
        // The responsive render effect will handle the margins, zoom, and render call
        setLoading(false);
      } catch (err) {
        console.error("OSMD Render Error:", err);
        setError("Render Fail"); 
        setLoading(false); 
      }
    })();
  }, [song, activePartKey, drawMeasureNumbers, isPerformanceMode, zoomLevel]);

  // Responsive Margins and Zooming Effect - Re-renders without reloading XML
  useEffect(() => {
    const osmd = osmdRef.current;
    if (osmd && (osmd as any).sheet && !loading) {
      osmd.EngravingRules.PageLeftMargin = 4.0;
      osmd.EngravingRules.PageRightMargin = 4.0;
      osmd.EngravingRules.PageTopMargin = 5.0;
      osmd.EngravingRules.PageBottomMargin = 5.0;
      
      (osmd as any).Zoom = zoomLevel;
      
      try {
        osmd.render();
        
        // Build Measure Map for Performance Mode paging if active
        if (isPerformanceMode) {
          const mList: Array<{ index: number; x: number }> = [];
          const graphicMeasures = osmd.GraphicSheet.MeasureList;
          for (let i = 0; i < graphicMeasures.length; i++) {
            const m = graphicMeasures[i][0];
            if (m) {
              mList.push({
                index: i,
                x: m.PositionAndShape.AbsolutePosition.x * 10
              });
            }
          }
          setMeasureMap(mList);
          setCurrentX(0);
        }
      } catch (e) {
        console.error("OSMD Responsive Render Error:", e);
      }
    }
  }, [windowWidth, zoomLevel, loading, isPerformanceMode]);

  // UX Fix: Reset audio player when format changes to ensure new format is picked up
  useEffect(() => {
    if (activeTrack?.type === 'audio') {
      setActiveTrack(null);
    }
  }, [audioFormat]);

  const partOrder = ['soprano', 'alto', 'tenor', 'bass', 'women', 'men'];
  const rehearsalParts: RehearsalPart[] = [
    { key: 'full', name: 'Full Score', files: song.files },
    ...partOrder
      .filter(key => song.parts?.[key])
      .map(key => ({ key, name: song.parts?.[key]?.name || key, files: song.parts?.[key]?.files || {} }))
  ];

  const handlePlayTrack = useCallback((type: 'audio' | 'video', part: RehearsalPart) => {
    const fileUrl = type === 'video' ? part.files.mp4 : (part.files[audioFormat] || part.files.flac || part.files.mp3);
    if (!fileUrl) return;
    
    // Apply cache-busting hash
    const hash = song.hashes?.[fileUrl] || Date.now();
    const finalUrl = `${resolvePath(fileUrl)}?v=${hash}`;
    
    setActiveTrack({ type, url: finalUrl, partName: part.name });
  }, [song, audioFormat]);

  // Performance Mode Unified Gesture Engine
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialX, setInitialX] = useState<number>(0);
  const dragStartTime = useRef<number>(0);
  const dragDistance = useRef<number>(0);
  const wasDragging = useRef<boolean>(false);

  const goToNextPage = useCallback((fromX = currentX) => {
    if (!isPerformanceMode || measureMap.length === 0) return;
    const viewportWidth = window.innerWidth;
    const targetX = fromX + (viewportWidth * 0.85);
    const nextMeasure = measureMap.find(m => m.x >= targetX);
    if (nextMeasure) setCurrentX(nextMeasure.x);
  }, [isPerformanceMode, measureMap, currentX]);

  const goToPrevPage = useCallback((fromX = currentX) => {
    if (!isPerformanceMode || measureMap.length === 0) return;
    const viewportWidth = window.innerWidth;
    const targetX = fromX - (viewportWidth * 0.85);
    const prevMeasure = [...measureMap].reverse().find(m => m.x <= targetX);
    setCurrentX(prevMeasure ? Math.max(0, prevMeasure.x) : 0);
  }, [isPerformanceMode, measureMap, currentX]);

  const handleGestureStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPerformanceMode) return;
    
    // Only allow dragging to start if the target is the score or a child of the score
    const scoreElement = containerRef.current?.querySelector('.performance-score');
    if (scoreElement && !scoreElement.contains(e.target as Node)) return;

    // Prevent browser default behavior (like swipe-to-back)
    if (e.cancelable) e.preventDefault();

    setIsDragging(true);
    wasDragging.current = false;
    dragStartTime.current = Date.now();
    dragDistance.current = 0;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setInitialX(currentX);
  };

  const handleGestureMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    // Prevent browser default behavior (like swipe-to-back)
    if (e.cancelable) e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - dragStartX;
    dragDistance.current = Math.abs(delta);
    
    if (dragDistance.current > 10) {
      wasDragging.current = true;
    }
    
    setCurrentX(Math.max(0, initialX - delta));
  };

  const handleGestureEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const clientX = 'changedTouches' in e ? (e.changedTouches?.[0]?.clientX || dragStartX) : (e as React.MouseEvent).clientX;
    const delta = clientX - dragStartX;
    const duration = Date.now() - dragStartTime.current;

    // FLICK: Fast movement -> Page Turn from INITIAL position
    if (duration < 250 && dragDistance.current > 50) {
      if (delta < 0) goToNextPage(initialX);
      else goToPrevPage(initialX);
      return;
    }

    // DRAG: Snap to nearest measure (Only if we actually moved significantly)
    if (wasDragging.current) {
      const nearest = measureMap.reduce((prev, curr) => 
        Math.abs(curr.x - currentX) < Math.abs(prev.x - currentX) ? curr : prev, 
        measureMap[0]
      );
      setCurrentX(nearest ? nearest.x : initialX);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPerformanceMode) return;
      
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNextPage(currentX);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage(currentX);
      } else if (e.key === 'Escape') {
        setIsPerformanceMode(false);
      }
    };

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && isPerformanceMode) {
        setIsPerformanceMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [isPerformanceMode, currentX, goToNextPage, goToPrevPage]);

  return (
    <div className={`viewer-container ${isPerformanceMode ? 'performance-mode' : ''}`}>
      <header className="viewer-header">
        <button onClick={onBack} className="btn-back">
          <span className="icon">←</span>
          <span className="text">Back</span>
        </button>
        <div className="song-title-group"><h3>{song.title}</h3></div>
        <div className="viewer-actions">
          <button 
            className={`btn-performance ${isPerformanceMode ? 'active' : ''}`} 
            data-tooltip="Performance Mode"
            onClick={() => {
              const nextState = !isPerformanceMode;
              setIsPerformanceMode(nextState);
              if (nextState) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
            }}
            title="Toggle Performance Mode"
          >
            ⛶
          </button>
          <button 
            className="btn-gear" 
            data-tooltip="Settings"
            onClick={() => setShowSettings(!showSettings)}
          >⚙️</button>
        </div>
      </header>

      {showSettings && (
        <aside className={`settings-drawer glass ${showSettings ? 'open' : ''}`}>
          <div className="drawer-header">
            <h4>Settings</h4>
            <button onClick={() => setShowSettings(false)}>×</button>
          </div>
          
          <div className="drawer-content">
            <section className="drawer-section">
              <h5>Score Display</h5>
              <div className="setting-group">
                <label>Part Selection</label>
                <select value={activePartKey} onChange={(e) => setActivePartKey(e.target.value)}>
                  <option value="full">Full Score</option>
                  {Object.entries(song.parts || {}).map(([key, part]) => (
                    <option key={key} value={key}>{part?.name || key}</option>
                  ))}
                </select>
              </div>
              <div className="setting-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={drawMeasureNumbers} onChange={(e) => updateSetting('drawMeasureNumbers', e.target.checked)} />
                  Show Measure Numbers
                </label>
              </div>
              <div className="setting-group">
                <label>Score Zoom</label>
                <div className="slider-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="0.3" 
                    max="1.5" 
                    step="0.05" 
                    value={zoomLevel} 
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))} 
                    style={{ flex: 1 }}
                  />
                  <span>{Math.round(zoomLevel * 100)}%</span>
                </div>
              </div>
            </section>

            <div className="drawer-divider"></div>

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
      {error && <div className="viewer-overlay"><div className="error-message">{error}</div></div>}
      
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
