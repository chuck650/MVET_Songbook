# Score Rendering Specification

## Purpose
Specifies the visual sheet music rendering engine, OpenSheetMusicDisplay (OSMD) configuration, viewport margins, and the Smart Part Names & Abbreviations standard.

## Requirements

### Requirement: OpenSheetMusicDisplay Configuration
The system SHALL render MusicXML and MXL score definitions into crisp vector SVGs via OpenSheetMusicDisplay.

#### Scenario: Centered Paper Layout
- **GIVEN** an active score rendering container
- **WHEN** OSMD initializes and computes engraving layout
- **THEN** it SHALL apply symmetric virtual margins (`PageLeftMargin = 4.0`, `PageRightMargin = 4.0`, `PageTopMargin = 5.0`, `PageBottomMargin = 5.0`) to center sheet music beneath the application header

#### Scenario: Header Title Redundancy Suppression
- **GIVEN** a loaded score with internal MusicXML credit and title tags
- **WHEN** rendering the virtual page
- **THEN** OSMD MUST suppress redundant score titles (`drawTitle: false`) and composer credits (`drawCredits: false`) to avoid collision with the web app header

### Requirement: Smart Part Names & Abbreviations Rendering Standard
The system SHALL conditionally render part names and abbreviations based on score dimensionality and view mode.

#### Scenario: Multi-Staff and SATB Score View
- **GIVEN** a multi-part score such as SATB or Conductor layout (`activePartKey === 'full'`) in paginated mode
- **WHEN** the score is rendered
- **THEN** OSMD MUST display full part names (`drawPartNames: true`) on the first system, and standard part abbreviations (`drawPartAbbreviations: true`) on all subsequent systems

#### Scenario: Isolated Single Practice Part View
- **GIVEN** an isolated vocal part view (e.g. `Soprano`, `Alto`, `Tenor`, `Bass`)
- **WHEN** the individual score is loaded
- **THEN** OSMD MUST suppress part names and abbreviations (`false`) to maximize horizontal screen width for note readability

#### Scenario: Performance Mode Single Strip View
- **GIVEN** the user activates Performance Mode (`renderSingleHorizontalStaffline: true`)
- **WHEN** the continuous staffline is drawn
- **THEN** OSMD MUST suppress part names and abbreviations (`false`) to ensure smooth, uncrowded horizontal strip scrolling

### Requirement: Hierarchical Score Zoom Engine
The system SHALL support device-responsive default zoom levels with persistent per-song zoom retention and automatic orphan settings cleanup.

#### Scenario: Device Mode Default Zoom Resolution
- **GIVEN** a song is loaded in the rehearsal suite without an existing per-song zoom preference
- **WHEN** the viewport width is evaluated
- **THEN** if the screen width is `<= 600px` (mobile viewport), the engine SHALL resolve zoom to `settings.zoomMobile` (default `0.75` / `75%`)
- **AND** if the screen width is `> 600px` (desktop viewport), the engine SHALL resolve zoom to `settings.zoomDesktop` (default `1.00` / `100%`)

#### Scenario: Per-Song Zoom Persistence & Precedence
- **GIVEN** a user adjusts the Score Zoom slider in an individual song's rehearsal settings drawer
- **WHEN** the value is updated
- **THEN** the system MUST persist the preference under the active device mode (`settings.songSettings[songId].zoomDesktop` or `settings.songSettings[songId].zoomMobile`) in client persistent storage
- **AND** when the song is viewed in that device mode, the stored per-song zoom for that mode SHALL take precedence over the global app default for that mode
- **AND** switching between desktop and mobile viewports SHALL use that specific mode's per-song stored zoom (or fall back to that mode's global app default if not customized for that mode)

#### Scenario: App Settings Responsive Zoom Configuration
- **GIVEN** the App Settings view under Rehearsal Preferences
- **WHEN** the user views or adjusts display preferences
- **THEN** the interface SHALL render two distinct zoom controls: `Score Zoom (Desktop)` and `Score Zoom (Mobile Device)`
- **AND** each control SHALL provide step buttons (`−`, `+`), a range slider (`0.30` to `2.00` in `0.05` increments), and dynamic percentage feedback

#### Scenario: Automatic Orphan Song Settings Pruning
- **GIVEN** a client application loading the library catalog
- **WHEN** songs are fetched from the API or local manifest
- **THEN** the system SHALL compare all keys in `settings.songSettings` against active and archived song IDs in the catalog
- **AND** any settings keys belonging to songs that have been completely removed from the library catalog MUST be automatically pruned from client storage

