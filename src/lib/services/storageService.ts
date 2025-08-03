import { Database } from 'sqlite3';
import path from 'path';
import { StorageManager, StorageConfig, StorageHealth, CleanupResult } from '../storage';
import { Song } from '../../types';

export interface StorageServiceConfig {
  databasePath: string;
  storageConfig: StorageConfig;
}

export interface FileIntegrityReport {
  totalFiles: number;
  validFiles: number;
  corruptFiles: number;
  missingFiles: number;
  orphanedFiles: number;
  fixedFiles: number;
  errors: string[];
}

export class StorageService {
  private db: Database;
  private storageManager: StorageManager;
  private config: StorageServiceConfig;

  constructor(config: StorageServiceConfig) {
    this.config = config;
    this.db = new Database(config.databasePath);
    this.storageManager = new StorageManager(config.storageConfig);
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    await this.storageManager.initialize();
  }

  /**
   * Get all downloaded songs from database
   */
  private async getDownloadedSongs(): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM songs WHERE is_downloaded = 1 AND file_path IS NOT NULL',
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              youtube_id: row.youtube_id,
              title: row.title,
              artist: row.artist,
              album: row.album,
              album_artist: row.album_artist,
              genre: row.genre,
              year: row.year,
              track_number: row.track_number,
              total_tracks: row.total_tracks,
              duration: row.duration,
              thumbnail: row.thumbnail,
              youtube_url: row.youtube_url,
              audio_url: row.audio_url,
              is_downloaded: Boolean(row.is_downloaded),
              file_path: row.file_path,
              file_size: row.file_size,
              quality: row.quality,
              format: row.format,
              added_at: new Date(row.added_at),
              play_count: row.play_count,
              last_played: row.last_played ? new Date(row.last_played) : undefined,
              rating: row.rating,
              is_favorite: Boolean(row.is_favorite)
            })));
          }
        }
      );
    });
  }

  /**
   * Update song file path in database
   */
  private async updateSongFilePath(songId: string, newPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE songs SET file_path = ? WHERE id = ?',
        [newPath, songId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Mark song as not downloaded if file is missing
   */
  private async markSongAsNotDownloaded(songId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE songs SET is_downloaded = 0, file_path = NULL WHERE id = ?',
        [songId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Get storage health report
   */
  async getStorageHealth(): Promise<StorageHealth> {
    return this.storageManager.getStorageHealth();
  }

  /**
   * Organize all downloaded files
   */
  async organizeFiles(): Promise<{
    organized: number;
    skipped: number;
    errors: Array<{ song: Song; error: string }>;
  }> {
    const songs = await this.getDownloadedSongs();
    const result = await this.storageManager.organizeFiles(songs);

    // Update database with new file paths
    for (const song of songs) {
      if (song.file_path) {
        try {
          const organizedPath = this.storageManager['fileOrganizer'].generateOrganizedPath(song);
          if (organizedPath !== song.file_path) {
            await this.updateSongFilePath(song.id, organizedPath);
          }
        } catch (error) {
          console.warn(`Failed to update file path for song ${song.id}:`, error);
        }
      }
    }

    return result;
  }

  /**
   * Clean up storage
   */
  async cleanup(options?: {
    removeDuplicates?: boolean;
    removeEmptyDirs?: boolean;
    removeCorruptFiles?: boolean;
  }): Promise<CleanupResult> {
    return this.storageManager.cleanup(options);
  }

  /**
   * Check file integrity and sync with database
   */
  async checkFileIntegrity(): Promise<FileIntegrityReport> {
    const songs = await this.getDownloadedSongs();
    const report: FileIntegrityReport = {
      totalFiles: songs.length,
      validFiles: 0,
      corruptFiles: 0,
      missingFiles: 0,
      orphanedFiles: 0,
      fixedFiles: 0,
      errors: []
    };

    // Check each song file
    for (const song of songs) {
      if (!song.file_path) {
        continue;
      }

      try {
        const integrity = await this.storageManager['fileOrganizer'].checkFileIntegrity(song.file_path);
        
        if (integrity.valid) {
          report.validFiles++;
        } else {
          report.corruptFiles++;
          
          if (integrity.error?.includes('ENOENT') || integrity.error?.includes('no such file')) {
            // File is missing
            report.missingFiles++;
            await this.markSongAsNotDownloaded(song.id);
            report.fixedFiles++;
          }
        }
      } catch (error) {
        report.errors.push(`Error checking ${song.file_path}: ${error}`);
      }
    }

    // Check for orphaned files (files in storage not in database)
    const orphanedFiles = await this.findOrphanedFiles();
    report.orphanedFiles = orphanedFiles.length;

    return report;
  }

  /**
   * Find files in storage that are not in the database
   */
  private async findOrphanedFiles(): Promise<string[]> {
    const songs = await this.getDownloadedSongs();
    const knownFiles = new Set(songs.map(s => s.file_path).filter(Boolean));
    const orphanedFiles: string[] = [];

    const scanDirectory = async (directory: string): Promise<void> => {
      try {
        const fs = await import('fs/promises');
        const entries = await fs.readdir(directory);
        
        for (const entry of entries) {
          const fullPath = path.join(directory, entry);
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (stats.isFile()) {
            // Check if this is an audio file
            const ext = path.extname(fullPath).toLowerCase();
            if (['.mp3', '.m4a', '.opus', '.flac', '.wav'].includes(ext)) {
              if (!knownFiles.has(fullPath)) {
                orphanedFiles.push(fullPath);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${directory}:`, error);
      }
    };

    await scanDirectory(this.config.storageConfig.baseDirectory);
    return orphanedFiles;
  }

  /**
   * Get storage recommendations
   */
  async getRecommendations(): Promise<Array<{
    type: 'cleanup' | 'organization' | 'optimization';
    priority: 'low' | 'medium' | 'high';
    description: string;
    action: string;
    estimatedBenefit?: string;
  }>> {
    return this.storageManager.getRecommendations();
  }

  /**
   * Monitor storage and perform automatic maintenance
   */
  async performMaintenance(): Promise<{
    healthBefore: StorageHealth;
    healthAfter: StorageHealth;
    actions: string[];
    errors: string[];
  }> {
    const healthBefore = await this.getStorageHealth();
    const actions: string[] = [];
    const errors: string[] = [];

    try {
      // Check file integrity first
      const integrityReport = await this.checkFileIntegrity();
      if (integrityReport.fixedFiles > 0) {
        actions.push(`Fixed ${integrityReport.fixedFiles} database entries for missing files`);
      }

      // Perform automatic cleanup if needed
      if (healthBefore.usage.warningLevel === 'high' || healthBefore.usage.warningLevel === 'critical') {
        const cleanupResult = await this.cleanup({
          removeDuplicates: true,
          removeEmptyDirs: true,
          removeCorruptFiles: false // Don't auto-remove corrupt files
        });
        
        if (cleanupResult.filesRemoved > 0) {
          actions.push(`Removed ${cleanupResult.filesRemoved} duplicate files, saved ${this.formatBytes(cleanupResult.spaceSaved)}`);
        }
        
        if (cleanupResult.directoriesRemoved > 0) {
          actions.push(`Removed ${cleanupResult.directoriesRemoved} empty directories`);
        }
        
        errors.push(...cleanupResult.errors);
      }

      // Organize files if organization score is low
      if (healthBefore.stats.organizationScore < 50) {
        const organizeResult = await this.organizeFiles();
        if (organizeResult.organized > 0) {
          actions.push(`Organized ${organizeResult.organized} files`);
        }
        errors.push(...organizeResult.errors.map(e => e.error));
      }

    } catch (error) {
      errors.push(`Maintenance failed: ${error}`);
    }

    const healthAfter = await this.getStorageHealth();

    return {
      healthBefore,
      healthAfter,
      actions,
      errors
    };
  }

  /**
   * Get detailed storage statistics
   */
  async getDetailedStats(): Promise<{
    storage: StorageHealth;
    integrity: FileIntegrityReport;
    recommendations: Array<{
      type: 'cleanup' | 'organization' | 'optimization';
      priority: 'low' | 'medium' | 'high';
      description: string;
      action: string;
      estimatedBenefit?: string;
    }>;
  }> {
    const [storage, integrity, recommendations] = await Promise.all([
      this.getStorageHealth(),
      this.checkFileIntegrity(),
      this.getRecommendations()
    ]);

    return {
      storage,
      integrity,
      recommendations
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }

  // Private helper methods

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}