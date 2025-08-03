import { Channel, ChannelVideo, ChannelPlaylist } from '../../types/channel';
import { extractVideoId, validateVideoId } from '../utils/youtube';

export interface ChannelScrapingResult {
  channel: Partial<Channel>;
  videos: Partial<ChannelVideo>[];
  playlists: Partial<ChannelPlaylist>[];
  success: boolean;
  error?: string;
}

export class YouTubeChannelScraper {
  private static instance: YouTubeChannelScraper;
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  private constructor() {}

  public static getInstance(): YouTubeChannelScraper {
    if (!YouTubeChannelScraper.instance) {
      YouTubeChannelScraper.instance = new YouTubeChannelScraper();
    }
    return YouTubeChannelScraper.instance;
  }

  /**
   * Scrape channel information from YouTube
   */
  async scrapeChannel(channelUrl: string): Promise<ChannelScrapingResult> {
    try {
      const channelId = this.extractChannelId(channelUrl);
      if (!channelId) {
        return {
          channel: {},
          videos: [],
          playlists: [],
          success: false,
          error: 'Invalid channel URL'
        };
      }

      // Construct channel URL
      const url = this.buildChannelUrl(channelId);
      
      // Fetch channel page
      const html = await this.fetchPage(url);
      
      // Parse channel information
      const channel = this.parseChannelInfo(html, channelId);
      
      // Parse videos
      const videos = this.parseChannelVideos(html, channelId);
      
      // Parse playlists
      const playlists = this.parseChannelPlaylists(html, channelId);

      return {
        channel,
        videos,
        playlists,
        success: true
      };

    } catch (error) {
      return {
        channel: {},
        videos: [],
        playlists: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }

  /**
   * Scrape channel videos page
   */
  async scrapeChannelVideos(channelUrl: string, limit: number = 50): Promise<Partial<ChannelVideo>[]> {
    try {
      const channelId = this.extractChannelId(channelUrl);
      if (!channelId) {
        return [];
      }

      const url = this.buildChannelUrl(channelId, 'videos');
      const html = await this.fetchPage(url);
      
      return this.parseChannelVideos(html, channelId).slice(0, limit);

    } catch (error) {
      console.error('Error scraping channel videos:', error);
      return [];
    }
  }

  /**
   * Scrape channel playlists page
   */
  async scrapeChannelPlaylists(channelUrl: string): Promise<Partial<ChannelPlaylist>[]> {
    try {
      const channelId = this.extractChannelId(channelUrl);
      if (!channelId) {
        return [];
      }

      const url = this.buildChannelUrl(channelId, 'playlists');
      const html = await this.fetchPage(url);
      
      return this.parseChannelPlaylists(html, channelId);

    } catch (error) {
      console.error('Error scraping channel playlists:', error);
      return [];
    }
  }

  /**
   * Extract channel ID from various YouTube URL formats
   */
  private extractChannelId(url: string): string | null {
    const patterns = [
      // Channel ID format
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      // Handle format
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      // Custom URL format
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      // User format (legacy)
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      // Direct channel ID
      /^[a-zA-Z0-9_-]{24}$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  /**
   * Build channel URL
   */
  private buildChannelUrl(channelId: string, section?: string): string {
    const baseUrl = channelId.startsWith('@') 
      ? `https://www.youtube.com/${channelId}`
      : `https://www.youtube.com/channel/${channelId}`;
    
    if (section) {
      return `${baseUrl}/${section}`;
    }
    
    return baseUrl;
  }

  /**
   * Fetch page with retry logic
   */
  private async fetchPage(url: string, maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to fetch page after all retries');
  }

  /**
   * Parse channel information from HTML
   */
  private parseChannelInfo(html: string, channelId: string): Partial<Channel> {
    const channel: Partial<Channel> = {
      youtube_id: channelId
    };

    try {
      // Extract channel name
      const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (nameMatch) {
        channel.name = this.decodeHtmlEntities(nameMatch[1]);
      }

      // Extract description
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      if (descMatch) {
        channel.description = this.decodeHtmlEntities(descMatch[1]);
      }

      // Extract thumbnail
      const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (thumbMatch) {
        channel.thumbnail = thumbMatch[1];
      }

      // Extract subscriber count from various possible locations
      const subCountPatterns = [
        /(\d+(?:\.\d+)?[KMB]?) subscribers/i,
        /"subscriberCountText":\{"simpleText":"([^"]+)"/,
        /"subscriberCountText":\{"runs":\[\{"text":"([^"]+)"/
      ];

      for (const pattern of subCountPatterns) {
        const match = html.match(pattern);
        if (match) {
          channel.subscriber_count = this.parseCount(match[1]);
          break;
        }
      }

      // Extract video count
      const videoCountMatch = html.match(/(\d+(?:,\d+)*) videos/i);
      if (videoCountMatch) {
        channel.video_count = parseInt(videoCountMatch[1].replace(/,/g, ''));
      }

      // Extract verification status
      channel.verified = html.includes('verified') || html.includes('checkmark');

      // Extract handle if available
      const handleMatch = html.match(/@([a-zA-Z0-9_-]+)/);
      if (handleMatch) {
        channel.handle = `@${handleMatch[1]}`;
      }

      // Try to extract additional metadata from JSON-LD or other structured data
      this.extractStructuredData(html, channel);

    } catch (error) {
      console.error('Error parsing channel info:', error);
    }

    return channel;
  }

  /**
   * Parse channel videos from HTML
   */
  private parseChannelVideos(html: string, channelId: string): Partial<ChannelVideo>[] {
    const videos: Partial<ChannelVideo>[] = [];

    try {
      // Look for video data in various formats
      const videoPatterns = [
        // Standard video grid
        /"videoId":"([^"]+)"[^}]*"title":\{"runs":\[\{"text":"([^"]+)"/g,
        // Compact video format
        /"videoId":"([^"]+)"[^}]*"simpleText":"([^"]+)"/g
      ];

      for (const pattern of videoPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const videoId = match[1];
          const title = this.decodeHtmlEntities(match[2]);

          if (validateVideoId(videoId)) {
            // Look for additional video metadata around this match
            const videoData = this.extractVideoMetadata(html, videoId, match.index);
            
            videos.push({
              youtube_id: videoId,
              channel_id: channelId,
              title,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              discovered_at: new Date(),
              ...videoData
            });
          }
        }
      }

      // Remove duplicates
      const uniqueVideos = videos.filter((video, index, self) => 
        index === self.findIndex(v => v.youtube_id === video.youtube_id)
      );

      return uniqueVideos.slice(0, 50); // Limit to 50 videos

    } catch (error) {
      console.error('Error parsing channel videos:', error);
      return [];
    }
  }

  /**
   * Parse channel playlists from HTML
   */
  private parseChannelPlaylists(html: string, channelId: string): Partial<ChannelPlaylist>[] {
    const playlists: Partial<ChannelPlaylist>[] = [];

    try {
      // Look for playlist data
      const playlistPattern = /"playlistId":"([^"]+)"[^}]*"title":\{"runs":\[\{"text":"([^"]+)"/g;
      
      let match;
      while ((match = playlistPattern.exec(html)) !== null) {
        const playlistId = match[1];
        const title = this.decodeHtmlEntities(match[2]);

        // Extract additional playlist metadata
        const playlistData = this.extractPlaylistMetadata(html, playlistId, match.index);

        playlists.push({
          youtube_id: playlistId,
          channel_id: channelId,
          title,
          created_at: new Date(),
          updated_at: new Date(),
          is_public: true,
          ...playlistData
        });
      }

      return playlists;

    } catch (error) {
      console.error('Error parsing channel playlists:', error);
      return [];
    }
  }

  /**
   * Extract video metadata from surrounding HTML context
   */
  private extractVideoMetadata(html: string, videoId: string, matchIndex: number): Partial<ChannelVideo> {
    const metadata: Partial<ChannelVideo> = {};

    try {
      // Extract a reasonable context around the match
      const contextStart = Math.max(0, matchIndex - 2000);
      const contextEnd = Math.min(html.length, matchIndex + 2000);
      const context = html.slice(contextStart, contextEnd);

      // Look for duration
      const durationMatch = context.match(/"lengthText":\{"simpleText":"([^"]+)"/);
      if (durationMatch) {
        metadata.duration = this.parseDuration(durationMatch[1]);
      }

      // Look for view count
      const viewMatch = context.match(/"viewCountText":\{"simpleText":"([^"]+)"/);
      if (viewMatch) {
        metadata.view_count = this.parseCount(viewMatch[1]);
      }

      // Look for published date
      const publishedMatch = context.match(/"publishedTimeText":\{"simpleText":"([^"]+)"/);
      if (publishedMatch) {
        metadata.published_at = this.parseRelativeDate(publishedMatch[1]);
      }

    } catch (error) {
      console.error('Error extracting video metadata:', error);
    }

    return metadata;
  }

  /**
   * Extract playlist metadata from surrounding HTML context
   */
  private extractPlaylistMetadata(html: string, playlistId: string, matchIndex: number): Partial<ChannelPlaylist> {
    const metadata: Partial<ChannelPlaylist> = {};

    try {
      const contextStart = Math.max(0, matchIndex - 1000);
      const contextEnd = Math.min(html.length, matchIndex + 1000);
      const context = html.slice(contextStart, contextEnd);

      // Look for video count
      const videoCountMatch = context.match(/(\d+) videos?/i);
      if (videoCountMatch) {
        metadata.video_count = parseInt(videoCountMatch[1]);
      }

      // Look for thumbnail
      const thumbnailMatch = context.match(/"url":"([^"]+hqdefault[^"]+)"/);
      if (thumbnailMatch) {
        metadata.thumbnail = thumbnailMatch[1];
      }

    } catch (error) {
      console.error('Error extracting playlist metadata:', error);
    }

    return metadata;
  }

  /**
   * Extract structured data from HTML
   */
  private extractStructuredData(html: string, channel: Partial<Channel>): void {
    try {
      // Look for JSON-LD structured data
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
      if (jsonLdMatch) {
        const data = JSON.parse(jsonLdMatch[1]);
        
        if (data['@type'] === 'Person' || data['@type'] === 'Organization') {
          if (data.name && !channel.name) {
            channel.name = data.name;
          }
          if (data.description && !channel.description) {
            channel.description = data.description;
          }
          if (data.image && !channel.thumbnail) {
            channel.thumbnail = typeof data.image === 'string' ? data.image : data.image.url;
          }
        }
      }

      // Look for microdata
      const microdataMatch = html.match(/itemtype="https?:\/\/schema\.org\/Person"[^>]*>/);
      if (microdataMatch) {
        // Extract microdata properties
        const nameMatch = html.match(/itemprop="name"[^>]*>([^<]+)</);
        if (nameMatch && !channel.name) {
          channel.name = this.decodeHtmlEntities(nameMatch[1]);
        }
      }

    } catch (error) {
      console.error('Error extracting structured data:', error);
    }
  }

  /**
   * Utility methods
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };

    return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  private parseCount(countStr: string): number {
    if (!countStr) return 0;

    const cleanStr = countStr.replace(/[,\s]/g, '').toLowerCase();
    const match = cleanStr.match(/^(\d+(?:\.\d+)?)(k|m|b)?/);
    
    if (!match) return 0;

    const number = parseFloat(match[1]);
    const suffix = match[2];

    switch (suffix) {
      case 'k': return Math.floor(number * 1000);
      case 'm': return Math.floor(number * 1000000);
      case 'b': return Math.floor(number * 1000000000);
      default: return Math.floor(number);
    }
  }

  private parseDuration(durationStr: string): number {
    if (!durationStr) return 0;

    const parts = durationStr.split(':').reverse();
    let seconds = 0;
    let multiplier = 1;

    for (const part of parts) {
      seconds += parseInt(part) * multiplier;
      multiplier *= 60;
    }

    return seconds;
  }

  private parseRelativeDate(relativeStr: string): Date {
    const now = new Date();
    
    if (!relativeStr) return now;

    const match = relativeStr.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
    if (!match) return now;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'second':
        return new Date(now.getTime() - amount * 1000);
      case 'minute':
        return new Date(now.getTime() - amount * 60 * 1000);
      case 'hour':
        return new Date(now.getTime() - amount * 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }
}