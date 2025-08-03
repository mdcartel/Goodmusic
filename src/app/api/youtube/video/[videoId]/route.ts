import { NextRequest, NextResponse } from 'next/server';
import { youtubeScraperService } from '@/lib/services/youtube-scraper';

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

    console.log(`Getting video info for: ${videoId}`);

    const videoInfo = await youtubeScraperService.getVideoInfo(videoId);

    return NextResponse.json({
      videoId,
      ...videoInfo,
    });

  } catch (error) {
    console.error('YouTube video info API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get video info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}