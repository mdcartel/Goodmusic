import { NextRequest, NextResponse } from 'next/server';
import { LibraryService } from '../../../../lib/services/libraryService';
import path from 'path';

const libraryService = LibraryService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query is required'
        },
        { status: 400 }
      );
    }

    // Parse filter parameters
    const filter: any = {};
    
    if (searchParams.get('artist')) {
      filter.artist = searchParams.get('artist');
    }
    
    if (searchParams.get('album')) {
      filter.album = searchParams.get('album');
    }
    
    if (searchParams.get('genre')) {
      filter.genre = searchParams.get('genre');
    }
    
    if (searchParams.get('year')) {
      filter.year = parseInt(searchParams.get('year')!);
    }
    
    if (searchParams.get('is_favorite')) {
      filter.is_favorite = searchParams.get('is_favorite') === 'true';
    }
    
    if (searchParams.get('is_downloaded')) {
      filter.is_downloaded = searchParams.get('is_downloaded') === 'true';
    }

    const searchResult = await libraryService.searchLibrary(
      query,
      Object.keys(filter).length > 0 ? filter : undefined,
      limit
    );

    return NextResponse.json({
      success: true,
      data: searchResult
    });

  } catch (error) {
    console.error('Library search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search library',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}