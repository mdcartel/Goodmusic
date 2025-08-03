import { audioExtractor } from './audio-extractor';
import { database } from '../database';
import { generateId } from '../utils';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { pipeline } from 'stream/promises';

// Download formats and qualities
export type DownloadFormat = 'mp3' | 'm4a' | 'opus' | 'webm';
export type DownloadQuality = '128' | '192' | '256' | '320' | 'best';

// Download status
export type DownloadStatus = 
  | 'pending' 
  | 'downloading' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

// Download priority
export type DownloadPriority = 'low' | 'normal' | 'high';

// Download item
export interface DownloadItem {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail?: string;
  format: DownloadFormat;
  quality: DownloadQuality;
  status: DownloadStatus;
  priority: DownloadPriority;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  downloadSpeed: number;
  estimatedTimeRemaining: number;
  filePath?: string;
  fileName?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

// Download options
export interface DownloadOptions {
  format?: DownloadFormat;
  quality?: DownloadQuality;
  priority?: DownloadPriority;
  outputPath?: string;
  fileName?: string;
  maxRetries?: number;
  overwrite?: boolean;
  includeThumbnail?: boolean;
  includeMetadata?: boolean;
}

// Download configuration
export interface DownloadConfig {
  maxConcurrentDownloads: number;
  maxDownloadSpeed: number; // KB/s, 0 = unlimited
  defaultFormat: DownloadFormat;
  defaultQuality: DownloadQuality;
  outputDirectory: string;
  createArtistFolders: boolean;
  createAlbumFolders: boolean;
  fileNameTemplate: string;
  resumeIncompleteDownloads: boolean;
  retryFailedDownloads: boolean;
  maxRetries: number;
  retryDelay: number;
  cleanupFailedDownloads: boolean;
}

// Download statistics
export interface DownloadStats {
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  totalBytes: number;
  downloadedBytes: number;
  averageSpeed: number;
  activeDownloads: number;
  queuedDownloads: number;
}

// Download events
export type DownloadEvent = 
  | 'downloadAdded'
  | 'downloadStarted'
  | 'downloadProgress'
  | 'downloadCompleted'
  | 'downloadFailed'
  | 'downloadCancelled'
  | 'downloadPaused'
  | 'downloadResumed'
  | 'queueChanged'
  | 'configChanged';

export type DownloadEventCallback = (data?: any) => void;

class DownloadManagerService {
  private static instance: DownloadManagerService;
  private downloads = new Map<string, DownloadItem>();
  private activeDownloads = new Map<string, AbortController>();
  private downloadQueue: string[] = [];
  private eventListeners = new Map<DownloadEvent, DownloadEventCallback[]>();
  
  private config: DownloadConfig = {
    maxConcurrentDownloads: 3,
    maxDownloadSpeed: 0, // Unlimited
    defaultFormat: 'm4a',
    defaultQuality: '192',
    outputDirectory: './downloads',
    createArtistFolders: true,
    createAlbumFolders: false,
    fileNameTemplate: '{artist} - {title}',
    resumeIncompleteDownloads: true,
    retryFailedDownloads: true,
    maxRetries: 3,
    retryDelay: 5000,
    cleanupFailedDownloads: false,
  };

  private constructor() {
    this.loadConfig();
    this.loadDownloads();
    this.startQueueProcessor();
  }

  public static getInstance(): DownloadManagerService {
    if (!DownloadManagerService.instance) {
      DownloadManagerService.instance = new DownloadManagerService();
    }
    return DownloadManagerService.instance;
  }

  // Event management
  public on(event: DownloadEvent, callback: DownloadEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: DownloadEvent, callback: DownloadEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: DownloadEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Download management
  public async addDownload(
    videoId: string,
    title: string,
    artist: string,
    duration: number,
    options: DownloadOptions = {}
  ): Promise<string> {
    const downloadId = generateId();
    
    const downloadItem: DownloadItem = {
      id: downloadId,
      videoId,
      title,
      artist,
      duration,
      thumbnail: options.includeThumbnail ? await this.getThumbnailUrl(videoId) : undefined,
      format: options.format || this.config.defaultFormat,
      quality: options.quality || this.config.defaultQuality,
      status: 'pending',
      priority: options.priority || 'normal',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      downloadSpeed: 0,
      estimatedTimeRemaining: 0,
      error: undefined,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
    };

    // Generate file path and name
    const fileName = options.fileName || this.generateFileName(downloadItem);
    const filePath = options.outputPath || this.generateFilePath(downloadItem, fileName);
    
    downloadItem.fileName = fileName;
    downloadItem.filePath = filePath;

    // Check if file already exists
    if (!options.overwrite && existsSync(filePath)) {
      downloadItem.status = 'failed';
      downloadItem.error = 'File already exists';
    }

    this.downloads.set(downloadId, downloadItem);
    this.addToQueue(downloadId);
    
    // Save to database
    await this.saveDownload(downloadItem);
    
    this.emit('downloadAdded', downloadItem);
    this.emit('queueChanged', this.getQueueStatus());
    
    return downloadId;
  }

  public async removeDownload(downloadId: string): Promise<boolean> {
    const download = this.downloads.get(downloadId);
    if (!download) return false;

    // Cancel if downloading
    if (download.status === 'downloading') {
      await this.cancelDownload(downloadId);
    }

    // Remove from queue
    this.removeFromQueue(downloadId);
    
    // Remove from memory
    this.downloads.delete(downloadId);
    
    // Remove from database
    await database.run('DELETE FROM downloads WHERE id = ?', [downloadId]);
    
    this.emit('queueChanged', this.getQueueStatus());
    
    return true;
  }

  public async pauseDownload(downloadId: string): Promise<boolean> {
    const download = this.downloads.get(downloadId);
    if (!download || download.status !== 'downloading') return false;

    const controller = this.activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(downloadId);
    }

    download.status = 'paused';
    await this.saveDownload(download);
    
    this.emit('downloadPaused', download);
    this.emit('queueChanged', this.getQueueStatus());
    
    return true;
  }

  public async resumeDownload(downloadId: string): Promise<boolean> {
    const download = this.downloads.get(downloadId);
    if (!download || download.status !== 'paused') return false;

    download.status = 'pending';
    this.addToQueue(downloadId);
    await this.saveDownload(download);
    
    this.emit('downloadResumed', download);
    this.emit('queueChanged', this.getQueueStatus());
    
    return true;
  }

  public async cancelDownload(downloadId: string): Promise<boolean> {
    const download = this.downloads.get(downloadId);
    if (!download) return false;

    // Abort active download
    const controller = this.activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(downloadId);
    }

    // Remove from queue
    this.removeFromQueue(downloadId);
    
    download.status = 'cancelled';
    await this.saveDownload(download);
    
    this.emit('downloadCancelled', download);
    this.emit('queueChanged', this.getQueueStatus());
    
    return true;
  }

  public async retryDownload(downloadId: string): Promise<boolean> {
    const download = this.downloads.get(downloadId);
    if (!download || (download.status !== 'failed' && download.status !== 'cancelled')) {
      return false;
    }

    download.status = 'pending';
    download.progress = 0;
    download.downloadedBytes = 0;
    download.error = undefined;
    download.retryCount++;
    
    this.addToQueue(downloadId);
    await this.saveDownload(download);
    
    this.emit('downloadResumed', download);
    this.emit('queueChanged', this.getQueueStatus());
    
    return true;
  }

  public async retryAllFailed(): Promise<number> {
    let retryCount = 0;
    
    for (const [downloadId, download] of this.downloads) {
      if (download.status === 'failed' && download.retryCount < download.maxRetries) {
        await this.retryDownload(downloadId);
        retryCount++;
      }
    }
    
    return retryCount;
  }

  public async clearCompleted(): Promise<number> {
    let clearedCount = 0;
    
    const completedIds = Array.from(this.downloads.entries())
      .filter(([_, download]) => download.status === 'completed')
      .map(([id, _]) => id);
    
    for (const downloadId of completedIds) {
      await this.removeDownload(downloadId);
      clearedCount++;
    }
    
    return clearedCount;
  }

  public async clearAll(): Promise<void> {
    // Cancel all active downloads
    for (const [downloadId] of this.activeDownloads) {
      await this.cancelDownload(downloadId);
    }
    
    // Clear all downloads
    this.downloads.clear();
    this.downloadQueue = [];
    this.activeDownloads.clear();
    
    // Clear database
    await database.run('DELETE FROM downloads');
    
    this.emit('queueChanged', this.getQueueStatus());
  }

  // Queue management
  private addToQueue(downloadId: string): void {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    // Remove if already in queue
    this.removeFromQueue(downloadId);
    
    // Add based on priority
    if (download.priority === 'high') {
      this.downloadQueue.unshift(downloadId);
    } else if (download.priority === 'low') {
      this.downloadQueue.push(downloadId);
    } else {
      // Normal priority - add after high priority items
      const highPriorityCount = this.downloadQueue
        .map(id => this.downloads.get(id))
        .filter(d => d?.priority === 'high').length;
      
      this.downloadQueue.splice(highPriorityCount, 0, downloadId);
    }
  }

  private removeFromQueue(downloadId: string): void {
    const index = this.downloadQueue.indexOf(downloadId);
    if (index > -1) {
      this.downloadQueue.splice(index, 1);
    }
  }

  public moveInQueue(downloadId: string, newPosition: number): boolean {
    const currentIndex = this.downloadQueue.indexOf(downloadId);
    if (currentIndex === -1) return false;

    // Remove from current position
    this.downloadQueue.splice(currentIndex, 1);
    
    // Insert at new position
    const clampedPosition = Math.max(0, Math.min(newPosition, this.downloadQueue.length));
    this.downloadQueue.splice(clampedPosition, 0, downloadId);
    
    this.emit('queueChanged', this.getQueueStatus());
    
    return true;
  }

  // Download processing
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  private async processQueue(): Promise<void> {
    const activeCount = this.activeDownloads.size;
    const maxConcurrent = this.config.maxConcurrentDownloads;
    
    if (activeCount >= maxConcurrent || this.downloadQueue.length === 0) {
      return;
    }

    const availableSlots = maxConcurrent - activeCount;
    const downloadsToStart = this.downloadQueue
      .slice(0, availableSlots)
      .map(id => this.downloads.get(id))
      .filter(download => download?.status === 'pending');

    for (const download of downloadsToStart) {
      if (download) {
        await this.startDownload(download.id);
      }
    }
  }

  private async startDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download || download.status !== 'pending') return;

    try {
      download.status = 'downloading';
      download.startedAt = new Date();
      download.error = undefined;
      
      const controller = new AbortController();
      this.activeDownloads.set(downloadId, controller);
      
      await this.saveDownload(download);
      this.emit('downloadStarted', download);
      
      // Extract audio stream
      const result = await audioExtractor.extractAudioStream(
        download.videoId,
        {
          quality: download.quality,
          format: download.format,
        }
      );

      if (!result.success || !result.stream) {
        throw new Error(result.error || 'Failed to extract audio stream');
      }

      // Download the file
      await this.downloadFile(download, result.stream.url, controller.signal);
      
      // Mark as completed
      download.status = 'completed';
      download.progress = 100;
      download.completedAt = new Date();
      
      this.activeDownloads.delete(downloadId);
      this.removeFromQueue(downloadId);
      
      await this.saveDownload(download);
      this.emit('downloadCompleted', download);
      this.emit('queueChanged', this.getQueueStatus());
      
    } catch (error) {
      await this.handleDownloadError(downloadId, error);
    }
  }

  private async downloadFile(
    download: DownloadItem,
    url: string,
    signal: AbortSignal
  ): Promise<void> {
    if (!download.filePath) {
      throw new Error('File path not specified');
    }

    // Ensure directory exists
    const dir = path.dirname(download.filePath);
    await fs.mkdir(dir, { recursive: true });

    // Start download
    const response = await fetch(url, { signal });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0');
    download.totalBytes = totalBytes;

    const fileStream = createWriteStream(download.filePath);
    let downloadedBytes = 0;
    let lastUpdate = Date.now();
    let lastBytes = 0;

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Check if cancelled
        if (signal.aborted) {
          throw new Error('Download cancelled');
        }

        downloadedBytes += value.length;
        download.downloadedBytes = downloadedBytes;
        
        // Write to file
        fileStream.write(value);
        
        // Update progress
        const now = Date.now();
        if (now - lastUpdate >= 1000) { // Update every second
          const timeDiff = (now - lastUpdate) / 1000;
          const bytesDiff = downloadedBytes - lastBytes;
          
          download.downloadSpeed = bytesDiff / timeDiff;
          download.progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
          
          if (download.downloadSpeed > 0) {
            const remainingBytes = totalBytes - downloadedBytes;
            download.estimatedTimeRemaining = remainingBytes / download.downloadSpeed;
          }
          
          await this.saveDownload(download);
          this.emit('downloadProgress', download);
          
          lastUpdate = now;
          lastBytes = downloadedBytes;
        }

        // Apply speed limit if configured
        if (this.config.maxDownloadSpeed > 0) {
          const expectedTime = (downloadedBytes / (this.config.maxDownloadSpeed * 1024)) * 1000;
          const actualTime = now - (download.startedAt?.getTime() || now);
          
          if (actualTime < expectedTime) {
            await new Promise(resolve => setTimeout(resolve, expectedTime - actualTime));
          }
        }
      }
    } finally {
      fileStream.end();
      reader.releaseLock();
    }

    // Final progress update
    download.progress = 100;
    download.downloadedBytes = downloadedBytes;
    download.downloadSpeed = 0;
    download.estimatedTimeRemaining = 0;
    
    await this.saveDownload(download);
    this.emit('downloadProgress', download);
  }

  private async handleDownloadError(downloadId: string, error: any): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    download.status = 'failed';
    download.error = error instanceof Error ? error.message : String(error);
    
    this.activeDownloads.delete(downloadId);
    this.removeFromQueue(downloadId);
    
    // Retry if configured and retries available
    if (this.config.retryFailedDownloads && 
        download.retryCount < download.maxRetries) {
      
      setTimeout(async () => {
        await this.retryDownload(downloadId);
      }, this.config.retryDelay);
    }
    
    await this.saveDownload(download);
    this.emit('downloadFailed', download);
    this.emit('queueChanged', this.getQueueStatus());
  }

  // File management
  private generateFileName(download: DownloadItem): string {
    const template = this.config.fileNameTemplate;
    const extension = this.getFileExtension(download.format);
    
    let fileName = template
      .replace('{title}', this.sanitizeFileName(download.title))
      .replace('{artist}', this.sanitizeFileName(download.artist))
      .replace('{quality}', download.quality)
      .replace('{format}', download.format);
    
    return `${fileName}.${extension}`;
  }

  private generateFilePath(download: DownloadItem, fileName: string): string {
    let outputPath = this.config.outputDirectory;
    
    if (this.config.createArtistFolders) {
      outputPath = path.join(outputPath, this.sanitizeFileName(download.artist));
    }
    
    if (this.config.createAlbumFolders) {
      // For now, use artist name as album (could be enhanced with metadata)
      outputPath = path.join(outputPath, this.sanitizeFileName(download.artist));
    }
    
    return path.join(outputPath, fileName);
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit length
  }

  private getFileExtension(format: DownloadFormat): string {
    const extensions: Record<DownloadFormat, string> = {
      mp3: 'mp3',
      m4a: 'm4a',
      opus: 'opus',
      webm: 'webm',
    };
    
    return extensions[format] || 'm4a';
  }

  private async getThumbnailUrl(videoId: string): Promise<string | undefined> {
    // Return YouTube thumbnail URL
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  // Data access
  public getDownload(downloadId: string): DownloadItem | undefined {
    return this.downloads.get(downloadId);
  }

  public getAllDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }

  public getDownloadsByStatus(status: DownloadStatus): DownloadItem[] {
    return Array.from(this.downloads.values())
      .filter(download => download.status === status);
  }

  public getQueueStatus(): {
    queue: DownloadItem[];
    active: DownloadItem[];
    completed: DownloadItem[];
    failed: DownloadItem[];
    totalCount: number;
  } {
    const allDownloads = this.getAllDownloads();
    
    return {
      queue: this.downloadQueue
        .map(id => this.downloads.get(id))
        .filter(Boolean) as DownloadItem[],
      active: allDownloads.filter(d => d.status === 'downloading'),
      completed: allDownloads.filter(d => d.status === 'completed'),
      failed: allDownloads.filter(d => d.status === 'failed'),
      totalCount: allDownloads.length,
    };
  }

  public getStats(): DownloadStats {
    const allDownloads = this.getAllDownloads();
    const completedDownloads = allDownloads.filter(d => d.status === 'completed');
    const failedDownloads = allDownloads.filter(d => d.status === 'failed');
    const activeDownloads = allDownloads.filter(d => d.status === 'downloading');
    const queuedDownloads = allDownloads.filter(d => d.status === 'pending');
    
    const totalBytes = allDownloads.reduce((sum, d) => sum + d.totalBytes, 0);
    const downloadedBytes = allDownloads.reduce((sum, d) => sum + d.downloadedBytes, 0);
    
    const averageSpeed = activeDownloads.length > 0 
      ? activeDownloads.reduce((sum, d) => sum + d.downloadSpeed, 0) / activeDownloads.length
      : 0;
    
    return {
      totalDownloads: allDownloads.length,
      completedDownloads: completedDownloads.length,
      failedDownloads: failedDownloads.length,
      totalBytes,
      downloadedBytes,
      averageSpeed,
      activeDownloads: activeDownloads.length,
      queuedDownloads: queuedDownloads.length,
    };
  }

  // Configuration
  public getConfig(): DownloadConfig {
    return { ...this.config };
  }

  public async updateConfig(updates: Partial<DownloadConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    this.emit('configChanged', this.config);
  }

  // Persistence
  private async loadConfig(): Promise<void> {
    try {
      const settings = await database.all(
        'SELECT key, value FROM settings WHERE key LIKE "download_%"'
      );
      
      settings.forEach((setting: any) => {
        const key = setting.key.replace('download_', '');
        const value = JSON.parse(setting.value);
        
        if (key in this.config) {
          (this.config as any)[key] = value;
        }
      });
    } catch (error) {
      console.warn('Failed to load download config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const configEntries = Object.entries(this.config);
      
      for (const [key, value] of configEntries) {
        await database.run(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [`download_${key}`, JSON.stringify(value)]
        );
      }
    } catch (error) {
      console.warn('Failed to save download config:', error);
    }
  }

  private async loadDownloads(): Promise<void> {
    try {
      const downloads = await database.all('SELECT * FROM downloads ORDER BY created_at DESC');
      
      downloads.forEach((row: any) => {
        const download: DownloadItem = {
          id: row.id,
          videoId: row.video_id,
          title: row.title,
          artist: row.artist,
          duration: row.duration,
          thumbnail: row.thumbnail,
          format: row.format,
          quality: row.quality,
          status: row.status,
          priority: row.priority,
          progress: row.progress,
          downloadedBytes: row.downloaded_bytes,
          totalBytes: row.total_bytes,
          downloadSpeed: 0, // Reset speed on load
          estimatedTimeRemaining: 0, // Reset ETA on load
          filePath: row.file_path,
          fileName: row.file_name,
          error: row.error,
          createdAt: new Date(row.created_at),
          startedAt: row.started_at ? new Date(row.started_at) : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
          retryCount: row.retry_count,
          maxRetries: row.max_retries,
        };
        
        this.downloads.set(download.id, download);
        
        // Add pending downloads back to queue
        if (download.status === 'pending' || 
            (download.status === 'downloading' && this.config.resumeIncompleteDownloads)) {
          download.status = 'pending';
          this.addToQueue(download.id);
        }
      });
    } catch (error) {
      console.warn('Failed to load downloads:', error);
    }
  }

  private async saveDownload(download: DownloadItem): Promise<void> {
    try {
      await database.run(
        `INSERT OR REPLACE INTO downloads (
          id, video_id, title, artist, duration, thumbnail, format, quality,
          status, priority, progress, downloaded_bytes, total_bytes,
          file_path, file_name, error, created_at, started_at, completed_at,
          retry_count, max_retries
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          download.id,
          download.videoId,
          download.title,
          download.artist,
          download.duration,
          download.thumbnail,
          download.format,
          download.quality,
          download.status,
          download.priority,
          download.progress,
          download.downloadedBytes,
          download.totalBytes,
          download.filePath,
          download.fileName,
          download.error,
          download.createdAt.toISOString(),
          download.startedAt?.toISOString(),
          download.completedAt?.toISOString(),
          download.retryCount,
          download.maxRetries,
        ]
      );
    } catch (error) {
      console.warn('Failed to save download:', error);
    }
  }

  // Cleanup
  public destroy(): void {
    // Cancel all active downloads
    for (const controller of this.activeDownloads.values()) {
      controller.abort();
    }
    
    this.activeDownloads.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const downloadManager = DownloadManagerService.getInstance();
export { DownloadManagerService };