import { NextRequest, NextResponse } from 'next/server';
import { AdvancedSearchService } from '../../../../lib/services/advancedSearchService';
import path from 'path';

const searchService = new AdvancedSearchService(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      // Return popular search terms if no query
      const popularTerms = await searchService.getPopularSearchTerms(limit);
      return NextResponse.json({
        success: true,
        data: popularTerms.map(term => term.text)
      });
    }

    const suggestions = await searchService.generateSearchSuggestions(query);

    return NextResponse.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get search suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}