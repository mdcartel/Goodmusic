import { NextRequest, NextResponse } from 'next/server';
import { LibraryService } from '../../../../lib/services/libraryService';
import path from 'path';

const libraryService = LibraryService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { song_id, play_duration, completed, source, context } = body;

    if (!song_id || play_duration === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Song ID and play duration are required'
        },
        { status: 400 }
      );
    }

    await libraryService.addToRecentlyPlayed(
      song_id,
      play_duration,
      completed || false,
      source || 'manual',
      context
    );

    return NextResponse.json({
      success: true,
      message: 'Play recorded successfully'
    });

  } catch (error) {
    console.error('Add to recently played error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record play',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}