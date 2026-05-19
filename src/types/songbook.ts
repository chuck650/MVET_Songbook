// src/types/songbook.ts

export interface RehearsalFiles {
  mscz?: string;
  mxl?: string;
  pdf?: string;
  mp4?: string;
  flac?: string;
  mp3?: string;
  [key: string]: string | undefined;
}

export interface VocalPart {
  name: string;
  files: RehearsalFiles;
}

export interface Song {
  id: string;
  title: string;
  key?: string;
  arranger?: string;
  engraver?: string;
  mtime?: string;
  thumbnail?: string;
  files: RehearsalFiles;
  parts?: {
    soprano?: VocalPart;
    alto?: VocalPart;
    tenor?: VocalPart;
    bass?: VocalPart;
    women?: VocalPart;
    men?: VocalPart;
    [key: string]: VocalPart | undefined;
  };
  hashes?: Record<string, string>;
}
