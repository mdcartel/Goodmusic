import { NextRequest, NextResponse } from 'next/server';
import { audioExtractionService } from '../../../../lib/services/audio-extraction';
import { ExtractionErrorHandler } from '../../../../lib/extractionErrors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const quality = searchParams.get('quality') || 'best';

    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Video ID is required'
        },
        { status: 400 }
      );
    }

    // Validate video ID format
    const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    if (!videoIdRegex.test(videoId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid video ID format'
        },
        { status: 400 }
      );
    }

    const streamUrl = await audioExtractionService.getStreamingUrl(videoId, quality as any);

    return NextResponse.json({
      success: true,
      data: {
        streamUrl,
        videoId,
        quality,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
      }
    });

  } catch (error) {
    console.error('Stream URL extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const parsedError = ExtractionErrorHandler.parseError(errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: parsedError.userMessage,
        errorType: parsedError.type,
        retryable: parsedError.retryable,
        suggestedAction: parsedError.suggestedAction
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, quality = 'best' } = body;

    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Video ID is required'
        },
        { status: 400 }
      );
    }

    // Validate video ID format
    const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    if (!videoIdRegex.test(videoId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid video ID format'
        },
        { status: 400 }
      );
    }

    const streamUrl = await audioExtractionService.getStreamingUrl(videoId, quality);

    return NextResponse.json({
      success: true,
      data: {
        streamUrl,
        videoId,
        quality,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
      }
    });

  } catch (error) {
    console.error('Stream URL extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const parsedError = ExtractionErrorHandler.parseError(errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: parsedError.userMessage,
        errorType: parsedError.type,
        retryable: parsedError.retryable,
        suggestedAction: parsedError.suggestedAction
      },
      { status: 500 }
    );
  }
}