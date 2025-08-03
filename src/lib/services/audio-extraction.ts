import youtubedl from 'youtube-dl-exec';
import { validateVideoId, getThumbnailUrl } from '../utils/youtube';

// Audio quality and format types
export type AudioQuality = '128' | '192' | '320' | 'best';
export type AudioFormat = 'mp3' | 'm4a' | 'opus' | 'webm';

export interface AudioExtractionOptions {
  quality: AudioQuality;
  format: AudioFormat;
  includeMetadata?: boolean;
  maxRetries?: number;
}

export interface AudioStreamInfo {
  url: string;
  format: AudioFormat;
  quality: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
  duration: number;
  fileSize?: number;
  headers?: Record<string, string>;
  expiresAt: Date;
}

export interface AudioExtractionResult {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  streams: AudioStreamInfo[];
  bestStream: AudioStreamInfo;
  extractedAt: Date;
}

// Cache interface for audio extractions
interface CacheEntry {
  data: AudioExtractionResult;
  timestamp: number;
  ttl: number;
}

class AudioExtractionCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

  set(key: string, data: AudioExtractionResult, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): AudioExtractionResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export class AudioExtractionService {
  private static instance: AudioExtractionService;
  private cache = new AudioExtractionCache();
  private extractionQueue = new Map<string, Promise<AudioExtractionResult>>();

  private constructor() {
    // Clean up cache every 10 minutes
    setInterval(() => this.cache.cleanup(), 10 * 60 * 1000);
  }

  public static getInstance(): AudioExtractionService {
    if (!AudioExtractionService.instance) {
      AudioExtractionService.instance = new AudioExtractionService();
    }
    return AudioExtractionService.instance;
  }

  /**
   * Extract audio streams from a YouTube video
   */
  async extractAudio(
    videoId: string,
    options: AudioExtractionOptions = {
      quality: 'best',
      format: 'm4a',
      includeMetadata: true,
      maxRetries: 3,
    }
  ): Promise<AudioExtractionResult> {
    // Validate video ID
    if (!validateVideoId(videoId)) {
      throw new Error('Invalid YouTube video ID format');
    }

    const cacheKey = `${videoId}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if extraction is already in progress
    const existingPromise = this.extractionQueue.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Start new extraction
    const extractionPromise = this.performExtraction(videoId, options);
    this.extractionQueue.set(cacheKey, extractionPromise);

    try {
      const result = await extractionPromise;
      
      // Cache the result
      this.cache.set(cacheKey, result, 30 * 60 * 1000); // 30 minutes
      
      return result;
    } finally {
      // Remove from queue
      this.extractionQueue.delete(cacheKey);
    }
  }

  /**
   * Get streaming URL for immediate playback
   */
  async getStreamingUrl(
    videoId: string,
    quality: AudioQuality = 'best'
  ): Promise<string> {
    // Validate video ID
    if (!validateVideoId(videoId)) {
      throw new Error('Invalid YouTube video ID format');
    }

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Build format selector based on quality
      let formatSelector = this.buildFormatSelector(quality, 'm4a');
      
      const options = {
        format: formatSelector,
        getUrl: true,
        noWarnings: true,
        ignoreErrors: true,
        // Add headers for better compatibility
        addHeader: [
          'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept:audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.8',
        ],
      };

      const result = await this.executeWithRetry(url, options, 3);
      
      if (typeof result === 'string' && result.startsWith('http')) {
        return result;
      }
      
      throw new Error('No streaming URL found');
      
    } catch (error) {
      console.error('Streaming URL extraction error:', error);
      throw new Error(`Failed to get streaming URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple quality options for a video
   */
  async getQualityOptions(videoId: string): Promise<AudioStreamInfo[]> {
    // Validate video ID
    if (!validateVideoId(videoId)) {
      throw new Error('Invalid YouTube video ID format');
    }

    const qualities: AudioQuality[] = ['128', '192', '320', 'best'];
    const formats: AudioFormat[] = ['m4a', 'opus', 'webm'];
    
    const streams: AudioStreamInfo[] = [];
    
    for (const quality of qualities) {
      for (const format of formats) {
        try {
          const result = await this.extractAudio(videoId, { quality, format });
          streams.push(...result.streams);
        } catch (error) {
          console.warn(`Failed to extract ${quality}/${format}:`, error);
        }
      }
    }
    
    // Remove duplicates and sort by quality
    const uniqueStreams = streams.filter((stream, index, self) => 
      index === self.findIndex(s => s.url === stream.url)
    );
    
    return uniqueStreams.sort((a, b) => b.bitrate - a.bitrate);
  }

  /**
   * Perform the actual audio extraction
   */
  private async performExtraction(
    videoId: string,
    options: AudioExtractionOptions
  ): Promise<AudioExtractionResult> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    const ytdlOptions = {
      dumpSingleJson: true,
      noWarnings: true,
      extractFlat: false,
      ignoreErrors: true,
      // Get all available formats
      listFormats: false,
      // Add metadata extraction
      writeInfoJson: options.includeMetadata,
      // Add headers for better success rate
      addHeader: [
        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language:en-US,en;q=0.9',
      ],
    };

    const result = await this.executeWithRetry(url, ytdlOptions, options.maxRetries || 3);
    
    if (!result || typeof result === 'string') {
      throw new Error('Failed to extract video information');
    }

    return this.parseExtractionResult(result, videoId, options);
  }

  /**
   * Parse yt-dlp result into our format
   */
  private parseExtractionResult(
    data: any,
    videoId: string,
    options: AudioExtractionOptions
  ): AudioExtractionResult {
    const audioFormats = (data.formats || [])
      .filter((format: any) => format.acodec && format.acodec !== 'none')
      .map((format: any) => this.parseAudioFormat(format));

    if (audioFormats.length === 0) {
      throw new Error('No audio formats found');
    }

    // Find the best stream based on options
    const bestStream = this.selectBestStream(audioFormats, options);

    return {
      videoId,
      title: data.title || 'Unknown Title',
      artist: data.uploader || data.channel || 'Unknown Artist',
      duration: data.duration || 0,
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || getThumbnailUrl(videoId, 'medium'),
      streams: audioFormats,
      bestStream,
      extractedAt: new Date(),
    };
  }

  /**
   * Parse individual audio format
   */
  private parseAudioFormat(format: any): AudioStreamInfo {
    const expiresIn = 6 * 60 * 60 * 1000; // 6 hours
    
    return {
      url: format.url,
      format: this.detectAudioFormat(format.ext || format.container),
      quality: this.mapQuality(format.abr || format.tbr || 0),
      bitrate: format.abr || format.tbr || 0,
      sampleRate: format.asr || 44100,
      channels: format.audio_channels || 2,
      duration: format.duration || 0,
      fileSize: format.filesize || format.filesize_approx,
      headers: this.generateStreamHeaders(),
      expiresAt: new Date(Date.now() + expiresIn),
    };
  }

  /**
   * Select the best stream based on options
   */
  private selectBestStream(
    streams: AudioStreamInfo[],
    options: AudioExtractionOptions
  ): AudioStreamInfo {
    // Filter by format preference
    let candidates = streams;
    
    if (options.format !== 'webm') {
      const formatFiltered = streams.filter(s => s.format === options.format);
      if (formatFiltered.length > 0) {
        candidates = formatFiltered;
      }
    }

    // Filter by quality preference
    if (options.quality !== 'best') {
      const targetBitrate = parseInt(options.quality);
      candidates.sort((a, b) => 
        Math.abs(a.bitrate - targetBitrate) - Math.abs(b.bitrate - targetBitrate)
      );
    } else {
      // Sort by bitrate descending for 'best'
      candidates.sort((a, b) => b.bitrate - a.bitrate);
    }

    return candidates[0];
  }

  /**
   * Build format selector string for yt-dlp
   */
  private buildFormatSelector(quality: AudioQuality, format: AudioFormat): string {
    const formatMap: Record<AudioFormat, string> = {
      mp3: 'mp3',
      m4a: 'm4a',
      opus: 'opus',
      webm: 'webm',
    };

    const baseFormat = `bestaudio[ext=${formatMap[format]}]`;
    
    if (quality === 'best') {
      return `${baseFormat}/bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio`;
    }

    const targetBitrate = parseInt(quality);
    return `${baseFormat}[abr<=${targetBitrate}]/${baseFormat}/bestaudio[abr<=${targetBitrate}]/bestaudio`;
  }

  /**
   * Execute yt-dlp with retry logic
   */
  private async executeWithRetry(
    url: string,
    options: any,
    maxRetries: number
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add random delay between retries
        if (attempt > 1) {
          const delay = Math.random() * 2000 + 1000; // 1-3 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await youtubedl(url, {
          ...options,
          // Rotate user agents
          userAgent: this.getRandomUserAgent(),
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Audio extraction attempt ${attempt} failed:`, error);
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('Video unavailable') || 
              error.message.includes('Private video')) {
            throw error;
          }
        }
      }
    }

    throw lastError || new Error('Audio extraction failed after all retries');
  }

  /**
   * Detect audio format from extension
   */
  private detectAudioFormat(ext: string): AudioFormat {
    const extension = ext?.toLowerCase() || '';
    
    if (extension.includes('mp3')) return 'mp3';
    if (extension.includes('m4a') || extension.includes('mp4')) return 'm4a';
    if (extension.includes('opus')) return 'opus';
    if (extension.includes('webm')) return 'webm';
    
    return 'm4a'; // Default fallback
  }

  /**
   * Map bitrate to quality string
   */
  private mapQuality(bitrate: number): string {
    if (bitrate >= 300) return 'high';
    if (bitrate >= 192) return 'medium';
    if (bitrate >= 128) return 'standard';
    return 'low';
  }

  /**
   * Generate headers for streaming
   */
  private generateStreamHeaders(): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  /**
   * Get random user agent for requests
   */
  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Clear all cached extractions
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache['cache'].size,
      entries: Array.from(this.cache['cache'].keys()),
    };
  }
}

// Export singleton instance
export const audioExtractionService = AudioExtractionService.getInstance();