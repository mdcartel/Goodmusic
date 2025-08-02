import { NextRequest, NextResponse } from 'next/server';
import { StreamingUtils } from '@/lib/streamingUtils';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    await withRateLimit(request, RATE_LIMITS.STREAM, async () => {});

    const { searchParams } = new URL(request.url);
    const streamUrl = searchParams.get('url');
    const range = request.headers.get('range');

    if (!streamUrl) {
      return NextResponse.json(
        { error: 'Stream URL is required' },
        { status: 400 }
      );
    }

    // Validate stream URL
    const validation = StreamingUtils.validateStreamUrl(streamUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if stream is expired
    if (StreamingUtils.isStreamExpired(streamUrl)) {
      return NextResponse.json(
        { error: 'Stream URL has expired' },
        { status: 410 }
      );
    }

    // Prepare headers for the upstream request
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    // Forward range header if present (for seeking)
    if (range) {
      upstreamHeaders['Range'] = range;
    }

    // Fetch the stream from YouTube
    const response = await fetch(streamUrl, {
      headers: upstreamHeaders,
      method: 'GET'
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch stream' },
        { status: response.status }
      );
    }

    // Validate stream response
    const streamValidation = await StreamingUtils.validateStreamResponse(response);
    if (!streamValidation.valid) {
      return NextResponse.json(
        { error: streamValidation.error },
        { status: 400 }
      );
    }

    // Get content info
    const contentLength = response.headers.get('content-length');
    const contentType = StreamingUtils.detectContentType(streamUrl, response.headers);
    const contentRange = response.headers.get('content-range');
    const totalLength = contentLength ? parseInt(contentLength, 10) : undefined;

    // Parse range if present
    let rangeInfo = null;
    if (range && totalLength) {
      rangeInfo = StreamingUtils.parseRangeHeader(range, totalLength);
    }

    // Generate appropriate headers
    const responseHeaders = StreamingUtils.generateStreamHeaders(
      contentType,
      totalLength,
      rangeInfo || undefined,
      totalLength
    );

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Return the stream with appropriate status
    const status = range && response.status === 206 ? 206 : 200;

    return new NextResponse(response.body, {
      status,
      headers: new Headers(responseHeaders)
    });

  } catch (error) {
    console.error('Error proxying stream:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream proxy failed' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}

// Handle HEAD requests for metadata
export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const streamUrl = searchParams.get('url');

    if (!streamUrl) {
      return new NextResponse(null, { status: 400 });
    }

    // Validate stream URL
    if (!streamUrl.includes('googlevideo.com') && !streamUrl.includes('youtube.com')) {
      return new NextResponse(null, { status: 400 });
    }

    // Get metadata with HEAD request
    const response = await fetch(streamUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const headers = new Headers({
      'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': response.headers.get('content-length') || '0',
      'Accept-Ranges': response.headers.get('accept-ranges') || 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Accept-Ranges',
      'Cache-Control': 'public, max-age=3600'
    });

    return new NextResponse(null, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error getting stream metadata:', error);
    return new NextResponse(null, { status: 500 });
  }
}