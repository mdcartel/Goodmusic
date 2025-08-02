/**
 * yt-dlp Integration for VibePipe MVP
 * Handles YouTube content extraction and streaming
 */

import { Song } from '@/types';

interface YtDlpInfo {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  url: string;
  formats: Array<{
    format_id: string;
    ext: string;
    quality: string;
    filesize?: number;
  }>;
}

class YtDlpIntegration {
  private isServerSide: boolean;
  private isAvailable: boolean = false;

  constructor() {
    this.isServerSide = typeof window === 'undefined';
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    if (!this.isServerSide) {
      // Client-side: check via API
      try {
        const response = await fetch('/api/ytdlp/check');
        const data = await response.json();
        this.isAvailable = data.available;
      } catch (error) {
        this.isAvailable = false;
      }
    }
  }

  async extractSongInfo(youtubeUrl: string): Promise<Song | null> {
    try {
      const response = await fetch('/api/ytdlp/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return this.formatToSong(data.info);
      } else {
        console.warn('yt-dlp extraction failed:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Failed to extract song info:', error);
      return null;
    }
  }

  async getStreamUrl(youtubeUrl: string): Promise<string | null> {
    try {
      const response = await fetch('/api/ytdlp/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.streamUrl;
      } else {
        console.warn('Failed to get stream URL:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Failed to get stream URL:', error);
      return null;
    }
  }

  async downloadSong(youtubeUrl: string, format: 'mp3' | 'mp4' = 'mp3'): Promise<string | null> {
    try {
      const response = await fetch('/api/ytdlp/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl, format }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.downloadUrl;
      } else {
        console.warn('Download failed:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Failed to download song:', error);
      return null;
    }
  }

  private formatToSong(info: YtDlpInfo): Song {
    return {
      id: info.id,
      title: this.cleanTitle(info.title),
      artist: info.uploader || 'Unknown Artist',
      thumbnail: info.thumbnail || '/api/placeholder-thumbnail',
      duration: this.formatDuration(info.duration),
      mood: this.detectMood(info.title),
      youtubeUrl: `https://youtube.com/watch?v=${info.id}`,
      tags: this.extractTags(info.title),
      popularity: Math.floor(Math.random() * 100) + 1, // Mock popularity for now
    };
  }

  private cleanTitle(title: string): string {
    // Remove common YouTube title patterns
    return title
      .replace(/\[.*?\]/g, '') // Remove [Official Video], [Lyrics], etc.
      .replace(/\(.*?\)/g, '') // Remove (Official Video), (Lyrics), etc.
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private detectMood(title: string): string[] {
    const moodKeywords = {
      chill: ['chill', 'relax', 'calm', 'peaceful', 'ambient', 'lo-fi', 'lofi'],
      hype: ['hype', 'energy', 'pump', 'motivational', 'workout', 'gym', 'beast'],
      focus: ['focus', 'study', 'concentration', 'work', 'productivity'],
      sleep: ['sleep', 'night', 'dream', 'lullaby', 'peaceful'],
      sad: ['sad', 'melancholy', 'emotional', 'heartbreak', 'cry'],
      happy: ['happy', 'joy', 'upbeat', 'positive', 'cheerful'],
      party: ['party', 'dance', 'club', 'celebration', 'fun'],
    };

    const detectedMoods: string[] = [];
    const lowerTitle = title.toLowerCase();

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        detectedMoods.push(mood);
      }
    }

    return detectedMoods.length > 0 ? detectedMoods : ['general'];
  }

  private extractTags(title: string): string[] {
    const tags: string[] = [];
    const lowerTitle = title.toLowerCase();

    // Common music tags
    const tagPatterns = {
      'official': /official/,
      'remix': /remix/,
      'cover': /cover/,
      'acoustic': /acoustic/,
      'live': /live/,
      'instrumental': /instrumental/,
      'lyrics': /lyrics/,
      'music video': /music video|mv/,
      'audio': /audio/,
      'extended': /extended|ext/,
    };

    for (const [tag, pattern] of Object.entries(tagPatterns)) {
      if (pattern.test(lowerTitle)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  // Mock data for development/fallback
  getMockSong(): Song {
    return {
      id: 'mock_song_' + Date.now(),
      title: 'Sample Audio Track',
      artist: 'VibePipe Demo',
      thumbnail: '/api/placeholder-thumbnail',
      duration: '3:00',
      mood: ['chill'],
      youtubeUrl: 'https://youtube.com/watch?v=mock',
      tags: ['demo', 'sample'],
      popularity: 75,
    };
  }
}

// Singleton instance
export const ytdlpIntegration = new YtDlpIntegration();
export default ytdlpIntegration;