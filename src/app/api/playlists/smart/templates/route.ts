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

export async function GET() {
  try {
    const templates = smartPlaylistService.getSmartPlaylistTemplates();

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Get smart playlist templates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get smart playlist templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}