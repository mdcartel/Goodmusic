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

export async function GET(request: NextRequest) {
  try {
    const health = await storageService.getStorageHealth();
    
    return NextResponse.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Storage health check failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get storage health',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}