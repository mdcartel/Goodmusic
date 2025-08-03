'use client';

import React from 'react';
import { useMusicPlayer, usePlayerInitialization } from '@/lib/hooks/useMusicPlayer';
import { PlayerControls } from './PlayerControls';
import { TrackInfo } from './TrackInfo';
import { VolumeControl } from './VolumeControl';
import { ProgressBar } from './ProgressBar';
import { QueueButton } from './QueueButton';

interface MusicPlayerProps {
  className?: string;
  compact?: boolean;
}

export function MusicPlayer({ className = '', compact = false }: MusicPlayerProps) {
  // Initialize player on mount
  usePlayerInitialization();
  
  const {
    currentTrack,
    isPlaying,
    isPaused,
    isLoading,
    timeInfo,
    progress,
    volume,
    error,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    clearError,
  } = useMusicPlayer();

  if (!currentTrack && !compact) {
    return (
      <div className={`bg-gray-900 border-t border-gray-700 p-4 ${className}`}>
        <div className="flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-lg mb-2">🎵</div>
            <p>No track selected</p>
            <p className="text-sm">Add songs to your queue to start playing</p>
          </div>
        </div>
      </div>
    );
  }

  if (compact && !currentTrack) {
    return null;
  }

  return (
    <div className={`bg-gray-900 border-t border-gray-700 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            onClick={clearError}
            className="text-red-200 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className={`p-4 ${compact ? 'py-2' : ''}`}>
        {/* Progress Bar - Full width on top for compact mode */}
        {compact && (
          <div className="mb-2">
            <ProgressBar
              currentTime={timeInfo.currentTime}
              duration={timeInfo.duration}
              progress={progress}
              onSeek={seek}
              compact
            />
          </div>
        )}

        <div className="flex items-center space-x-4">
          {/* Track Info */}
          <div className={`flex-1 min-w-0 ${compact ? 'max-w-xs' : 'max-w-sm'}`}>
            <TrackInfo
              track={currentTrack}
              isLoading={isLoading}
              compact={compact}
            />
          </div>

          {/* Player Controls */}
          <div className="flex items-center space-x-2">
            <PlayerControls
              isPlaying={isPlaying}
              isPaused={isPaused}
              isLoading={isLoading}
              onPlay={play}
              onPause={pause}
              onNext={next}
              onPrevious={previous}
              compact={compact}
            />
          </div>

          {/* Volume and Queue Controls */}
          <div className="flex items-center space-x-2">
            {!compact && (
              <VolumeControl
                volume={volume}
                onVolumeChange={setVolume}
              />
            )}
            
            <QueueButton compact={compact} />
          </div>
        </div>

        {/* Progress Bar - Below controls for normal mode */}
        {!compact && (
          <div className="mt-4">
            <ProgressBar
              currentTime={timeInfo.currentTime}
              duration={timeInfo.duration}
              progress={progress}
              onSeek={seek}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;