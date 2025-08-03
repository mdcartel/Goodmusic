import { NextRequest, NextResponse } from 'next/server';
import { audioExtractionService, AudioQuality } from '@/lib/services/audio-extraction';

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

    const quality = (searchParams.get('quality') as AudioQuality) || 'best';
    const redirect = searchParams.get('redirect') === 'true';

    console.log(`Getting streaming URL for video: ${videoId}, quality: ${quality}`);

    const streamingUrl = await audioExtractionService.getStreamingUrl(videoId, quality);

    if (redirect) {
      // Redirect directly to the streaming URL
      return NextResponse.redirect(streamingUrl);
    }

    return NextResponse.json({
      success: true,
      videoId,
      quality,
      streamingUrl,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    });

  } catch (error) {
    console.error('Streaming URL API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get streaming URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}