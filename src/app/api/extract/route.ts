import { NextRequest, NextResponse } from 'next/server';
import { ExtractionService } from '@/lib/extractionService';
import { ExtractRequest, ExtractResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: ExtractRequest = await request.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    const extractionService = ExtractionService.getInstance();
    
    // Extract video info
    const infoResult = await extractionService.extractVideoInfo(youtubeUrl, {
      timeout: 30000,
      maxDuration: 3600 // 1 hour max
    });

    if (!infoResult.success || !infoResult.data) {
      return NextResponse.json(
        { error: infoResult.error || 'Failed to extract video information' },
        { status: 400 }
      );
    }

    // Get stream URL
    const streamResult = await extractionService.getStreamUrl(youtubeUrl, 'best[height<=720]');

    if (!streamResult.success || !streamResult.streamUrl) {
      return NextResponse.json(
        { error: streamResult.error || 'Failed to get stream URL' },
        { status: 400 }
      );
    }

    const response: ExtractResponse = {
      streamUrl: streamResult.streamUrl,
      title: infoResult.data.title,
      duration: infoResult.data.duration
    };

    // Add additional metadata if available
    const extendedResponse = {
      ...response,
      videoId: infoResult.data.id,
      thumbnail: infoResult.data.thumbnail,
      uploader: infoResult.data.uploader,
      cached: infoResult.cached || false
    };

    return NextResponse.json(extendedResponse);
  } catch (error) {
    console.error('Error extracting YouTube content:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to extract content: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const extractionService = ExtractionService.getInstance();
    const healthCheck = await extractionService.healthCheck();
    const stats = extractionService.getStats();

    return NextResponse.json({
      status: healthCheck.healthy ? 'healthy' : 'unhealthy',
      error: healthCheck.error,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}