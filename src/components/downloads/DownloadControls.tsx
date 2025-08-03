'use client';

import React from 'react';
import {
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DownloadControlsProps {
  onClearCompleted: () => void;
  onClearAll: () => void;
  onRetryAllFailed: () => void;
  hasCompleted: boolean;
  hasFailed: boolean;
  hasAny: boolean;
}

export function DownloadControls({
  onClearCompleted,
  onClearAll,
  onRetryAllFailed,
  hasCompleted,
  hasFailed,
  hasAny,
}: DownloadControlsProps) {
  return (
    <div className="flex items-center space-x-2">
      {/* Retry All Failed */}
      {hasFailed && (
        <button
          onClick={onRetryAllFailed}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          title="Retry all failed downloads"
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span>Retry Failed</span>
        </button>
      )}

      {/* Clear Completed */}
      {hasCompleted && (
        <button
          onClick={onClearCompleted}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          title="Clear completed downloads"
        >
          <TrashIcon className="w-4 h-4" />
          <span>Clear Completed</span>
        </button>
      )}

      {/* Clear All */}
      {hasAny && (
        <button
          onClick={onClearAll}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          title="Clear all downloads"
        >
          <XMarkIcon className="w-4 h-4" />
          <span>Clear All</span>
        </button>
      )}
    </div>
  );
}

export default DownloadControls;