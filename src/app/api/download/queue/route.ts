import { NextRequest, NextResponse } from 'next/server';

// Get download queue status
export async function GET() {
  try {
    const globalStore = getGlobalDownloadStore();
    const downloads = Array.from(globalStore.values()) as Array<{
      id: string;
      songId?: string;
      youtubeUrl: string;
      format: 'mp3' | 'mp4';
      quality: string;
      status: 'queued' | 'processing' | 'completed' | 'failed';
      progress: number;
      startTime: number;
      filePath?: string;
      fileSize?: number;
      error?: string;
    }>;

    const queueStats = {
      total: downloads.length,
      queued: downloads.filter(d => d.status === 'queued').length,
      processing: downloads.filter(d => d.status === 'processing').length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length,
      totalSize: downloads
        .filter(d => d.fileSize)
        .reduce((sum, d) => sum + (d.fileSize || 0), 0)
    };

    const queueItems = downloads
      .filter(d => d.status === 'queued' || d.status === 'processing')
      .sort((a, b) => a.startTime - b.startTime)
      .map(d => ({
        downloadId: d.id,
        songId: d.songId,
        format: d.format,
        quality: d.quality,
        status: d.status,
        progress: d.progress,
        queuePosition: d.status === 'queued' ? 
          downloads.filter(x => x.status === 'queued' && x.startTime <= d.startTime).length : 0
      }));

    return NextResponse.json({
      stats: queueStats,
      queue: queueItems,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting download queue:', error);
    return NextResponse.json(
      { error: 'Failed to get download queue' },
      { status: 500 }
    );
  }
}

// Clear completed downloads from queue
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const globalStore = getGlobalDownloadStore();
    let removedCount = 0;

    if (action === 'completed') {
      // Remove only completed downloads
      for (const [id, download] of globalStore.entries()) {
        const typedDownload = download as { status: string };
        if (typedDownload.status === 'completed') {
          globalStore.delete(id);
          removedCount++;
        }
      }
    } else if (action === 'failed') {
      // Remove only failed downloads
      for (const [id, download] of globalStore.entries()) {
        const typedDownload = download as { status: string };
        if (typedDownload.status === 'failed') {
          globalStore.delete(id);
          removedCount++;
        }
      }
    } else if (action === 'all') {
      // Remove all downloads (except processing ones)
      for (const [id, download] of globalStore.entries()) {
        const typedDownload = download as { status: string };
        if (typedDownload.status !== 'processing') {
          globalStore.delete(id);
          removedCount++;
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: completed, failed, or all' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Removed ${removedCount} downloads`,
      action,
      removedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing download queue:', error);
    return NextResponse.json(
      { error: 'Failed to clear download queue' },
      { status: 500 }
    );
  }
}

// Pause/resume download queue processing
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be pause or resume' },
        { status: 400 }
      );
    }

    // In a real implementation, this would pause/resume the download processor
    // For demo purposes, we'll just return a success response
    const globalState = getGlobalQueueState();
    globalState.paused = action === 'pause';

    return NextResponse.json({
      message: `Download queue ${action}d`,
      action,
      paused: globalState.paused,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating download queue:', error);
    return NextResponse.json(
      { error: 'Failed to update download queue' },
      { status: 500 }
    );
  }
}

// Helper functions
function getGlobalDownloadStore(): Map<string, unknown> {
  if (typeof global !== 'undefined') {
    const globalObj = global as { downloadStore?: Map<string, unknown> };
    if (!globalObj.downloadStore) {
      globalObj.downloadStore = new Map();
    }
    return globalObj.downloadStore;
  }
  return new Map();
}

function getGlobalQueueState(): { paused: boolean } {
  if (typeof global !== 'undefined') {
    const globalObj = global as { queueState?: { paused: boolean } };
    if (!globalObj.queueState) {
      globalObj.queueState = { paused: false };
    }
    return globalObj.queueState;
  }
  return { paused: false };
}