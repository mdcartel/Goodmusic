import { NextRequest, NextResponse } from 'next/server';
import { PlaylistService } from '../../../../lib/services/playlistService';
import path from 'path';

const playlistService = PlaylistService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET() {
  try {
    const stats = await playlistService.getPlaylistStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get playlist stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get playlist statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}