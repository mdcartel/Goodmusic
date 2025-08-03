import { NextRequest, NextResponse } from 'next/server';
import { AdvancedSearchService } from '../../../../lib/services/advancedSearchService';
import path from 'path';

const searchService = new AdvancedSearchService(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const history = await searchService.getSearchHistory(limit);

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Get search history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get search history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await searchService.clearSearchHistory();

    return NextResponse.json({
      success: true,
      message: 'Search history cleared'
    });

  } catch (error) {
    console.error('Clear search history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear search history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}