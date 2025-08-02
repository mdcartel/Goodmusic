// Core data models for VibePipe MVP

export interface Song {
  id: string;
  title: string;
  artist?: string;
  thumbnail: string;
  duration: string;
  mood: string[];
  youtubeUrl: string;
  extractedAt?: Date;
  streamUrl?: string;
}

export interface Mood {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  keywords: string[];
}

export interface Download {
  id: string;
  songId: string;
  format: 'mp3' | 'mp4';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  filePath?: string;
  fileSize?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestedSongs?: Song[];
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  currentMood?: string;
  createdAt: Date;
  lastActivity: Date;
}

// API Response types
export interface SongsResponse {
  songs: Song[];
  mood: string;
  total: number;
}

export interface MoodsResponse {
  moods: Mood[];
}

export interface ExtractRequest {
  youtubeUrl: string;
}

export interface ExtractResponse {
  streamUrl: string;
  title: string;
  duration: number;
}

export interface DownloadRequest {
  youtubeUrl: string;
  format: 'mp3' | 'mp4';
  quality: string;
}

export interface DownloadResponse {
  downloadId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface DownloadStatusResponse {
  downloadId: string;
  status: string;
  progress: number;
  filePath?: string;
  error?: string;
}

export interface ChatRequest {
  message: string;
  context?: string;
}

export interface ChatResponse {
  response: string;
  suggestedSongs?: Song[];
  mood?: string;
}