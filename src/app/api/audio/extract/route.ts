import { NextRequest, NextResponse } from 'next/server';
import { audioExtractionService, AudioExtractionOptions } from '../../../../lib/services/audio-extraction';
import { ExtractionErrorHandler } from '../../../../lib/extractionErrors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, options = {} } = body;

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

    const extractionOptions: AudioExtractionOptions = {
      quality: options.quality || 'best',
      format: options.format || 'm4a',
      includeMetadata: options.includeMetadata !== false,
      maxRetries: options.maxRetries || 3,
    };

    const result = await audioExtractionService.extractAudio(videoId, extractionOptions);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Audio extraction error:', error);
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const quality = searchParams.get('quality') || 'best';
    const format = searchParams.get('format') || 'm4a';

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

    const extractionOptions: AudioExtractionOptions = {
      quality: quality as any,
      format: format as any,
      includeMetadata: true,
      maxRetries: 3,
    };

    const result = await audioExtractionService.extractAudio(videoId, extractionOptions);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Audio extraction error:', error);
    
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