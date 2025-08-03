'use client';

import React from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  ForwardIcon, 
  BackwardIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

interface PlayerControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  compact?: boolean;
}

export function PlayerControls({
  isPlaying,
  isPaused,
  isLoading,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  compact = false,
}: PlayerControlsProps) {
  const buttonSize = compact ? 'w-8 h-8' : 'w-10 h-10';
  const playButtonSize = compact ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = compact ? 'w-4 h-4' : 'w-5 h-5';
  const playIconSize = compact ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div className="flex items-center space-x-2">
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        disabled={isLoading}
        className={`${buttonSize} flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        title="Previous track (Ctrl+←)"
      >
        <BackwardIcon className={iconSize} />
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={isLoading}
        className={`${playButtonSize} flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isLoading ? (
          <ArrowPathIcon className={`${playIconSize} animate-spin`} />
        ) : isPlaying ? (
          <PauseIcon className={playIconSize} />
        ) : (
          <PlayIcon className={playIconSize} />
        )}
      </button>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={isLoading}
        className={`${buttonSize} flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        title="Next track (Ctrl+→)"
      >
        <ForwardIcon className={iconSize} />
      </button>
    </div>
  );
}

export default PlayerControls;