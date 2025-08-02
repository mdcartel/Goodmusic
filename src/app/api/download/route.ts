import { NextRequest, NextResponse } from 'next/server';
import { DownloadRequest, DownloadResponse } from '@/types';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { ExtractionService } from '@/lib/extractionService';
import { validateYouTubeUrl, generateId } from '@/lib/utils';
import { mockSongs } from '@/lib/mockData';
import { extendedMockSongs } from '@/lib/mockDataExtended';

// In-memory download tracking for the API
const activeDownloads = new Map<string, {
  id: string;
  songId?: string;
  youtubeUrl: string;
  format: 'mp3' | 'mp4';
  quality: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  filePath?: string;
  fileSize?: number;
  error?: string;
}>();

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    await withRateLimit(request, RATE_LIMITS.DOWNLOAD, async () => {});

    const body: DownloadRequest = await request.json();
    const { youtubeUrl, format, quality } = body;

    // Validate input
    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    if (!validateYouTubeUrl(youtubeUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    if (!format || !['mp3', 'mp4'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be mp3 or mp4' },
        { status: 400 }
      );
    }

    // Find associated song if available
    const allSongs = [...mockSongs, ...extendedMockSongs];
    const associatedSong = allSongs.find(song => song.youtubeUrl === youtubeUrl);

    // Generate download ID
    const downloadId = generateId();

    // Create download record
    const downloadRecord = {
      id: downloadId,
      songId: associatedSong?.id,
      youtubeUrl,
      format: format as 'mp3' | 'mp4',
      quality: quality || (format === 'mp3' ? '192' : '720p'),
      status: 'queued' as const,
      progress: 0,
      startTime: Date.now()
    };

    activeDownloads.set(downloadId, downloadRecord);

    // Start download process asynchronously
    processDownload(downloadId);

    const response: DownloadResponse = {
      downloadId,
      status: 'queued'
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('Error starting download:', error);
    
    // Handle rate limit errors
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      const rateLimitError = error as { status: number; retryAfter?: number; resetTime?: number };
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitError.retryAfter,
          resetTime: rateLimitError.resetTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitError.retryAfter?.toString() || '60',
            'X-RateLimit-Reset': rateLimitError.resetTime?.toString() || ''
          }
        }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start download' },
      { status: 500 }
    );
  }
}

// Get all active downloads
export async function GET() {
  try {
    const downloads = Array.from(activeDownloads.values()).map(download => ({
      downloadId: download.id,
      songId: download.songId,
      youtubeUrl: download.youtubeUrl,
      format: download.format,
      quality: download.quality,
      status: download.status,
      progress: download.progress,
      filePath: download.filePath,
      fileSize: download.fileSize,
      error: download.error,
      startTime: download.startTime
    }));

    return NextResponse.json({
      downloads,
      total: downloads.length,
      active: downloads.filter(d => d.status === 'processing').length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length
    });

  } catch (error) {
    console.error('Error getting downloads:', error);
    return NextResponse.json(
      { error: 'Failed to get downloads' },
      { status: 500 }
    );
  }
}

// Process download asynchronously
async function processDownload(downloadId: string) {
  const download = activeDownloads.get(downloadId);
  if (!download) return;

  try {
    // Update status to processing
    download.status = 'processing';
    download.progress = 0;
    activeDownloads.set(downloadId, download);

    // Note: ExtractionService would be used here in production

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const currentDownload = activeDownloads.get(downloadId);
      if (!currentDownload || currentDownload.status !== 'processing') {
        clearInterval(progressInterval);
        return;
      }

      // Simulate progress
      const newProgress = Math.min(currentDownload.progress + Math.random() * 15, 95);
      currentDownload.progress = newProgress;
      activeDownloads.set(downloadId, currentDownload);
    }, 1000);

    // For demo purposes, simulate download completion
    // In production, this would use the actual extraction service
    await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));

    clearInterval(progressInterval);

    // Mark as completed
    download.status = 'completed';
    download.progress = 100;
    download.filePath = `/downloads/${downloadId}.${download.format}`;
    download.fileSize = Math.floor(Math.random() * 10000000) + 1000000; // Random size
    activeDownloads.set(downloadId, download);

  } catch (error) {
    console.error('Download failed:', error);
    
    download.status = 'failed';
    download.error = error instanceof Error ? error.message : 'Download failed';
    activeDownloads.set(downloadId, download);
  }
}

// Clean up old downloads periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [id, download] of activeDownloads.entries()) {
    if (now - download.startTime > maxAge) {
      activeDownloads.delete(id);
    }
  }
}, 60 * 60 * 1000); // Run every hour