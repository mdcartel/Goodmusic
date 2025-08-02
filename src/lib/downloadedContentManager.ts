// Downloaded content management system for VibePipe MVP
// Handles local file indexing, playback, and storage management

import { Song, Download } from '@/types';
import { FileStorageService } from './fileStorage';
import { LocalStorage } from './storage';
import { EventEmitter } from 'events';

export interface DownloadedSong extends Song {
  downloadId: string;
  filePath: string;
  fileSize: number;
  downloadedAt: Date;
  format: 'mp3' | 'mp4';
  localStreamUrl?: string;
  isAvailable: boolean;
}

export interface ContentIndex {
  songs: DownloadedSong[];
  totalSize: number;
  lastUpdated: Date;
  version: string;
}

export interface PlaybackSource {
  type: 'local' | 'stream';
  url: string;
  format: string;
  quality?: string;
}

export interface CleanupOptions {
  olderThanDays?: number;
  maxTotalSize?: number;
  keepFavorites?: boolean;
  dryRun?: boolean;
}

export interface CleanupResult {
  filesRemoved: number;
  spaceFreed: number;
  errors: string[];
  removedFiles: string[];
}

export class DownloadedContentManager extends EventEmitter {
  private static instance: DownloadedContentManager;
  private fileStorage: FileStorageService;
  private contentIndex: ContentIndex;
  private isIndexing = false;
  private readonly INDEX_VERSION = '1.0.0';

  private constructor() {
    super();
    this.fileStorage = FileStorageService.getInstance();
    this.contentIndex = this.initializeIndex();
    this.loadPersistedIndex();
  }

  static getInstance(): DownloadedContentManager {
    if (!DownloadedContentManager.instance) {
      DownloadedContentManager.instance = new DownloadedContentManager();
    }
    return DownloadedContentManager.instance;
  }

  // Initialize empty content index
  private initializeIndex(): ContentIndex {
    return {
      songs: [],
      totalSize: 0,
      lastUpdated: new Date(),
      version: this.INDEX_VERSION
    };
  }

  // Load persisted index from storage
  private loadPersistedIndex(): void {
    try {
      const persistedIndex = LocalStorage.getItem('downloadedContentIndex');
      if (persistedIndex) {
        const parsed = JSON.parse(persistedIndex);
        
        // Check version compatibility
        if (parsed.version === this.INDEX_VERSION) {
          this.contentIndex = {
            ...parsed,
            lastUpdated: new Date(parsed.lastUpdated),
            songs: parsed.songs.map((song: any) => ({
              ...song,
              downloadedAt: new Date(song.downloadedAt)
            }))
          };
          console.log(`📚 Loaded content index with ${this.contentIndex.songs.length} songs`);
        } else {
          console.log('🔄 Index version mismatch, rebuilding...');
          this.rebuildIndex();
        }
      } else {
        console.log('📚 No existing content index found, will build on first scan');
      }
    } catch (error) {
      console.error('❌ Failed to load content index:', error);
      this.contentIndex = this.initializeIndex();
    }
  }

  // Persist index to storage
  private persistIndex(): void {
    try {
      const serialized = JSON.stringify(this.contentIndex);
      LocalStorage.setItem('downloadedContentIndex', serialized);
      console.log('💾 Content index persisted');
    } catch (error) {
      console.error('❌ Failed to persist content index:', error);
    }
  }

  // Add downloaded song to index
  async addDownloadedSong(download: Download, song: Song): Promise<void> {
    try {
      if (download.status !== 'completed' || !download.filePath || !download.fileSize) {
        console.warn('⚠️ Cannot index incomplete download:', download.id);
        return;
      }

      // Check if song already exists in index
      const existingIndex = this.contentIndex.songs.findIndex(
        s => s.downloadId === download.id
      );

      const downloadedSong: DownloadedSong = {
        ...song,
        downloadId: download.id,
        filePath: download.filePath,
        fileSize: download.fileSize,
        downloadedAt: download.completedAt || new Date(),
        format: download.format,
        isAvailable: await this.verifyFileExists(download.filePath),
        localStreamUrl: this.generateLocalStreamUrl(download.filePath)
      };

      if (existingIndex >= 0) {
        // Update existing entry
        this.contentIndex.songs[existingIndex] = downloadedSong;
        console.log('🔄 Updated downloaded song in index:', song.title);
      } else {
        // Add new entry
        this.contentIndex.songs.push(downloadedSong);
        this.contentIndex.totalSize += download.fileSize;
        console.log('➕ Added downloaded song to index:', song.title);
      }

      this.contentIndex.lastUpdated = new Date();
      this.persistIndex();
      this.emit('songAdded', downloadedSong);
    } catch (error) {
      console.error('❌ Failed to add downloaded song to index:', error);
    }
  }

  // Remove song from index
  async removeDownloadedSong(downloadId: string): Promise<boolean> {
    try {
      const songIndex = this.contentIndex.songs.findIndex(
        s => s.downloadId === downloadId
      );

      if (songIndex >= 0) {
        const song = this.contentIndex.songs[songIndex];
        
        // Remove from file system
        const fileRemoved = await this.fileStorage.deleteFile(song.filePath);
        
        // Remove from index
        this.contentIndex.songs.splice(songIndex, 1);
        this.contentIndex.totalSize -= song.fileSize;
        this.contentIndex.lastUpdated = new Date();
        
        this.persistIndex();
        this.emit('songRemoved', song);
        
        console.log('🗑️ Removed downloaded song:', song.title);
        return fileRemoved;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to remove downloaded song:', error);
      return false;
    }
  }

  // Get all downloaded songs
  getDownloadedSongs(): DownloadedSong[] {
    return [...this.contentIndex.songs];
  }

  // Get downloaded songs by mood
  getDownloadedSongsByMood(mood: string): DownloadedSong[] {
    return this.contentIndex.songs.filter(song => 
      song.mood.includes(mood.toLowerCase())
    );
  }

  // Get downloaded songs by format
  getDownloadedSongsByFormat(format: 'mp3' | 'mp4'): DownloadedSong[] {
    return this.contentIndex.songs.filter(song => song.format === format);
  }

  // Search downloaded songs
  searchDownloadedSongs(query: string): DownloadedSong[] {
    const searchTerm = query.toLowerCase();
    return this.contentIndex.songs.filter(song =>
      song.title.toLowerCase().includes(searchTerm) ||
      (song.artist && song.artist.toLowerCase().includes(searchTerm)) ||
      song.mood.some(mood => mood.toLowerCase().includes(searchTerm))
    );
  }

  // Get playback source for song
  async getPlaybackSource(songId: string): Promise<PlaybackSource | null> {
    try {
      // First check if we have a local copy
      const downloadedSong = this.contentIndex.songs.find(s => s.id === songId);
      
      if (downloadedSong && downloadedSong.isAvailable) {
        // Verify file still exists
        const fileExists = await this.verifyFileExists(downloadedSong.filePath);
        
        if (fileExists) {
          return {
            type: 'local',
            url: downloadedSong.localStreamUrl || downloadedSong.filePath,
            format: downloadedSong.format,
            quality: 'original'
          };
        } else {
          // Mark as unavailable and fall back to streaming
          downloadedSong.isAvailable = false;
          this.persistIndex();
          console.warn('⚠️ Local file not found, falling back to stream:', downloadedSong.title);
        }
      }

      // Fall back to streaming
      return {
        type: 'stream',
        url: `/api/stream/${songId}`,
        format: 'stream',
        quality: 'best'
      };
    } catch (error) {
      console.error('❌ Failed to get playback source:', error);
      return null;
    }
  }

  // Verify file exists
  private async verifyFileExists(filePath: string): Promise<boolean> {
    try {
      return await this.fileStorage.fileExists(filePath);
    } catch (error) {
      return false;
    }
  }

  // Generate local stream URL
  private generateLocalStreamUrl(filePath: string): string {
    // In a real implementation, this would create a local server URL
    // For web version, we simulate this
    const filename = filePath.split('/').pop() || 'unknown';
    return `/api/local-stream/${encodeURIComponent(filename)}`;
  }

  // Rebuild content index by scanning file system
  async rebuildIndex(): Promise<void> {
    if (this.isIndexing) {
      console.log('🔄 Index rebuild already in progress');
      return;
    }

    try {
      this.isIndexing = true;
      console.log('🔄 Rebuilding content index...');

      // Get all completed downloads from download history
      const downloadHistory = LocalStorage.getDownloadHistory();
      const completedDownloads = downloadHistory.filter(d => d.status === 'completed');

      // Reset index
      this.contentIndex = this.initializeIndex();

      // Process each completed download
      for (const download of completedDownloads) {
        try {
          // Get song info (in real implementation, this would fetch from database)
          const song = await this.getSongInfo(download.songId);
          if (song) {
            await this.addDownloadedSong(download, song);
          }
        } catch (error) {
          console.warn('⚠️ Failed to process download during rebuild:', download.id, error);
        }
      }

      console.log(`✅ Index rebuilt with ${this.contentIndex.songs.length} songs`);
      this.emit('indexRebuilt', this.contentIndex);
    } catch (error) {
      console.error('❌ Failed to rebuild index:', error);
    } finally {
      this.isIndexing = false;
    }
  }

  // Verify index integrity
  async verifyIndexIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    fixedIssues: string[];
  }> {
    const issues: string[] = [];
    const fixedIssues: string[] = [];

    try {
      console.log('🔍 Verifying content index integrity...');

      // Check each song in index
      for (let i = this.contentIndex.songs.length - 1; i >= 0; i--) {
        const song = this.contentIndex.songs[i];
        
        // Verify file exists
        const fileExists = await this.verifyFileExists(song.filePath);
        
        if (!fileExists) {
          if (song.isAvailable) {
            // Mark as unavailable
            song.isAvailable = false;
            fixedIssues.push(`Marked ${song.title} as unavailable`);
          }
          issues.push(`File missing: ${song.title} (${song.filePath})`);
        } else if (!song.isAvailable) {
          // File exists but marked as unavailable, fix it
          song.isAvailable = true;
          fixedIssues.push(`Restored availability for ${song.title}`);
        }

        // Validate file path
        if (!this.fileStorage.validateFilePath(song.filePath)) {
          issues.push(`Invalid file path: ${song.filePath}`);
        }

        // Check file size consistency
        const actualSize = await this.fileStorage.getFileSize(song.filePath);
        if (actualSize > 0 && actualSize !== song.fileSize) {
          song.fileSize = actualSize;
          fixedIssues.push(`Updated file size for ${song.title}`);
        }
      }

      // Recalculate total size
      const calculatedSize = this.contentIndex.songs.reduce((sum, song) => sum + song.fileSize, 0);
      if (calculatedSize !== this.contentIndex.totalSize) {
        this.contentIndex.totalSize = calculatedSize;
        fixedIssues.push('Corrected total size calculation');
      }

      // Persist fixes
      if (fixedIssues.length > 0) {
        this.contentIndex.lastUpdated = new Date();
        this.persistIndex();
      }

      const isValid = issues.length === 0;
      console.log(`${isValid ? '✅' : '⚠️'} Index integrity check complete: ${issues.length} issues found`);

      return { isValid, issues, fixedIssues };
    } catch (error) {
      console.error('❌ Index integrity verification failed:', error);
      return {
        isValid: false,
        issues: ['Integrity verification failed'],
        fixedIssues: []
      };
    }
  }

  // Clean up downloaded files
  async cleanupDownloads(options: CleanupOptions = {}): Promise<CleanupResult> {
    const result: CleanupResult = {
      filesRemoved: 0,
      spaceFreed: 0,
      errors: [],
      removedFiles: []
    };

    try {
      console.log('🧹 Starting download cleanup...');

      const {
        olderThanDays = 30,
        maxTotalSize = 1024 * 1024 * 1024, // 1GB
        keepFavorites = true,
        dryRun = false
      } = options;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get candidates for removal
      let candidates = this.contentIndex.songs.filter(song => {
        // Skip favorites if requested
        if (keepFavorites && this.isFavorite(song.id)) {
          return false;
        }
        
        // Check age
        return song.downloadedAt < cutoffDate;
      });

      // Sort by oldest first
      candidates.sort((a, b) => a.downloadedAt.getTime() - b.downloadedAt.getTime());

      // Remove files until we're under the size limit
      let currentSize = this.contentIndex.totalSize;
      
      for (const song of candidates) {
        if (currentSize <= maxTotalSize) {
          break;
        }

        try {
          if (!dryRun) {
            const removed = await this.removeDownloadedSong(song.downloadId);
            if (removed) {
              result.filesRemoved++;
              result.spaceFreed += song.fileSize;
              result.removedFiles.push(song.title);
              currentSize -= song.fileSize;
            }
          } else {
            // Dry run - just count what would be removed
            result.filesRemoved++;
            result.spaceFreed += song.fileSize;
            result.removedFiles.push(song.title);
            currentSize -= song.fileSize;
          }
        } catch (error) {
          const errorMsg = `Failed to remove ${song.title}: ${error}`;
          result.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      console.log(`🧹 Cleanup ${dryRun ? 'simulation' : 'complete'}: ${result.filesRemoved} files, ${this.formatFileSize(result.spaceFreed)} freed`);
      
      if (!dryRun) {
        this.emit('cleanupCompleted', result);
      }

      return result;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      result.errors.push(`Cleanup failed: ${error}`);
      return result;
    }
  }

  // Check if song is marked as favorite
  private isFavorite(songId: string): boolean {
    try {
      const favorites = LocalStorage.getItem('favoriteSongs');
      if (favorites) {
        const favoriteIds = JSON.parse(favorites);
        return Array.isArray(favoriteIds) && favoriteIds.includes(songId);
      }
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
    return false;
  }

  // Get content statistics
  getContentStats(): {
    totalSongs: number;
    totalSize: number;
    byFormat: Record<string, number>;
    byMood: Record<string, number>;
    availableSongs: number;
    unavailableSongs: number;
    oldestDownload: Date | null;
    newestDownload: Date | null;
  } {
    const stats = {
      totalSongs: this.contentIndex.songs.length,
      totalSize: this.contentIndex.totalSize,
      byFormat: {} as Record<string, number>,
      byMood: {} as Record<string, number>,
      availableSongs: 0,
      unavailableSongs: 0,
      oldestDownload: null as Date | null,
      newestDownload: null as Date | null
    };

    this.contentIndex.songs.forEach(song => {
      // Count by format
      stats.byFormat[song.format] = (stats.byFormat[song.format] || 0) + 1;
      
      // Count by mood
      song.mood.forEach(mood => {
        stats.byMood[mood] = (stats.byMood[mood] || 0) + 1;
      });
      
      // Count availability
      if (song.isAvailable) {
        stats.availableSongs++;
      } else {
        stats.unavailableSongs++;
      }
      
      // Track date range
      if (!stats.oldestDownload || song.downloadedAt < stats.oldestDownload) {
        stats.oldestDownload = song.downloadedAt;
      }
      if (!stats.newestDownload || song.downloadedAt > stats.newestDownload) {
        stats.newestDownload = song.downloadedAt;
      }
    });

    return stats;
  }

  // Format file size for display
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get song info (placeholder - in real implementation would fetch from database)
  private async getSongInfo(songId: string): Promise<Song | null> {
    // This is a placeholder implementation
    // In a real app, this would fetch from your song database
    return {
      id: songId,
      title: `Song ${songId}`,
      thumbnail: '',
      duration: '0:00',
      mood: ['unknown'],
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };
  }

  // Get content index info
  getIndexInfo(): ContentIndex {
    return { ...this.contentIndex };
  }

  // Export content index
  exportIndex(): string {
    return JSON.stringify(this.contentIndex, null, 2);
  }

  // Import content index
  async importIndex(indexData: string): Promise<boolean> {
    try {
      const imported = JSON.parse(indexData);
      
      // Validate structure
      if (!imported.songs || !Array.isArray(imported.songs)) {
        throw new Error('Invalid index format');
      }

      this.contentIndex = {
        ...imported,
        lastUpdated: new Date(imported.lastUpdated),
        songs: imported.songs.map((song: any) => ({
          ...song,
          downloadedAt: new Date(song.downloadedAt)
        }))
      };

      this.persistIndex();
      this.emit('indexImported', this.contentIndex);
      
      console.log('📥 Content index imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import index:', error);
      return false;
    }
  }
}