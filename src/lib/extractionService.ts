// YouTube extraction service manager with caching and error handling

import { YouTubeExtractor, YouTubeInfo, YouTubeQuality, ExtractionOptions } from './youtube';
import { validateYouTubeUrl, extractVideoId } from './utils';

interface CacheEntry {
  data: YouTubeInfo;
  timestamp: number;
  expiresAt: number;
}

interface ExtractionResult {
  success: boolean;
  data?: YouTubeInfo;
  error?: string;
  cached?: boolean;
}

export class ExtractionService {
  private static instance: ExtractionService;
  private cache: Map<string, CacheEntry> = new Map();
  private extractor: YouTubeExtractor;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 100;

  private constructor() {
    this.extractor = YouTubeExtractor.getInstance();
    
    // Cleanup cache periodically
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  static getInstance(): ExtractionService {
    if (!ExtractionService.instance) {
      ExtractionService.instance = new ExtractionService();
    }
    return ExtractionService.instance;
  }

  async extractVideoInfo(url: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    try {
      // Validate URL
      if (!validateYouTubeUrl(url)) {
        return {
          success: false,
          error: 'Invalid YouTube URL format'
        };
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return {
          success: false,
          error: 'Could not extract video ID from URL'
        };
      }

      // Check cache first
      const cached = this.getCachedInfo(videoId);
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true
        };
      }

      // Extract from YouTube
      const info = await this.extractor.extractInfo(url, {
        ...options,
        timeout: options.timeout || 30000,
        maxDuration: options.maxDuration || 3600 // 1 hour max
      });

      // Cache the result
      this.cacheInfo(videoId, info);

      return {
        success: true,
        data: info,
        cached: false
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  async getStreamUrl(url: string, quality: string = 'best[height<=720]'): Promise<{ success: boolean; streamUrl?: string; error?: string }> {
    try {
      if (!validateYouTubeUrl(url)) {
        return {
          success: false,
          error: 'Invalid YouTube URL format'
        };
      }

      const streamUrl = await this.extractor.getStreamUrl(url, { quality });

      return {
        success: true,
        streamUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stream URL'
      };
    }
  }

  async downloadAudio(
    url: string,
    outputDir: string,
    filename: string,
    format: 'mp3' | 'mp4' = 'mp3'
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (!validateYouTubeUrl(url)) {
        return {
          success: false,
          error: 'Invalid YouTube URL format'
        };
      }

      // Sanitize filename
      const sanitizedFilename = this.sanitizeFilename(filename);

      const filePath = await this.extractor.downloadAudio(
        url,
        outputDir,
        sanitizedFilename,
        { format }
      );

      return {
        success: true,
        filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  async getVideoQualities(url: string): Promise<{ success: boolean; qualities?: YouTubeQuality[]; error?: string }> {
    try {
      if (!validateYouTubeUrl(url)) {
        return {
          success: false,
          error: 'Invalid YouTube URL format'
        };
      }

      const qualities = await this.extractor.getAvailableQualities(url);

      return {
        success: true,
        qualities
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get video qualities'
      };
    }
  }

  // Batch extraction for multiple URLs
  async extractMultiple(urls: string[], options: ExtractionOptions = {}): Promise<Map<string, ExtractionResult>> {
    const results = new Map<string, ExtractionResult>();
    
    // Process URLs with a delay to respect rate limits
    for (const url of urls) {
      const result = await this.extractVideoInfo(url, options);
      results.set(url, result);
      
      // Add delay between requests
      if (urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Cache management
  private getCachedInfo(videoId: string): YouTubeInfo | null {
    const entry = this.cache.get(videoId);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(videoId);
      return null;
    }

    return entry.data;
  }

  private cacheInfo(videoId: string, info: YouTubeInfo): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry = {
      data: info,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    };

    this.cache.set(videoId, entry);
  }

  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [videoId, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(videoId);
      }
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace invalid filename characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100); // Limit length
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Test with a known working video
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = await this.extractVideoInfo(testUrl, { timeout: 10000 });
      
      return {
        healthy: result.success
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  // Get service statistics
  getStats(): {
    cacheSize: number;
    activeExtractions: number;
    cacheHitRate?: number;
  } {
    return {
      cacheSize: this.cache.size,
      activeExtractions: this.extractor.getActiveExtractions().length
    };
  }

  // Cleanup resources
  cleanup(): void {
    this.extractor.cleanup();
    this.cache.clear();
  }
}