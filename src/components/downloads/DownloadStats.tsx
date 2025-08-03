'use client';

import React from 'react';
import { DownloadStats as StatsType } from '@/lib/services/download-manager';

interface DownloadStatsProps {
  stats: StatsType & {
    averageSpeedFormatted: string;
    totalSizeFormatted: string;
    downloadedSizeFormatted: string;
    progressPercentage: number;
  };
  progressData: {
    activeDownloads: any[];
    totalProgress: number;
    averageSpeed: number;
    estimatedTimeRemaining: number;
  };
}

export function DownloadStats({ stats, progressData }: DownloadStatsProps) {
  const statItems = [
    {
      label: 'Total Downloads',
      value: stats.totalDownloads.toString(),
      color: 'text-blue-400',
    },
    {
      label: 'Completed',
      value: stats.completedDownloads.toString(),
      color: 'text-green-400',
    },
    {
      label: 'Failed',
      value: stats.failedDownloads.toString(),
      color: 'text-red-400',
    },
    {
      label: 'Active',
      value: stats.activeDownloads.toString(),
      color: 'text-yellow-400',
    },
    {
      label: 'Queued',
      value: stats.queuedDownloads.toString(),
      color: 'text-gray-400',
    },
  ];

  const sizeStats = [
    {
      label: 'Total Size',
      value: stats.totalSizeFormatted,
    },
    {
      label: 'Downloaded',
      value: stats.downloadedSizeFormatted,
    },
    {
      label: 'Average Speed',
      value: stats.averageSpeedFormatted,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Download Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statItems.map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Size and Speed Stats */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Storage & Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sizeStats.map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-lg p-4">
              <div className="text-xl font-semibold text-white">
                {item.value}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Overview */}
      {stats.totalBytes > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Overall Progress</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Total Progress</span>
              <span>{Math.round(stats.progressPercentage)}%</span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${stats.progressPercentage}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
              <span>{stats.downloadedSizeFormatted} of {stats.totalSizeFormatted}</span>
              <span>
                {stats.completedDownloads} of {stats.totalDownloads} files
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active Downloads Summary */}
      {progressData.activeDownloads.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Active Downloads</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl font-semibold text-blue-400">
                  {progressData.activeDownloads.length}
                </div>
                <div className="text-sm text-gray-400">Active</div>
              </div>
              
              <div>
                <div className="text-xl font-semibold text-green-400">
                  {Math.round(progressData.totalProgress)}%
                </div>
                <div className="text-sm text-gray-400">Average Progress</div>
              </div>
              
              <div>
                <div className="text-xl font-semibold text-yellow-400">
                  {formatSpeed(progressData.averageSpeed)}
                </div>
                <div className="text-sm text-gray-400">Average Speed</div>
              </div>
              
              <div>
                <div className="text-xl font-semibold text-purple-400">
                  {formatTime(progressData.estimatedTimeRemaining)}
                </div>
                <div className="text-sm text-gray-400">Est. Time</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Rate */}
      {stats.totalDownloads > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Success Rate</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Success Rate</span>
              <span>
                {Math.round((stats.completedDownloads / stats.totalDownloads) * 100)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(stats.completedDownloads / stats.totalDownloads) * 100}%` 
                }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
              <span>{stats.completedDownloads} successful</span>
              <span>{stats.failedDownloads} failed</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalDownloads === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-white mb-2">No Download Statistics</h3>
          <p className="text-gray-400">
            Start downloading some music to see statistics here
          </p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  
  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export default DownloadStats;