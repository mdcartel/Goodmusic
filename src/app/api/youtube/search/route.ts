import { NextRequest, NextResponse } from 'next/server';
import { youtubeScraperService } from '@/lib/services/youtube-scraper';
import { SearchFilters } from '@/lib/store/types';

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

    // Parse filters from query parameters
    const filters: SearchFilters = {};
    
    const duration = searchParams.get('duration');
    if (duration && ['short', 'medium', 'long'].includes(duration)) {
      filters.duration = duration as 'short' | 'medium' | 'long';
    }

    const uploadDate = searchParams.get('upload_date');
    if (uploadDate && ['hour', 'today', 'week', 'month', 'year'].includes(uploadDate)) {
      filters.uploadDate = uploadDate as 'hour' | 'today' | 'week' | 'month' | 'year';
    }

    const sortBy = searchParams.get('sort_by');
    if (sortBy && ['relevance', 'date', 'views', 'rating'].includes(sortBy)) {
      filters.sortBy = sortBy as 'relevance' | 'date' | 'views' | 'rating';
    }

    console.log(`Searching YouTube for: "${query}" with filters:`, filters);

    const results = await youtubeScraperService.search(query, filters);

    return NextResponse.json({
      query,
      filters,
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('YouTube search API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required in request body' },
        { status: 400 }
      );
    }

    console.log(`Searching YouTube for: "${query}" with filters:`, filters);

    const results = await youtubeScraperService.search(query, filters);

    return NextResponse.json({
      query,
      filters,
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('YouTube search API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}