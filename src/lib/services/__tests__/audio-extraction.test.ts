/**
 * Tests for the audio extraction service
 * Note: These tests require yt-dlp to be installed and working
 */

import { audioExtractionService, AudioExtractionService } from '../audio-extraction';

// Mock yt-dlp for testing
jest.mock('youtube-dl-exec', () => {
  return jest.fn().mockImplementation((url: string, options: any) => {
    // Mock successful extraction
    if (options.dumpSingleJson) {
      return Promise.resolve({
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
        uploader: 'Rick Astley',
        duration: 212,
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        formats: [
          {
            format_id: '140',
            ext: 'm4a',
            acodec: 'mp4a.40.2',
            abr: 128,
            asr: 44100,
            audio_channels: 2,
            url: 'https://example.com/audio.m4a',
            filesize: 3400000,
            duration: 212
          },
          {
            format_id: '251',
            ext: 'webm',
            acodec: 'opus',
            abr: 160,
            asr: 48000,
            audio_channels: 2,
            url: 'https://example.com/audio.webm',
            filesize: 4200000,
            duration: 212
          }
        ]
      });
    }
    
    // Mock streaming URL extraction
    if (options.getUrl) {
      return Promise.resolve('https://example.com/stream.m4a');
    }
    
    return Promise.resolve('');
  });
});

describe('AudioExtractionService', () => {
  let service: AudioExtractionService;

  beforeEach(() => {
    service = AudioExtractionService.getInstance();
    service.clearCache();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('extractAudio', () => {
    it('should extract audio information successfully', async () => {
      const result = await service.extractAudio('dQw4w9WgXcQ');
      
      expect(result).toBeDefined();
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.title).toBe('Rick Astley - Never Gonna Give You Up (Official Video)');
      expect(result.artist).toBe('Rick Astley');
      expect(result.duration).toBe(212);
      expect(result.streams).toHaveLength(2);
      expect(result.bestStream).toBeDefined();
    });

    it('should throw error for invalid video ID', async () => {
      await expect(service.extractAudio('invalid-id')).rejects.toThrow('Invalid YouTube video ID format');
    });

    it('should cache extraction results', async () => {
      const result1 = await service.extractAudio('dQw4w9WgXcQ');
      const result2 = await service.extractAudio('dQw4w9WgXcQ');
      
      expect(result1).toEqual(result2);
      
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle different quality options', async () => {
      const result = await service.extractAudio('dQw4w9WgXcQ', {
        quality: '320',
        format: 'mp3',
        includeMetadata: true
      });
      
      expect(result).toBeDefined();
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('getStreamingUrl', () => {
    it('should get streaming URL successfully', async () => {
      const url = await service.getStreamingUrl('dQw4w9WgXcQ');
      
      expect(url).toBe('https://example.com/stream.m4a');
      expect(url).toMatch(/^https?:\/\//);
    });

    it('should throw error for invalid video ID', async () => {
      await expect(service.getStreamingUrl('invalid-id')).rejects.toThrow('Invalid YouTube video ID format');
    });

    it('should handle different quality options', async () => {
      const url = await service.getStreamingUrl('dQw4w9WgXcQ', '320');
      
      expect(url).toBe('https://example.com/stream.m4a');
    });
  });

  describe('getQualityOptions', () => {
    it('should get quality options successfully', async () => {
      const options = await service.getQualityOptions('dQw4w9WgXcQ');
      
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
    });

    it('should throw error for invalid video ID', async () => {
      await expect(service.getQualityOptions('invalid-id')).rejects.toThrow('Invalid YouTube video ID format');
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should clear cache successfully', async () => {
      // Add something to cache
      await service.extractAudio('dQw4w9WgXcQ');
      
      let stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      // Clear cache
      service.clearCache();
      
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      // Mock yt-dlp to throw an error
      const mockYtdl = require('youtube-dl-exec');
      mockYtdl.mockImplementationOnce(() => {
        throw new Error('Video unavailable');
      });

      await expect(service.extractAudio('dQw4w9WgXcQ')).rejects.toThrow();
    });
  });

  describe('format selection', () => {
    it('should select best stream based on options', async () => {
      const result = await service.extractAudio('dQw4w9WgXcQ', {
        quality: 'best',
        format: 'm4a'
      });
      
      expect(result.bestStream).toBeDefined();
      expect(result.bestStream.format).toBe('m4a');
    });

    it('should handle format preferences', async () => {
      const result = await service.extractAudio('dQw4w9WgXcQ', {
        quality: '128',
        format: 'opus'
      });
      
      expect(result.bestStream).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  // These tests would run against real YouTube videos
  // They should be run separately and may be skipped in CI
  
  describe.skip('Real YouTube extraction', () => {
    let service: AudioExtractionService;

    beforeAll(() => {
      service = AudioExtractionService.getInstance();
    });

    it('should extract from real YouTube video', async () => {
      // Use a known stable video for testing
      const result = await service.extractAudio('dQw4w9WgXcQ');
      
      expect(result).toBeDefined();
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.streams.length).toBeGreaterThan(0);
      expect(result.bestStream.url).toMatch(/^https?:\/\//);
    }, 30000); // 30 second timeout

    it('should get real streaming URL', async () => {
      const url = await service.getStreamingUrl('dQw4w9WgXcQ');
      
      expect(url).toMatch(/^https?:\/\//);
      
      // Test that the URL is accessible
      const response = await fetch(url, { method: 'HEAD' });
      expect(response.ok).toBe(true);
    }, 30000);
  });
});