import { NextRequest, NextResponse } from 'next/server';

interface FileParams {
  downloadId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<FileParams> }
) {
  try {
    const { downloadId } = await params;

    if (!downloadId) {
      return NextResponse.json(
        { error: 'Download ID is required' },
        { status: 400 }
      );
    }

    // Get download info from global store
    const download = getDownloadFromGlobalStore(downloadId) as {
      id: string;
      format: string;
      status: string;
      fileSize?: number;
      startTime: number;
    } | null;

    if (!download) {
      return NextResponse.json(
        { error: 'Download not found' },
        { status: 404 }
      );
    }

    if (download.status !== 'completed') {
      return NextResponse.json(
        { error: 'Download not completed yet' },
        { status: 400 }
      );
    }

    // In a real implementation, this would serve the actual file
    // For demo purposes, we'll return a redirect to a placeholder
    const { searchParams } = new URL(request.url);
    const inline = searchParams.get('inline') === 'true';

    // Generate appropriate headers for file download
    const headers = new Headers({
      'Content-Type': download.format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
      'Content-Disposition': inline 
        ? `inline; filename="${downloadId}.${download.format}"`
        : `attachment; filename="${downloadId}.${download.format}"`,
      'Content-Length': download.fileSize?.toString() || '0',
      'Cache-Control': 'private, max-age=3600',
      'X-Download-ID': downloadId
    });

    // For demo purposes, return a response indicating the file would be served
    // In production, this would stream the actual file content
    return NextResponse.json({
      message: 'File download would start here',
      downloadId,
      filename: `${downloadId}.${download.format}`,
      contentType: download.format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
      fileSize: download.fileSize,
      note: 'In production, this would stream the actual file content'
    }, { headers });

  } catch (error) {
    console.error('Error serving download file:', error);
    return NextResponse.json(
      { error: 'Failed to serve download file' },
      { status: 500 }
    );
  }
}

// Get file metadata without downloading
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<FileParams> }
) {
  try {
    const { downloadId } = await params;

    if (!downloadId) {
      return new NextResponse(null, { status: 400 });
    }

    const download = getDownloadFromGlobalStore(downloadId) as {
      id: string;
      format: string;
      status: string;
      fileSize?: number;
      startTime: number;
    } | null;

    if (!download || download.status !== 'completed') {
      return new NextResponse(null, { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': download.format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
      'Content-Length': download.fileSize?.toString() || '0',
      'Accept-Ranges': 'bytes',
      'Last-Modified': new Date(download.startTime + 10000).toUTCString(),
      'X-Download-ID': downloadId
    });

    return new NextResponse(null, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error getting file metadata:', error);
    return new NextResponse(null, { status: 500 });
  }
}

// Helper function to access global download store
function getDownloadFromGlobalStore(downloadId: string) {
  if (typeof global !== 'undefined') {
    const globalObj = global as { downloadStore?: Map<string, unknown> };
    const globalStore = globalObj.downloadStore;
    if (globalStore) {
      return globalStore.get(downloadId);
    }
  }
  
  // Fallback for demo
  return {
    id: downloadId,
    format: 'mp3' as const,
    status: 'completed' as const,
    fileSize: Math.floor(Math.random() * 10000000) + 1000000,
    startTime: Date.now() - 60000
  };
}