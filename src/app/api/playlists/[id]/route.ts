import { NextRequest, NextResponse } from 'next/server';
import { PlaylistService } from '../../../../lib/services/playlistService';
import { SmartPlaylistService } from '../../../../lib/services/smartPlaylistService';
import path from 'path';

const playlistService = PlaylistService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

const smartPlaylistService = new SmartPlaylistService(
  path.join(process.cwd(), 'data', 'goodmusic.db'),
  playlistService
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlist = await playlistService.getPlaylist(params.id);

    if (!playlist) {
      return NextResponse.json(
        {
          success: false,
          error: 'Playlist not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: playlist
    });

  } catch (error) {
    console.error('Get playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get playlist',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { updates, user_id } = body;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Updates object is required'
        },
        { status: 400 }
      );
    }

    // Validate smart playlist criteria if updating
    if (updates.smart_criteria) {
      const validation = smartPlaylistService.validateCriteria(updates.smart_criteria);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid smart playlist criteria',
            details: validation.errors
          },
          { status: 400 }
        );
      }
    }

    await playlistService.updatePlaylist(params.id, updates, user_id);

    // If it's a smart playlist and criteria were updated, refresh the playlist
    const playlist = await playlistService.getPlaylist(params.id);
    if (playlist?.is_smart && updates.smart_criteria) {
      await smartPlaylistService.updateSmartPlaylist(params.id);
    }

    const updatedPlaylist = await playlistService.getPlaylist(params.id);

    return NextResponse.json({
      success: true,
      data: updatedPlaylist
    });

  } catch (error) {
    console.error('Update playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update playlist',
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    await playlistService.deletePlaylist(params.id, userId || undefined);

    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully'
    });

  } catch (error) {
    console.error('Delete playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete playlist',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}