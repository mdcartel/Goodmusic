import { NextRequest, NextResponse } from 'next/server';
import { audioExtractionService } from '@/lib/services/audio-extraction';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log(`Getting quality options for video: ${videoId}`);

    const qualityOptions = await audioExtractionService.getQualityOptions(videoId);

    return NextResponse.json({
      success: true,
      videoId,
      qualityOptions,
      count: qualityOptions.length,
    });

  } catch (error) {
    console.error('Quality options API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get quality options',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}