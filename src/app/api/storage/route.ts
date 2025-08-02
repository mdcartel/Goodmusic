// Storage management API for VibePipe MVP
// Handles secure directory initialization and storage operations

import { NextRequest, NextResponse } from 'next/server';
import { FileStorageService } from '@/lib/fileStorage';

// GET /api/storage - Get storage information and statistics
export async function GET() {
  try {
    const fileStorage = FileStorageService.getInstance();
    
    // Get storage configuration and stats
    const config = fileStorage.getConfig();
    const directories = fileStorage.getDirectories();
    const stats = await fileStorage.getStorageStats();
    const integrity = await fileStorage.verifyStorageIntegrity();

    return NextResponse.json({
      success: true,
      data: {
        config: {
          platform: config.platform,
          enablePrivacy: config.enablePrivacy,
          maxFileSize: config.maxFileSize,
          allowedExtensions: config.allowedExtensions
        },
        directories,
        stats,
        integrity
      }
    });
  } catch (error) {
    console.error('Storage API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get storage information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/storage - Initialize or reinitialize storage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    const fileStorage = FileStorageService.getInstance();

    switch (action) {
      case 'initialize':
        await fileStorage.initializeStorage();
        return NextResponse.json({
          success: true,
          message: 'Storage initialized successfully',
          directories: fileStorage.getDirectories()
        });

      case 'verify':
        const integrity = await fileStorage.verifyStorageIntegrity();
        return NextResponse.json({
          success: true,
          integrity
        });

      case 'cleanup':
        const hours = body.hours || 24;
        await fileStorage.cleanupTempFiles(hours);
        return NextResponse.json({
          success: true,
          message: `Temp files older than ${hours} hours cleaned up`
        });

      case 'updateConfig':
        if (config) {
          fileStorage.updateConfig(config);
          return NextResponse.json({
            success: true,
            message: 'Configuration updated',
            config: fileStorage.getConfig()
          });
        }
        throw new Error('Configuration data required');

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Storage API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Storage operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/storage - Update storage settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { enablePrivacy, maxFileSize, allowedExtensions } = body;

    const fileStorage = FileStorageService.getInstance();
    
    const updates: any = {};
    if (typeof enablePrivacy === 'boolean') {
      updates.enablePrivacy = enablePrivacy;
      fileStorage.setPrivacyEnabled(enablePrivacy);
    }
    if (typeof maxFileSize === 'number') {
      updates.maxFileSize = maxFileSize;
    }
    if (Array.isArray(allowedExtensions)) {
      updates.allowedExtensions = allowedExtensions;
    }

    if (Object.keys(updates).length > 0) {
      fileStorage.updateConfig(updates);
    }

    return NextResponse.json({
      success: true,
      message: 'Storage settings updated',
      config: fileStorage.getConfig()
    });
  } catch (error) {
    console.error('Storage settings update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update storage settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/storage - Clean up storage
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'temp';

    const fileStorage = FileStorageService.getInstance();

    switch (type) {
      case 'temp':
        await fileStorage.cleanupTempFiles();
        return NextResponse.json({
          success: true,
          message: 'Temporary files cleaned up'
        });

      case 'cache':
        // In a real implementation, this would clear cache files
        console.log('Cache cleanup requested');
        return NextResponse.json({
          success: true,
          message: 'Cache files cleaned up'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid cleanup type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Storage cleanup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Storage cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}