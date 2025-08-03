'use client';

import React, { useState } from 'react';
import { QueueListIcon } from '@heroicons/react/24/outline';
import { useQueue } from '@/lib/hooks/useMusicPlayer';
import { QueuePanel } from './QueuePanel';

interface QueueButtonProps {
  compact?: boolean;
}

export function QueueButton({ compact = false }: QueueButtonProps) {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const queue = useQueue();

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  return (
    <>
      <button
        onClick={toggleQueue}
        className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors relative`}
        title={`${isQueueOpen ? 'Hide' : 'Show'} queue`}
      >
        <QueueListIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        
        {/* Queue count badge */}
        {queue.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {queue.length > 99 ? '99+' : queue.length}
          </div>
        )}
      </button>

      {/* Queue Panel */}
      {isQueueOpen && (
        <QueuePanel
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
        />
      )}
    </>
  );
}

export default QueueButton;