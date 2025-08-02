// Local file indexing system for VibePipe MVP
// Manages downloaded content and provides fast access to local files

import { Song, Download } from '@/types';
import { FileStorageService } from './fileStorage';
import { LocalStorage } from './storage';

export interface LocalFile {
  id: string;
  songId: string;
  filePath: string;
  fileName: string;
  format: 'mp3' | 'mp4';
  fileSize: number;
  downloadedAt: Date;
  lastAccessed: Date;
  metadata: {
    title: string;
    artist?: string;
    duration: string;
    mood: string[];
    thumbnail: string;
  };
  isAvailable: boolean;
}

export interface IndexStats {
  totalFiles: number;
  totalSize: number;
  byFormat: Record<string, number>;
  byMood: Record<string, number>;
  oldestFile: Date | null;
  newestFile: Date | null;
}

export class LocalFileIndex {
  private static instance: LocalFileIndex;
  private fileIndex: Map<string, LocalFile> = new Map();
  private songToFileMap: Map<string, LocalFile[]> = new Map();
  private fileStorage: FileStorageService;
  private isInitialized = false;

  private constructor() {
    this.fileStorage = FileStorageService.getInstance();
  }

  static getInstance(): LocalFileIndex {
    if (!LocalFileIndex.instance) {
      LocalFileIndex.instance = new LocalFileIndex();
    }
    return LocalFileIndex.instance;
  }

  // Initialize the file index
  async initialize(): Promise<void> {
    try {
      console.log('🔍 Initializing local file index...');
      
      // Load persisted index from storage
      await this.loadPersistedIndex();
      
      // Scan for new files and verify existing ones
      await this.scanAndVerifyFiles();
      
      // Clean up orphaned entries
      await this.cleanupOrphanedEntries();
      
      // Save updated index
      await this.persistIndex();
      
      this.isInitialized = true;
      console.log(`✅ File index initialized with ${this.fileIndex.size} files`);
    } catch (error) {
      console.error('❌ Failed to initialize file index:', error);
      throw error;
    }
  }

  // Add a file to the index
  async addFile(download: Download, song: Song): Promise<LocalFile> {
    try {
      if (!download.filePath) {
        throw new Error('Download has no file path');
      }

      const localFile: LocalFile = {
        id: `${download.songId}_${download.format}_${Date.now()}`,
        songId: download.songId,
        filePath: download.filePath,
        fileName: this.extractFileName(download.filePath),
        format: download.format,
        fileSize: download.fileSize || 0,
        downloadedAt: download.completedAt || new Date(),
        lastAccessed: new Date(),
        metadata: {
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          mood: song.mood,
          thumbnail: song.thumbnail
        },
        isAvailable: true
      };

      // Add to main index
      this.fileIndex.set(localFile.id, localFile);

      // Add to song mapping
      const existingFiles = this.songToFileMap.get(song.id) || [];
      existingFiles.push(localFile);
      this.songToFileMap.set(song.id, existingFiles);

      // Persist changes
      await this.persistIndex();

      console.log(`📁 Added file to index: ${localFile.fileName}`);
      return localFile;
    } catch (error) {
      console.error('❌ Failed to add file to index:', error);
      throw error;
    }
  }

  // Remove a file from the index
  async removeFile(fileId: string): Promise<boolean> {
    try {
      const localFile = this.fileIndex.get(fileId);
      if (!localFile) {
        return false;
      }

      // Remove from main index
      this.fileIndex.delete(fileId);

      // Remove from song mapping
      const songFiles = this.songToFileMap.get(localFile.songId) || [];
      const updatedFiles = songFiles.filter(f => f.id !== fileId);
      
      if (updatedFiles.length === 0) {
        this.songToFileMap.delete(localFile.songId);
      } else {
        this.songToFileMap.set(localFile.songId, updatedFiles);
      }

      // Persist changes
      await this.persistIndex();

      console.log(`🗑️ Removed file from index: ${localFile.fileName}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to remove file from index:', error);
      return false;
    }
  }

  // Get all files for a song
  getFilesForSong(songId: string): LocalFile[] {
    return this.songToFileMap.get(songId) || [];
  }

  // Get a specific file by ID
  getFile(fileId: string): LocalFile | null {
    return this.fileIndex.get(fileId) || null;
  }

  // Get all files
  getAllFiles(): LocalFile[] {
    return Array.from(this.fileIndex.values());
  }

  // Get files by format
  getFilesByFormat(format: 'mp3' | 'mp4'): LocalFile[] {
    return this.getAllFiles().filter(file => file.format === format);
  }

  // Get files by mood
  getFilesByMood(mood: string): LocalFile[] {
    return this.getAllFiles().filter(file => 
      file.metadata.mood.includes(mood)
    );
  }

  // Search files
  searchFiles(query: string): LocalFile[] {
    const searchTerm = query.toLowerCase();
    return this.getAllFiles().filter(file => 
      file.metadata.title.toLowerCase().includes(searchTerm) ||
      (file.metadata.artist && file.metadata.artist.toLowerCase().includes(searchTerm)) ||
      file.metadata.mood.some(mood => mood.toLowerCase().includes(searchTerm))
    );
  }

  // Check if a song has local files
  hasSong(songId: string): boolean {
    return this.songToFileMap.has(songId);
  }

  // Get preferred file for a song (prioritize MP3, then most recent)
  getPreferredFile(songId: string): LocalFile | null {
    const files = this.getFilesForSong(songId);
    if (files.length === 0) return null;

    // Filter available files
    const availableFiles = files.filter(f => f.isAvailable);
    if (availableFiles.length === 0) return null;

    // Prioritize MP3 format
    const mp3Files = availableFiles.filter(f => f.format === 'mp3');
    if (mp3Files.length > 0) {
      return mp3Files.sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime())[0];
    }

    // Return most recent file
    return availableFiles.sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime())[0];
  }

  // Update last accessed time
  async updateLastAccessed(fileId: string): Promise<void> {
    const file = this.fileIndex.get(fileId);
    if (file) {
      file.lastAccessed = new Date();
      await this.persistIndex();
    }
  }

  // Get index statistics
  getStats(): IndexStats {
    const files = this.getAllFiles();
    const availableFiles = files.filter(f => f.isAvailable);

    const stats: IndexStats = {
      totalFiles: availableFiles.length,
      totalSize: availableFiles.reduce((sum, f) => sum + f.fileSize, 0),
      byFormat: {},
      byMood: {},
      oldestFile: null,
      newestFile: null
    };

    // Calculate format distribution
    availableFiles.forEach(file => {
      stats.byFormat[file.format] = (stats.byFormat[file.format] || 0) + 1;
    });

    // Calculate mood distribution
    availableFiles.forEach(file => {
      file.metadata.mood.forEach(mood => {
        stats.byMood[mood] = (stats.byMood[mood] || 0) + 1;
      });
    });

    // Find oldest and newest files
    if (availableFiles.length > 0) {
      const sortedByDate = availableFiles.sort((a, b) => 
        a.downloadedAt.getTime() - b.downloadedAt.getTime()
      );
      stats.oldestFile = sortedByDate[0].downloadedAt;
      stats.newestFile = sortedByDate[sortedByDate.length - 1].downloadedAt;
    }

    return stats;
  }

  // Clean up old files based on criteria
  async cleanupOldFiles(criteria: {
    maxAge?: number; // days
    maxSize?: number; // bytes
    keepMinimum?: number; // minimum files to keep
  }): Promise<number> {
    try {
      const files = this.getAllFiles().filter(f => f.isAvailable);
      let filesToRemove: LocalFile[] = [];

      // Sort by last accessed (oldest first)
      const sortedFiles = files.sort((a, b) => 
        a.lastAccessed.getTime() - b.lastAccessed.getTime()
      );

      // Apply age criteria
      if (criteria.maxAge) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - criteria.maxAge);
        
        filesToRemove = sortedFiles.filter(f => 
          f.lastAccessed < cutoffDate
        );
      }

      // Apply size criteria
      if (criteria.maxSize) {
        let totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
        
        for (const file of sortedFiles) {
          if (totalSize <= criteria.maxSize) break;
          if (!filesToRemove.includes(file)) {
            filesToRemove.push(file);
            totalSize -= file.fileSize;
          }
        }
      }

      // Respect minimum files to keep
      const keepMinimum = criteria.keepMinimum || 0;
      if (files.length - filesToRemove.length < keepMinimum) {
        const excessRemoval = keepMinimum - (files.length - filesToRemove.length);
        filesToRemove = filesToRemove.slice(0, -excessRemoval);
      }

      // Remove files
      let removedCount = 0;
      for (const file of filesToRemove) {
        try {
          // Mark as unavailable (in web version, we can't actually delete files)
          file.isAvailable = false;
          await this.removeFile(file.id);
          removedCount++;
        } catch (error) {
          console.error(`Failed to remove file ${file.fileName}:`, error);
        }
      }

      console.log(`🧹 Cleaned up ${removedCount} old files`);
      return removedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup old files:', error);
      return 0;
    }
  }

  // Verify file availability
  async verifyFileAvailability(fileId: string): Promise<boolean> {
    try {
      const file = this.fileIndex.get(fileId);
      if (!file) return false;

      // In web version, we simulate file existence check
      // In a real implementation, this would check actual file existence
      const isAvailable = await this.fileStorage.fileExists(file.filePath);
      
      if (file.isAvailable !== isAvailable) {
        file.isAvailable = isAvailable;
        await this.persistIndex();
      }

      return isAvailable;
    } catch (error) {
      console.error('❌ Failed to verify file availability:', error);
      return false;
    }
  }

  // Scan for new files and verify existing ones
  private async scanAndVerifyFiles(): Promise<void> {
    try {
      console.log('🔍 Scanning and verifying files...');
      
      // Get completed downloads from download manager
      const downloads = LocalStorage.getDownloadHistory()
        .filter(d => d.status === 'completed' && d.filePath);

      // Check each download
      for (const download of downloads) {
        const existingFiles = this.getFilesForSong(download.songId);
        const hasMatchingFile = existingFiles.some(f => 
          f.filePath === download.filePath && f.format === download.format
        );

        if (!hasMatchingFile) {
          // This is a new file, try to add it
          try {
            const song = await this.getSongInfo(download.songId);
            if (song) {
              await this.addFile(download, song);
            }
          } catch (error) {
            console.warn(`Could not add file for download ${download.id}:`, error);
          }
        }
      }

      // Verify existing files
      const verificationPromises = Array.from(this.fileIndex.values()).map(async (file) => {
        const isAvailable = await this.verifyFileAvailability(file.id);
        if (!isAvailable && file.isAvailable) {
          console.warn(`File no longer available: ${file.fileName}`);
        }
      });

      await Promise.all(verificationPromises);
    } catch (error) {
      console.error('❌ Failed to scan and verify files:', error);
    }
  }

  // Clean up orphaned entries
  private async cleanupOrphanedEntries(): Promise<void> {
    try {
      const orphanedFiles: string[] = [];
      
      for (const [fileId, file] of this.fileIndex.entries()) {
        if (!file.isAvailable) {
          orphanedFiles.push(fileId);
        }
      }

      for (const fileId of orphanedFiles) {
        await this.removeFile(fileId);
      }

      if (orphanedFiles.length > 0) {
        console.log(`🧹 Cleaned up ${orphanedFiles.length} orphaned entries`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup orphaned entries:', error);
    }
  }

  // Load persisted index from storage
  private async loadPersistedIndex(): Promise<void> {
    try {
      const indexData = LocalStorage.getItem('localFileIndex');
      if (indexData) {
        const parsedData = JSON.parse(indexData);
        
        // Restore file index
        this.fileIndex.clear();
        this.songToFileMap.clear();
        
        for (const fileData of parsedData.files || []) {
          const localFile: LocalFile = {
            ...fileData,
            downloadedAt: new Date(fileData.downloadedAt),
            lastAccessed: new Date(fileData.lastAccessed)
          };
          
          this.fileIndex.set(localFile.id, localFile);
          
          // Rebuild song mapping
          const songFiles = this.songToFileMap.get(localFile.songId) || [];
          songFiles.push(localFile);
          this.songToFileMap.set(localFile.songId, songFiles);
        }
        
        console.log(`📂 Loaded ${this.fileIndex.size} files from persisted index`);
      }
    } catch (error) {
      console.error('❌ Failed to load persisted index:', error);
    }
  }

  // Persist index to storage
  private async persistIndex(): Promise<void> {
    try {
      const indexData = {
        files: Array.from(this.fileIndex.values()),
        lastUpdated: new Date().toISOString()
      };
      
      LocalStorage.setItem('localFileIndex', JSON.stringify(indexData));
    } catch (error) {
      console.error('❌ Failed to persist index:', error);
    }
  }

  // Extract filename from path
  private extractFileName(filePath: string): string {
    return filePath.split('/').pop() || 'unknown';
  }

  // Get song info (placeholder - would integrate with actual song service)
  private async getSongInfo(songId: string): Promise<Song | null> {
    // In a real implementation, this would fetch from your song database
    // For now, we'll return a placeholder
    return {
      id: songId,
      title: `Song ${songId}`,
      thumbnail: '',
      duration: '0:00',
      mood: ['unknown'],
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };
  }

  // Check if index is initialized
  isReady(): boolean {
    return this.isInitialized;
  }

  // Rebuild index from scratch
  async rebuildIndex(): Promise<void> {
    console.log('🔄 Rebuilding file index...');
    this.fileIndex.clear();
    this.songToFileMap.clear();
    this.isInitialized = false;
    
    await this.initialize();
  }
}