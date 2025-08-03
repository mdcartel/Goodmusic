// Core exports for the GoodMusic NewPipe Edition app

// Store
export { useAppStore } from './store';
export type { AppActions } from './store';
export type { AppState, Song, Playlist, Download, SearchResult } from './store/types';

// Services
export { youtubeScraperService } from './services';
export type { VideoInfo, AudioFormat, ChannelInfo, PlaylistInfo } from './services';

// Database
export { database } from './database';

// Query client
export { queryClient, queryKeys } from './query/client';

// Initialization
export { initializeApp, shutdownApp } from './init/app';
export { initializeDatabase, checkDatabaseHealth, getDatabaseStats } from './init/database';