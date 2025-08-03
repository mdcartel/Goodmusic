import { NextRequest, NextResponse } from 'next/server';
import { youtubeScraperService } from '@/lib/services/youtube-scraper';

export async function GET(request: NextRequest) {
  try {
    console.log('Getting trending music...');

    const results = await youtubeScraperService.getTrendingMusic();

    return NextResponse.json({
      category: 'music',
      results,
      count: results.length,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('YouTube trending API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get trending music',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}