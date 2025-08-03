import { NextRequest, NextResponse } from 'next/server';
import { AdvancedSearchService } from '../../../../../lib/services/advancedSearchService';
import path from 'path';

const searchService = new AdvancedSearchService(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const savedSearch = await searchService.useSavedSearch(params.id);

    if (!savedSearch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Saved search not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: savedSearch
    });

  } catch (error) {
    console.error('Get saved search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get saved search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await searchService.deleteSavedSearch(params.id);

    return NextResponse.json({
      success: true,
      message: 'Saved search deleted'
    });

  } catch (error) {
    console.error('Delete saved search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete saved search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}