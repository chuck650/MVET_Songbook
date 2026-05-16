# Skill: Web Audio Implementation

This skill provides instructions for implementing and managing high-precision audio playback and synchronization using the Native Web Audio API (`AudioContext`), following industry best practices for performance and accuracy.

## Prerequisites
- High-resolution timing manifest (`timing.json`) generated from MusicXML.
- Audio assets (MP3/FLAC) accessible via `fetch`.
- A user-gesture trigger (e.g., a "Play" button) to initialize the `AudioContext`.

## Procedure

### 1. Initialize Audio Context (Autoplay Policy)
Always initialize or resume the `AudioContext` inside a user-driven event handler. Browsers suspend contexts created outside of user gestures.
```javascript
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Best Practice: Check state and resume if suspended
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};
```

### 2. Low-Latency Loading (AudioBuffer)
For precise "note-by-note" synchronization, fetch and decode audio into an `AudioBuffer`. This avoids the high latency and imprecise seeking of the `<audio>` element.
```javascript
const response = await fetch(url);
const arrayBuffer = await response.arrayBuffer();
// Best Practice: Use decodeAudioData for sample-accurate access
const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
```

### 3. Precision Scheduling (AudioParam)
Avoid setting `.value` directly on nodes (like `gain.value = 0`). Use `AudioParam` methods to schedule changes against the high-precision `currentTime` clock.
```javascript
const source = audioCtx.createBufferSource();
source.buffer = audioBuffer;

const gainNode = audioCtx.createGain();
source.connect(gainNode).connect(audioCtx.destination);

// Best Practice: Schedule gain changes to prevent 'clicks' or 'pops'
gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1); // Quick fade-in

source.start(0, offsetInSeconds);
```

### 4. Deterministic Sync Loop
Synchronize the UI cursor by comparing the `AudioContext.currentTime` against the pre-generated timing manifest.
```javascript
const syncLoop = () => {
  const elapsed = audioCtx.currentTime - startTime + pauseOffset;
  const entry = findBestManifestMatch(elapsed);
  
  if (entry && entry.index !== lastIndex) {
    // Best Practice: Calculate duration for CSS transition
    const duration = entry.duration || 0.1;
    updateCursor(entry, duration);
    lastIndex = entry.index;
  }
  requestAnimationFrame(syncLoop);
};
```

### 5. Resource Lifecycle & Cleanup
Always stop and disconnect nodes when they are no longer needed to prevent memory leaks and unnecessary CPU usage.
```javascript
const stopPlayback = () => {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect(); // Best Practice: Explicitly disconnect
    sourceNode = null;
  }
};
```

## Success Criteria
- **Autoplay**: Audio starts immediately upon the first user interaction.
- **Accuracy**: Cursor movement is jitter-free and matches the audio beat-for-beat.
- **Performance**: No memory leaks when switching between songs or pausing/resuming.
- **Accessibility**: Volume and Play/Pause controls are accessible via keyboard and screen readers (ARIA role="switch").
