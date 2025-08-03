'use client';

import React, { useEffect, useRef } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { 
  ArrowsUpDownIcon, 
  ShuffleIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/solid';
import { useMusicPlayer, useQueue } from '@/lib/hooks/useMusicPlayer';
import { QueueItem } from '@/lib/services/music-player';
import Image from 'next/image';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queue = useQueue();
  const {
    state,
    playTrackAtIndex,
    removeFromQueue,
    clearQueue,
    setShuffle,
    setRepeatMode,
  } = useMusicPlayer();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRepeatModeIcon = () => {
    switch (state.repeatMode) {
      case 'one':
        return '🔂';
      case 'all':
        return '🔁';
      default:
        return '↻';
    }
  };

  const cycleRepeatMode = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(state.repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end">
      <div
        ref={panelRef}
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-96 h-96 m-4 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Queue</h3>
          <div className="flex items-center space-x-2">
            {/* Shuffle Button */}
            <button
              onClick={() => setShuffle(!state.shuffleEnabled)}
              className={`p-2 rounded ${
                state.shuffleEnabled 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } transition-colors`}
              title={`${state.shuffleEnabled ? 'Disable' : 'Enable'} shuffle`}
            >
              <ShuffleIcon className="w-4 h-4" />
            </button>

            {/* Repeat Button */}
            <button
              onClick={cycleRepeatMode}
              className={`p-2 rounded ${
                state.repeatMode !== 'none'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } transition-colors`}
              title={`Repeat: ${state.repeatMode}`}
            >
              <span className="text-sm">{getRepeatModeIcon()}</span>
            </button>

            {/* Clear Queue Button */}
            <button
              onClick={clearQueue}
              className="p-2 rounded bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
              title="Clear queue"
            >
              <TrashIcon className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Queue Info */}
        <div className="px-4 py-2 bg-gray-800 text-sm text-gray-400">
          {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
          {queue.length > 0 && (
            <span className="ml-2">
              • {formatDuration(queue.reduce((total, track) => total + track.duration, 0))} total
            </span>
          )}
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">🎵</div>
                <p>Queue is empty</p>
                <p className="text-sm">Add songs to start playing</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {queue.map((track, index) => (
                <QueueTrackItem
                  key={track.queueId}
                  track={track}
                  index={index}
                  isCurrentTrack={index === state.currentIndex}
                  isPlaying={index === state.currentIndex && state.playbackState === 'playing'}
                  onPlay={() => playTrackAtIndex(index)}
                  onRemove={() => removeFromQueue(track.queueId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface QueueTrackItemProps {
  track: QueueItem;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
}

function QueueTrackItem({
  track,
  index,
  isCurrentTrack,
  isPlaying,
  onPlay,
  onRemove,
}: QueueTrackItemProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center space-x-3 p-2 rounded hover:bg-gray-800 transition-colors group ${
        isCurrentTrack ? 'bg-gray-800 border-l-2 border-blue-500' : ''
      }`}
    >
      {/* Track Number / Playing Indicator */}
      <div className="w-6 text-center text-sm">
        {isPlaying ? (
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 flex space-x-0.5">
              <div className="w-0.5 bg-blue-500 animate-pulse"></div>
              <div className="w-0.5 bg-blue-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-0.5 bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : (
          <span className={isCurrentTrack ? 'text-blue-400' : 'text-gray-400'}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 relative rounded overflow-hidden bg-gray-700 flex-shrink-0">
        {track.thumbnail ? (
          <Image
            src={track.thumbnail}
            alt={track.title}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-sm">🎵</span>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <div className={`font-medium truncate ${isCurrentTrack ? 'text-blue-400' : 'text-white'}`}>
          {track.title}
        </div>
        <div className="text-sm text-gray-400 truncate">
          {track.artist}
        </div>
      </div>

      {/* Duration */}
      <div className="text-sm text-gray-400 flex-shrink-0">
        {formatDuration(track.duration)}
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove from queue"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export default QueuePanel;