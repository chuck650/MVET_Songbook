import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseWebAudioReturn {
  play: (off?: number) => void;
  pause: () => void;
  seek: (t: number) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  amplitude: number;
  resume: () => Promise<void> | undefined;
  resetEngine: () => void;
  testBeep: () => void;
  setVolume: (v: number) => void;
}

/**
 * Hardened Web Audio Engine v3.8.0 typed in TypeScript
 */
export const useWebAudio = (url?: string, autoPlay = false): UseWebAudioReturn => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const requestRef = useRef<number>();
  
  // Track if we've auto-played the current URL
  const hasAutoPlayedRef = useRef<boolean>(false);

  const initAudio = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      console.log("WebAudio: Creating AudioContext (Target: 48kHz)...");
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        audioCtxRef.current = new AudioContextClass({
          sampleRate: 48000
        });
      } catch (e) {
        console.warn("WebAudio: 48kHz context failed, using default.");
        audioCtxRef.current = new AudioContextClass();
      }
      
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.gain.value = 1.0;
      gainNodeRef.current.connect(audioCtxRef.current.destination);
      console.log("WebAudio: Graph Connected. Actual SampleRate:", audioCtxRef.current.sampleRate);
    }
    if (audioCtxRef.current.state === 'suspended') {
      console.log("WebAudio: Resuming suspended context...");
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const resetEngine = useCallback(() => {
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    initAudio();
  }, [initAudio]);

  useEffect(() => {
    let active = true;

    if (!url) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      pauseOffsetRef.current = 0;
      startTimeRef.current = 0;
      audioBufferRef.current = null;
      hasAutoPlayedRef.current = false;
      return;
    }
    
    const load = async () => {
      setIsLoading(true); setError(null);
      if (active) {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
      pauseOffsetRef.current = 0;
      startTimeRef.current = 0;
      audioBufferRef.current = null;
      hasAutoPlayedRef.current = false;
      
      try {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        // Use a fresh context if needed
        const ctx = initAudio();
        const buf = await ctx.decodeAudioData(arrayBuf);
        
        // Diagnostic: Check if buffer has content (scan first 5 seconds)
        let maxVal = 0;
        const scanSamples = Math.min(buf.length, Math.floor(buf.sampleRate * 5));
        for (let c=0; c<buf.numberOfChannels; c++) {
          const data = buf.getChannelData(c);
          for (let i=0; i<scanSamples; i+=100) { // Sample every 100th
            if (Math.abs(data[i]) > maxVal) maxVal = Math.abs(data[i]);
          }
        }
        console.log(`WebAudio: Decoded buffer. Duration: ${buf.duration.toFixed(2)}s, Channels: ${buf.numberOfChannels}, SampleRate: ${buf.sampleRate}, Peak(first 5s): ${maxVal.toFixed(4)}`);
        
        if (maxVal === 0) {
          console.warn("WebAudio Warning: Decoded buffer appears to be SILENT (first 5s).");
        }

        if (active) {
          audioBufferRef.current = buf;
          setDuration(buf.duration);
          setIsLoading(false);
        }
      } catch (err: unknown) { 
        console.error("WebAudio Load Error:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        if (active) {
          setError(errMsg); 
          setIsLoading(false); 
        }
      }
    };
    void load();
    return () => {
      active = false;
      sourceNodeRef.current?.stop();
    };
  }, [url, initAudio]);

  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
      setAmplitude(0);
      return;
    }

    const animate = () => {
      if (audioCtxRef.current) {
        const cur = audioCtxRef.current.currentTime - startTimeRef.current + pauseOffsetRef.current;
        setCurrentTime(cur);

        // Amplitude Meter
        if (audioBufferRef.current) {
          const sampleIdx = Math.floor(cur * audioBufferRef.current.sampleRate);
          if (sampleIdx >= 0 && sampleIdx < audioBufferRef.current.length) {
            let peak = 0;
            const data = audioBufferRef.current.getChannelData(0);
            for (let i = 0; i < 200; i += 2) {
              const v = Math.abs(data[sampleIdx + i] || 0);
              if (v > peak) peak = v;
            }
            setAmplitude(peak);
          }
        }

        if (cur >= duration) { 
          setIsPlaying(false); 
          pauseOffsetRef.current = 0; 
          setAmplitude(0);
        } else {
          requestRef.current = requestAnimationFrame(animate);
        }
      } else {
        setAmplitude(0);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, duration]);

  const play = useCallback((off = 0) => {
    const ctx = initAudio();
    if (isPlaying || !audioBufferRef.current) return;
    
    const src = ctx.createBufferSource();
    src.buffer = audioBufferRef.current;
    
    if (gainNodeRef.current) {
      src.connect(gainNodeRef.current);
    }
    
    const start = off || pauseOffsetRef.current;
    console.log(`WebAudio: Starting playback at ${start}s. Context state: ${ctx.state}`);
    
    src.start(0, start);
    startTimeRef.current = ctx.currentTime;
    pauseOffsetRef.current = start;
    sourceNodeRef.current = src;
    setIsPlaying(true);
  }, [isPlaying, initAudio]);

  const pause = useCallback(() => {
    if (!isPlaying || !audioCtxRef.current) return;
    sourceNodeRef.current?.stop();
    pauseOffsetRef.current += audioCtxRef.current.currentTime - startTimeRef.current;
    setIsPlaying(false);
  }, [isPlaying]);

  const seek = useCallback((t: number) => {
    const was = isPlaying;
    if (was) pause();
    pauseOffsetRef.current = Math.max(0, Math.min(t, duration));
    setCurrentTime(pauseOffsetRef.current);
    if (was) play(pauseOffsetRef.current);
  }, [isPlaying, pause, play, duration]);

  // Handle auto-play once the buffer is fully loaded
  useEffect(() => {
    if (autoPlay && !isLoading && audioBufferRef.current && !isPlaying && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      play();
    }
  }, [autoPlay, isLoading, isPlaying, play]);

  return { 
    play, 
    pause, 
    seek, 
    isPlaying, 
    currentTime, 
    duration, 
    isLoading, 
    error,
    amplitude,
    resume: () => audioCtxRef.current?.resume(),
    resetEngine,
    testBeep: () => {
      const ctx = initAudio();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.1;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      console.log("WebAudio: Beep Test triggered.");
    },
    setVolume: (v: number) => {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(v, audioCtxRef.current.currentTime, 0.05);
        console.log("WebAudio: Volume set to", v);
      }
    } 
  };
};
