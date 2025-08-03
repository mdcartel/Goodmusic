import { NextRequest, NextResponse } from 'next/server';
import { audioExtractionService } from '../../../../lib/services/audio-extraction';

export async function GET() {
  try {
    const stats = audioExtractionService.getCacheStats();

    return NextResponse.json({
      success: true,
      data: {
        cacheSize: stats.size,
        cachedEntries: stats.entries.length,
        entries: stats.entries
      }
    });

  } catch (error) {
    console.error('Cache stats error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cache statistics'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    audioExtractionService.clearCache();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache'
      },
      { status: 500 }
    );
  }
}