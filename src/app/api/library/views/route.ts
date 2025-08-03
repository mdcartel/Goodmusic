import { NextRequest, NextResponse } from 'next/server';
import { LibraryService } from '../../../../lib/services/libraryService';
import path from 'path';

const libraryService = LibraryService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viewType = searchParams.get('type') as any;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    if (!viewType) {
      return NextResponse.json(
        {
          success: false,
          error: 'View type is required'
        },
        { status: 400 }
      );
    }

    // Parse filter parameters
    const filter: any = {};
    
    if (searchParams.get('search')) {
      filter.search = searchParams.get('search');
    }
    
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
    
    if (searchParams.get('year_from') && searchParams.get('year_to')) {
      filter.year_range = {
        from: parseInt(searchParams.get('year_from')!),
        to: parseInt(searchParams.get('year_to')!)
      };
    }
    
    if (searchParams.get('is_favorite')) {
      filter.is_favorite = searchParams.get('is_favorite') === 'true';
    }
    
    if (searchParams.get('is_downloaded')) {
      filter.is_downloaded = searchParams.get('is_downloaded') === 'true';
    }

    // Parse sort parameters
    const sort: any = {};
    
    if (searchParams.get('sort_field')) {
      sort.field = searchParams.get('sort_field');
    }
    
    if (searchParams.get('sort_order')) {
      sort.order = searchParams.get('sort_order');
    }

    const libraryView = await libraryService.getLibraryView(
      viewType,
      Object.keys(filter).length > 0 ? filter : undefined,
      Object.keys(sort).length > 0 ? sort : undefined,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      data: libraryView
    });

  } catch (error) {
    console.error('Get library view error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get library view',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}