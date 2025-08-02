'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Song } from '@/types';
import { DownloadManager, DownloadProgress, DownloadOptions } from '@/lib/downloadManager';

export interface UseDownloadManagerReturn {
  downloads: Download[];
  statistics: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    queued: number;
    totalSize: number;
  };
  startDownload: (song: Song, options: DownloadOptions) => Promise<string>;
  cancelDownload: (downloadId: string) => Promise<boolean>;
  retryDownload: (downloadId: string) => Promise<boolean>;
  clearCompleted: () => void;
  clearAll: () => void;
  getDownloadStatus: (downloadId: string) => Download | null;
  isDownloading: (songId: string) => boolean;
  getDownloadProgress: (songId: string) => number;
}

export function useDownloadManager(): UseDownloadManagerReturn {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    queued: 0,
    totalSize: 0
  });

  const downloadManager = DownloadManager.getInstance();

  // Update downloads and statistics
  const updateState = useCallback(() => {
    const allDownloads = downloadManager.getAllDownloads();
    const stats = downloadManager.getStatistics();
    
    setDownloads([...allDownloads]);
    setStatistics(stats);
  }, [downloadManager]);

  // Set up event listeners
  useEffect(() => {
    const handleDownloadAdded = (download: Download) => {
      updateState();
    };

    const handleDownloadProgress = (progress: DownloadProgress) => {
      updateState();
    };

    const handleDownloadCompleted = (download: Download) => {
      updateState();
      // Optional: Show notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification('Download Complete', {
          body: `Downloaded: ${download.id}`,
          icon: '/favicon.ico'
        });
      }
    };

    const handleDownloadFailed = (download: Download) => {
      updateState();
      // Optional: Show error notification
      console.error('Download failed:', download.error);
    };

    const handleDownloadCancelled = (download: Download) => {
      updateState();
    };

    const handleDownloadRetried = (download: Download) => {
      updateState();
    };

    const handleDownloadsCleared = () => {
      updateState();
    };

    const handleAllDownloadsCleared = () => {
      updateState();
    };

    // Add event listeners
    downloadManager.on('downloadAdded', handleDownloadAdded);
    downloadManager.on('downloadProgress', handleDownloadProgress);
    downloadManager.on('downloadCompleted', handleDownloadCompleted);
    downloadManager.on('downloadFailed', handleDownloadFailed);
    downloadManager.on('downloadCancelled', handleDownloadCancelled);
    downloadManager.on('downloadRetried', handleDownloadRetried);
    downloadManager.on('downloadsCleared', handleDownloadsCleared);
    downloadManager.on('allDownloadsCleared', handleAllDownloadsCleared);

    // Initial state update
    updateState();

    // Cleanup
    return () => {
      downloadManager.removeListener('downloadAdded', handleDownloadAdded);
      downloadManager.removeListener('downloadProgress', handleDownloadProgress);
      downloadManager.removeListener('downloadCompleted', handleDownloadCompleted);
      downloadManager.removeListener('downloadFailed', handleDownloadFailed);
      downloadManager.removeListener('downloadCancelled', handleDownloadCancelled);
      downloadManager.removeListener('downloadRetried', handleDownloadRetried);
      downloadManager.removeListener('downloadsCleared', handleDownloadsCleared);
      downloadManager.removeListener('allDownloadsCleared', handleAllDownloadsCleared);
    };
  }, [downloadManager, updateState]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const startDownload = useCallback(async (song: Song, options: DownloadOptions): Promise<string> => {
    try {
      return await downloadManager.startDownload(song, options);
    } catch (error) {
      console.error('Failed to start download:', error);
      throw error;
    }
  }, [downloadManager]);

  const cancelDownload = useCallback(async (downloadId: string): Promise<boolean> => {
    return await downloadManager.cancelDownload(downloadId);
  }, [downloadManager]);

  const retryDownload = useCallback(async (downloadId: string): Promise<boolean> => {
    return await downloadManager.retryDownload(downloadId);
  }, [downloadManager]);

  const clearCompleted = useCallback(() => {
    downloadManager.clearCompleted();
  }, [downloadManager]);

  const clearAll = useCallback(() => {
    downloadManager.clearAll();
  }, [downloadManager]);

  const getDownloadStatus = useCallback((downloadId: string): Download | null => {
    return downloadManager.getDownloadStatus(downloadId);
  }, [downloadManager]);

  const isDownloading = useCallback((songId: string): boolean => {
    const songDownloads = downloads.filter(d => d.songId === songId);
    return songDownloads.some(d => d.status === 'processing' || d.status === 'queued');
  }, [downloads]);

  const getDownloadProgress = useCallback((songId: string): number => {
    const songDownloads = downloads.filter(d => d.songId === songId);
    const activeDownload = songDownloads.find(d => d.status === 'processing');
    return activeDownload?.progress || 0;
  }, [downloads]);

  return {
    downloads,
    statistics,
    startDownload,
    cancelDownload,
    retryDownload,
    clearCompleted,
    clearAll,
    getDownloadStatus,
    isDownloading,
    getDownloadProgress
  };
}

// Helper hook for individual song download status
export function useSongDownloadStatus(songId: string) {
  const { downloads, isDownloading, getDownloadProgress } = useDownloadManager();
  
  const songDownloads = downloads.filter(d => d.songId === songId);
  const latestDownload = songDownloads.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  return {
    isDownloading: isDownloading(songId),
    progress: getDownloadProgress(songId),
    status: latestDownload?.status || null,
    error: latestDownload?.error || null,
    downloadId: latestDownload?.id || null,
    hasCompleted: songDownloads.some(d => d.status === 'completed'),
    hasFailed: songDownloads.some(d => d.status === 'failed')
  };
}