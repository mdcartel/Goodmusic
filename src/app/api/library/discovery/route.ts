import { NextRequest, NextResponse } from 'next/server';
import { MusicDiscoveryService } from '../../../../lib/services/musicDiscoveryService';
import path from 'path';

const discoveryService = new MusicDiscoveryService(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    const recommendations = await discoveryService.getDiscoveryRecommendations(userId || undefined);

    return NextResponse.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('Get discovery recommendations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get discovery recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}