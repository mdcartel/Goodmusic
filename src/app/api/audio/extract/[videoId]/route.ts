import { NextRequest, NextResponse } from 'next/server';
import { audioExtractionService, AudioExtractionOptions } from '@/lib/services/audio-extraction';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    const { searchParams } = new URL(request.url);
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Parse extraction options from query parameters
    const options: AudioExtractionOptions = {
      quality: (searchParams.get('quality') as any) || 'best',
      format: (searchParams.get('format') as any) || 'm4a',
      includeMetadata: searchParams.get('metadata') !== 'false',
      maxRetries: parseInt(searchParams.get('retries') || '3'),
    };

    console.log(`Extracting audio for video: ${videoId} with options:`, options);

    const result = await audioExtractionService.extractAudio(videoId, options);

    return NextResponse.json({
      success: true,
      videoId,
      options,
      ...result,
    });

  } catch (error) {
    console.error('Audio extraction API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Audio extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    const body = await request.json();
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const options: AudioExtractionOptions = {
      quality: body.quality || 'best',
      format: body.format || 'm4a',
      includeMetadata: body.includeMetadata !== false,
      maxRetries: body.maxRetries || 3,
    };

    console.log(`Extracting audio for video: ${videoId} with options:`, options);

    const result = await audioExtractionService.extractAudio(videoId, options);

    return NextResponse.json({
      success: true,
      videoId,
      options,
      ...result,
    });

  } catch (error) {
    console.error('Audio extraction API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Audio extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}