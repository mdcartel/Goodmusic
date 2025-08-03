import { NextRequest, NextResponse } from 'next/server';
import { AdvancedSearchService } from '../../../../lib/services/advancedSearchService';
import path from 'path';

const searchService = new AdvancedSearchService(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      filters,
      sortBy,
      sortOrder,
      limit,
      offset,
      fuzzySearch
    } = body;

    const searchOptions = {
      query: query || '',
      filters,
      sortBy,
      sortOrder,
      limit: limit || 50,
      offset: offset || 0,
      fuzzySearch: fuzzySearch || false
    };

    const result = await searchService.search(searchOptions);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform advanced search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const fuzzySearch = searchParams.get('fuzzySearch') === 'true';

    // Parse filters from query params
    const filters: any = {};
    
    // Duration filters
    const minDuration = searchParams.get('minDuration');
    const maxDuration = searchParams.get('maxDuration');
    if (minDuration || maxDuration) {
      filters.duration = {};
      if (minDuration) filters.duration.min = parseInt(minDuration);
      if (maxDuration) filters.duration.max = parseInt(maxDuration);
    }

    // Quality and format filters
    const quality = searchParams.get('quality');
    if (quality) filters.quality = quality.split(',');
    
    const format = searchParams.get('format');
    if (format) filters.format = format.split(',');

    // Metadata filters
    const artist = searchParams.get('artist');
    if (artist) filters.artist = artist;
    
    const album = searchParams.get('album');
    if (album) filters.album = album;
    
    const genre = searchParams.get('genre');
    if (genre) filters.genre = genre;

    // Boolean filters
    const isDownloaded = searchParams.get('isDownloaded');
    if (isDownloaded !== null) filters.isDownloaded = isDownloaded === 'true';
    
    const isFavorite = searchParams.get('isFavorite');
    if (isFavorite !== null) filters.isFavorite = isFavorite === 'true';

    const searchOptions = {
      query,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      limit,
      offset,
      fuzzySearch
    };

    const result = await searchService.search(searchOptions);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform advanced search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}