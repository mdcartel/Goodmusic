import { NextRequest, NextResponse } from 'next/server';
import { youtubeScraperService } from '@/lib/services/youtube-scraper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({
        query,
        suggestions: [],
      });
    }

    console.log(`Getting search suggestions for: "${query}"`);

    const suggestions = await youtubeScraperService.getSearchSuggestions(query);

    return NextResponse.json({
      query,
      suggestions,
      count: suggestions.length,
    });

  } catch (error) {
    console.error('YouTube suggestions API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}