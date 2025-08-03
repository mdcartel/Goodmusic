import { NextRequest, NextResponse } from 'next/server';
import { youtubeScraperService } from '@/lib/services/youtube-scraper';

export async function GET(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  try {
    const { playlistId } = params;
    
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    console.log(`Getting playlist info for: ${playlistId}`);

    const playlistInfo = await youtubeScraperService.getPlaylistInfo(playlistId);

    return NextResponse.json({
      playlistId,
      ...playlistInfo,
    });

  } catch (error) {
    console.error('YouTube playlist info API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get playlist info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}