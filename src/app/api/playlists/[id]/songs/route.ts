import { NextRequest, NextResponse } from 'next/server';
import { PlaylistService } from '../../../../../lib/services/playlistService';
import path from 'path';

const playlistService = PlaylistService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const songs = await playlistService.getPlaylistSongs(params.id);

    return NextResponse.json({
      success: true,
      data: songs
    });

  } catch (error) {
    console.error('Get playlist songs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get playlist songs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { song_id, position, user_id } = body;

    if (!song_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Song ID is required'
        },
        { status: 400 }
      );
    }

    await playlistService.addSongToPlaylist(
      params.id,
      song_id,
      position,
      user_id
    );

    const updatedSongs = await playlistService.getPlaylistSongs(params.id);

    return NextResponse.json({
      success: true,
      data: updatedSongs,
      message: 'Song added to playlist'
    });

  } catch (error) {
    console.error('Add song to playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add song to playlist',
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
    const songId = searchParams.get('song_id');
    const userId = searchParams.get('user_id');

    if (!songId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Song ID is required'
        },
        { status: 400 }
      );
    }

    await playlistService.removeSongFromPlaylist(
      params.id,
      songId,
      userId || undefined
    );

    const updatedSongs = await playlistService.getPlaylistSongs(params.id);

    return NextResponse.json({
      success: true,
      data: updatedSongs,
      message: 'Song removed from playlist'
    });

  } catch (error) {
    console.error('Remove song from playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove song from playlist',
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
    const { song_id, new_position, user_id } = body;

    if (!song_id || new_position === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Song ID and new position are required'
        },
        { status: 400 }
      );
    }

    await playlistService.reorderSong(
      params.id,
      song_id,
      new_position,
      user_id
    );

    const updatedSongs = await playlistService.getPlaylistSongs(params.id);

    return NextResponse.json({
      success: true,
      data: updatedSongs,
      message: 'Song reordered in playlist'
    });

  } catch (error) {
    console.error('Reorder song in playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reorder song in playlist',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}