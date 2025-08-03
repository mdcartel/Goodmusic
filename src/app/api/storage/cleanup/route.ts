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
    const body = await request.json();
    const {
      removeDuplicates = true,
      removeEmptyDirs = true,
      removeCorruptFiles = false
    } = body;

    const result = await storageService.cleanup({
      removeDuplicates,
      removeEmptyDirs,
      removeCorruptFiles
    });
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Storage cleanup failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup storage',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}