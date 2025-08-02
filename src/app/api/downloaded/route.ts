// Downloaded content management API for VibePipe MVP
// Handles local file indexing, playback sources, and content management

import { NextRequest, NextResponse } from 'next/server';
import { DownloadedContentManager } from '@/lib/downloadedContentManager';

// GET /api/downloaded - Get downloaded songs and content statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const mood = searchParams.get('mood');
    const format = searchParams.get('format') as 'mp3' | 'mp4' | null;
    const query = searchParams.get('q');

    const contentManager = DownloadedContentManager.getInstance();

    switch (action) {
      case 'list':
        let songs = contentManager.getDownloadedSongs();
        
        // Apply filters
        if (mood) {
          songs = contentManager.getDownloadedSongsByMood(mood);
        }
        if (format) {
          songs = contentManager.getDownloadedSongsByFormat(format);
        }
        if (query) {
          songs = contentManager.searchDownloadedSongs(query);
        }

        return NextResponse.json({
          success: true,
          data: {
            songs,
            total: songs.length,
            filters: { mood, format, query }
          }
        });

      case 'stats':
        const stats = contentManager.getContentStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'index-info':
        const indexInfo = contentManager.getIndexInfo();
        return NextResponse.json({
          success: true,
          data: indexInfo
        });

      case 'playback-source':
        const songId = searchParams.get('songId');
        if (!songId) {
          return NextResponse.json(
            { success: false, error: 'Song ID required' },
            { status: 400 }
          );
        }

        const playbackSource = await contentManager.getPlaybackSource(songId);
        return NextResponse.json({
          success: true,
          data: playbackSource
        });

      case 'verify':
        const integrity = await contentManager.verifyIndexIntegrity();
        return NextResponse.json({
          success: true,
          data: integrity
        });

      case 'export':
        const exportData = contentManager.exportIndex();
        return NextResponse.json({
          success: true,
          data: {
            index: exportData,
            filename: `vibepipe-index-${new Date().toISOString().split('T')[0]}.json`
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Downloaded content API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/downloaded - Manage downloaded content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const contentManager = DownloadedContentManager.getInstance();

    switch (action) {
      case 'rebuild-index':
        await contentManager.rebuildIndex();
        return NextResponse.json({
          success: true,
          message: 'Content index rebuilt successfully'
        });

      case 'cleanup':
        const cleanupOptions = {
          olderThanDays: params.olderThanDays || 30,
          maxTotalSize: params.maxTotalSize || 1024 * 1024 * 1024, // 1GB
          keepFavorites: params.keepFavorites !== false,
          dryRun: params.dryRun === true
        };

        const cleanupResult = await contentManager.cleanupDownloads(cleanupOptions);
        return NextResponse.json({
          success: true,
          data: cleanupResult,
          message: params.dryRun 
            ? 'Cleanup simulation completed'
            : 'Cleanup completed successfully'
        });

      case 'add-song':
        const { download, song } = params;
        if (!download || !song) {
          return NextResponse.json(
            { success: false, error: 'Download and song data required' },
            { status: 400 }
          );
        }

        await contentManager.addDownloadedSong(download, song);
        return NextResponse.json({
          success: true,
          message: 'Song added to downloaded content'
        });

      case 'remove-song':
        const { downloadId } = params;
        if (!downloadId) {
          return NextResponse.json(
            { success: false, error: 'Download ID required' },
            { status: 400 }
          );
        }

        const removed = await contentManager.removeDownloadedSong(downloadId);
        return NextResponse.json({
          success: true,
          data: { removed },
          message: removed ? 'Song removed successfully' : 'Song not found'
        });

      case 'import-index':
        const { indexData } = params;
        if (!indexData) {
          return NextResponse.json(
            { success: false, error: 'Index data required' },
            { status: 400 }
          );
        }

        const imported = await contentManager.importIndex(indexData);
        return NextResponse.json({
          success: imported,
          message: imported 
            ? 'Index imported successfully'
            : 'Failed to import index'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Downloaded content management error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Content management operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/downloaded - Remove downloaded content
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const downloadId = searchParams.get('downloadId');
    const action = searchParams.get('action') || 'remove-song';

    const contentManager = DownloadedContentManager.getInstance();

    switch (action) {
      case 'remove-song':
        if (!downloadId) {
          return NextResponse.json(
            { success: false, error: 'Download ID required' },
            { status: 400 }
          );
        }

        const removed = await contentManager.removeDownloadedSong(downloadId);
        return NextResponse.json({
          success: true,
          data: { removed },
          message: removed ? 'Song removed successfully' : 'Song not found'
        });

      case 'cleanup-unavailable':
        // Remove all songs marked as unavailable
        const songs = contentManager.getDownloadedSongs();
        const unavailableSongs = songs.filter(song => !song.isAvailable);
        
        let removedCount = 0;
        for (const song of unavailableSongs) {
          const removed = await contentManager.removeDownloadedSong(song.downloadId);
          if (removed) removedCount++;
        }

        return NextResponse.json({
          success: true,
          data: { removedCount },
          message: `Removed ${removedCount} unavailable songs`
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Downloaded content deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}