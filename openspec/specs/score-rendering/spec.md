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
