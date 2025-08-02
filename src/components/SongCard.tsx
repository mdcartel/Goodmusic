'use client';

import { useState, useEffect } from 'react';
import { Song, Download as DownloadType } from '@/types';
import { cn } from '@/lib/utils';
import { Play, Pause, Download, Heart, X, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components';
import { DownloadManager } from '@/lib/downloadManager';
import { useDownloadErrorHandling, useStreamingErrorHandling } from '@/hooks/useErrorHandling';
import { useToast } from '@/contexts/ToastContext';
import { useFavorites, useRecentlyPlayed } from '@/hooks/useUserPreferences';

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  onDownload: (song: Song, format: 'mp3' | 'mp4') => void;
  isPlaying?: boolean;
  isLoading?: boolean;
  className?: string;
}

export default function SongCard({
  song,
  onPlay,
  onDownload,
  isPlaying = false,
  isLoading = false,
  className
}: SongCardProps) {
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState<DownloadType[]>([]);
  
  const downloadManager = DownloadManager.getInstance();
  const { executeDownload } = useDownloadErrorHandling();
  const { executeStream } = useStreamingErrorHandling();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToRecentlyPlayed } = useRecentlyPlayed();
  const toast = useToast();

  useEffect(() => {
    // Get initial downloads for this song
    const updateDownloads = () => {
      const allDownloads = downloadManager.getAllDownloads();
      const songDownloads = allDownloads.filter(d => d.songId === song.id);
      setActiveDownloads(songDownloads);
    };

    updateDownloads();

    // Listen for download events
    const handleDownloadUpdate = () => updateDownloads();
    
    downloadManager.on('downloadAdded', handleDownloadUpdate);
    downloadManager.on('downloadProgress', handleDownloadUpdate);
    downloadManager.on('downloadCompleted', handleDownloadUpdate);
    downloadManager.on('downloadFailed', handleDownloadUpdate);
    downloadManager.on('downloadCancelled', handleDownloadUpdate);

    return () => {
      downloadManager.off('downloadAdded', handleDownloadUpdate);
      downloadManager.off('downloadProgress', handleDownloadUpdate);
      downloadManager.off('downloadCompleted', handleDownloadUpdate);
      downloadManager.off('downloadFailed', handleDownloadUpdate);
      downloadManager.off('downloadCancelled', handleDownloadUpdate);
    };
  }, [song.id, downloadManager]);

  const handlePlayClick = async () => {
    await executeStream(async () => {
      onPlay(song);
      // Add to recently played
      addToRecentlyPlayed(song);
    }, song.title);
  };

  const handleDownloadClick = async (format: 'mp3' | 'mp4') => {
    const result = await executeDownload(async () => {
      await downloadManager.startDownload(song, { format });
      onDownload(song, format);
      return true;
    }, song.title);

    if (result) {
      setShowDownloadOptions(false);
      toast.success(
        'Download Started',
        `${song.title} is being downloaded as ${format.toUpperCase()}`
      );
    }
  };

  const handleCancelDownload = async (downloadId: string) => {
    try {
      await downloadManager.cancelDownload(downloadId);
      toast.info('Download Cancelled', 'The download has been cancelled');
    } catch (error) {
      toast.error('Failed to Cancel', 'Could not cancel the download');
    }
  };

  const handleRetryDownload = async (downloadId: string) => {
    const result = await executeDownload(async () => {
      await downloadManager.retryDownload(downloadId);
      return true;
    }, song.title);

    if (result) {
      toast.success('Download Retried', 'The download has been restarted');
    }
  };

  const handleToggleFavorite = () => {
    const success = toggleFavorite(song);
    if (success) {
      const isNowFavorite = isFavorite(song.id);
      toast.success(
        isNowFavorite ? 'Added to Favorites' : 'Removed from Favorites',
        `${song.title} ${isNowFavorite ? 'added to' : 'removed from'} your favorites`
      );
    }
  };

  const getMoodColor = (mood: string) => {
    const moodColors: Record<string, string> = {
      chill: 'bg-blue-500',
      heartbreak: 'bg-red-500',
      hype: 'bg-orange-500',
      nostalgic: 'bg-purple-500',
      focus: 'bg-green-500',
      party: 'bg-pink-500'
    };
    return moodColors[mood] || 'bg-gray-500';
  };

  return (
    <div className={cn(
      "group relative bg-gray-800 rounded-lg overflow-hidden transition-all duration-300",
      "hover:bg-gray-750 hover:shadow-lg hover:shadow-purple-500/10",
      "border border-gray-700 hover:border-gray-600",
      isPlaying && "ring-2 ring-purple-500 border-purple-500 shadow-lg shadow-purple-500/20",
      className
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-900">
        {!imageError ? (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-4xl text-gray-600">🎵</div>
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center",
          isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <Button
            onClick={handlePlayClick}
            variant="primary"
            size="lg"
            loading={isLoading}
            className={cn(
              "rounded-full w-16 h-16 shadow-lg",
              isPlaying && "bg-purple-600 hover:bg-purple-700"
            )}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {song.duration}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Artist */}
        <div className="mb-3">
          <h3 className="font-semibold text-white text-base sm:text-lg leading-tight mb-1 line-clamp-2">
            {song.title}
          </h3>
          {song.artist && (
            <p className="text-gray-400 text-sm line-clamp-1">
              {song.artist}
            </p>
          )}
        </div>

        {/* Mood Tags */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
          {song.mood.slice(0, 3).map((mood) => (
            <span
              key={mood}
              className={cn(
                "text-xs px-2 py-1 rounded-full text-white font-medium",
                getMoodColor(mood)
              )}
            >
              {mood}
            </span>
          ))}
          {song.mood.length > 3 && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-600 text-gray-300">
              +{song.mood.length - 3}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 flex-1">
            <Button
              onClick={handlePlayClick}
              variant="primary"
              size="sm"
              loading={isLoading}
              className="flex-1 touch-manipulation"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Pause</span>
                  <span className="sm:hidden">⏸</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Play</span>
                  <span className="sm:hidden">▶</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleToggleFavorite}
              variant="ghost"
              size="sm"
              className={cn(
                "p-2 touch-manipulation",
                isFavorite(song.id) && "text-red-500 hover:text-red-400"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite(song.id) && "fill-current")} />
            </Button>

            {/* Download Menu */}
            <div className="relative">
              <Button
                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                variant="ghost"
                size="sm"
                className="p-2 touch-manipulation"
              >
                <Download className="w-4 h-4" />
              </Button>

              {showDownloadOptions && (
                <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[140px]">
                  <div className="py-1">
                    <button
                      onClick={() => handleDownloadClick('mp3')}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors touch-manipulation"
                    >
                      Download MP3
                    </button>
                    <button
                      onClick={() => handleDownloadClick('mp4')}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors touch-manipulation"
                    >
                      Download MP4
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Download Progress Indicators */}
        {activeDownloads.length > 0 && (
          <div className="mt-3 space-y-2">
            {activeDownloads.map((download) => (
              <div key={download.id} className="bg-gray-900 rounded-lg p-2 sm:p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {download.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    {download.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    {(download.status === 'processing' || download.status === 'queued') && (
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm font-medium text-gray-300">
                      {download.format.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500 capitalize truncate">
                      {download.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {download.status === 'failed' && (
                      <Button
                        onClick={() => handleRetryDownload(download.id)}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6 touch-manipulation"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                    {(download.status === 'processing' || download.status === 'queued') && (
                      <Button
                        onClick={() => handleCancelDownload(download.id)}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6 text-red-400 hover:text-red-300 touch-manipulation"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(download.status === 'processing' || download.status === 'queued') && (
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${download.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {download.status === 'failed' && download.error && (
                  <div className="text-xs text-red-400 mt-1 break-words">
                    {download.error}
                  </div>
                )}

                {/* Completion Info */}
                {download.status === 'completed' && (
                  <div className="text-xs text-green-400 mt-1">
                    Download completed • {download.fileSize ? `${(download.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playing Indicator */}
      {isPlaying && (
        <div className="absolute top-2 left-2">
          <div className="flex items-center space-x-1 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>Playing</span>
          </div>
        </div>
      )}
    </div>
  );
}