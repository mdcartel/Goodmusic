// Local playback service for VibePipe MVP
// Handles playback of downloaded files with fallback to streaming

import { Song } from '@/types';
import { LocalFileIndex, LocalFile } from './localFileIndex';
import { FileStorageService } from './fileStorage';

export interface PlaybackSource {
  type: 'local' | 'stream';
  url: string;
  file?: LocalFile;
  quality?: string;
}

export interface PlaybackOptions {
  preferLocal?: boolean;
  fallbackToStream?: boolean;
  quality?: string;
}

export class LocalPlaybackService {
  private static instance: LocalPlaybackService;
  private fileIndex: LocalFileIndex;
  private fileStorage: FileStorageService;
  private audioCache: Map<string, string> = new Map(); // File ID -> Blob URL

  private constructor() {
    this.fileIndex = LocalFileIndex.getInstance();
    this.fileStorage = FileStorageService.getInstance();
  }

  static getInstance(): LocalPlaybackService {
    if (!LocalPlaybackService.instance) {
      LocalPlaybackService.instance = new LocalPlaybackService();
    }
    return LocalPlaybackService.instance;
  }

  // Get playback source for a song
  async getPlaybackSource(song: Song, options: PlaybackOptions = {}): Promise<PlaybackSource> {
    try {
      const {
        preferLocal = true,
        fallbackToStream = true,
        quality = 'best'
      } = options;

      // Check for local files first if preferred
      if (preferLocal && this.fileIndex.hasSong(song.id)) {
        const localSource = await this.getLocalPlaybackSource(song);
        if (localSource) {
          console.log(`🎵 Using local playback for: ${song.title}`);
          return localSource;
        }
      }

      // Fallback to streaming if allowed
      if (fallbackToStream) {
        console.log(`🌐 Using stream playback for: ${song.title}`);
        return await this.getStreamPlaybackSource(song, quality);
      }

      throw new Error('No playback source available');
    } catch (error) {
      console.error('❌ Failed to get playback source:', error);
      throw error;
    }
  }

  // Get local playback source
  private async getLocalPlaybackSource(song: Song): Promise<PlaybackSource | null> {
    try {
      const preferredFile = this.fileIndex.getPreferredFile(song.id);
      if (!preferredFile || !preferredFile.isAvailable) {
        return null;
      }

      // Verify file is still available
      const isAvailable = await this.fileIndex.verifyFileAvailability(preferredFile.id);
      if (!isAvailable) {
        return null;
      }

      // Get or create blob URL for the file
      const blobUrl = await this.getFileBlobUrl(preferredFile);
      if (!blobUrl) {
        return null;
      }

      // Update last accessed time
      await this.fileIndex.updateLastAccessed(preferredFile.id);

      return {
        type: 'local',
        url: blobUrl,
        file: preferredFile
      };
    } catch (error) {
      console.error('❌ Failed to get local playback source:', error);
      return null;
    }
  }

  // Get stream playback source
  private async getStreamPlaybackSource(song: Song, quality: string): Promise<PlaybackSource> {
    try {
      // In a real implementation, this would call the streaming API
      // For now, we'll simulate it
      const streamUrl = `/api/stream/${song.id}?quality=${quality}`;
      
      return {
        type: 'stream',
        url: streamUrl,
        quality
      };
    } catch (error) {
      console.error('❌ Failed to get stream playback source:', error);
      throw error;
    }
  }

  // Get or create blob URL for a local file
  private async getFileBlobUrl(file: LocalFile): Promise<string | null> {
    try {
      // Check if we already have a cached blob URL
      const cachedUrl = this.audioCache.get(file.id);
      if (cachedUrl) {
        return cachedUrl;
      }

      // In web version, we simulate file access
      // In a real implementation, this would read the actual file
      const blobUrl = await this.createSimulatedBlobUrl(file);
      
      if (blobUrl) {
        this.audioCache.set(file.id, blobUrl);
      }

      return blobUrl;
    } catch (error) {
      console.error('❌ Failed to create blob URL:', error);
      return null;
    }
  }

  // Create simulated blob URL (for web version)
  private async createSimulatedBlobUrl(file: LocalFile): Promise<string | null> {
    try {
      // In web version, we can't access actual files, so we simulate
      // In a real implementation, this would read the file and create a blob URL
      
      console.log(`📁 Creating blob URL for local file: ${file.fileName}`);
      
      // For simulation, we'll return a placeholder URL that points to the stream
      // In a real app, this would be: URL.createObjectURL(blob)
      return `/api/stream/${file.songId}?local=true&file=${file.id}`;
    } catch (error) {
      console.error('❌ Failed to create simulated blob URL:', error);
      return null;
    }
  }

  // Check if a song can be played locally
  canPlayLocally(songId: string): boolean {
    if (!this.fileIndex.hasSong(songId)) {
      return false;
    }

    const preferredFile = this.fileIndex.getPreferredFile(songId);
    return preferredFile !== null && preferredFile.isAvailable;
  }

  // Get local files for a song
  getLocalFiles(songId: string): LocalFile[] {
    return this.fileIndex.getFilesForSong(songId);
  }

  // Get all locally available songs
  getLocallyAvailableSongs(): Song[] {
    const files = this.fileIndex.getAllFiles().filter(f => f.isAvailable);
    const uniqueSongs = new Map<string, Song>();

    files.forEach(file => {
      if (!uniqueSongs.has(file.songId)) {
        uniqueSongs.set(file.songId, {
          id: file.songId,
          title: file.metadata.title,
          artist: file.metadata.artist,
          thumbnail: file.metadata.thumbnail,
          duration: file.metadata.duration,
          mood: file.metadata.mood,
          youtubeUrl: '', // Not needed for local playback
          streamUrl: undefined // Will be set when needed
        });
      }
    });

    return Array.from(uniqueSongs.values());
  }

  // Search locally available songs
  searchLocalSongs(query: string): Song[] {
    const matchingFiles = this.fileIndex.searchFiles(query);
    const uniqueSongs = new Map<string, Song>();

    matchingFiles.forEach(file => {
      if (file.isAvailable && !uniqueSongs.has(file.songId)) {
        uniqueSongs.set(file.songId, {
          id: file.songId,
          title: file.metadata.title,
          artist: file.metadata.artist,
          thumbnail: file.metadata.thumbnail,
          duration: file.metadata.duration,
          mood: file.metadata.mood,
          youtubeUrl: '',
          streamUrl: undefined
        });
      }
    });

    return Array.from(uniqueSongs.values());
  }

  // Get locally available songs by mood
  getLocalSongsByMood(mood: string): Song[] {
    const matchingFiles = this.fileIndex.getFilesByMood(mood);
    const uniqueSongs = new Map<string, Song>();

    matchingFiles.forEach(file => {
      if (file.isAvailable && !uniqueSongs.has(file.songId)) {
        uniqueSongs.set(file.songId, {
          id: file.songId,
          title: file.metadata.title,
          artist: file.metadata.artist,
          thumbnail: file.metadata.thumbnail,
          duration: file.metadata.duration,
          mood: file.metadata.mood,
          youtubeUrl: '',
          streamUrl: undefined
        });
      }
    });

    return Array.from(uniqueSongs.values());
  }

  // Preload a song for faster playback
  async preloadSong(songId: string): Promise<boolean> {
    try {
      if (!this.canPlayLocally(songId)) {
        return false;
      }

      const preferredFile = this.fileIndex.getPreferredFile(songId);
      if (!preferredFile) {
        return false;
      }

      // Create blob URL if not already cached
      const blobUrl = await this.getFileBlobUrl(preferredFile);
      return blobUrl !== null;
    } catch (error) {
      console.error('❌ Failed to preload song:', error);
      return false;
    }
  }

  // Clear audio cache
  clearCache(): void {
    // Revoke all blob URLs to free memory
    this.audioCache.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    this.audioCache.clear();
    console.log('🧹 Audio cache cleared');
  }

  // Get cache statistics
  getCacheStats(): {
    cachedFiles: number;
    memoryUsage: number; // Estimated in bytes
  } {
    return {
      cachedFiles: this.audioCache.size,
      memoryUsage: this.audioCache.size * 1024 * 1024 // Rough estimate: 1MB per cached file
    };
  }

  // Clean up resources
  destroy(): void {
    this.clearCache();
  }

  // Get playback statistics
  getPlaybackStats(): {
    localFiles: number;
    availableFiles: number;
    totalSize: number;
    byFormat: Record<string, number>;
  } {
    const stats = this.fileIndex.getStats();
    return {
      localFiles: stats.totalFiles,
      availableFiles: stats.totalFiles, // Same as total since we filter unavailable
      totalSize: stats.totalSize,
      byFormat: stats.byFormat
    };
  }

  // Check if local playback is available
  isLocalPlaybackAvailable(): boolean {
    return this.fileIndex.isReady() && this.fileIndex.getAllFiles().length > 0;
  }

  // Get recommended local songs (most recently accessed)
  getRecommendedLocalSongs(limit: number = 10): Song[] {
    const files = this.fileIndex.getAllFiles()
      .filter(f => f.isAvailable)
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());

    const uniqueSongs = new Map<string, Song>();
    
    for (const file of files) {
      if (uniqueSongs.size >= limit) break;
      
      if (!uniqueSongs.has(file.songId)) {
        uniqueSongs.set(file.songId, {
          id: file.songId,
          title: file.metadata.title,
          artist: file.metadata.artist,
          thumbnail: file.metadata.thumbnail,
          duration: file.metadata.duration,
          mood: file.metadata.mood,
          youtubeUrl: '',
          streamUrl: undefined
        });
      }
    }

    return Array.from(uniqueSongs.values());
  }
}