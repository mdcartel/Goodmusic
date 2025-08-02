import { NextRequest, NextResponse } from 'next/server';
import { ExtractionService } from '@/lib/extractionService';
import { mockSongs } from '@/lib/mockData';
import { extendedMockSongs } from '@/lib/mockDataExtended';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { apiErrorMiddleware, ValidationError, NotFoundError, YouTubeExtractionError, RateLimitError } from '@/lib/errorHandler';
import { log } from '@/lib/logger';

interface StreamParams {
  songId: string;
}

async function getStreamHandler(
  request: NextRequest,
  { params }: { params: Promise<StreamParams> }
) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    try {
      await withRateLimit(request, RATE_LIMITS.STREAM, async () => {});
    } catch (rateLimitError) {
      if (rateLimitError && typeof rateLimitError === 'object' && 'status' in rateLimitError && rateLimitError.status === 429) {
        const error = rateLimitError as { status: number; retryAfter?: number; resetTime?: number };
        throw new RateLimitError(`Rate limit exceeded. Try again in ${error.retryAfter || 60} seconds.`);
      }
      throw rateLimitError;
    }

    const { songId } = await params;
    const { searchParams } = new URL(request.url);
    const quality = searchParams.get('quality') || 'best[height<=720]';
    const format = searchParams.get('format') || 'audio';

    // Validate input
    if (!songId || typeof songId !== 'string') {
      throw new ValidationError('Song ID is required and must be a string');
    }

    if (songId.length > 100) {
      throw new ValidationError('Song ID is too long');
    }

    log.debug('Getting stream URL', 'Stream', { songId, quality, format });

    // Find the song in our mock data
    const allSongs = [...mockSongs, ...extendedMockSongs];
    const song = allSongs.find(s => s.id === songId);

    if (!song) {
      throw new NotFoundError(`Song with ID "${songId}"`);
    }

    log.streaming(songId, 'started');

    const extractionService = ExtractionService.getInstance();

    // Get stream URL from YouTube
    const streamResult = await extractionService.getStreamUrl(song.youtubeUrl, quality);

    if (!streamResult.success || !streamResult.streamUrl) {
      log.streaming(songId, 'failed', new Error(streamResult.error || 'Failed to get stream URL'));
      throw new YouTubeExtractionError(
        streamResult.error || 'Failed to get stream URL',
        {
          songId,
          youtubeUrl: song.youtubeUrl,
          quality,
          suggestion: 'Install yt-dlp for real YouTube streaming: pip install yt-dlp'
        }
      );
    }

    // Return stream information
    const response = {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      streamUrl: streamResult.streamUrl,
      quality,
      format,
      duration: song.duration,
      thumbnail: song.thumbnail,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
      timestamp: new Date().toISOString()
    };

    // Set CORS headers for streaming
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Type': 'application/json'
    });

    const duration = Date.now() - startTime;
    log.streaming(songId, 'completed');
    log.info('Stream URL generated successfully', 'Stream', { 
      songId, 
      title: song.title,
      quality,
      duration 
    });

    return NextResponse.json(response, { headers });
  } catch (error) {
    const duration = Date.now() - startTime;
    const { songId } = await params;
    log.error('Failed to get stream URL', 'Stream', { songId, duration }, error as Error);
    throw error; // Re-throw to be handled by middleware
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}

export const GET = apiErrorMiddleware(getStreamHandler);