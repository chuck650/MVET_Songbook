// src/types/songbook.ts

export interface RehearsalFiles {
  mscz?: string;
  mxl?: string;
  pdf?: string;
  mp4?: string;
  flac?: string;
  mp3?: string;
  protected?: boolean;
  mtime?: string;
  [key: string]: any;
}

export interface VocalPart {
  name: string;
  files: RehearsalFiles;
}

export interface CopyrightInfo {
  type: 'public_domain' | 'copyrighted' | 'creative_commons' | 'permissive_license';
  license?: string;
  holder?: string;
  year?: string | number;
  statement?: string;
  links?: string[];
}

export interface Song {
  id: string;
  title: string;
  subtitle?: string;
  key?: string;
  arranger?: string;
  composer?: string;
  engraver?: string;
  copyright?: string;
  copyrightInfo?: CopyrightInfo;
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
    instrumental?: VocalPart;
    [key: string]: VocalPart | undefined;
  };
  hashes?: Record<string, any>;
}

