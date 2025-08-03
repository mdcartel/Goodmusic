'use client';

import React, { useState } from 'react';
import { useDownloadManager } from '@/lib/hooks/useDownloadManager';
import { DownloadList } from './DownloadList';
import { DownloadStats } from './DownloadStats';
import { DownloadControls } from './DownloadControls';
import { DownloadSettings } from './DownloadSettings';
import { DownloadStatus } from '@/lib/services/download-manager';
import { 
  QueueListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface DownloadManagerProps {
  className?: string;
}

type TabType = 'queue' | 'active' | 'completed' | 'failed' | 'stats' | 'settings';

export function DownloadManager({ className = '' }: DownloadManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const {
    downloads,
    stats,
    config,
    queueStatus,
    progressData,
    hasActiveDownloads,
    hasQueuedDownloads,
    hasFailedDownloads,
    hasCompletedDownloads,
    formattedStats,
    clearCompleted,
    clearAll,
    retryAllFailed,
  } = useDownloadManager();

  const tabs = [
    {
      id: 'queue' as TabType,
      name: 'Queue',
      icon: QueueListIcon,
      count: queueStatus.queue.length,
      badge: hasQueuedDownloads,
    },
    {
      id: 'active' as TabType,
      name: 'Active',
      icon: ArrowDownTrayIcon,
      count: stats.activeDownloads,
      badge: hasActiveDownloads,
    },
    {
      id: 'completed' as TabType,
      name: 'Completed',
      icon: QueueListIcon,
      count: stats.completedDownloads,
      badge: hasCompletedDownloads,
    },
    {
      id: 'failed' as TabType,
      name: 'Failed',
      icon: QueueListIcon,
      count: stats.failedDownloads,
      badge: hasFailedDownloads,
    },
    {
      id: 'stats' as TabType,
      name: 'Statistics',
      icon: ChartBarIcon,
      count: 0,
      badge: false,
    },
    {
      id: 'settings' as TabType,
      name: 'Settings',
      icon: Cog6ToothIcon,
      count: 0,
      badge: false,
    },
  ];

  const getDownloadsForTab = (tab: TabType) => {
    switch (tab) {
      case 'queue':
        return queueStatus.queue;
      case 'active':
        return queueStatus.active;
      case 'completed':
        return queueStatus.completed;
      case 'failed':
        return queueStatus.failed;
      default:
        return [];
    }
  };

  const getStatusForTab = (tab: TabType): DownloadStatus | undefined => {
    switch (tab) {
      case 'queue':
        return 'pending';
      case 'active':
        return 'downloading';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return undefined;
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Download Manager</h2>
          
          {/* Global Controls */}
          <DownloadControls
            onClearCompleted={clearCompleted}
            onClearAll={clearAll}
            onRetryAllFailed={retryAllFailed}
            hasCompleted={hasCompletedDownloads}
            hasFailed={hasFailedDownloads}
            hasAny={stats.totalDownloads > 0}
          />
        </div>

        {/* Progress Summary */}
        {hasActiveDownloads && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>{progressData.activeDownloads.length} active downloads</span>
              <span>{formattedStats.averageSpeedFormatted}</span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressData.totalProgress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>{Math.round(progressData.totalProgress)}% complete</span>
              {progressData.estimatedTimeRemaining > 0 && (
                <span>
                  ~{Math.round(progressData.estimatedTimeRemaining / 60)}m remaining
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-gray-800'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
                
                {tab.badge && tab.count === 0 && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {(activeTab === 'queue' || activeTab === 'active' || activeTab === 'completed' || activeTab === 'failed') && (
          <DownloadList
            downloads={getDownloadsForTab(activeTab)}
            status={getStatusForTab(activeTab)}
            emptyMessage={getEmptyMessage(activeTab)}
          />
        )}

        {activeTab === 'stats' && (
          <DownloadStats
            stats={formattedStats}
            progressData={progressData}
          />
        )}

        {activeTab === 'settings' && (
          <DownloadSettings
            config={config}
          />
        )}
      </div>
    </div>
  );
}

function getEmptyMessage(tab: TabType): string {
  switch (tab) {
    case 'queue':
      return 'No downloads in queue';
    case 'active':
      return 'No active downloads';
    case 'completed':
      return 'No completed downloads';
    case 'failed':
      return 'No failed downloads';
    default:
      return 'No downloads';
  }
}

export default DownloadManager;