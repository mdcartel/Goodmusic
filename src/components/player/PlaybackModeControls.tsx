'use client';

import React from 'react';
import { 
  ArrowPathIcon,
  ShuffleIcon,
  SpeakerWaveIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useMusicPlayer } from '@/lib/hooks/useMusicPlayer';

interface PlaybackModeControlsProps {
  compact?: boolean;
}

export function PlaybackModeControls({ compact = false }: PlaybackModeControlsProps) {
  const { state, setShuffle, setRepeatMode } = useMusicPlayer();

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

  const getRepeatModeTitle = () => {
    switch (state.repeatMode) {
      case 'one':
        return 'Repeat: One track';
      case 'all':
        return 'Repeat: All tracks';
      default:
        return 'Repeat: Off';
    }
  };

  const cycleRepeatMode = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(state.repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const buttonSize = compact ? 'w-8 h-8' : 'w-9 h-9';
  const iconSize = compact ? 'w-4 h-4' : 'w-4 h-4';

  return (
    <div className="flex items-center space-x-1">
      {/* Shuffle Button */}
      <button
        onClick={() => setShuffle(!state.shuffleEnabled)}
        className={`${buttonSize} flex items-center justify-center rounded ${
          state.shuffleEnabled 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        } transition-colors`}
        title={`${state.shuffleEnabled ? 'Disable' : 'Enable'} shuffle`}
      >
        <ShuffleIcon className={iconSize} />
      </button>

      {/* Repeat Button */}
      <button
        onClick={cycleRepeatMode}
        className={`${buttonSize} flex items-center justify-center rounded ${
          state.repeatMode !== 'none'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        } transition-colors`}
        title={getRepeatModeTitle()}
      >
        <span className="text-sm">{getRepeatModeIcon()}</span>
      </button>

      {/* Gapless Playback Indicator */}
      {state.gaplessEnabled && !compact && (
        <div
          className="w-6 h-6 flex items-center justify-center text-green-400"
          title="Gapless playback enabled"
        >
          <SpeakerWaveIcon className="w-4 h-4" />
        </div>
      )}

      {/* Crossfade Indicator */}
      {state.crossfadeEnabled && !compact && (
        <div
          className="w-6 h-6 flex items-center justify-center text-purple-400"
          title="Crossfade enabled"
        >
          <div className="text-xs">⚡</div>
        </div>
      )}
    </div>
  );
}

export default PlaybackModeControls;