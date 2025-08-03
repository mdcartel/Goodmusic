import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '../../../../lib/services/storageService';
import path from 'path';

const storageService = new StorageService({
  databasePath: path.join(process.cwd(), 'data', 'goodmusic.db'),
  storageConfig: {
    baseDirectory: path.join(process.cwd(), 'data', 'music'),
    maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
    warningThreshold: 80,
    autoCleanup: true,
    organizationConfig: {
      baseDirectory: path.join(process.cwd(), 'data', 'music'),
      structure: 'artist-album',
      sanitizeNames: true,
      maxPathLength: 260,
      duplicateHandling: 'rename'
    }
  }
});

export async function POST(request: NextRequest) {
  try {
    const result = await storageService.performMaintenance();
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Storage maintenance failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform maintenance',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await storageService.getDetailedStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get detailed stats:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get storage statistics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}