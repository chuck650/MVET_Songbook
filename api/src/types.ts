export interface CopyrightInfo {
  type: 'copyrighted' | 'public_domain' | 'creative_commons' | 'permissive';
  statement?: string;
  holder?: string;
  year?: string;
  license?: string;
  links?: string[];
}

export interface FileManifest {
  mscz?: string;
  mxl?: string;
  osmd?: string;
  pdf?: string;
  mp3?: string;
  flac?: string;
  mp4?: string;
  protected?: boolean;
  mtime?: string;
}

export interface Part {
  name: string;
  files: FileManifest;
}

export interface Song {
  id: string;
  title: string;
  subtitle?: string;
  composer?: string;
  arranger?: string;
  engraver?: string;
  copyright?: string;
  copyrightInfo?: CopyrightInfo;
  key?: string;
  mtime?: string;
  files: FileManifest;
  parts?: Record<string, Part>;
  thumbnail?: string;
  hashes?: Record<string, string> | { protected: boolean };
}

export interface PSKRequest {
  psk: string;
}

export interface TokenResponse {
  token: string;
  expires_at: string;
}

export interface JWTPayload {
  authorized: boolean;
  iat?: number;
  exp?: number;
}
