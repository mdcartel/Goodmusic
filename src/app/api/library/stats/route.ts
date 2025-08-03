import { NextRequest, NextResponse } from 'next/server';
import { LibraryService } from '../../../../lib/services/libraryService';
import path from 'path';

const libraryService = LibraryService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET() {
  try {
    const stats = await libraryService.getLibraryStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get library stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get library statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}