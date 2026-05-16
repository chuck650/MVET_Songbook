const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

const SONGS_DIR = path.join(__dirname, '../public/songs');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

function processSong(songId) {
  const songDir = path.join(SONGS_DIR, songId);
  const mxlFile = path.join(songDir, `${songId}.mxl`);

  if (!fs.existsSync(mxlFile)) {
    console.warn(`[Timing] No MXL found for ${songId}`);
    return;
  }

  console.log(`[Timing] Generating map for ${songId}...`);

  try {
    const zip = new AdmZip(mxlFile);
    const zipEntries = zip.getEntries();
    
    // Find the main .xml file (usually the largest one or matches song name)
    const xmlEntry = zipEntries.find(e => e.entryName.endsWith('.xml') && !e.entryName.includes('META-INF'));
    if (!xmlEntry) throw new Error("No XML found in MXL");

    const xmlData = xmlEntry.getData().toString('utf8');
    const jsonObj = parser.parse(xmlData);

    const partList = jsonObj['score-partwise']?.part;
    if (!partList) throw new Error("Invalid MusicXML structure");

    // Use the first part that contains measures
    const part = Array.isArray(partList) ? partList[0] : partList;
    const measures = Array.isArray(part.measure) ? part.measure : [part.measure];
    
    let currentTime = 0;
    let currentBPM = 120;
    let currentBeats = 4;
    let currentBeatType = 4;
    let currentDivisions = 1;
    const timingMap = [];

    // Expanded Playback Logic
    let i = 0;
    let repeatStartIdx = 0;
    let isRepeatPass = false;
    let hasRepeatedAt = new Set(); 

    while (i < measures.length) {
      const m = measures[i];
      
      // Robust measure numbering extraction
      let measureNum = i + 1;
      if (m["@_number"]) {
        const n = parseInt(m["@_number"]);
        if (!isNaN(n)) measureNum = n;
      }

      // Detect Ending/Volta info
      const barlines = Array.isArray(m.barline) ? m.barline : (m.barline ? [m.barline] : []);
      let endingInfo = null;
      barlines.forEach(bl => {
        if (bl.ending) endingInfo = bl.ending;
      });

      // 1st Ending Logic: If we are on a repeat pass and hit Ending 1, skip to Ending 2
      if (isRepeatPass && endingInfo && (endingInfo["@_number"] === "1" || endingInfo["@_number"].includes("1"))) {
        // Skip this measure and look for Ending 2
        let j = i;
        while (j < measures.length) {
          const mNext = measures[j];
          const blNexts = Array.isArray(mNext.barline) ? mNext.barline : (mNext.barline ? [mNext.barline] : []);
          let foundEnding2 = false;
          blNexts.forEach(bl => {
            if (bl.ending && (bl.ending["@_number"] === "2" || bl.ending["@_number"].includes("2")) && bl.ending["@_type"] === "start") {
              foundEnding2 = true;
            }
          });
          if (foundEnding2) {
            i = j;
            isRepeatPass = false; // Finished the repeat skip
            break;
          }
          j++;
        }
        continue; // Process the new 'i' (Ending 2 start)
      }

      // Detect Repeat Start (Forward)
      barlines.forEach(bl => {
        if (bl.repeat && bl.repeat["@_direction"] === "forward") {
          repeatStartIdx = i;
        }
      });

      // Handle Attributes (Time Signature + Divisions)
      if (m.attributes) {
        const attrs = Array.isArray(m.attributes) ? m.attributes : [m.attributes];
        attrs.forEach(attr => {
          if (attr.time) {
            currentBeats = parseInt(attr.time.beats) || currentBeats;
            currentBeatType = parseInt(attr.time['beat-type']) || currentBeatType;
          }
          if (attr.divisions) {
            currentDivisions = parseInt(attr.divisions) || currentDivisions;
          }
        });
      }

      // Handle Tempo
      if (m.direction) {
        const directions = Array.isArray(m.direction) ? m.direction : [m.direction];
        directions.forEach(d => {
          if (d.sound && d.sound["@_tempo"]) {
            currentBPM = parseFloat(d.sound["@_tempo"]);
          }
        });
      }

      // Record measure start
      timingMap.push({
        index: i,
        measure: measureNum,
        time: parseFloat(currentTime.toFixed(3)),
        type: 'measure'
      });

      // Calculate note-level timing
      const notes = Array.isArray(m.note) ? m.note : (m.note ? [m.note] : []);
      let measureTimeOffset = 0;
      
      // Determine the primary voice for timing (usually the one with the most duration or voice 1)
      const voiceTimings = {};
      notes.forEach(note => {
        const v = note.voice || "1";
        if (!voiceTimings[v]) voiceTimings[v] = [];
        if (!note.chord) {
          voiceTimings[v].push(note);
        }
      });

      // Use the first available voice that has notes
      const primaryVoice = Object.keys(voiceTimings)[0];
      const primaryNotes = voiceTimings[primaryVoice] || [];

      primaryNotes.forEach((note, noteIdx) => {
        const duration = parseInt(note.duration) || 0;
        const noteSeconds = (duration / currentDivisions) * (60 / currentBPM);
        
        if (noteIdx > 0) { // Measure start already recorded
          timingMap.push({
            index: i,
            measure: measureNum,
            time: parseFloat((currentTime + measureTimeOffset).toFixed(3)),
            type: note.rest ? 'rest' : 'note'
          });
        }
        measureTimeOffset += noteSeconds;
      });

      // Advance clock by full measure duration (calculated from time signature)
      const secondsPerMeasure = (currentBeats * 4 / currentBeatType) * (60 / currentBPM);
      currentTime += secondsPerMeasure;

      // Detect Repeat End (Backward)
      let jumpBack = false;
      barlines.forEach(bl => {
        if (bl.repeat && bl.repeat["@_direction"] === "backward") {
          if (!hasRepeatedAt.has(i)) {
            hasRepeatedAt.add(i);
            jumpBack = true;
          }
        }
      });

      if (jumpBack) {
        i = repeatStartIdx;
        isRepeatPass = true;
      } else {
        i++;
      }

      if (timingMap.length > 2000) break;
    }

    // Final Validation: Ensure we don't have duplicate times at the start
    // If the audio starts at measure 16, 0.0s must be measure 16
    const outputPath = path.join(songDir, 'timing.json');
    fs.writeFileSync(outputPath, JSON.stringify(timingMap, null, 2));
    console.log(`[Timing] Success: ${outputPath} (${timingMap.length} measures)`);

  } catch (err) {
    console.error(`[Timing] Failed ${songId}: ${err.message}`);
  }
}

// Main Execution
const songs = fs.readdirSync(SONGS_DIR).filter(f => fs.statSync(path.join(SONGS_DIR, f)).isDirectory());
songs.forEach(processSong);
