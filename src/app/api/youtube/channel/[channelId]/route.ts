import { NextRequest, NextResponse } from 'next/server';
import { youtubeScraperService } from '@/lib/services/youtube-scraper';

export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const { channelId } = params;
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    console.log(`Getting channel info for: ${channelId}`);

    const channelInfo = await youtubeScraperService.getChannelInfo(channelId);

    return NextResponse.json({
      channelId,
      ...channelInfo,
    });

  } catch (error) {
    console.error('YouTube channel info API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get channel info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}