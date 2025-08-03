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
    const report = await storageService.checkFileIntegrity();
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('File integrity check failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check file integrity',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Trigger integrity check and repair
    const report = await storageService.checkFileIntegrity();
    
    return NextResponse.json({
      success: true,
      message: 'File integrity check completed',
      data: report
    });
  } catch (error) {
    console.error('File integrity repair failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to repair file integrity',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}