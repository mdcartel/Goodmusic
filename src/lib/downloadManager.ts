// Download management system for VibePipe MVP

import { Download, Song } from '@/types';
import { DataFactory } from './dataFactory';
import { localStorageManager } from './localStorageManager';
import { FileStorageService } from './fileStorage';
import { DownloadedContentManager } from './downloadedContentManager';
// Note: ExtractionService import removed for browser compatibility
// generateId import removed - using DataFactory instead
import { EventEmitter } from 'events';

export interface DownloadProgress {
  downloadId: string;
  progress: number;
  status: Download['status'];
  speed?: number; // bytes per second
  eta?: number; // estimated time remaining in seconds
  error?: string;
}

export interface DownloadOptions {
  format: 'mp3' | 'mp4';
  quality?: string;
  outputDir?: string;
  filename?: string;
}

export class DownloadManager extends EventEmitter {
  private static instance: DownloadManager;
  private activeDownloads: Map<string, Download> = new Map();
  private downloadQueue: Download[] = [];
  private maxConcurrentDownloads = 3;
  private isProcessing = false;
  private fileStorage: FileStorageService;
  private contentManager: DownloadedContentManager;

  private constructor() {
    super();
    this.fileStorage = FileStorageService.getInstance();
    this.contentManager = DownloadedContentManager.getInstance();
    this.initializeStorage();
    this.loadPersistedDownloads();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await this.fileStorage.initializeStorage();
      console.log('Download storage initialized');
    } catch (error) {
      console.error('Failed to initialize download storage:', error);
    }
  }

  static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  // Start a new download
  async startDownload(song: Song, options: DownloadOptions): Promise<string> {
    try {
      // Create download record
      const download = DataFactory.createDownload({
        songId: song.id,
        format: options.format,
        quality: options.quality
      });

      // Generate secure file path using FileStorageService
      const secureFilePath = this.fileStorage.generateSecureFilePath(song, options.format, {
        useMoodFolder: true,
        useArtistFolder: !!song.artist
      });

      // Validate the file path
      if (!this.fileStorage.validateFilePath(secureFilePath)) {
        throw new Error('Invalid file path generated');
      }

      // Add metadata
      const enhancedDownload: Download = {
        ...download,
        filePath: secureFilePath,
        createdAt: new Date()
      };

      // Add to queue
      this.downloadQueue.push(enhancedDownload);
      this.activeDownloads.set(download.id, enhancedDownload);

      // Persist to storage
      localStorageManager.addToDownloadHistory(enhancedDownload);

      // Emit event
      this.emit('downloadAdded', enhancedDownload);

      // Start processing queue
      this.processQueue();

      return download.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start download: ${errorMessage}`);
    }
  }

  // Get download status
  getDownloadStatus(downloadId: string): Download | null {
    return this.activeDownloads.get(downloadId) || null;
  }

  // Get all downloads
  getAllDownloads(): Download[] {
    return Array.from(this.activeDownloads.values());
  }

  // Get downloads by status
  getDownloadsByStatus(status: Download['status']): Download[] {
    return this.getAllDownloads().filter(d => d.status === status);
  }

  // Cancel download
  async cancelDownload(downloadId: string): Promise<boolean> {
    try {
      const download = this.activeDownloads.get(downloadId);
      if (!download) return false;

      // Update status
      const cancelledDownload = DataFactory.updateDownloadProgress(
        download,
        0,
        'failed'
      );
      cancelledDownload.error = 'Download cancelled by user';

      this.activeDownloads.set(downloadId, cancelledDownload);
      localStorageManager.addToDownloadHistory(cancelledDownload);

      // Remove from queue if not started
      this.downloadQueue = this.downloadQueue.filter(d => d.id !== downloadId);

      this.emit('downloadCancelled', cancelledDownload);
      return true;

    } catch (error) {
      console.error('Error cancelling download:', error);
      return false;
    }
  }

  // Retry failed download
  async retryDownload(downloadId: string): Promise<boolean> {
    try {
      const download = this.activeDownloads.get(downloadId);
      if (!download || download.status !== 'failed') return false;

      // Reset download
      const retriedDownload: Download = {
        ...download,
        status: 'queued',
        progress: 0,
        error: undefined,
        createdAt: new Date()
      };

      this.activeDownloads.set(downloadId, retriedDownload);
      this.downloadQueue.push(retriedDownload);
      localStorageManager.addToDownloadHistory(retriedDownload);

      this.emit('downloadRetried', retriedDownload);
      this.processQueue();

      return true;

    } catch (error) {
      console.error('Error retrying download:', error);
      return false;
    }
  }

  // Clear completed downloads
  clearCompleted(): void {
    const completed = this.getDownloadsByStatus('completed');
    completed.forEach(download => {
      this.activeDownloads.delete(download.id);
    });

    this.emit('downloadsCleared', completed);
  }

  // Clear all downloads
  clearAll(): void {
    const allDownloads = this.getAllDownloads();
    this.activeDownloads.clear();
    this.downloadQueue = [];

    this.emit('allDownloadsCleared', allDownloads);
  }

  // Process download queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.downloadQueue.length > 0) {
        const activeCount = this.getDownloadsByStatus('processing').length;
        
        if (activeCount >= this.maxConcurrentDownloads) {
          // Wait for a download to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const download = this.downloadQueue.shift();
        if (!download) continue;

        // Start processing
        this.processDownload(download);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual download
  private async processDownload(download: Download): Promise<void> {
    try {
      // Update status to processing
      const processingDownload = DataFactory.updateDownloadProgress(
        download,
        0,
        'processing'
      );
      this.activeDownloads.set(download.id, processingDownload);
      localStorageManager.addToDownloadHistory(processingDownload);

      this.emit('downloadStarted', processingDownload);

      // Get song information
      const song = await this.getSongInfo(download.songId);
      if (!song) {
        throw new Error('Song not found');
      }

      // Directory creation is handled by FileStorageService during initialization

      // Start actual download
      await this.performDownload(download, song);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedDownload = DataFactory.markDownloadFailed(download, errorMessage);
      
      this.activeDownloads.set(download.id, failedDownload);
      LocalStorage.addToDownloadHistory(failedDownload);

      this.emit('downloadFailed', failedDownload);
    }
  }

  // Perform the actual download
  private async performDownload(download: Download, song: Song): Promise<void> {
    // For web version, we'll simulate the download process
    // In a real implementation, this would trigger a server-side download
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const currentDownload = this.activeDownloads.get(download.id);
      if (!currentDownload || currentDownload.status !== 'processing') {
        clearInterval(progressInterval);
        return;
      }

      // Simulate progress
      const newProgress = Math.min(currentDownload.progress + Math.random() * 10, 95);
      const updatedDownload = DataFactory.updateDownloadProgress(
        currentDownload,
        newProgress,
        'processing'
      );

      this.activeDownloads.set(download.id, updatedDownload);
      this.emit('downloadProgress', {
        downloadId: download.id,
        progress: newProgress,
        status: 'processing'
      });
    }, 500);

    try {
      // Simulate download time (2-5 seconds)
      const downloadTime = 2000 + Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, downloadTime));

      clearInterval(progressInterval);

      // Mark as completed
      const completedDownload = DataFactory.updateDownloadProgress(
        download,
        100,
        'completed'
      );
      completedDownload.filePath = download.filePath;
      completedDownload.completedAt = new Date();
      completedDownload.fileSize = Math.floor(Math.random() * 10000000) + 1000000; // Random file size

      this.activeDownloads.set(download.id, completedDownload);
      LocalStorage.addToDownloadHistory(completedDownload);

      // Add to downloaded content index
      try {
        await this.contentManager.addDownloadedSong(completedDownload, song);
        console.log('✅ Added to downloaded content index:', song.title);
      } catch (error) {
        console.error('❌ Failed to add to content index:', error);
      }

      this.emit('downloadCompleted', completedDownload);

    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  // Get storage statistics
  async getStorageStatistics(): Promise<{
    totalSize: number;
    availableSpace: number;
    fileCount: number;
    storageHealth: {
      isValid: boolean;
      issues: string[];
      recommendations: string[];
    };
  }> {
    try {
      const storageStats = await this.fileStorage.getStorageStats();
      const storageHealth = await this.fileStorage.verifyStorageIntegrity();

      return {
        totalSize: storageStats.totalSize,
        availableSpace: storageStats.availableSpace,
        fileCount: storageStats.fileCount,
        storageHealth
      };
    } catch (error) {
      console.error('Failed to get storage statistics:', error);
      return {
        totalSize: 0,
        availableSpace: 0,
        fileCount: 0,
        storageHealth: {
          isValid: false,
          issues: ['Failed to retrieve storage statistics'],
          recommendations: ['Check storage system configuration']
        }
      };
    }
  }

  // Clean up storage
  async cleanupStorage(): Promise<void> {
    try {
      await this.fileStorage.cleanupTempFiles(24); // Clean files older than 24 hours
      console.log('Storage cleanup completed');
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  private async getSongInfo(songId: string): Promise<Song | null> {
    // In a real implementation, this would fetch from your song database
    // For now, we'll simulate it
    return {
      id: songId,
      title: `Song ${songId}`,
      thumbnail: '',
      duration: '0:00',
      mood: ['unknown'],
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };
  }

  private loadPersistedDownloads(): void {
    try {
      const persistedDownloads = LocalStorage.getDownloadHistory();
      persistedDownloads.forEach(download => {
        if (download.status === 'processing' || download.status === 'queued') {
          // Reset interrupted downloads
          download.status = 'failed';
          download.error = 'Download interrupted';
        }
        this.activeDownloads.set(download.id, download);
      });
    } catch (error) {
      console.error('Error loading persisted downloads:', error);
    }
  }

  // Statistics
  getStatistics(): {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    queued: number;
    totalSize: number;
  } {
    const downloads = this.getAllDownloads();
    
    return {
      total: downloads.length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length,
      processing: downloads.filter(d => d.status === 'processing').length,
      queued: downloads.filter(d => d.status === 'queued').length,
      totalSize: downloads
        .filter(d => d.fileSize)
        .reduce((sum, d) => sum + (d.fileSize || 0), 0)
    };
  }

  // Cleanup
  destroy(): void {
    this.removeAllListeners();
    this.activeDownloads.clear();
    this.downloadQueue = [];
  }
}