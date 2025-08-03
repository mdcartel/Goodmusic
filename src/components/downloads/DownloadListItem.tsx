'use client';

import React from 'react';
import Image from 'next/image';
import { DownloadItem } from '@/lib/services/download-manager';
import { useDownloadOperations } from '@/lib/hooks/useDownloadManager';
import { formatDuration } from '@/lib/hooks/useDownloadManager';
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  XMarkIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface DownloadListItemProps {
  download: DownloadItem;
}

export function DownloadListItem({ download }: DownloadListItemProps) {
  const {
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    retryDownload,
  } = useDownloadOperations();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const getStatusIcon = () => {
    switch (download.status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-400" />;
      case 'downloading':
        return (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        );
      case 'paused':
        return <PauseIcon className="w-4 h-4 text-gray-400" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <XMarkIcon className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (download.status) {
      case 'pending':
        return 'text-yellow-400';
      case 'downloading':
        return 'text-blue-400';
      case 'paused':
        return 'text-gray-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'cancelled':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getProgressBarColor = () => {
    switch (download.status) {
      case 'downloading':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-gray-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const canPause = download.status === 'downloading';
  const canResume = download.status === 'paused';
  const canRetry = download.status === 'failed' && download.retryCount < download.maxRetries;
  const canCancel = download.status === 'downloading' || download.status === 'pending';
  const canRemove = download.status === 'completed' || download.status === 'failed' || download.status === 'cancelled';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start space-x-4">
        {/* Thumbnail */}
        <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-700 flex-shrink-0">
          {download.thumbnail ? (
            <Image
              src={download.thumbnail}
              alt={download.title}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 text-lg">🎵</span>
            </div>
          )}
        </div>

        {/* Download Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white truncate">{download.title}</h3>
              <p className="text-sm text-gray-400 truncate">{download.artist}</p>
              
              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                <span>{formatDuration(download.duration)}</span>
                <span>•</span>
                <span>{download.quality}</span>
                <span>•</span>
                <span>{download.format.toUpperCase()}</span>
                {download.priority !== 'normal' && (
                  <>
                    <span>•</span>
                    <span className={`capitalize ${
                      download.priority === 'high' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {download.priority} priority
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status and Controls */}
            <div className="flex items-center space-x-2 ml-4">
              {/* Status Icon */}
              <div className="flex items-center space-x-1">
                {getStatusIcon()}
                <span className={`text-xs capitalize ${getStatusColor()}`}>
                  {download.status}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1">
                {canPause && (
                  <button
                    onClick={() => pauseDownload(download.id)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Pause download"
                  >
                    <PauseIcon className="w-4 h-4" />
                  </button>
                )}

                {canResume && (
                  <button
                    onClick={() => resumeDownload(download.id)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Resume download"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                )}

                {canRetry && (
                  <button
                    onClick={() => retryDownload(download.id)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Retry download"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => cancelDownload(download.id)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                    title="Cancel download"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}

                {canRemove && (
                  <button
                    onClick={() => removeDownload(download.id)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                    title="Remove from list"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(download.status === 'downloading' || download.status === 'paused' || download.progress > 0) && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{Math.round(download.progress)}%</span>
                <div className="flex items-center space-x-2">
                  {download.downloadedBytes > 0 && download.totalBytes > 0 && (
                    <span>
                      {formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}
                    </span>
                  )}
                  {download.downloadSpeed > 0 && (
                    <span>{formatSpeed(download.downloadSpeed)}</span>
                  )}
                  {download.estimatedTimeRemaining > 0 && (
                    <span>
                      ~{formatDuration(download.estimatedTimeRemaining)} remaining
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                  style={{ width: `${Math.min(100, Math.max(0, download.progress))}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {download.error && (
            <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded text-sm text-red-400">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Download failed</p>
                  <p className="text-xs text-red-300 mt-1">{download.error}</p>
                  {download.retryCount > 0 && (
                    <p className="text-xs text-red-300 mt-1">
                      Retry {download.retryCount}/{download.maxRetries}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File Path (for completed downloads) */}
          {download.status === 'completed' && download.filePath && (
            <div className="mt-2 text-xs text-gray-500">
              <span>Saved to: </span>
              <span className="font-mono">{download.filePath}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DownloadListItem;