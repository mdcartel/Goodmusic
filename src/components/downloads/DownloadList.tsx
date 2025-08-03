'use client';

import React from 'react';
import { DownloadItem, DownloadStatus } from '@/lib/services/download-manager';
import { DownloadListItem } from './DownloadListItem';

interface DownloadListProps {
  downloads: DownloadItem[];
  status?: DownloadStatus;
  emptyMessage?: string;
}

export function DownloadList({ 
  downloads, 
  status, 
  emptyMessage = 'No downloads' 
}: DownloadListProps) {
  if (downloads.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📥</div>
          <p className="text-lg">{emptyMessage}</p>
          <p className="text-sm mt-1">
            {status === 'pending' && 'Add songs to your download queue to get started'}
            {status === 'downloading' && 'Downloads will appear here when they start'}
            {status === 'completed' && 'Completed downloads will appear here'}
            {status === 'failed' && 'Failed downloads will appear here for retry'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {downloads.map((download) => (
        <DownloadListItem
          key={download.id}
          download={download}
        />
      ))}
    </div>
  );
}

export default DownloadList;