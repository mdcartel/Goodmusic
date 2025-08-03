import { NextRequest, NextResponse } from 'next/server';
import { AdvancedSearchService } from '../../../../lib/services/advancedSearchService';
import path from 'path';

const searchService = new AdvancedSearchService(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET() {
  try {
    const savedSearches = await searchService.getSavedSearches();

    return NextResponse.json({
      success: true,
      data: savedSearches
    });

  } catch (error) {
    console.error('Get saved searches error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get saved searches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, query, filters } = body;

    if (!name || !query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and query are required'
        },
        { status: 400 }
      );
    }

    const id = await searchService.saveSearch(name, query, filters);

    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Search saved successfully'
    });

  } catch (error) {
    console.error('Save search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}