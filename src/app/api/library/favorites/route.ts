import { NextRequest, NextResponse } from 'next/server';
import { LibraryService } from '../../../../lib/services/libraryService';
import path from 'path';

const libraryService = LibraryService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { song_id, user_id } = body;

    if (!song_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Song ID is required'
        },
        { status: 400 }
      );
    }

    await libraryService.addToFavorites(song_id, user_id);

    return NextResponse.json({
      success: true,
      message: 'Song added to favorites'
    });

  } catch (error) {
    console.error('Add to favorites error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add song to favorites',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('song_id');

    if (!songId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Song ID is required'
        },
        { status: 400 }
      );
    }

    await libraryService.removeFromFavorites(songId);

    return NextResponse.json({
      success: true,
      message: 'Song removed from favorites'
    });

  } catch (error) {
    console.error('Remove from favorites error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove song from favorites',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}