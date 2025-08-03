'use client';

import React from 'react';
import Image from 'next/image';
import { QueueItem } from '@/lib/services/music-player';

interface TrackInfoProps {
  track: QueueItem | null;
  isLoading: boolean;
  compact?: boolean;
}

export function TrackInfo({ track, isLoading, compact = false }: TrackInfoProps) {
  if (!track) {
    return (
      <div className={`flex items-center space-x-3 ${compact ? 'space-x-2' : ''}`}>
        <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} bg-gray-700 rounded flex items-center justify-center`}>
          <span className="text-gray-400 text-lg">🎵</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-gray-400 ${compact ? 'text-sm' : ''}`}>No track selected</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-3 ${compact ? 'space-x-2' : ''}`}>
      {/* Thumbnail */}
      <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} relative rounded overflow-hidden bg-gray-700 flex-shrink-0`}>
        {track.thumbnail ? (
          <Image
            src={track.thumbnail}
            alt={track.title}
            fill
            className="object-cover"
            sizes={compact ? '40px' : '48px'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-lg">🎵</span>
          </div>
        )}
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Track Details */}
      <div className="min-w-0 flex-1">
        <div className={`font-medium text-white truncate ${compact ? 'text-sm' : ''}`}>
          {track.title}
        </div>
        <div className={`text-gray-400 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
          {track.artist}
        </div>
        
        {/* Additional info for non-compact mode */}
        {!compact && (
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
            {track.duration > 0 && (
              <span>{formatDuration(track.duration)}</span>
            )}
            {track.quality && (
              <>
                <span>•</span>
                <span>{track.quality}</span>
              </>
            )}
            {track.format && (
              <>
                <span>•</span>
                <span>{track.format.toUpperCase()}</span>
              </>
            )}
            {track.playCount > 0 && (
              <>
                <span>•</span>
                <span>{track.playCount} plays</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrackInfo;