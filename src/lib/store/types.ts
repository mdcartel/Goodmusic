// Core data types for the NewPipe-style music app

export interface Song {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  thumbnail: string;
  youtubeUrl: string;
  audioUrl?: string;
  isDownloaded: boolean;
  filePath?: string;
  fileSize?: number;
  quality?: string;
  format?: string;
  addedAt: Date;
  playCount: number;
  lastPlayed?: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: Song[];
  createdAt: Date;
  updatedAt: Date;
  totalDuration: number;
  thumbnail?: string;
}

export interface Channel {
  id: string;
  youtubeId: string;
  name: string;
  description: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  isSubscribed: boolean;
  subscribedAt?: Date;
}

export interface Download {
  id: string;
  song: Song;
  options: DownloadOptions;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed: number;
  eta: number;
  filePath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface DownloadOptions {
  format: 'mp3' | 'm4a' | 'opus';
  quality: '128' | '192' | '320' | 'best';
  includeMetadata: boolean;
  includeThumbnail: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  viewCount: number;
  uploadDate: Date;
  youtubeUrl: string;
}

export interface SearchFilters {
  duration?: 'short' | 'medium' | 'long';
  uploadDate?: 'hour' | 'today' | 'week' | 'month' | 'year';
  sortBy?: 'relevance' | 'date' | 'views' | 'rating';
}

export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  repeatMode: 'none' | 'one' | 'all';
  shuffleEnabled: boolean;
  isLoading: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  downloadQuality: '128' | '192' | '320' | 'best';
  downloadFormat: 'mp3' | 'm4a' | 'opus';
  downloadPath: string;
  includeMetadata: boolean;
  includeThumbnail: boolean;
  maxConcurrentDownloads: number;
  playbackVolume: number;
  repeatMode: 'none' | 'one' | 'all';
  shuffleEnabled: boolean;
}

export interface AppState {
  // Player state
  player: PlayerState;
  
  // Library data
  songs: Song[];
  playlists: Playlist[];
  channels: Channel[];
  downloads: Download[];
  
  // Search state
  searchResults: SearchResult[];
  searchQuery: string;
  searchFilters: SearchFilters;
  isSearching: boolean;
  
  // UI state
  currentView: 'search' | 'library' | 'playlists' | 'downloads' | 'settings';
  selectedPlaylist: string | null;
  selectedChannel: string | null;
  
  // Settings
  settings: AppSettings;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}