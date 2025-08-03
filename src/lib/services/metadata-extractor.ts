import { database } from '../database';
import { generateId } from '../utils';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { pipeline } from 'stream/promises';

// Metadata interfaces
export interface TrackMetadata {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  totalTracks?: number;
  duration: number;
  description?: string;
  language?: string;
  uploader?: string;
  uploadDate?: Date;
  viewCount?: number;
  likeCount?: number;
  tags?: string[];
  thumbnail?: string;
  thumbnailPath?: string;
  extractedAt: Date;
}

// Thumbnail information
export interface ThumbnailInfo {
  id: string;
  videoId: string;
  url: string;
  width: number;
  height: number;
  quality: 'low' | 'medium' | 'high' | 'maxres';
  format: 'jpg' | 'webp' | 'png';
  filePath?: string;
  fileSize?: number;
  downloadedAt?: Date;
}

// Metadata extraction options
export interface MetadataExtractionOptions {
  includeThumbnail?: boolean;
  thumbnailQuality?: 'low' | 'medium' | 'high' | 'maxres';
  extractLyrics?: boolean;
  extractChapters?: boolean;
  extractComments?: boolean;
  maxComments?: number;
  includeUploadInfo?: boolean;
  includeStatistics?: boolean;
}

// Metadata embedding options
export interface MetadataEmbeddingOptions {
  embedThumbnail?: boolean;
  embedLyrics?: boolean;
  embedChapters?: boolean;
  overwriteExisting?: boolean;
  preserveOriginal?: boolean;
  outputFormat?: 'mp3' | 'm4a' | 'flac';
}

// Batch processing options
export interface BatchProcessingOptions {
  concurrency?: number;
  skipExisting?: boolean;
  retryFailed?: boolean;
  progressCallback?: (progress: BatchProgress) => void;
}

// Batch processing progress
export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
  percentage: number;
}

class MetadataExtractorService {
  private static instance: MetadataExtractorService;
  private readonly THUMBNAIL_CACHE_DIR = './cache/thumbnails';
  private readonly METADATA_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.ensureCacheDirectory();
  }

  public static getInstance(): MetadataExtractorService {
    if (!MetadataExtractorService.instance) {
      MetadataExtractorService.instance = new MetadataExtractorService();
    }
    return MetadataExtractorService.instance;
  }

  // Metadata extraction
  public async extractMetadata(
    videoId: string,
    options: MetadataExtractionOptions = {}
  ): Promise<TrackMetadata> {
    try {
      console.log(`Extracting metadata for video: ${videoId}`);

      // Check if metadata already exists and is fresh
      const existingMetadata = await this.getCachedMetadata(videoId);
      if (existingMetadata && this.isMetadataFresh(existingMetadata)) {
        console.log(`Using cached metadata for ${videoId}`);
        return existingMetadata;
      }

      // Extract metadata using yt-dlp
      const rawMetadata = await this.extractRawMetadata(videoId, options);
      
      // Process and normalize metadata
      const processedMetadata = await this.processMetadata(rawMetadata, options);
      
      // Download thumbnail if requested
      if (options.includeThumbnail && processedMetadata.thumbnail) {
        const thumbnailInfo = await this.downloadThumbnail(
          videoId,
          processedMetadata.thumbnail,
          options.thumbnailQuality || 'high'
        );
        
        if (thumbnailInfo) {
          processedMetadata.thumbnailPath = thumbnailInfo.filePath;
        }
      }

      // Save metadata to database
      await this.saveMetadata(processedMetadata);

      return processedMetadata;

    } catch (error) {
      console.error(`Failed to extract metadata for ${videoId}:`, error);
      throw error;
    }
  }

  // Batch metadata extraction
  public async extractBatchMetadata(
    videoIds: string[],
    options: MetadataExtractionOptions = {},
    batchOptions: BatchProcessingOptions = {}
  ): Promise<{ successful: TrackMetadata[]; failed: Array<{ videoId: string; error: string }> }> {
    const {
      concurrency = 3,
      skipExisting = true,
      retryFailed = true,
      progressCallback
    } = batchOptions;

    const successful: TrackMetadata[] = [];
    const failed: Array<{ videoId: string; error: string }> = [];
    let completed = 0;

    // Filter out existing metadata if skipExisting is true
    const videosToProcess = skipExisting 
      ? await this.filterExistingMetadata(videoIds)
      : videoIds;

    const total = videosToProcess.length;

    // Process in batches with concurrency limit
    const processBatch = async (batch: string[]) => {
      const promises = batch.map(async (videoId) => {
        try {
          progressCallback?.({
            total,
            completed,
            failed: failed.length,
            current: videoId,
            percentage: (completed / total) * 100
          });

          const metadata = await this.extractMetadata(videoId, options);
          successful.push(metadata);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          failed.push({ videoId, error: errorMessage });
          
          // Retry once if enabled
          if (retryFailed) {
            try {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              const metadata = await this.extractMetadata(videoId, options);
              successful.push(metadata);
              
              // Remove from failed array
              const failedIndex = failed.findIndex(f => f.videoId === videoId);
              if (failedIndex > -1) {
                failed.splice(failedIndex, 1);
              }
            } catch (retryError) {
              // Keep in failed array with updated error
              const failedItem = failed.find(f => f.videoId === videoId);
              if (failedItem) {
                failedItem.error = retryError instanceof Error ? retryError.message : String(retryError);
              }
            }
          }
        } finally {
          completed++;
          progressCallback?.({
            total,
            completed,
            failed: failed.length,
            percentage: (completed / total) * 100
          });
        }
      });

      await Promise.all(promises);
    };

    // Process videos in batches
    for (let i = 0; i < videosToProcess.length; i += concurrency) {
      const batch = videosToProcess.slice(i, i + concurrency);
      await processBatch(batch);
    }

    return { successful, failed };
  }

  // Thumbnail handling
  public async downloadThumbnail(
    videoId: string,
    thumbnailUrl: string,
    quality: 'low' | 'medium' | 'high' | 'maxres' = 'high'
  ): Promise<ThumbnailInfo | null> {
    try {
      // Check if thumbnail already exists
      const existingThumbnail = await this.getCachedThumbnail(videoId, quality);
      if (existingThumbnail && existsSync(existingThumbnail.filePath!)) {
        return existingThumbnail;
      }

      // Get the best thumbnail URL for the requested quality
      const bestThumbnailUrl = await this.getBestThumbnailUrl(videoId, quality);
      const finalUrl = bestThumbnailUrl || thumbnailUrl;

      // Download thumbnail
      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Determine file format from content type or URL
      const contentType = response.headers.get('content-type') || '';
      const format = this.getThumbnailFormat(contentType, finalUrl);
      
      // Generate file path
      const fileName = `${videoId}_${quality}.${format}`;
      const filePath = path.join(this.THUMBNAIL_CACHE_DIR, fileName);

      // Save thumbnail to file
      const fileStream = createWriteStream(filePath);
      if (response.body) {
        await pipeline(response.body as any, fileStream);
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Get image dimensions (basic implementation)
      const dimensions = await this.getImageDimensions(filePath);

      const thumbnailInfo: ThumbnailInfo = {
        id: generateId(),
        videoId,
        url: finalUrl,
        width: dimensions.width,
        height: dimensions.height,
        quality,
        format: format as 'jpg' | 'webp' | 'png',
        filePath,
        fileSize: stats.size,
        downloadedAt: new Date(),
      };

      // Save thumbnail info to database
      await this.saveThumbnailInfo(thumbnailInfo);

      return thumbnailInfo;

    } catch (error) {
      console.error(`Failed to download thumbnail for ${videoId}:`, error);
      return null;
    }
  }

  // Metadata embedding
  public async embedMetadata(
    audioFilePath: string,
    metadata: TrackMetadata,
    options: MetadataEmbeddingOptions = {}
  ): Promise<boolean> {
    try {
      const {
        embedThumbnail = true,
        embedLyrics = false,
        overwriteExisting = true,
        preserveOriginal = true,
        outputFormat
      } = options;

      // Check if file exists
      if (!existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Create backup if preserveOriginal is true
      if (preserveOriginal) {
        const backupPath = `${audioFilePath}.backup`;
        await fs.copyFile(audioFilePath, backupPath);
      }

      // Use ffmpeg to embed metadata
      await this.embedWithFFmpeg(audioFilePath, metadata, options);

      console.log(`Successfully embedded metadata in ${audioFilePath}`);
      return true;

    } catch (error) {
      console.error(`Failed to embed metadata in ${audioFilePath}:`, error);
      return false;
    }
  }

  // Batch metadata embedding
  public async embedBatchMetadata(
    files: Array<{ audioFilePath: string; metadata: TrackMetadata }>,
    options: MetadataEmbeddingOptions = {},
    batchOptions: BatchProcessingOptions = {}
  ): Promise<{ successful: string[]; failed: Array<{ filePath: string; error: string }> }> {
    const {
      concurrency = 2, // Lower concurrency for file operations
      progressCallback
    } = batchOptions;

    const successful: string[] = [];
    const failed: Array<{ filePath: string; error: string }> = [];
    let completed = 0;
    const total = files.length;

    const processBatch = async (batch: typeof files) => {
      const promises = batch.map(async ({ audioFilePath, metadata }) => {
        try {
          progressCallback?.({
            total,
            completed,
            failed: failed.length,
            current: audioFilePath,
            percentage: (completed / total) * 100
          });

          const success = await this.embedMetadata(audioFilePath, metadata, options);
          if (success) {
            successful.push(audioFilePath);
          } else {
            failed.push({ filePath: audioFilePath, error: 'Embedding failed' });
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          failed.push({ filePath: audioFilePath, error: errorMessage });
        } finally {
          completed++;
          progressCallback?.({
            total,
            completed,
            failed: failed.length,
            percentage: (completed / total) * 100
          });
        }
      });

      await Promise.all(promises);
    };

    // Process files in batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      await processBatch(batch);
    }

    return { successful, failed };
  }

  // Metadata editing
  public async editMetadata(
    metadataId: string,
    updates: Partial<TrackMetadata>
  ): Promise<TrackMetadata | null> {
    try {
      const existingMetadata = await this.getMetadataById(metadataId);
      if (!existingMetadata) {
        throw new Error(`Metadata not found: ${metadataId}`);
      }

      const updatedMetadata: TrackMetadata = {
        ...existingMetadata,
        ...updates,
        id: metadataId, // Ensure ID doesn't change
        extractedAt: new Date(), // Update extraction time
      };

      await this.saveMetadata(updatedMetadata);
      return updatedMetadata;

    } catch (error) {
      console.error(`Failed to edit metadata ${metadataId}:`, error);
      return null;
    }
  }

  // Data access methods
  public async getMetadata(videoId: string): Promise<TrackMetadata | null> {
    try {
      const result = await database.get(
        'SELECT * FROM metadata WHERE video_id = ? ORDER BY extracted_at DESC LIMIT 1',
        [videoId]
      );

      return result ? this.deserializeMetadata(result) : null;
    } catch (error) {
      console.error(`Failed to get metadata for ${videoId}:`, error);
      return null;
    }
  }

  public async getMetadataById(id: string): Promise<TrackMetadata | null> {
    try {
      const result = await database.get(
        'SELECT * FROM metadata WHERE id = ?',
        [id]
      );

      return result ? this.deserializeMetadata(result) : null;
    } catch (error) {
      console.error(`Failed to get metadata by ID ${id}:`, error);
      return null;
    }
  }

  public async getAllMetadata(): Promise<TrackMetadata[]> {
    try {
      const results = await database.all(
        'SELECT * FROM metadata ORDER BY extracted_at DESC'
      );

      return results.map(result => this.deserializeMetadata(result));
    } catch (error) {
      console.error('Failed to get all metadata:', error);
      return [];
    }
  }

  public async searchMetadata(query: string): Promise<TrackMetadata[]> {
    try {
      const results = await database.all(
        `SELECT * FROM metadata 
         WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? 
         ORDER BY extracted_at DESC`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
      );

      return results.map(result => this.deserializeMetadata(result));
    } catch (error) {
      console.error(`Failed to search metadata for "${query}":`, error);
      return [];
    }
  }

  // Private methods
  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.THUMBNAIL_CACHE_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create thumbnail cache directory:', error);
    }
  }

  private async extractRawMetadata(
    videoId: string,
    options: MetadataExtractionOptions
  ): Promise<any> {
    // This would use yt-dlp to extract metadata
    // For now, we'll simulate the extraction
    const youtubedl = require('youtube-dl-exec');
    
    const extractOptions = {
      dumpSingleJson: true,
      noWarnings: true,
      extractFlat: false,
      writeInfoJson: false,
      writeDescription: options.extractComments,
      writeAnnotations: false,
      writeThumbnail: false,
      writeSubtitles: false,
      writeAutoSub: false,
    };

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const result = await youtubedl(url, extractOptions);

    return result;
  }

  private async processMetadata(
    rawMetadata: any,
    options: MetadataExtractionOptions
  ): Promise<TrackMetadata> {
    // Extract and normalize metadata from yt-dlp output
    const metadata: TrackMetadata = {
      id: generateId(),
      videoId: rawMetadata.id || rawMetadata.display_id,
      title: this.cleanTitle(rawMetadata.title || 'Unknown Title'),
      artist: this.extractArtist(rawMetadata.title, rawMetadata.uploader),
      album: this.extractAlbum(rawMetadata.title, rawMetadata.description),
      genre: this.extractGenre(rawMetadata.categories, rawMetadata.tags),
      year: this.extractYear(rawMetadata.upload_date),
      duration: rawMetadata.duration || 0,
      description: rawMetadata.description,
      language: rawMetadata.language,
      uploader: rawMetadata.uploader,
      uploadDate: rawMetadata.upload_date ? new Date(rawMetadata.upload_date) : undefined,
      viewCount: rawMetadata.view_count,
      likeCount: rawMetadata.like_count,
      tags: rawMetadata.tags || [],
      thumbnail: this.getBestThumbnailFromMetadata(rawMetadata.thumbnails),
      extractedAt: new Date(),
    };

    return metadata;
  }

  private cleanTitle(title: string): string {
    // Remove common patterns from YouTube titles
    return title
      .replace(/\s*\[.*?\]\s*/g, '') // Remove [Official Video], [HD], etc.
      .replace(/\s*\(.*?official.*?\)\s*/gi, '') // Remove (Official Music Video)
      .replace(/\s*-\s*YouTube\s*$/i, '') // Remove - YouTube suffix
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractArtist(title: string, uploader: string): string {
    // Try to extract artist from title (Artist - Song format)
    const dashMatch = title.match(/^([^-]+)\s*-\s*(.+)$/);
    if (dashMatch) {
      const potentialArtist = dashMatch[1].trim();
      // Avoid generic terms
      if (!potentialArtist.toLowerCase().includes('official') && 
          !potentialArtist.toLowerCase().includes('music') &&
          potentialArtist.length > 1) {
        return potentialArtist;
      }
    }

    // Fallback to uploader, but clean it up
    return uploader
      .replace(/\s*(official|music|records|entertainment)\s*/gi, '')
      .replace(/\s*-\s*topic\s*$/i, '') // Remove YouTube auto-generated "- Topic"
      .trim() || 'Unknown Artist';
  }

  private extractAlbum(title: string, description?: string): string | undefined {
    // Try to extract album from description
    if (description) {
      const albumMatch = description.match(/album[:\s]+([^\n\r]+)/i);
      if (albumMatch) {
        return albumMatch[1].trim();
      }
    }

    // Could also try to extract from title patterns
    return undefined;
  }

  private extractGenre(categories?: string[], tags?: string[]): string | undefined {
    const musicGenres = [
      'pop', 'rock', 'hip hop', 'rap', 'jazz', 'classical', 'electronic',
      'country', 'folk', 'blues', 'reggae', 'metal', 'punk', 'indie',
      'alternative', 'r&b', 'soul', 'funk', 'disco', 'house', 'techno',
      'ambient', 'experimental', 'world', 'latin', 'gospel', 'spiritual'
    ];

    // Check categories first
    if (categories) {
      for (const category of categories) {
        const lowerCategory = category.toLowerCase();
        for (const genre of musicGenres) {
          if (lowerCategory.includes(genre)) {
            return genre.charAt(0).toUpperCase() + genre.slice(1);
          }
        }
      }
    }

    // Check tags
    if (tags) {
      for (const tag of tags) {
        const lowerTag = tag.toLowerCase();
        for (const genre of musicGenres) {
          if (lowerTag === genre || lowerTag.includes(genre)) {
            return genre.charAt(0).toUpperCase() + genre.slice(1);
          }
        }
      }
    }

    return undefined;
  }

  private extractYear(uploadDate?: string): number | undefined {
    if (!uploadDate) return undefined;
    
    const year = parseInt(uploadDate.substring(0, 4));
    return isNaN(year) ? undefined : year;
  }

  private getBestThumbnailFromMetadata(thumbnails?: any[]): string | undefined {
    if (!thumbnails || thumbnails.length === 0) return undefined;

    // Sort by resolution (width * height) and pick the best one
    const sortedThumbnails = thumbnails
      .filter(thumb => thumb.url)
      .sort((a, b) => {
        const aRes = (a.width || 0) * (a.height || 0);
        const bRes = (b.width || 0) * (b.height || 0);
        return bRes - aRes;
      });

    return sortedThumbnails[0]?.url;
  }

  private async getBestThumbnailUrl(
    videoId: string,
    quality: 'low' | 'medium' | 'high' | 'maxres'
  ): Promise<string> {
    const qualityMap = {
      low: 'default', // 120x90
      medium: 'mqdefault', // 320x180
      high: 'hqdefault', // 480x360
      maxres: 'maxresdefault' // 1280x720
    };

    const qualityKey = qualityMap[quality];
    return `https://img.youtube.com/vi/${videoId}/${qualityKey}.jpg`;
  }

  private getThumbnailFormat(contentType: string, url: string): string {
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('png')) return 'png';
    if (url.includes('.webp')) return 'webp';
    if (url.includes('.png')) return 'png';
    return 'jpg'; // Default
  }

  private async getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
    // Basic implementation - in a real app, you'd use a proper image library
    // For now, return default dimensions based on file name
    if (filePath.includes('maxres')) return { width: 1280, height: 720 };
    if (filePath.includes('hq')) return { width: 480, height: 360 };
    if (filePath.includes('mq')) return { width: 320, height: 180 };
    return { width: 120, height: 90 };
  }

  private async embedWithFFmpeg(
    audioFilePath: string,
    metadata: TrackMetadata,
    options: MetadataEmbeddingOptions
  ): Promise<void> {
    // This would use ffmpeg to embed metadata
    // For now, we'll simulate the embedding
    console.log(`Embedding metadata for ${audioFilePath}:`, {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      embedThumbnail: options.embedThumbnail && metadata.thumbnailPath,
    });

    // In a real implementation, you would:
    // 1. Use ffmpeg to embed metadata tags
    // 2. Embed thumbnail as album art if available
    // 3. Handle different audio formats appropriately
  }

  private async getCachedMetadata(videoId: string): Promise<TrackMetadata | null> {
    return this.getMetadata(videoId);
  }

  private isMetadataFresh(metadata: TrackMetadata): boolean {
    const age = Date.now() - metadata.extractedAt.getTime();
    return age < this.METADATA_CACHE_TTL;
  }

  private async filterExistingMetadata(videoIds: string[]): Promise<string[]> {
    const existing = await Promise.all(
      videoIds.map(async (videoId) => {
        const metadata = await this.getCachedMetadata(videoId);
        return metadata && this.isMetadataFresh(metadata) ? null : videoId;
      })
    );

    return existing.filter(Boolean) as string[];
  }

  private async getCachedThumbnail(
    videoId: string,
    quality: string
  ): Promise<ThumbnailInfo | null> {
    try {
      const result = await database.get(
        'SELECT * FROM thumbnails WHERE video_id = ? AND quality = ?',
        [videoId, quality]
      );

      return result ? this.deserializeThumbnailInfo(result) : null;
    } catch (error) {
      console.error(`Failed to get cached thumbnail for ${videoId}:`, error);
      return null;
    }
  }

  private async saveMetadata(metadata: TrackMetadata): Promise<void> {
    try {
      await database.run(
        `INSERT OR REPLACE INTO metadata (
          id, video_id, title, artist, album, album_artist, genre, year,
          track_number, total_tracks, duration, description, language,
          uploader, upload_date, view_count, like_count, tags,
          thumbnail, thumbnail_path, extracted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.id,
          metadata.videoId,
          metadata.title,
          metadata.artist,
          metadata.album,
          metadata.albumArtist,
          metadata.genre,
          metadata.year,
          metadata.trackNumber,
          metadata.totalTracks,
          metadata.duration,
          metadata.description,
          metadata.language,
          metadata.uploader,
          metadata.uploadDate?.toISOString(),
          metadata.viewCount,
          metadata.likeCount,
          JSON.stringify(metadata.tags || []),
          metadata.thumbnail,
          metadata.thumbnailPath,
          metadata.extractedAt.toISOString(),
        ]
      );
    } catch (error) {
      console.error('Failed to save metadata:', error);
      throw error;
    }
  }

  private async saveThumbnailInfo(thumbnailInfo: ThumbnailInfo): Promise<void> {
    try {
      await database.run(
        `INSERT OR REPLACE INTO thumbnails (
          id, video_id, url, width, height, quality, format,
          file_path, file_size, downloaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          thumbnailInfo.id,
          thumbnailInfo.videoId,
          thumbnailInfo.url,
          thumbnailInfo.width,
          thumbnailInfo.height,
          thumbnailInfo.quality,
          thumbnailInfo.format,
          thumbnailInfo.filePath,
          thumbnailInfo.fileSize,
          thumbnailInfo.downloadedAt?.toISOString(),
        ]
      );
    } catch (error) {
      console.error('Failed to save thumbnail info:', error);
      throw error;
    }
  }

  private deserializeMetadata(row: any): TrackMetadata {
    return {
      id: row.id,
      videoId: row.video_id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      albumArtist: row.album_artist,
      genre: row.genre,
      year: row.year,
      trackNumber: row.track_number,
      totalTracks: row.total_tracks,
      duration: row.duration,
      description: row.description,
      language: row.language,
      uploader: row.uploader,
      uploadDate: row.upload_date ? new Date(row.upload_date) : undefined,
      viewCount: row.view_count,
      likeCount: row.like_count,
      tags: row.tags ? JSON.parse(row.tags) : [],
      thumbnail: row.thumbnail,
      thumbnailPath: row.thumbnail_path,
      extractedAt: new Date(row.extracted_at),
    };
  }

  private deserializeThumbnailInfo(row: any): ThumbnailInfo {
    return {
      id: row.id,
      videoId: row.video_id,
      url: row.url,
      width: row.width,
      height: row.height,
      quality: row.quality,
      format: row.format,
      filePath: row.file_path,
      fileSize: row.file_size,
      downloadedAt: row.downloaded_at ? new Date(row.downloaded_at) : undefined,
    };
  }
}

// Export singleton instance
export const metadataExtractor = MetadataExtractorService.getInstance();
export { MetadataExtractorService };