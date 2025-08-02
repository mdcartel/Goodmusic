import { NextRequest, NextResponse } from 'next/server';
import { DownloadStatusResponse } from '@/types';

// Note: In a real application, this would be stored in a database or Redis

interface StatusParams {
  downloadId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<StatusParams> }
) {
  try {
    const { downloadId } = await params;

    if (!downloadId) {
      return NextResponse.json(
        { error: 'Download ID is required' },
        { status: 400 }
      );
    }

    // Get download from our in-memory store
    // In production, this would query a database
    const downloadData = getDownloadFromGlobalStore(downloadId);

    if (!downloadData) {
      return NextResponse.json(
        { error: 'Download not found' },
        { status: 404 }
      );
    }

    const download = downloadData as {
      id: string;
      status: string;
      progress: number;
      filePath?: string;
      error?: string;
      fileSize?: number;
      startTime: number;
    };

    const response: DownloadStatusResponse = {
      downloadId: download.id,
      status: download.status,
      progress: download.progress,
      filePath: download.filePath,
      error: download.error
    };

    // Add additional metadata for completed downloads
    if (download.status === 'completed') {
      const extendedResponse = {
        ...response,
        fileSize: download.fileSize,
        completedAt: new Date(download.startTime + 10000).toISOString(), // Simulate completion time
        downloadUrl: `/api/download/${downloadId}/file`
      };
      return NextResponse.json(extendedResponse);
    }

    // Add ETA for processing downloads
    if (download.status === 'processing') {
      const elapsed = Date.now() - download.startTime;
      const estimatedTotal = download.progress > 0 ? (elapsed / download.progress) * 100 : 0;
      const eta = Math.max(0, estimatedTotal - elapsed);

      const extendedResponse = {
        ...response,
        eta: Math.round(eta / 1000), // ETA in seconds
        speed: download.fileSize ? Math.round((download.fileSize * download.progress / 100) / (elapsed / 1000)) : undefined
      };
      return NextResponse.json(extendedResponse);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting download status:', error);
    return NextResponse.json(
      { error: 'Failed to get download status' },
      { status: 500 }
    );
  }
}

// Cancel a download
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<StatusParams> }
) {
  try {
    const { downloadId } = await params;

    if (!downloadId) {
      return NextResponse.json(
        { error: 'Download ID is required' },
        { status: 400 }
      );
    }

    const downloadData = getDownloadFromGlobalStore(downloadId);

    if (!downloadData) {
      return NextResponse.json(
        { error: 'Download not found' },
        { status: 404 }
      );
    }

    const download = downloadData as {
      id: string;
      status: string;
      progress: number;
      filePath?: string;
      error?: string;
      fileSize?: number;
      startTime: number;
    };

    if (download.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed download' },
        { status: 400 }
      );
    }

    // Cancel the download
    const updatedDownload = {
      ...download,
      status: 'failed',
      error: 'Download cancelled by user'
    };
    updateDownloadInGlobalStore(downloadId, updatedDownload);

    return NextResponse.json({
      downloadId,
      status: 'cancelled',
      message: 'Download cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling download:', error);
    return NextResponse.json(
      { error: 'Failed to cancel download' },
      { status: 500 }
    );
  }
}

// Helper functions to access the global download store
// In a real application, these would be database operations
function getDownloadFromGlobalStore(downloadId: string) {
  // This is a workaround for the in-memory store
  // In production, use a proper database or Redis
  if (typeof global !== 'undefined') {
    const globalObj = global as { downloadStore?: Map<string, unknown> };
    const globalStore = globalObj.downloadStore;
    if (globalStore) {
      return globalStore.get(downloadId);
    }
  }
  
  // Fallback: create a mock download for demo purposes
  return {
    id: downloadId,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    format: 'mp3' as const,
    quality: '192',
    status: 'processing' as const,
    progress: Math.floor(Math.random() * 100),
    startTime: Date.now() - Math.random() * 60000,
    fileSize: Math.floor(Math.random() * 10000000) + 1000000
  };
}

function updateDownloadInGlobalStore(downloadId: string, download: Record<string, unknown>) {
  if (typeof global !== 'undefined') {
    const globalObj = global as { downloadStore?: Map<string, unknown> };
    const globalStore = globalObj.downloadStore;
    if (globalStore) {
      globalStore.set(downloadId, download);
    }
  }
}

// Initialize global store if it doesn't exist
if (typeof global !== 'undefined') {
  const globalObj = global as { downloadStore?: Map<string, unknown> };
  if (!globalObj.downloadStore) {
    globalObj.downloadStore = new Map();
  }
}