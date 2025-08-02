// Enhanced YouTube extraction service using yt-dlp

import { spawn, ChildProcess } from 'child_process';
import { validateYouTubeUrl, extractVideoId } from './utils';
import path from 'path';
import fs from 'fs/promises';

export interface YouTubeInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  uploader?: string;
  uploadDate?: string;
  viewCount?: number;
  description?: string;
  streamUrl?: string;
}

export interface YouTubeQuality {
  format_id: string;
  ext: string;
  quality: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
}

export interface ExtractionOptions {
  quality?: string;
  format?: 'mp3' | 'mp4' | 'best';
  maxDuration?: number; // in seconds
  timeout?: number; // in milliseconds
}

export class YouTubeExtractor {
  private static instance: YouTubeExtractor;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  static getInstance(): YouTubeExtractor {
    if (!YouTubeExtractor.instance) {
      YouTubeExtractor.instance = new YouTubeExtractor();
    }
    return YouTubeExtractor.instance;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async checkYtDlpAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ytdlp = spawn('yt-dlp', ['--version']);
      
      ytdlp.on('close', (code) => {
        resolve(code === 0);
      });
      
      ytdlp.on('error', () => {
        resolve(false);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        ytdlp.kill();
        resolve(false);
      }, 5000);
    });
  }

  async extractInfo(url: string, options: ExtractionOptions = {}): Promise<YouTubeInfo> {
    if (!validateYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    // Check if yt-dlp is available
    const isAvailable = await this.checkYtDlpAvailable();
    if (!isAvailable) {
      throw new Error('yt-dlp is not available. Please install it using: pip install yt-dlp');
    }

    await this.enforceRateLimit();

    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }

    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        '--ignore-errors',
        url
      ];

      const ytdlp = spawn('yt-dlp', args);
      this.activeProcesses.set(videoId, ytdlp);

      let output = '';
      let error = '';

      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        error += data.toString();
      });

      ytdlp.on('close', (code) => {
        this.activeProcesses.delete(videoId);
        
        if (code !== 0) {
          const errorMessage = this.parseYtDlpError(error);
          reject(new Error(`YouTube extraction failed: ${errorMessage}`));
          return;
        }

        try {
          const lines = output.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const info = JSON.parse(lastLine);

          // Validate duration if maxDuration is specified
          if (options.maxDuration && info.duration > options.maxDuration) {
            reject(new Error(`Video duration (${info.duration}s) exceeds maximum allowed (${options.maxDuration}s)`));
            return;
          }

          const result: YouTubeInfo = {
            id: info.id,
            title: info.title || 'Unknown Title',
            duration: info.duration || 0,
            thumbnail: this.getBestThumbnail(info.thumbnails),
            uploader: info.uploader || info.channel,
            uploadDate: info.upload_date,
            viewCount: info.view_count,
            description: info.description?.substring(0, 500) // Limit description length
          };

          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse YouTube metadata: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
        }
      });

      ytdlp.on('error', (err) => {
        this.activeProcesses.delete(videoId);
        reject(new Error(`Failed to start yt-dlp process: ${err.message}`));
      });

      // Set timeout for extraction
      const timeout = options.timeout || 30000;
      setTimeout(() => {
        if (this.activeProcesses.has(videoId)) {
          ytdlp.kill('SIGTERM');
          this.activeProcesses.delete(videoId);
          reject(new Error('YouTube extraction timeout'));
        }
      }, timeout);
    });
  }

  async getStreamUrl(url: string, options: ExtractionOptions = {}): Promise<string> {
    if (!validateYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    // Check if yt-dlp is available
    const isAvailable = await this.checkYtDlpAvailable();
    if (!isAvailable) {
      // Fallback to mock streaming for development
      console.warn('yt-dlp not available, using mock stream URL for development');
      const videoId = extractVideoId(url);
      return `https://mock-stream.vibepipe.dev/stream/${videoId}?quality=${options.quality || 'best'}`;
    }

    await this.enforceRateLimit();

    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }

    return new Promise((resolve, reject) => {
      const quality = options.quality || 'best[height<=720]';
      const args = [
        '--get-url',
        '--format', quality,
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const ytdlp = spawn('yt-dlp', args);
      this.activeProcesses.set(`stream_${videoId}`, ytdlp);

      let output = '';
      let error = '';

      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        error += data.toString();
      });

      ytdlp.on('close', (code) => {
        this.activeProcesses.delete(`stream_${videoId}`);
        
        if (code !== 0) {
          const errorMessage = this.parseYtDlpError(error);
          reject(new Error(`Stream URL extraction failed: ${errorMessage}`));
          return;
        }

        const streamUrl = output.trim().split('\n')[0]; // Get first URL
        if (streamUrl && streamUrl.startsWith('http')) {
          resolve(streamUrl);
        } else {
          reject(new Error('No valid stream URL found'));
        }
      });

      ytdlp.on('error', (err) => {
        this.activeProcesses.delete(`stream_${videoId}`);
        reject(new Error(`Failed to start yt-dlp process: ${err.message}`));
      });

      // Set timeout for stream URL extraction
      const timeout = options.timeout || 15000;
      setTimeout(() => {
        if (this.activeProcesses.has(`stream_${videoId}`)) {
          ytdlp.kill('SIGTERM');
          this.activeProcesses.delete(`stream_${videoId}`);
          reject(new Error('Stream URL extraction timeout'));
        }
      }, timeout);
    });
  }

  async downloadAudio(
    url: string, 
    outputDir: string, 
    filename: string,
    options: ExtractionOptions = {}
  ): Promise<string> {
    if (!validateYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    await this.enforceRateLimit();

    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }

    const format = options.format || 'mp3';
    const outputPath = path.join(outputDir, `${filename}.${format}`);

    return new Promise((resolve, reject) => {
      const args = [
        '--extract-audio',
        '--audio-format', format,
        '--audio-quality', '192K',
        '--output', outputPath,
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const ytdlp = spawn('yt-dlp', args);
      this.activeProcesses.set(`download_${videoId}`, ytdlp);

      let error = '';

      ytdlp.stderr.on('data', (data) => {
        error += data.toString();
      });

      ytdlp.on('close', (code) => {
        this.activeProcesses.delete(`download_${videoId}`);
        
        if (code !== 0) {
          const errorMessage = this.parseYtDlpError(error);
          reject(new Error(`Download failed: ${errorMessage}`));
          return;
        }

        resolve(outputPath);
      });

      ytdlp.on('error', (err) => {
        this.activeProcesses.delete(`download_${videoId}`);
        reject(new Error(`Failed to start download process: ${err.message}`));
      });

      // Set timeout for download (5 minutes default)
      const timeout = options.timeout || 300000;
      setTimeout(() => {
        if (this.activeProcesses.has(`download_${videoId}`)) {
          ytdlp.kill('SIGTERM');
          this.activeProcesses.delete(`download_${videoId}`);
          reject(new Error('Download timeout'));
        }
      }, timeout);
    });
  }

  async getAvailableQualities(url: string): Promise<YouTubeQuality[]> {
    if (!validateYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    await this.enforceRateLimit();

    return new Promise((resolve, reject) => {
      const args = [
        '--list-formats',
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const ytdlp = spawn('yt-dlp', args);

      let output = '';
      let error = '';

      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        error += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to get qualities: ${error}`));
          return;
        }

        try {
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{'));
          
          if (jsonLine) {
            const info = JSON.parse(jsonLine);
            const qualities: YouTubeQuality[] = (info.formats || [])
              .filter((format: Record<string, unknown>) => format.acodec !== 'none' || format.vcodec !== 'none')
              .map((format: Record<string, unknown>) => ({
                format_id: format.format_id,
                ext: format.ext,
                quality: format.quality || format.format_note || 'unknown',
                filesize: format.filesize,
                vcodec: format.vcodec,
                acodec: format.acodec
              }));
            
            resolve(qualities);
          } else {
            resolve([]);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse quality information: ${parseError}`));
        }
      });

      setTimeout(() => {
        ytdlp.kill();
        reject(new Error('Quality check timeout'));
      }, 15000);
    });
  }

  private getBestThumbnail(thumbnails: Array<{ id?: string; url?: string }>): string {
    if (!thumbnails || thumbnails.length === 0) {
      return '';
    }

    // Prefer maxresdefault, then hqdefault, then any available
    const preferred = thumbnails.find(t => t.id === 'maxresdefault') ||
                     thumbnails.find(t => t.id === 'hqdefault') ||
                     thumbnails[thumbnails.length - 1];

    return preferred?.url || '';
  }

  private parseYtDlpError(error: string): string {
    if (error.includes('Video unavailable')) {
      return 'Video is unavailable or private';
    }
    if (error.includes('age-restricted')) {
      return 'Video is age-restricted';
    }
    if (error.includes('geo-blocked')) {
      return 'Video is not available in your region';
    }
    if (error.includes('copyright')) {
      return 'Video has copyright restrictions';
    }
    if (error.includes('network')) {
      return 'Network connection error';
    }
    
    // Return first line of error for brevity
    return error.split('\n')[0] || 'Unknown error';
  }

  // Cleanup method to kill all active processes
  cleanup(): void {
    for (const [id, process] of this.activeProcesses) {
      try {
        process.kill('SIGTERM');
        this.activeProcesses.delete(id);
      } catch (error) {
        console.error(`Failed to kill process ${id}:`, error);
      }
    }
  }

  // Get status of active extractions
  getActiveExtractions(): string[] {
    return Array.from(this.activeProcesses.keys());
  }
}