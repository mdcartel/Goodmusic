import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  downloadManager, 
  DownloadItem, 
  DownloadOptions, 
  DownloadConfig, 
  DownloadStats,
  DownloadStatus,
  DownloadEvent,
  DownloadEventCallback 
} from '../services/download-manager';

// Hook for download manager state
export function useDownloadManagerState() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(downloadManager.getAllDownloads());
  const [stats, setStats] = useState<DownloadStats>(downloadManager.getStats());

  useEffect(() => {
    const handleDownloadChange = () => {
      setDownloads(downloadManager.getAllDownloads());
      setStats(downloadManager.getStats());
    };

    const events: DownloadEvent[] = [
      'downloadAdded',
      'downloadStarted',
      'downloadProgress',
      'downloadCompleted',
      'downloadFailed',
      'downloadCancelled',
      'downloadPaused',
      'downloadResumed',
      'queueChanged'
    ];

    events.forEach(event => {
      downloadManager.on(event, handleDownloadChange);
    });

    // Initial load
    handleDownloadChange();

    return () => {
      events.forEach(event => {
        downloadManager.off(event, handleDownloadChange);
      });
    };
  }, []);

  return { downloads, stats };
}

// Hook for download operations
export function useDownloadOperations() {
  const queryClient = useQueryClient();

  const addDownloadMutation = useMutation({
    mutationFn: async ({
      videoId,
      title,
      artist,
      duration,
      options = {}
    }: {
      videoId: string;
      title: string;
      artist: string;
      duration: number;
      options?: DownloadOptions;
    }) => {
      return downloadManager.addDownload(videoId, title, artist, duration, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const removeDownloadMutation = useMutation({
    mutationFn: async (downloadId: string) => {
      return downloadManager.removeDownload(downloadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const pauseDownloadMutation = useMutation({
    mutationFn: async (downloadId: string) => {
      return downloadManager.pauseDownload(downloadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const resumeDownloadMutation = useMutation({
    mutationFn: async (downloadId: string) => {
      return downloadManager.resumeDownload(downloadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const cancelDownloadMutation = useMutation({
    mutationFn: async (downloadId: string) => {
      return downloadManager.cancelDownload(downloadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const retryDownloadMutation = useMutation({
    mutationFn: async (downloadId: string) => {
      return downloadManager.retryDownload(downloadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const retryAllFailedMutation = useMutation({
    mutationFn: async () => {
      return downloadManager.retryAllFailed();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: async () => {
      return downloadManager.clearCompleted();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return downloadManager.clearAll();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const moveInQueueMutation = useMutation({
    mutationFn: async ({ downloadId, newPosition }: { downloadId: string; newPosition: number }) => {
      return downloadManager.moveInQueue(downloadId, newPosition);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  return {
    addDownload: addDownloadMutation.mutate,
    removeDownload: removeDownloadMutation.mutate,
    pauseDownload: pauseDownloadMutation.mutate,
    resumeDownload: resumeDownloadMutation.mutate,
    cancelDownload: cancelDownloadMutation.mutate,
    retryDownload: retryDownloadMutation.mutate,
    retryAllFailed: retryAllFailedMutation.mutate,
    clearCompleted: clearCompletedMutation.mutate,
    clearAll: clearAllMutation.mutate,
    moveInQueue: moveInQueueMutation.mutate,
    isLoading: addDownloadMutation.isPending || 
               removeDownloadMutation.isPending || 
               pauseDownloadMutation.isPending || 
               resumeDownloadMutation.isPending || 
               cancelDownloadMutation.isPending || 
               retryDownloadMutation.isPending ||
               retryAllFailedMutation.isPending ||
               clearCompletedMutation.isPending ||
               clearAllMutation.isPending ||
               moveInQueueMutation.isPending,
  };
}

// Hook for download configuration
export function useDownloadConfig() {
  const [config, setConfig] = useState<DownloadConfig>(downloadManager.getConfig());
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleConfigChange: DownloadEventCallback = (newConfig: DownloadConfig) => {
      setConfig(newConfig);
    };

    downloadManager.on('configChanged', handleConfigChange);

    // Get initial config
    setConfig(downloadManager.getConfig());

    return () => {
      downloadManager.off('configChanged', handleConfigChange);
    };
  }, []);

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<DownloadConfig>) => {
      await downloadManager.updateConfig(updates);
      return downloadManager.getConfig();
    },
    onSuccess: (newConfig) => {
      setConfig(newConfig);
      queryClient.invalidateQueries({ queryKey: ['download-config'] });
    },
  });

  return {
    config,
    updateConfig: updateConfigMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
  };
}

// Hook for specific download
export function useDownload(downloadId: string) {
  const [download, setDownload] = useState<DownloadItem | undefined>(
    downloadManager.getDownload(downloadId)
  );

  useEffect(() => {
    const handleDownloadChange = () => {
      setDownload(downloadManager.getDownload(downloadId));
    };

    const events: DownloadEvent[] = [
      'downloadStarted',
      'downloadProgress',
      'downloadCompleted',
      'downloadFailed',
      'downloadCancelled',
      'downloadPaused',
      'downloadResumed'
    ];

    events.forEach(event => {
      downloadManager.on(event, handleDownloadChange);
    });

    // Initial load
    handleDownloadChange();

    return () => {
      events.forEach(event => {
        downloadManager.off(event, handleDownloadChange);
      });
    };
  }, [downloadId]);

  return download;
}

// Hook for downloads by status
export function useDownloadsByStatus(status: DownloadStatus) {
  const [downloads, setDownloads] = useState<DownloadItem[]>(
    downloadManager.getDownloadsByStatus(status)
  );

  useEffect(() => {
    const handleDownloadChange = () => {
      setDownloads(downloadManager.getDownloadsByStatus(status));
    };

    const events: DownloadEvent[] = [
      'downloadAdded',
      'downloadStarted',
      'downloadCompleted',
      'downloadFailed',
      'downloadCancelled',
      'downloadPaused',
      'downloadResumed',
      'queueChanged'
    ];

    events.forEach(event => {
      downloadManager.on(event, handleDownloadChange);
    });

    // Initial load
    handleDownloadChange();

    return () => {
      events.forEach(event => {
        downloadManager.off(event, handleDownloadChange);
      });
    };
  }, [status]);

  return downloads;
}

// Hook for download queue status
export function useDownloadQueue() {
  const [queueStatus, setQueueStatus] = useState(downloadManager.getQueueStatus());

  useEffect(() => {
    const handleQueueChange = () => {
      setQueueStatus(downloadManager.getQueueStatus());
    };

    downloadManager.on('queueChanged', handleQueueChange);

    // Initial load
    handleQueueChange();

    return () => {
      downloadManager.off('queueChanged', handleQueueChange);
    };
  }, []);

  return queueStatus;
}

// Hook for download statistics
export function useDownloadStats() {
  const [stats, setStats] = useState<DownloadStats>(downloadManager.getStats());

  useEffect(() => {
    const handleStatsChange = () => {
      setStats(downloadManager.getStats());
    };

    const events: DownloadEvent[] = [
      'downloadAdded',
      'downloadStarted',
      'downloadProgress',
      'downloadCompleted',
      'downloadFailed',
      'downloadCancelled',
      'queueChanged'
    ];

    events.forEach(event => {
      downloadManager.on(event, handleStatsChange);
    });

    // Initial load
    handleStatsChange();

    return () => {
      events.forEach(event => {
        downloadManager.off(event, handleStatsChange);
      });
    };
  }, []);

  return stats;
}

// Hook for download events
export function useDownloadEvent(event: DownloadEvent, callback: DownloadEventCallback) {
  useEffect(() => {
    downloadManager.on(event, callback);

    return () => {
      downloadManager.off(event, callback);
    };
  }, [event, callback]);
}

// Hook for download progress tracking
export function useDownloadProgress() {
  const [progressData, setProgressData] = useState<{
    activeDownloads: DownloadItem[];
    totalProgress: number;
    averageSpeed: number;
    estimatedTimeRemaining: number;
  }>({
    activeDownloads: [],
    totalProgress: 0,
    averageSpeed: 0,
    estimatedTimeRemaining: 0,
  });

  useEffect(() => {
    const updateProgress = () => {
      const activeDownloads = downloadManager.getDownloadsByStatus('downloading');
      const totalProgress = activeDownloads.length > 0 
        ? activeDownloads.reduce((sum, d) => sum + d.progress, 0) / activeDownloads.length
        : 0;
      
      const averageSpeed = activeDownloads.length > 0
        ? activeDownloads.reduce((sum, d) => sum + d.downloadSpeed, 0) / activeDownloads.length
        : 0;
      
      const estimatedTimeRemaining = activeDownloads.length > 0
        ? Math.max(...activeDownloads.map(d => d.estimatedTimeRemaining))
        : 0;

      setProgressData({
        activeDownloads,
        totalProgress,
        averageSpeed,
        estimatedTimeRemaining,
      });
    };

    downloadManager.on('downloadProgress', updateProgress);
    downloadManager.on('downloadStarted', updateProgress);
    downloadManager.on('downloadCompleted', updateProgress);
    downloadManager.on('downloadFailed', updateProgress);
    downloadManager.on('downloadCancelled', updateProgress);

    // Initial update
    updateProgress();

    return () => {
      downloadManager.off('downloadProgress', updateProgress);
      downloadManager.off('downloadStarted', updateProgress);
      downloadManager.off('downloadCompleted', updateProgress);
      downloadManager.off('downloadFailed', updateProgress);
      downloadManager.off('downloadCancelled', updateProgress);
    };
  }, []);

  return progressData;
}

// Comprehensive hook that combines all download functionality
export function useDownloadManager() {
  const { downloads, stats } = useDownloadManagerState();
  const operations = useDownloadOperations();
  const { config, updateConfig, isUpdating } = useDownloadConfig();
  const queueStatus = useDownloadQueue();
  const progressData = useDownloadProgress();

  return {
    // State
    downloads,
    stats,
    config,
    queueStatus,
    progressData,

    // Operations
    ...operations,
    updateConfig,

    // Computed properties
    isConfigUpdating: isUpdating,
    hasActiveDownloads: stats.activeDownloads > 0,
    hasQueuedDownloads: stats.queuedDownloads > 0,
    hasFailedDownloads: stats.failedDownloads > 0,
    hasCompletedDownloads: stats.completedDownloads > 0,
    totalDownloads: stats.totalDownloads,
    
    // Helper functions
    getDownload: (id: string) => downloads.find(d => d.id === id),
    getDownloadsByStatus: (status: DownloadStatus) => downloads.filter(d => d.status === status),
    
    // Formatted data
    formattedStats: {
      ...stats,
      averageSpeedFormatted: formatSpeed(stats.averageSpeed),
      totalSizeFormatted: formatBytes(stats.totalBytes),
      downloadedSizeFormatted: formatBytes(stats.downloadedBytes),
      progressPercentage: stats.totalBytes > 0 ? (stats.downloadedBytes / stats.totalBytes) * 100 : 0,
    },
  };
}

// Utility functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Hook for batch download operations
export function useBatchDownloadOperations() {
  const queryClient = useQueryClient();

  const batchAddDownloadsMutation = useMutation({
    mutationFn: async (downloads: Array<{
      videoId: string;
      title: string;
      artist: string;
      duration: number;
      options?: DownloadOptions;
    }>) => {
      const results = [];
      for (const download of downloads) {
        const result = await downloadManager.addDownload(
          download.videoId,
          download.title,
          download.artist,
          download.duration,
          download.options
        );
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const batchRemoveDownloadsMutation = useMutation({
    mutationFn: async (downloadIds: string[]) => {
      const results = [];
      for (const downloadId of downloadIds) {
        const result = await downloadManager.removeDownload(downloadId);
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  return {
    batchAddDownloads: batchAddDownloadsMutation.mutate,
    batchRemoveDownloads: batchRemoveDownloadsMutation.mutate,
    isBatchLoading: batchAddDownloadsMutation.isPending || batchRemoveDownloadsMutation.isPending,
  };
}