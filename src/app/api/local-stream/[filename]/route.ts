// Local file streaming API for VibePipe MVP
// Serves downloaded files from secure storage

import { NextRequest, NextResponse } from 'next/server';
import { FileStorageService } from '@/lib/fileStorage';
import { DownloadedContentManager } from '@/lib/downloadedContentManager';

interface RouteParams {
  params: {
    filename: string;
  };
}

// GET /api/local-stream/[filename] - Stream local downloaded file
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { filename } = params;
    const decodedFilename = decodeURIComponent(filename);

    const fileStorage = FileStorageService.getInstance();
    const contentManager = DownloadedContentManager.getInstance();

    // Find the song by filename
    const downloadedSongs = contentManager.getDownloadedSongs();
    const song = downloadedSongs.find(s => 
      s.filePath.endsWith(decodedFilename) || 
      s.filePath.includes(decodedFilename)
    );

    if (!song) {
      return NextResponse.json(
        { success: false, error: 'File not found in downloaded content' },
        { status: 404 }
      );
    }

    // Validate file path
    if (!fileStorage.validateFilePath(song.filePath)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Check if file exists
    const fileExists = await fileStorage.fileExists(song.filePath);
    if (!fileExists) {
      return NextResponse.json(
        { success: false, error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // For web version, we simulate file streaming
    // In a real implementation, this would stream the actual file
    const response = new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Local file streaming (simulated)',
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          format: song.format,
          filePath: song.filePath,
          fileSize: song.fileSize
        },
        streamUrl: `/api/stream/${song.id}`, // Fallback to regular streaming
        note: 'In production, this would stream the actual downloaded file'
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Source': 'local-download'
        }
      }
    );

    return response;
  } catch (error) {
    console.error('Local streaming error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to stream local file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// HEAD /api/local-stream/[filename] - Check if local file is available
export async function HEAD(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { filename } = params;
    const decodedFilename = decodeURIComponent(filename);

    const fileStorage = FileStorageService.getInstance();
    const contentManager = DownloadedContentManager.getInstance();

    // Find the song by filename
    const downloadedSongs = contentManager.getDownloadedSongs();
    const song = downloadedSongs.find(s => 
      s.filePath.endsWith(decodedFilename) || 
      s.filePath.includes(decodedFilename)
    );

    if (!song) {
      return new NextResponse(null, { status: 404 });
    }

    // Validate file path
    if (!fileStorage.validateFilePath(song.filePath)) {
      return new NextResponse(null, { status: 403 });
    }

    // Check if file exists
    const fileExists = await fileStorage.fileExists(song.filePath);
    if (!fileExists) {
      return new NextResponse(null, { status: 404 });
    }

    // Return file info in headers
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Length': song.fileSize.toString(),
        'Content-Type': song.format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Source': 'local-download',
        'X-File-Format': song.format,
        'X-Song-Title': song.title,
        'X-Song-Artist': song.artist || 'Unknown'
      }
    });
  } catch (error) {
    console.error('Local file check error:', error);
    return new NextResponse(null, { status: 500 });
  }
}