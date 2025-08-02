import { NextResponse } from 'next/server';

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
      completedAt?: number;
    }>;
    const now = Date.now();

    // Basic statistics
    const basicStats = {
      total: downloads.length,
      queued: downloads.filter(d => d.status === 'queued').length,
      processing: downloads.filter(d => d.status === 'processing').length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length
    };

    // File format breakdown
    const formatStats = {
      mp3: downloads.filter(d => d.format === 'mp3').length,
      mp4: downloads.filter(d => d.format === 'mp4').length
    };

    // Size statistics
    const completedDownloads = downloads.filter(d => d.status === 'completed' && d.fileSize);
    const sizeStats = {
      totalSize: completedDownloads.reduce((sum, d) => sum + (d.fileSize || 0), 0),
      averageSize: completedDownloads.length > 0 
        ? Math.round(completedDownloads.reduce((sum, d) => sum + (d.fileSize || 0), 0) / completedDownloads.length)
        : 0,
      largestFile: completedDownloads.length > 0 
        ? Math.max(...completedDownloads.map(d => d.fileSize || 0))
        : 0,
      smallestFile: completedDownloads.length > 0 
        ? Math.min(...completedDownloads.map(d => d.fileSize || 0))
        : 0
    };

    // Time-based statistics
    const last24Hours = downloads.filter(d => now - d.startTime < 24 * 60 * 60 * 1000);
    const lastHour = downloads.filter(d => now - d.startTime < 60 * 60 * 1000);
    
    const timeStats = {
      last24Hours: last24Hours.length,
      lastHour: lastHour.length,
      completedLast24Hours: last24Hours.filter(d => d.status === 'completed').length,
      failedLast24Hours: last24Hours.filter(d => d.status === 'failed').length
    };

    // Success rate
    const totalAttempts = downloads.filter(d => d.status !== 'queued').length;
    const successRate = totalAttempts > 0 
      ? Math.round((basicStats.completed / totalAttempts) * 100)
      : 0;

    // Average download time (for completed downloads)
    const completedWithTimes = downloads.filter(d => 
      d.status === 'completed' && d.completedAt && d.startTime
    );
    const averageDownloadTime = completedWithTimes.length > 0
      ? Math.round(completedWithTimes.reduce((sum, d) => {
          const completedAt = d.completedAt || d.startTime + 10000; // Fallback
          return sum + (completedAt - d.startTime);
        }, 0) / completedWithTimes.length / 1000) // Convert to seconds
      : 0;

    // Quality breakdown
    const qualityStats = downloads.reduce((acc, d) => {
      const quality = d.quality || 'unknown';
      acc[quality] = (acc[quality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recent activity (last 10 downloads)
    const recentActivity = downloads
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10)
      .map(d => ({
        downloadId: d.id,
        songId: d.songId,
        format: d.format,
        status: d.status,
        startTime: new Date(d.startTime).toISOString(),
        fileSize: d.fileSize
      }));

    // System health
    const systemHealth = {
      activeDownloads: basicStats.processing,
      queueLength: basicStats.queued,
      errorRate: totalAttempts > 0 ? Math.round((basicStats.failed / totalAttempts) * 100) : 0,
      systemLoad: Math.min(100, (basicStats.processing / 5) * 100), // Assuming max 5 concurrent
      uptime: '24h 0m 0s' // Mock uptime
    };

    const response = {
      basic: basicStats,
      formats: formatStats,
      sizes: sizeStats,
      time: timeStats,
      quality: qualityStats,
      performance: {
        successRate,
        averageDownloadTime,
        totalAttempts
      },
      recentActivity,
      systemHealth,
      timestamp: new Date().toISOString(),
      generatedAt: now
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting download statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get download statistics' },
      { status: 500 }
    );
  }
}

// Get download statistics for a specific time period
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startDate, endDate, format, status } = body;

    const globalStore = getGlobalDownloadStore();
    let downloads = Array.from(globalStore.values()) as Array<{
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

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate).getTime();
      downloads = downloads.filter(d => d.startTime >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      downloads = downloads.filter(d => d.startTime <= end);
    }

    // Filter by format
    if (format && ['mp3', 'mp4'].includes(format)) {
      downloads = downloads.filter(d => d.format === format);
    }

    // Filter by status
    if (status && ['queued', 'processing', 'completed', 'failed'].includes(status)) {
      downloads = downloads.filter(d => d.status === status);
    }

    // Generate filtered statistics
    const filteredStats = {
      total: downloads.length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length,
      totalSize: downloads
        .filter(d => d.fileSize)
        .reduce((sum, d) => sum + (d.fileSize || 0), 0),
      averageSize: downloads.length > 0 
        ? Math.round(downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0) / downloads.length)
        : 0,
      filters: {
        startDate,
        endDate,
        format,
        status
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(filteredStats);

  } catch (error) {
    console.error('Error getting filtered download statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get filtered statistics' },
      { status: 500 }
    );
  }
}

// Helper function
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