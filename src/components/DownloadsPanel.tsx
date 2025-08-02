'use client';

import { useState, useEffect } from 'react';
import { Download as DownloadType } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Download, 
  X, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  FolderOpen,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components';
import { DownloadManager } from '@/lib/downloadManager';

interface DownloadsPanelProps {
  className?: string;
}

type FilterType = 'all' | 'completed' | 'processing' | 'failed' | 'queued';

export default function DownloadsPanel({ className }: DownloadsPanelProps) {
  const [downloads, setDownloads] = useState<DownloadType[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const downloadManager = DownloadManager.getInstance();

  useEffect(() => {
    // Get initial downloads
    const updateDownloads = () => {
      const allDownloads = downloadManager.getAllDownloads();
      setDownloads(allDownloads);
    };

    updateDownloads();

    // Listen for download events
    const handleDownloadUpdate = () => updateDownloads();
    
    downloadManager.on('downloadAdded', handleDownloadUpdate);
    downloadManager.on('downloadProgress', handleDownloadUpdate);
    downloadManager.on('downloadCompleted', handleDownloadUpdate);
    downloadManager.on('downloadFailed', handleDownloadUpdate);
    downloadManager.on('downloadCancelled', handleDownloadUpdate);
    downloadManager.on('downloadsCleared', handleDownloadUpdate);
    downloadManager.on('allDownloadsCleared', handleDownloadUpdate);

    return () => {
      downloadManager.off('downloadAdded', handleDownloadUpdate);
      downloadManager.off('downloadProgress', handleDownloadUpdate);
      downloadManager.off('downloadCompleted', handleDownloadUpdate);
      downloadManager.off('downloadFailed', handleDownloadUpdate);
      downloadManager.off('downloadCancelled', handleDownloadUpdate);
      downloadManager.off('downloadsCleared', handleDownloadUpdate);
      downloadManager.off('allDownloadsCleared', handleDownloadUpdate);
    };
  }, [downloadManager]);

  // Filter downloads based on status and search query
  const filteredDownloads = downloads.filter(download => {
    const matchesFilter = filter === 'all' || download.status === filter;
    const matchesSearch = searchQuery === '' || 
      download.songId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      download.format.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCancelDownload = async (downloadId: string) => {
    await downloadManager.cancelDownload(downloadId);
  };

  const handleRetryDownload = async (downloadId: string) => {
    await downloadManager.retryDownload(downloadId);
  };

  const handleClearCompleted = () => {
    downloadManager.clearCompleted();
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all downloads? This action cannot be undone.')) {
      downloadManager.clearAll();
    }
  };

  const getStatusIcon = (status: DownloadType['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
      case 'queued':
        return <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Download className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: DownloadType['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'processing':
        return 'text-purple-400';
      case 'queued':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const statistics = downloadManager.getStatistics();

  return (
    <div className={cn("bg-gray-800 rounded-lg border border-gray-700", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Downloads</h2>
            <span className="text-sm text-gray-400">({statistics.total})</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Filter className="w-4 h-4" />
            </Button>
            
            {statistics.completed > 0 && (
              <Button
                onClick={handleClearCompleted}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                Clear Completed
              </Button>
            )}
            
            {statistics.total > 0 && (
              <Button
                onClick={handleClearAll}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-400">{statistics.completed}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-400">{statistics.processing}</div>
            <div className="text-xs text-gray-500">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-400">{statistics.queued}</div>
            <div className="text-xs text-gray-500">Queued</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-400">{statistics.failed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
        </div>

        {/* Search and Filters */}
        {showFilters && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search downloads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'completed', 'processing', 'failed', 'queued'] as FilterType[]).map((filterType) => (
                <Button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  variant={filter === filterType ? 'primary' : 'ghost'}
                  size="sm"
                  className="capitalize"
                >
                  {filterType}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Downloads List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredDownloads.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No downloads found</p>
            <p className="text-sm">
              {downloads.length === 0 
                ? "Start downloading music to see your downloads here"
                : "No downloads match your current filter"
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredDownloads.map((download) => (
              <div key={download.id} className="p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getStatusIcon(download.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white truncate">
                          Song {download.songId}
                        </span>
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {download.format.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className={cn("capitalize", getStatusColor(download.status))}>
                          {download.status}
                        </span>
                        <span>{formatDate(download.createdAt)}</span>
                        {download.fileSize && (
                          <span>{formatFileSize(download.fileSize)}</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {(download.status === 'processing' || download.status === 'queued') && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(download.progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${download.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {download.status === 'failed' && download.error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                          {download.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 ml-4">
                    {download.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-gray-400 hover:text-white"
                        title="Open file location"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {download.status === 'failed' && (
                      <Button
                        onClick={() => handleRetryDownload(download.id)}
                        variant="ghost"
                        size="sm"
                        className="p-2 text-blue-400 hover:text-blue-300"
                        title="Retry download"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {(download.status === 'processing' || download.status === 'queued') && (
                      <Button
                        onClick={() => handleCancelDownload(download.id)}
                        variant="ghost"
                        size="sm"
                        className="p-2 text-red-400 hover:text-red-300"
                        title="Cancel download"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}