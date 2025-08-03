import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { metadataExtractor, MetadataExtractorService } from '../metadata-extractor';
import { database } from '../../database';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs operations
jest.mock('fs/promises');
jest.mock('fs');

// Mock youtube-dl-exec
jest.mock('youtube-dl-exec', () => {
  return jest.fn().mockResolvedValue({
    id: 'test-video-id',
    title: 'Test Song - Test Artist',
    uploader: 'Test Channel',
    duration: 180,
    upload_date: '20230101',
    view_count: 1000000,
    like_count: 50000,
    description: 'Test description',
    categories: ['Music'],
    tags: ['music', 'test', 'song'],
    thumbnails: [
      {
        url: 'https://img.youtube.com/vi/test-video-id/maxresdefault.jpg',
        width: 1280,
        height: 720
      }
    ]
  });
});

// Mock fetch for thumbnail downloads
global.fetch = jest.fn();

describe('MetadataExtractorService', () => {
  beforeAll(async () => {
    // Initialize database for testing
    await database.initialize();
  });

  afterAll(async () => {
    // Clean up
    await database.close();
  });

  beforeEach(async () => {
    // Clear metadata before each test
    await database.run('DELETE FROM metadata');
    await database.run('DELETE FROM thumbnails');
    jest.clearAllMocks();
  });

  describe('Service initialization', () => {
    it('should be a singleton instance', () => {
      const instance1 = metadataExtractor;
      const instance2 = MetadataExtractorService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should have all required methods', () => {
      expect(typeof metadataExtractor.extractMetadata).toBe('function');
      expect(typeof metadataExtractor.extractBatchMetadata).toBe('function');
      expect(typeof metadataExtractor.downloadThumbnail).toBe('function');
      expect(typeof metadataExtractor.embedMetadata).toBe('function');
      expect(typeof metadataExtractor.editMetadata).toBe('function');
      expect(typeof metadataExtractor.getMetadata).toBe('function');
      expect(typeof metadataExtractor.searchMetadata).toBe('function');
    });
  });

  describe('Metadata extraction', () => {
    it('should extract metadata from video ID', async () => {
      const metadata = await metadataExtractor.extractMetadata('test-video-id');
      
      expect(metadata).toBeDefined();
      expect(metadata.videoId).toBe('test-video-id');
      expect(metadata.title).toBe('Test Song');
      expect(metadata.artist).toBe('Test Artist');
      expect(metadata.duration).toBe(180);
      expect(metadata.year).toBe(2023);
      expect(metadata.viewCount).toBe(1000000);
      expect(metadata.likeCount).toBe(50000);
      expect(metadata.tags).toContain('music');
    });

    it('should extract metadata with options', async () => {
      const options = {
        includeThumbnail: true,
        thumbnailQuality: 'high' as const,
        includeUploadInfo: true,
        includeStatistics: true,
      };

      const metadata = await metadataExtractor.extractMetadata('test-video-id', options);
      
      expect(metadata).toBeDefined();
      expect(metadata.uploader).toBe('Test Channel');
      expect(metadata.uploadDate).toBeInstanceOf(Date);
      expect(metadata.thumbnail).toBeTruthy();
    });

    it('should use cached metadata when available and fresh', async () => {
      // First extraction
      const metadata1 = await metadataExtractor.extractMetadata('test-video-id');
      
      // Second extraction should use cache
      const metadata2 = await metadataExtractor.extractMetadata('test-video-id');
      
      expect(metadata1.id).toBe(metadata2.id);
      expect(metadata1.extractedAt).toEqual(metadata2.extractedAt);
    });

    it('should handle extraction errors gracefully', async () => {
      const youtubedl = require('youtube-dl-exec');
      youtubedl.mockRejectedValueOnce(new Error('Video not found'));

      await expect(
        metadataExtractor.extractMetadata('invalid-video-id')
      ).rejects.toThrow('Video not found');
    });
  });

  describe('Batch metadata extraction', () => {
    it('should extract metadata for multiple videos', async () => {
      const videoIds = ['video1', 'video2', 'video3'];
      
      const result = await metadataExtractor.extractBatchMetadata(videoIds);
      
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      
      result.successful.forEach((metadata, index) => {
        expect(metadata.videoId).toBe(videoIds[index]);
      });
    });

    it('should handle partial failures in batch extraction', async () => {
      const youtubedl = require('youtube-dl-exec');
      youtubedl
        .mockResolvedValueOnce({ id: 'video1', title: 'Song 1', duration: 180 })
        .mockRejectedValueOnce(new Error('Video not found'))
        .mockResolvedValueOnce({ id: 'video3', title: 'Song 3', duration: 200 });

      const videoIds = ['video1', 'video2', 'video3'];
      const result = await metadataExtractor.extractBatchMetadata(videoIds);
      
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].videoId).toBe('video2');
    });

    it('should call progress callback during batch extraction', async () => {
      const progressCallback = jest.fn();
      const videoIds = ['video1', 'video2'];
      
      await metadataExtractor.extractBatchMetadata(
        videoIds,
        {},
        { progressCallback }
      );
      
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 2,
          completed: expect.any(Number),
          percentage: expect.any(Number),
        })
      );
    });

    it('should skip existing metadata when configured', async () => {
      // First, extract metadata for one video
      await metadataExtractor.extractMetadata('video1');
      
      const videoIds = ['video1', 'video2'];
      const result = await metadataExtractor.extractBatchMetadata(
        videoIds,
        {},
        { skipExisting: true }
      );
      
      // Should only extract metadata for video2
      expect(result.successful).toHaveLength(1);
      expect(result.successful[0].videoId).toBe('video2');
    });
  });

  describe('Thumbnail handling', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('image/jpeg'),
        },
        body: {
          pipe: jest.fn(),
        },
      });

      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024000,
      });

      (existsSync as jest.Mock).mockReturnValue(false);
    });

    it('should download thumbnail', async () => {
      const thumbnailInfo = await metadataExtractor.downloadThumbnail(
        'test-video-id',
        'https://img.youtube.com/vi/test-video-id/maxresdefault.jpg',
        'high'
      );
      
      expect(thumbnailInfo).toBeDefined();
      expect(thumbnailInfo!.videoId).toBe('test-video-id');
      expect(thumbnailInfo!.quality).toBe('high');
      expect(thumbnailInfo!.format).toBe('jpg');
      expect(thumbnailInfo!.width).toBe(480);
      expect(thumbnailInfo!.height).toBe(360);
    });

    it('should use cached thumbnail when available', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      
      // First download
      const thumbnail1 = await metadataExtractor.downloadThumbnail(
        'test-video-id',
        'https://img.youtube.com/vi/test-video-id/maxresdefault.jpg',
        'high'
      );
      
      // Second download should use cache
      const thumbnail2 = await metadataExtractor.downloadThumbnail(
        'test-video-id',
        'https://img.youtube.com/vi/test-video-id/maxresdefault.jpg',
        'high'
      );
      
      expect(thumbnail1).toBeDefined();
      expect(thumbnail2).toBeDefined();
    });

    it('should handle thumbnail download errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const thumbnailInfo = await metadataExtractor.downloadThumbnail(
        'test-video-id',
        'https://invalid-url.com/thumbnail.jpg',
        'high'
      );
      
      expect(thumbnailInfo).toBeNull();
    });
  });

  describe('Metadata embedding', () => {
    beforeEach(() => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should embed metadata into audio file', async () => {
      const metadata = await metadataExtractor.extractMetadata('test-video-id');
      
      const success = await metadataExtractor.embedMetadata(
        '/path/to/audio.m4a',
        metadata
      );
      
      expect(success).toBe(true);
    });

    it('should create backup when preserveOriginal is true', async () => {
      const metadata = await metadataExtractor.extractMetadata('test-video-id');
      
      await metadataExtractor.embedMetadata(
        '/path/to/audio.m4a',
        metadata,
        { preserveOriginal: true }
      );
      
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/path/to/audio.m4a',
        '/path/to/audio.m4a.backup'
      );
    });

    it('should handle embedding errors', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      
      const metadata = await metadataExtractor.extractMetadata('test-video-id');
      
      const success = await metadataExtractor.embedMetadata(
        '/nonexistent/audio.m4a',
        metadata
      );
      
      expect(success).toBe(false);
    });
  });

  describe('Metadata editing', () => {
    it('should edit existing metadata', async () => {
      const originalMetadata = await metadataExtractor.extractMetadata('test-video-id');
      
      const updates = {
        title: 'Updated Title',
        artist: 'Updated Artist',
        genre: 'Rock',
      };
      
      const updatedMetadata = await metadataExtractor.editMetadata(
        originalMetadata.id,
        updates
      );
      
      expect(updatedMetadata).toBeDefined();
      expect(updatedMetadata!.title).toBe('Updated Title');
      expect(updatedMetadata!.artist).toBe('Updated Artist');
      expect(updatedMetadata!.genre).toBe('Rock');
      expect(updatedMetadata!.id).toBe(originalMetadata.id);
    });

    it('should return null for non-existent metadata', async () => {
      const result = await metadataExtractor.editMetadata(
        'non-existent-id',
        { title: 'New Title' }
      );
      
      expect(result).toBeNull();
    });
  });

  describe('Data access methods', () => {
    beforeEach(async () => {
      // Create test metadata
      await metadataExtractor.extractMetadata('video1');
      await metadataExtractor.extractMetadata('video2');
    });

    it('should get metadata by video ID', async () => {
      const metadata = await metadataExtractor.getMetadata('video1');
      
      expect(metadata).toBeDefined();
      expect(metadata!.videoId).toBe('video1');
    });

    it('should get metadata by ID', async () => {
      const allMetadata = await metadataExtractor.getAllMetadata();
      const firstMetadata = allMetadata[0];
      
      const metadata = await metadataExtractor.getMetadataById(firstMetadata.id);
      
      expect(metadata).toBeDefined();
      expect(metadata!.id).toBe(firstMetadata.id);
    });

    it('should get all metadata', async () => {
      const allMetadata = await metadataExtractor.getAllMetadata();
      
      expect(allMetadata).toHaveLength(2);
      expect(allMetadata[0].videoId).toBe('video2'); // Most recent first
      expect(allMetadata[1].videoId).toBe('video1');
    });

    it('should search metadata', async () => {
      const results = await metadataExtractor.searchMetadata('Test');
      
      expect(results).toHaveLength(2);
      results.forEach(metadata => {
        expect(
          metadata.title.includes('Test') ||
          metadata.artist.includes('Test')
        ).toBe(true);
      });
    });

    it('should return empty array for no search results', async () => {
      const results = await metadataExtractor.searchMetadata('NonExistent');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Title and artist extraction', () => {
    it('should extract artist from title with dash separator', async () => {
      const youtubedl = require('youtube-dl-exec');
      youtubedl.mockResolvedValueOnce({
        id: 'test-video',
        title: 'Artist Name - Song Title',
        uploader: 'Channel Name',
        duration: 180,
      });

      const metadata = await metadataExtractor.extractMetadata('test-video');
      
      expect(metadata.artist).toBe('Artist Name');
      expect(metadata.title).toBe('Song Title');
    });

    it('should clean title from common YouTube patterns', async () => {
      const youtubedl = require('youtube-dl-exec');
      youtubedl.mockResolvedValueOnce({
        id: 'test-video',
        title: 'Song Title [Official Video] (Official Music Video) - YouTube',
        uploader: 'Artist Name',
        duration: 180,
      });

      const metadata = await metadataExtractor.extractMetadata('test-video');
      
      expect(metadata.title).toBe('Song Title');
    });

    it('should extract genre from categories and tags', async () => {
      const youtubedl = require('youtube-dl-exec');
      youtubedl.mockResolvedValueOnce({
        id: 'test-video',
        title: 'Test Song',
        uploader: 'Test Artist',
        duration: 180,
        categories: ['Music'],
        tags: ['rock', 'music', 'guitar'],
      });

      const metadata = await metadataExtractor.extractMetadata('test-video');
      
      expect(metadata.genre).toBe('Rock');
    });

    it('should extract year from upload date', async () => {
      const youtubedl = require('youtube-dl-exec');
      youtubedl.mockResolvedValueOnce({
        id: 'test-video',
        title: 'Test Song',
        uploader: 'Test Artist',
        duration: 180,
        upload_date: '20220315',
      });

      const metadata = await metadataExtractor.extractMetadata('test-video');
      
      expect(metadata.year).toBe(2022);
    });
  });

  describe('Database persistence', () => {
    it('should save metadata to database', async () => {
      const metadata = await metadataExtractor.extractMetadata('test-video-id');
      
      const dbMetadata = await database.get(
        'SELECT * FROM metadata WHERE video_id = ?',
        ['test-video-id']
      );
      
      expect(dbMetadata).toBeTruthy();
      expect(dbMetadata.title).toBe(metadata.title);
      expect(dbMetadata.artist).toBe(metadata.artist);
    });

    it('should save thumbnail info to database', async () => {
      const thumbnailInfo = await metadataExtractor.downloadThumbnail(
        'test-video-id',
        'https://img.youtube.com/vi/test-video-id/maxresdefault.jpg',
        'high'
      );
      
      if (thumbnailInfo) {
        const dbThumbnail = await database.get(
          'SELECT * FROM thumbnails WHERE video_id = ? AND quality = ?',
          ['test-video-id', 'high']
        );
        
        expect(dbThumbnail).toBeTruthy();
        expect(dbThumbnail.video_id).toBe('test-video-id');
        expect(dbThumbnail.quality).toBe('high');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalRun = database.run;
      database.run = jest.fn().mockRejectedValue(new Error('Database error'));

      // Should not throw, but log error
      const metadata = await metadataExtractor.extractMetadata('test-video-id');
      expect(metadata).toBeDefined();

      // Restore original method
      database.run = originalRun;
    });

    it('should handle network errors in thumbnail download', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const thumbnailInfo = await metadataExtractor.downloadThumbnail(
        'test-video-id',
        'https://invalid-url.com/thumbnail.jpg',
        'high'
      );
      
      expect(thumbnailInfo).toBeNull();
    });
  });
});