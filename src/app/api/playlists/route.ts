import { NextRequest, NextResponse } from 'next/server';
import { PlaylistService } from '../../../lib/services/playlistService';
import { SmartPlaylistService } from '../../../lib/services/smartPlaylistService';
import path from 'path';

const playlistService = PlaylistService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

const smartPlaylistService = new SmartPlaylistService(
  path.join(process.cwd(), 'data', 'goodmusic.db'),
  playlistService
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filter = {
      search: searchParams.get('search') || undefined,
      is_smart: searchParams.get('is_smart') ? searchParams.get('is_smart') === 'true' : undefined,
      is_public: searchParams.get('is_public') ? searchParams.get('is_public') === 'true' : undefined,
      is_collaborative: searchParams.get('is_collaborative') ? searchParams.get('is_collaborative') === 'true' : undefined,
      created_by: searchParams.get('created_by') || undefined,
      min_songs: searchParams.get('min_songs') ? parseInt(searchParams.get('min_songs')!) : undefined,
      max_songs: searchParams.get('max_songs') ? parseInt(searchParams.get('max_songs')!) : undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'updated_at',
      sort_order: (searchParams.get('sort_order') as any) || 'desc'
    };

    // Parse tags if provided
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filter.tags = tagsParam.split(',');
    }

    // Parse date filters
    const createdAfter = searchParams.get('created_after');
    if (createdAfter) {
      filter.created_after = new Date(createdAfter);
    }

    const createdBefore = searchParams.get('created_before');
    if (createdBefore) {
      filter.created_before = new Date(createdBefore);
    }

    const playlists = await playlistService.getPlaylists(filter);

    return NextResponse.json({
      success: true,
      data: playlists
    });

  } catch (error) {
    console.error('Get playlists error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get playlists',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, is_smart, smart_criteria, options = {} } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Playlist name is required'
        },
        { status: 400 }
      );
    }

    let playlistId: string;

    if (is_smart && smart_criteria) {
      // Validate smart playlist criteria
      const validation = smartPlaylistService.validateCriteria(smart_criteria);
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

      // Create smart playlist
      playlistId = await smartPlaylistService.createSmartPlaylist(
        name,
        smart_criteria,
        description,
        options.created_by
      );
    } else {
      // Create regular playlist
      playlistId = await playlistService.createPlaylist(
        name,
        description,
        false,
        undefined,
        options
      );
    }

    const playlist = await playlistService.getPlaylist(playlistId);

    return NextResponse.json({
      success: true,
      data: playlist
    });

  } catch (error) {
    console.error('Create playlist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create playlist',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}