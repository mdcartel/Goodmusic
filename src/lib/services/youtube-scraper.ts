import youtubedl from 'youtube-dl-exec';
import { SearchResult, SearchFilters } from '../store/types';

// Rate limiting and caching utilities
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
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
}

class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 30, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

export interface VideoInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  thumbnail: string;
  description: string;
  viewCount: number;
  likeCount?: number;
  uploadDate: Date;
  formats: AudioFormat[];
}

export interface AudioFormat {
  itag: number;
  url: string;
  mimeType: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
  quality: string;
}

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
  videos: SearchResult[];
}

export interface TrendingInfo {
  category: string;
  results: SearchResult[];
  lastUpdated: Date;
}

export class YouTubeScraperService {
  private static instance: YouTubeScraperService;
  private cache = new SimpleCache();
  private rateLimiter = new RateLimiter(30, 60000); // 30 requests per minute
  
  private constructor() {}
  
  public static getInstance(): YouTubeScraperService {
    if (!YouTubeScraperService.instance) {
      YouTubeScraperService.instance = new YouTubeScraperService();
    }
    return YouTubeScraperService.instance;
  }

  /**
   * Search for videos on YouTube using yt-dlp with enhanced error handling
   */
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = this.cache.get<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      // Build search URL with filters
      let searchUrl = `ytsearch50:${query}`;
      
      // Apply filters if provided
      if (filters?.duration) {
        switch (filters.duration) {
          case 'short':
            searchUrl += ' duration:<4:00';
            break;
          case 'medium':
            searchUrl += ' duration:4:00-20:00';
            break;
          case 'long':
            searchUrl += ' duration:>20:00';
            break;
        }
      }

      // Apply upload date filter
      if (filters?.uploadDate) {
        switch (filters.uploadDate) {
          case 'hour':
            searchUrl += ' upload_date:today';
            break;
          case 'today':
            searchUrl += ' upload_date:today';
            break;
          case 'week':
            searchUrl += ' upload_date:week';
            break;
          case 'month':
            searchUrl += ' upload_date:month';
            break;
          case 'year':
            searchUrl += ' upload_date:year';
            break;
        }
      }

      // Apply sort filter
      if (filters?.sortBy) {
        switch (filters.sortBy) {
          case 'date':
            searchUrl += ' sort:upload_date';
            break;
          case 'views':
            searchUrl += ' sort:view_count';
            break;
          case 'rating':
            searchUrl += ' sort:rating';
            break;
          // 'relevance' is default, no need to add anything
        }
      }

      const options = {
        dumpSingleJson: true,
        noWarnings: true,
        extractFlat: true,
        playlistEnd: 50,
        ignoreErrors: true,
      };

      const result = await this.executeWithFallback(searchUrl, options);
      
      if (!result || typeof result === 'string' || !result.entries) {
        return [];
      }

      const searchResults = result.entries
        .filter((entry: any) => entry && entry.id && entry.title)
        .map((entry: any) => this.mapToSearchResult(entry))
        .filter((result: SearchResult | null) => result !== null) as SearchResult[];

      // Cache the results
      this.cache.set(cacheKey, searchResults, 10 * 60 * 1000); // Cache for 10 minutes
      
      return searchResults;
        
    } catch (error) {
      console.error('Search error:', error);
      
      // Try fallback search with simpler query
      try {
        return await this.fallbackSearch(query);
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Get detailed information about a specific video with caching
   */
  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const cacheKey = `video:${videoId}`;
    
    // Check cache first
    const cached = this.cache.get<VideoInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      const options = {
        dumpSingleJson: true,
        noWarnings: true,
        extractFlat: false,
        ignoreErrors: true,
      };

      const result = await this.executeWithFallback(url, options);
      
      if (!result) {
        throw new Error('No video information found');
      }

      const videoInfo = this.mapToVideoInfo(result);
      
      // Cache the result
      this.cache.set(cacheKey, videoInfo, 30 * 60 * 1000); // Cache for 30 minutes
      
      return videoInfo;
      
    } catch (error) {
      console.error('Video info error:', error);
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get channel information with enhanced error handling
   */
  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    const cacheKey = `channel:${channelId}`;
    
    // Check cache first
    const cached = this.cache.get<ChannelInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      // Try different URL formats for channel
      const urls = [
        `https://www.youtube.com/channel/${channelId}`,
        `https://www.youtube.com/c/${channelId}`,
        `https://www.youtube.com/@${channelId}`,
      ];

      let result = null;
      let lastError = null;

      for (const url of urls) {
        try {
          const options = {
            dumpSingleJson: true,
            noWarnings: true,
            extractFlat: true,
            ignoreErrors: true,
          };

          result = await youtubedl(url, options);
          if (result) break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      
      if (!result) {
        throw lastError || new Error('No channel information found');
      }

      const channelInfo = this.mapToChannelInfo(result);
      
      // Cache the result
      this.cache.set(cacheKey, channelInfo, 60 * 60 * 1000); // Cache for 1 hour
      
      return channelInfo;
      
    } catch (error) {
      console.error('Channel info error:', error);
      throw new Error(`Failed to get channel info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get playlist information with enhanced parsing
   */
  async getPlaylistInfo(playlistId: string): Promise<PlaylistInfo> {
    const cacheKey = `playlist:${playlistId}`;
    
    // Check cache first
    const cached = this.cache.get<PlaylistInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      const url = `https://www.youtube.com/playlist?list=${playlistId}`;
      
      const options = {
        dumpSingleJson: true,
        noWarnings: true,
        extractFlat: true,
        ignoreErrors: true,
        playlistEnd: 100, // Get more videos from playlist
      };

      const result = await this.executeWithFallback(url, options);
      
      if (!result) {
        throw new Error('No playlist information found');
      }

      const playlistInfo = this.mapToPlaylistInfo(result);
      
      // Cache the result
      this.cache.set(cacheKey, playlistInfo, 30 * 60 * 1000); // Cache for 30 minutes
      
      return playlistInfo;
      
    } catch (error) {
      console.error('Playlist info error:', error);
      throw new Error(`Failed to get playlist info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get trending music videos with multiple fallback strategies
   */
  async getTrendingMusic(): Promise<SearchResult[]> {
    const cacheKey = 'trending:music';
    
    // Check cache first
    const cached = this.cache.get<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try multiple trending search strategies
      const strategies = [
        'trending music 2024',
        'popular music today',
        'top songs this week',
        'viral music',
        'new music 2024',
      ];

      for (const strategy of strategies) {
        try {
          const results = await this.search(strategy, { sortBy: 'views' });
          if (results.length > 0) {
            // Cache the results
            this.cache.set(cacheKey, results, 60 * 60 * 1000); // Cache for 1 hour
            return results;
          }
        } catch (error) {
          console.warn(`Trending strategy "${strategy}" failed:`, error);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('Trending music error:', error);
      return [];
    }
  }

  /**
   * Extract audio URL for streaming with quality options
   */
  async extractAudioUrl(videoId: string, quality: string = 'best'): Promise<string> {
    const cacheKey = `audio:${videoId}:${quality}`;
    
    // Check cache first (shorter TTL for audio URLs as they expire)
    const cached = this.cache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Build format selector based on quality preference
      let formatSelector = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio';
      
      if (quality !== 'best') {
        const qualityMap: { [key: string]: string } = {
          '128': 'bestaudio[abr<=128]',
          '192': 'bestaudio[abr<=192]',
          '320': 'bestaudio[abr<=320]',
        };
        
        if (qualityMap[quality]) {
          formatSelector = `${qualityMap[quality]}/bestaudio`;
        }
      }
      
      const options = {
        format: formatSelector,
        getUrl: true,
        noWarnings: true,
        ignoreErrors: true,
      };

      const result = await this.executeWithFallback(url, options);
      
      if (typeof result === 'string') {
        // Cache the URL for a shorter time (5 minutes) as they expire
        this.cache.set(cacheKey, result, 5 * 60 * 1000);
        return result;
      }
      
      throw new Error('No audio URL found');
      
    } catch (error) {
      console.error('Audio extraction error:', error);
      throw new Error(`Failed to extract audio URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    if (partialQuery.length < 2) return [];

    const cacheKey = `suggestions:${partialQuery}`;
    
    // Check cache first
    const cached = this.cache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use a simple search to get related terms
      const results = await this.search(partialQuery, { sortBy: 'relevance' });
      
      // Extract unique terms from titles
      const suggestions = new Set<string>();
      
      results.slice(0, 10).forEach(result => {
        const words = result.title.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 2 && word.includes(partialQuery.toLowerCase())) {
            suggestions.add(word);
          }
        });
      });

      const suggestionArray = Array.from(suggestions).slice(0, 8);
      
      // Cache suggestions for 1 hour
      this.cache.set(cacheKey, suggestionArray, 60 * 60 * 1000);
      
      return suggestionArray;
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  /**
   * Execute yt-dlp command with fallback mechanisms
   */
  private async executeWithFallback(url: string, options: any, retries: number = 3): Promise<any> {
    let lastError = null;

    for (let i = 0; i < retries; i++) {
      try {
        // Add random delay between retries to avoid rate limiting
        if (i > 0) {
          const delay = Math.random() * 2000 + 1000; // 1-3 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await youtubedl(url, {
          ...options,
          // Add user agent rotation to avoid detection
          userAgent: this.getRandomUserAgent(),
        });

        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed:`, error);
        
        // If it's a network error, wait longer before retry
        if (error instanceof Error && error.message.includes('network')) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Fallback search with simpler query
   */
  private async fallbackSearch(query: string): Promise<SearchResult[]> {
    // Try with a simpler search query
    const simpleQuery = query.split(' ').slice(0, 2).join(' '); // Take first 2 words
    
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      extractFlat: true,
      playlistEnd: 20, // Fewer results for fallback
      ignoreErrors: true,
    };

    const result = await youtubedl(`ytsearch20:${simpleQuery}`, options);
    
    if (!result || typeof result === 'string' || !result.entries) {
      return [];
    }

    return result.entries
      .filter((entry: any) => entry && entry.id && entry.title)
      .map((entry: any) => this.mapToSearchResult(entry))
      .filter((result: SearchResult | null) => result !== null) as SearchResult[];
  }

  /**
   * Get random user agent to avoid detection
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
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
  }

  // Helper methods for mapping data
  private mapToSearchResult(entry: any): SearchResult | null {
    try {
      if (!entry.id || !entry.title) {
        return null;
      }

      // Clean up title and extract artist info
      let title = entry.title;
      let artist = entry.uploader || entry.channel || 'Unknown Artist';

      // Try to extract artist from title if it contains common separators
      const separators = [' - ', ' | ', ' by ', ' ft. ', ' feat. '];
      for (const sep of separators) {
        if (title.includes(sep)) {
          const parts = title.split(sep);
          if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(sep).trim();
            break;
          }
        }
      }

      return {
        id: entry.id,
        title: title,
        artist: artist,
        duration: entry.duration || 0,
        thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url || '',
        viewCount: entry.view_count || 0,
        uploadDate: entry.upload_date ? new Date(entry.upload_date) : new Date(),
        youtubeUrl: `https://www.youtube.com/watch?v=${entry.id}`,
      };
    } catch (error) {
      console.error('Error mapping search result:', error);
      return null;
    }
  }

  private mapToVideoInfo(data: any): VideoInfo {
    return {
      id: data.id,
      title: data.title || 'Unknown Title',
      artist: data.uploader || data.channel || 'Unknown Artist',
      album: data.album || data.playlist_title,
      duration: data.duration || 0,
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || '',
      description: data.description || '',
      viewCount: data.view_count || 0,
      likeCount: data.like_count,
      uploadDate: data.upload_date ? new Date(data.upload_date) : new Date(),
      formats: (data.formats || [])
        .filter((format: any) => format.acodec && format.acodec !== 'none')
        .map((format: any) => ({
          itag: format.format_id,
          url: format.url,
          mimeType: format.ext,
          bitrate: format.abr || 0,
          sampleRate: format.asr || 0,
          channels: format.audio_channels || 2,
          quality: format.quality || 'unknown',
        })),
    };
  }

  private mapToChannelInfo(data: any): ChannelInfo {
    return {
      id: data.id || data.channel_id,
      name: data.title || data.uploader || data.channel || 'Unknown Channel',
      description: data.description || '',
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || '',
      subscriberCount: data.subscriber_count || 0,
      videoCount: data.playlist_count || data.video_count || 0,
    };
  }

  private mapToPlaylistInfo(data: any): PlaylistInfo {
    return {
      id: data.id,
      title: data.title || 'Unknown Playlist',
      description: data.description || '',
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || '',
      videoCount: data.playlist_count || (data.entries ? data.entries.length : 0),
      videos: (data.entries || [])
        .map((entry: any) => this.mapToSearchResult(entry))
        .filter((result: SearchResult | null) => result !== null) as SearchResult[],
    };
  }
}

// Export singleton instance
export const youtubeScraperService = YouTubeScraperService.getInstance();