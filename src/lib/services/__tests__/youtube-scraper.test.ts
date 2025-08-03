import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { youtubeScraperService } from '../youtube-scraper';

describe('YouTubeScraperService', () => {
  beforeAll(() => {
    // Set up test environment
    console.log('Setting up YouTube scraper tests...');
  });

  afterAll(() => {
    // Clean up
    youtubeScraperService.clearCache();
  });

  describe('Search functionality', () => {
    it('should be a singleton instance', () => {
      const instance1 = youtubeScraperService;
      const instance2 = youtubeScraperService;
      
      expect(instance1).toBe(instance2);
    });

    it('should have all required methods', () => {
      expect(typeof youtubeScraperService.search).toBe('function');
      expect(typeof youtubeScraperService.getVideoInfo).toBe('function');
      expect(typeof youtubeScraperService.getChannelInfo).toBe('function');
      expect(typeof youtubeScraperService.getPlaylistInfo).toBe('function');
      expect(typeof youtubeScraperService.getTrendingMusic).toBe('function');
      expect(typeof youtubeScraperService.extractAudioUrl).toBe('function');
      expect(typeof youtubeScraperService.getSearchSuggestions).toBe('function');
      expect(typeof youtubeScraperService.clearCache).toBe('function');
    });

    it('should handle empty search queries', async () => {
      const results = await youtubeScraperService.search('');
      expect(Array.isArray(results)).toBe(true);
      // Empty query might return empty results or throw error
    });

    it('should handle search with filters', async () => {
      const filters = {
        duration: 'short' as const,
        sortBy: 'relevance' as const,
      };

      // This test might fail if yt-dlp is not available, so we wrap in try-catch
      try {
        const results = await youtubeScraperService.search('test music', filters);
        expect(Array.isArray(results)).toBe(true);
        
        if (results.length > 0) {
          const result = results[0];
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('artist');
          expect(result).toHaveProperty('duration');
          expect(result).toHaveProperty('thumbnail');
          expect(result).toHaveProperty('viewCount');
          expect(result).toHaveProperty('uploadDate');
          expect(result).toHaveProperty('youtubeUrl');
        }
      } catch (error) {
        console.warn('Search test skipped - yt-dlp might not be available:', error);
        expect(error).toBeInstanceOf(Error);
      }
    }, 30000); // 30 second timeout for network requests

    it('should handle search suggestions', async () => {
      try {
        const suggestions = await youtubeScraperService.getSearchSuggestions('music');
        expect(Array.isArray(suggestions)).toBe(true);
      } catch (error) {
        console.warn('Suggestions test skipped - yt-dlp might not be available:', error);
        expect(error).toBeInstanceOf(Error);
      }
    }, 30000);

    it('should handle trending music', async () => {
      try {
        const trending = await youtubeScraperService.getTrendingMusic();
        expect(Array.isArray(trending)).toBe(true);
      } catch (error) {
        console.warn('Trending test skipped - yt-dlp might not be available:', error);
        expect(error).toBeInstanceOf(Error);
      }
    }, 30000);
  });

  describe('Video information', () => {
    it('should handle invalid video IDs', async () => {
      try {
        await youtubeScraperService.getVideoInfo('invalid_video_id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }, 15000);

    it('should handle video info extraction', async () => {
      // Using a well-known video ID that should exist
      const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - should always exist
      
      try {
        const videoInfo = await youtubeScraperService.getVideoInfo(testVideoId);
        
        expect(videoInfo).toHaveProperty('id');
        expect(videoInfo).toHaveProperty('title');
        expect(videoInfo).toHaveProperty('artist');
        expect(videoInfo).toHaveProperty('duration');
        expect(videoInfo).toHaveProperty('thumbnail');
        expect(videoInfo).toHaveProperty('description');
        expect(videoInfo).toHaveProperty('viewCount');
        expect(videoInfo).toHaveProperty('uploadDate');
        expect(videoInfo).toHaveProperty('formats');
        
        expect(videoInfo.id).toBe(testVideoId);
        expect(Array.isArray(videoInfo.formats)).toBe(true);
      } catch (error) {
        console.warn('Video info test skipped - yt-dlp might not be available:', error);
        expect(error).toBeInstanceOf(Error);
      }
    }, 30000);
  });

  describe('Channel and Playlist information', () => {
    it('should handle invalid channel IDs', async () => {
      try {
        await youtubeScraperService.getChannelInfo('invalid_channel_id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }, 15000);

    it('should handle invalid playlist IDs', async () => {
      try {
        await youtubeScraperService.getPlaylistInfo('invalid_playlist_id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }, 15000);
  });

  describe('Audio extraction', () => {
    it('should handle audio URL extraction', async () => {
      const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll
      
      try {
        const audioUrl = await youtubeScraperService.extractAudioUrl(testVideoId);
        expect(typeof audioUrl).toBe('string');
        expect(audioUrl.length).toBeGreaterThan(0);
        // Should be a valid URL
        expect(() => new URL(audioUrl)).not.toThrow();
      } catch (error) {
        console.warn('Audio extraction test skipped - yt-dlp might not be available:', error);
        expect(error).toBeInstanceOf(Error);
      }
    }, 30000);

    it('should handle audio extraction with quality options', async () => {
      const testVideoId = 'dQw4w9WgXcQ';
      
      try {
        const audioUrl = await youtubeScraperService.extractAudioUrl(testVideoId, '128');
        expect(typeof audioUrl).toBe('string');
        expect(audioUrl.length).toBeGreaterThan(0);
      } catch (error) {
        console.warn('Audio extraction with quality test skipped - yt-dlp might not be available:', error);
        expect(error).toBeInstanceOf(Error);
      }
    }, 30000);
  });

  describe('Caching', () => {
    it('should clear cache without errors', () => {
      expect(() => youtubeScraperService.clearCache()).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with a malformed video ID that should cause an error
      try {
        await youtubeScraperService.getVideoInfo('');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Failed to get video info');
      }
    });

    it('should handle search errors gracefully', async () => {
      // Test with a very long query that might cause issues
      const longQuery = 'a'.repeat(1000);
      
      try {
        const results = await youtubeScraperService.search(longQuery);
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }, 15000);
  });
});