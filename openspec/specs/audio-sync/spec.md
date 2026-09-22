# Audio Playback & Synchronization Specification

## Purpose
Specifies the Native Web Audio API (`AudioContext`) audio engine, low-latency buffer decoding, format resolution (FLAC/MP3), and bidirectional score-cursor synchronization.

## Requirements

### Requirement: Native Web Audio Engine
The system SHALL manage audio decoding, volume leveling, and playback scheduling via the Native Web Audio API.

#### Scenario: User-Initiated Context Initialization
- **GIVEN** browser autoplay security policies
- **WHEN** the user interacts with a play control
- **THEN** the audio engine SHALL initialize or resume the `AudioContext` from user gesture handlers

#### Scenario: High-Fidelity Audio Loading
- **GIVEN** an active vocal or instrumental practice track
- **WHEN** the player requests audio data
- **THEN** the audio engine MUST fetch and decode raw audio directly into an `AudioBuffer` via `decodeAudioData` without HTML5 `<audio>` latency artifacts

### Requirement: Note-Level Cursor Synchronization
The system SHALL synchronize the score cursor and performance scroller with audio playback time.

#### Scenario: High-Resolution Clock Scheduling
- **GIVEN** an active playback session with a MusicXML timing map
- **WHEN** audio frames advance
- **THEN** the engine MUST compute cursor position using `AudioContext.currentTime` to eliminate seeking jitter

#### Scenario: Format Preference Switching
- **GIVEN** the user changes preferred audio format between FLAC and MP3 in settings
- **WHEN** switching occurs during playback
- **THEN** the player SHALL seamlessly release the active buffer and reload the preferred stream without corrupting playback position
