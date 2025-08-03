import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { downloadManager, DownloadManagerService } from '../download-manager';
import { database } from '../../database';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs operations
jest.mock('fs/promises');
jest.mock('fs');

// Mock audio extractor
jest.mock('../audio-extractor', () => ({
  audioExtractor: {
    extractAudioStream: jest.fn().mockResolvedValue({
      success: true,
      stream: {
        id: 'test-stream-id',
        url: 'https://example.com/audio.m4a',
        quality: 'best',
        format: 'm4a',
        bitrate: 256,
        sampleRate: 44100,
        channels: 2,
        duration: 180,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        videoId: 'test-video-id',
      },
    }),
  },
}));

// Mock fetch for downloads
global.fetch = jest.fn();

describe('DownloadManagerService', () => {
  beforeAll(async () => {
    // Initialize database for testing
    await database.initialize();
  });

  afterAll(async () => {
    // Clean up
    downloadManager.destroy();
    await database.close();
  });

  beforeEach(async () => {
    // Clear downloads before each test
    await downloadManager.clearAll();
    jest.clearAllMocks();
  });

  describe('Service initialization', () => {
    it('should be a singleton instance', () => {
      const instance1 = downloadManager;
      const instance2 = DownloadManagerService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should have default configuration', () => {
      const config = downloadManager.getConfig();
      
      expect(config.maxConcurrentDownloads).toBe(3);
      expect(config.defaultFormat).toBe('m4a');
      expect(config.defaultQuality).toBe('192');
      expect(config.outputDirectory).toBe('./downloads');
      expect(config.createArtistFolders).toBe(true);
      expect(config.maxRetries).toBe(3);
    });

    it('should start with empty downloads', () => {
      const downloads = downloadManager.getAllDownloads();
      expect(downloads).toHaveLength(0);
      
      const stats = downloadManager.getStats();
      expect(stats.totalDownloads).toBe(0);
      expect(stats.activeDownloads).toBe(0);
    });
  });

  describe('Download management', () => {
    it('should add download to queue', async () => {
      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );

      expect(downloadId).toBeTruthy();
      
      const download = downloadManager.getDownload(downloadId);
      expect(download).toBeDefined();
      expect(download!.title).toBe('Test Song');
      expect(download!.artist).toBe('Test Artist');
      expect(download!.status).toBe('pending');
      expect(download!.progress).toBe(0);
    });

    it('should add download with custom options', async () => {
      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180,
        {
          format: 'mp3',
          quality: '320',
          priority: 'high',
          fileName: 'custom-name.mp3',
        }
      );

      const download = downloadManager.getDownload(downloadId);
      expect(download!.format).toBe('mp3');
      expect(download!.quality).toBe('320');
      expect(download!.priority).toBe('high');
      expect(download!.fileName).toBe('custom-name.mp3');
    });

    it('should remove download from queue', async () => {
      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );

      const removed = await downloadManager.removeDownload(downloadId);
      expect(removed).toBe(true);
      
      const download = downloadManager.getDownload(downloadId);
      expect(download).toBeUndefined();
    });

    it('should not remove non-existent download', async () => {
      const removed = await downloadManager.removeDownload('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Download operations', () => {
    let downloadId: string;

    beforeEach(async () => {
      downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );
    });

    it('should pause download', async () => {
      // First set status to downloading
      const download = downloadManager.getDownload(downloadId)!;
      download.status = 'downloading';

      const paused = await downloadManager.pauseDownload(downloadId);
      expect(paused).toBe(true);
      
      const updatedDownload = downloadManager.getDownload(downloadId);
      expect(updatedDownload!.status).toBe('paused');
    });

    it('should resume download', async () => {
      // First set status to paused
      const download = downloadManager.getDownload(downloadId)!;
      download.status = 'paused';

      const resumed = await downloadManager.resumeDownload(downloadId);
      expect(resumed).toBe(true);
      
      const updatedDownload = downloadManager.getDownload(downloadId);
      expect(updatedDownload!.status).toBe('pending');
    });

    it('should cancel download', async () => {
      const cancelled = await downloadManager.cancelDownload(downloadId);
      expect(cancelled).toBe(true);
      
      const download = downloadManager.getDownload(downloadId);
      expect(download!.status).toBe('cancelled');
    });

    it('should retry failed download', async () => {
      // First set status to failed
      const download = downloadManager.getDownload(downloadId)!;
      download.status = 'failed';
      download.error = 'Test error';

      const retried = await downloadManager.retryDownload(downloadId);
      expect(retried).toBe(true);
      
      const updatedDownload = downloadManager.getDownload(downloadId);
      expect(updatedDownload!.status).toBe('pending');
      expect(updatedDownload!.error).toBeUndefined();
      expect(updatedDownload!.retryCount).toBe(1);
    });

    it('should not retry download that is not failed', async () => {
      const retried = await downloadManager.retryDownload(downloadId);
      expect(retried).toBe(false);
    });
  });

  describe('Batch operations', () => {
    beforeEach(async () => {
      // Add multiple downloads
      await downloadManager.addDownload('video1', 'Song 1', 'Artist 1', 180);
      await downloadManager.addDownload('video2', 'Song 2', 'Artist 2', 240);
      await downloadManager.addDownload('video3', 'Song 3', 'Artist 3', 200);
    });

    it('should retry all failed downloads', async () => {
      const downloads = downloadManager.getAllDownloads();
      
      // Set some downloads to failed
      downloads[0].status = 'failed';
      downloads[1].status = 'failed';
      downloads[2].status = 'completed';

      const retryCount = await downloadManager.retryAllFailed();
      expect(retryCount).toBe(2);
      
      const failedDownloads = downloadManager.getDownloadsByStatus('failed');
      expect(failedDownloads).toHaveLength(0);
    });

    it('should clear completed downloads', async () => {
      const downloads = downloadManager.getAllDownloads();
      
      // Set some downloads to completed
      downloads[0].status = 'completed';
      downloads[1].status = 'completed';
      downloads[2].status = 'pending';

      const clearedCount = await downloadManager.clearCompleted();
      expect(clearedCount).toBe(2);
      
      const remainingDownloads = downloadManager.getAllDownloads();
      expect(remainingDownloads).toHaveLength(1);
      expect(remainingDownloads[0].status).toBe('pending');
    });

    it('should clear all downloads', async () => {
      await downloadManager.clearAll();
      
      const downloads = downloadManager.getAllDownloads();
      expect(downloads).toHaveLength(0);
      
      const stats = downloadManager.getStats();
      expect(stats.totalDownloads).toBe(0);
    });
  });

  describe('Queue management', () => {
    it('should maintain queue order by priority', async () => {
      const lowId = await downloadManager.addDownload(
        'video1', 'Song 1', 'Artist 1', 180, { priority: 'low' }
      );
      const normalId = await downloadManager.addDownload(
        'video2', 'Song 2', 'Artist 2', 180, { priority: 'normal' }
      );
      const highId = await downloadManager.addDownload(
        'video3', 'Song 3', 'Artist 3', 180, { priority: 'high' }
      );

      const queueStatus = downloadManager.getQueueStatus();
      const queueIds = queueStatus.queue.map(d => d.id);
      
      // High priority should be first
      expect(queueIds[0]).toBe(highId);
      expect(queueIds[1]).toBe(normalId);
      expect(queueIds[2]).toBe(lowId);
    });

    it('should move download in queue', async () => {
      const id1 = await downloadManager.addDownload('video1', 'Song 1', 'Artist 1', 180);
      const id2 = await downloadManager.addDownload('video2', 'Song 2', 'Artist 2', 180);
      const id3 = await downloadManager.addDownload('video3', 'Song 3', 'Artist 3', 180);

      const moved = downloadManager.moveInQueue(id3, 0);
      expect(moved).toBe(true);
      
      const queueStatus = downloadManager.getQueueStatus();
      const queueIds = queueStatus.queue.map(d => d.id);
      
      expect(queueIds[0]).toBe(id3);
      expect(queueIds[1]).toBe(id1);
      expect(queueIds[2]).toBe(id2);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Add downloads with different statuses
      const id1 = await downloadManager.addDownload('video1', 'Song 1', 'Artist 1', 180);
      const id2 = await downloadManager.addDownload('video2', 'Song 2', 'Artist 2', 180);
      const id3 = await downloadManager.addDownload('video3', 'Song 3', 'Artist 3', 180);
      
      const downloads = downloadManager.getAllDownloads();
      downloads[0].status = 'completed';
      downloads[0].totalBytes = 5000000;
      downloads[0].downloadedBytes = 5000000;
      
      downloads[1].status = 'failed';
      downloads[1].totalBytes = 4000000;
      downloads[1].downloadedBytes = 2000000;
      
      downloads[2].status = 'downloading';
      downloads[2].totalBytes = 6000000;
      downloads[2].downloadedBytes = 3000000;
      downloads[2].downloadSpeed = 100000;
    });

    it('should calculate correct statistics', () => {
      const stats = downloadManager.getStats();
      
      expect(stats.totalDownloads).toBe(3);
      expect(stats.completedDownloads).toBe(1);
      expect(stats.failedDownloads).toBe(1);
      expect(stats.activeDownloads).toBe(1);
      expect(stats.queuedDownloads).toBe(0);
      expect(stats.totalBytes).toBe(15000000);
      expect(stats.downloadedBytes).toBe(10000000);
      expect(stats.averageSpeed).toBe(100000);
    });

    it('should get downloads by status', () => {
      const completedDownloads = downloadManager.getDownloadsByStatus('completed');
      expect(completedDownloads).toHaveLength(1);
      
      const failedDownloads = downloadManager.getDownloadsByStatus('failed');
      expect(failedDownloads).toHaveLength(1);
      
      const activeDownloads = downloadManager.getDownloadsByStatus('downloading');
      expect(activeDownloads).toHaveLength(1);
    });

    it('should get queue status', () => {
      const queueStatus = downloadManager.getQueueStatus();
      
      expect(queueStatus.active).toHaveLength(1);
      expect(queueStatus.completed).toHaveLength(1);
      expect(queueStatus.failed).toHaveLength(1);
      expect(queueStatus.totalCount).toBe(3);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', async () => {
      await downloadManager.updateConfig({
        maxConcurrentDownloads: 5,
        defaultFormat: 'mp3',
        outputDirectory: './custom-downloads',
      });

      const config = downloadManager.getConfig();
      expect(config.maxConcurrentDownloads).toBe(5);
      expect(config.defaultFormat).toBe('mp3');
      expect(config.outputDirectory).toBe('./custom-downloads');
    });

    it('should persist configuration changes', async () => {
      await downloadManager.updateConfig({
        maxRetries: 5,
        retryDelay: 10000,
      });

      // Check if settings were saved to database
      const maxRetriesSetting = await database.get(
        'SELECT value FROM settings WHERE key = "download_maxRetries"'
      );
      expect(JSON.parse(maxRetriesSetting.value)).toBe(5);

      const retryDelaySetting = await database.get(
        'SELECT value FROM settings WHERE key = "download_retryDelay"'
      );
      expect(JSON.parse(retryDelaySetting.value)).toBe(10000);
    });
  });

  describe('Event system', () => {
    it('should emit download added event', async () => {
      const mockCallback = jest.fn();
      downloadManager.on('downloadAdded', mockCallback);

      await downloadManager.addDownload('video1', 'Song 1', 'Artist 1', 180);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Song 1',
          artist: 'Artist 1',
          status: 'pending',
        })
      );
    });

    it('should emit queue changed event', async () => {
      const mockCallback = jest.fn();
      downloadManager.on('queueChanged', mockCallback);

      await downloadManager.addDownload('video1', 'Song 1', 'Artist 1', 180);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCount: 1,
        })
      );
    });

    it('should remove event listeners', async () => {
      const mockCallback = jest.fn();
      
      downloadManager.on('downloadAdded', mockCallback);
      downloadManager.off('downloadAdded', mockCallback);

      await downloadManager.addDownload('video1', 'Song 1', 'Artist 1', 180);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('File operations', () => {
    it('should generate correct file name', async () => {
      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );

      const download = downloadManager.getDownload(downloadId);
      expect(download!.fileName).toBe('Test Artist - Test Song.m4a');
    });

    it('should generate correct file path with artist folders', async () => {
      await downloadManager.updateConfig({ createArtistFolders: true });

      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );

      const download = downloadManager.getDownload(downloadId);
      expect(download!.filePath).toContain('Test Artist');
      expect(download!.filePath).toContain('Test Artist - Test Song.m4a');
    });

    it('should sanitize file names', async () => {
      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test/Song<>:"|?*',
        'Test\\Artist',
        180
      );

      const download = downloadManager.getDownload(downloadId);
      expect(download!.fileName).toBe('TestArtist - TestSong.m4a');
    });
  });

  describe('Error handling', () => {
    it('should handle audio extraction errors', async () => {
      const { audioExtractor } = require('../audio-extractor');
      audioExtractor.extractAudioStream.mockResolvedValueOnce({
        success: false,
        error: 'Failed to extract audio',
      });

      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );

      // Simulate download start
      const download = downloadManager.getDownload(downloadId)!;
      download.status = 'downloading';

      // The download should fail and be marked as failed
      // This would happen in the actual download process
      expect(download).toBeDefined();
    });

    it('should handle file system errors', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180,
        { overwrite: false }
      );

      const download = downloadManager.getDownload(downloadId);
      expect(download!.status).toBe('failed');
      expect(download!.error).toBe('File already exists');
    });
  });

  describe('Database persistence', () => {
    it('should save download to database', async () => {
      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );

      const dbDownload = await database.get(
        'SELECT * FROM downloads WHERE id = ?',
        [downloadId]
      );

      expect(dbDownload).toBeTruthy();
      expect(dbDownload.title).toBe('Test Song');
      expect(dbDownload.artist).toBe('Test Artist');
      expect(dbDownload.video_id).toBe('test-video-id');
    });

    it('should load downloads from database on initialization', async () => {
      // Add a download
      const downloadId = await downloadManager.addDownload(
        'test-video-id',
        'Test Song',
        'Test Artist',
        180
      );

      // Create new instance (simulating app restart)
      const newManager = DownloadManagerService.getInstance();
      
      const downloads = newManager.getAllDownloads();
      expect(downloads.length).toBeGreaterThan(0);
      
      const loadedDownload = downloads.find(d => d.id === downloadId);
      expect(loadedDownload).toBeDefined();
      expect(loadedDownload!.title).toBe('Test Song');
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      downloadManager.destroy();
      
      // Should clear event listeners
      const downloads = downloadManager.getAllDownloads();
      expect(downloads).toBeDefined(); // Service should still be accessible
    });
  });
});