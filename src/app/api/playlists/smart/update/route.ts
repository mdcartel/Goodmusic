import { NextRequest, NextResponse } from 'next/server';
import { SmartPlaylistService } from '../../../../../lib/services/smartPlaylistService';
import { PlaylistService } from '../../../../../lib/services/playlistService';
import path from 'path';

const playlistService = PlaylistService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

const smartPlaylistService = new SmartPlaylistService(
  path.join(process.cwd(), 'data', 'goodmusic.db'),
  playlistService
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlist_id } = body;

    if (playlist_id) {
      // Update specific smart playlist
      await smartPlaylistService.updateSmartPlaylist(playlist_id);
      
      const updatedPlaylist = await playlistService.getPlaylist(playlist_id);
      
      return NextResponse.json({
        success: true,
        data: updatedPlaylist,
        message: 'Smart playlist updated successfully'
      });
    } else {
      // Update all smart playlists
      await smartPlaylistService.updateAllSmartPlaylists();
      
      return NextResponse.json({
        success: true,
        message: 'All smart playlists updated successfully'
      });
    }

  } catch (error) {
    console.error('Update smart playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update smart playlist',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}