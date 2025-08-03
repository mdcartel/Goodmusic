import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  musicPlayer, 
  PlayerState, 
  PlayerConfig, 
  Track, 
  QueueItem, 
  RepeatMode,
  PlayerEvent,
  PlayerEventCallback 
} from '../services/music-player';

// Hook for player state management
export function useMusicPlayerState() {
  const [state, setState] = useState<PlayerState>(musicPlayer.getState());

  useEffect(() => {
    const handleStateChange: PlayerEventCallback = (newState: PlayerState) => {
      setState(newState);
    };

    musicPlayer.on('stateChange', handleStateChange);

    // Get initial state
    setState(musicPlayer.getState());

    return () => {
      musicPlayer.off('stateChange', handleStateChange);
    };
  }, []);

  return state;
}

// Hook for player configuration
export function useMusicPlayerConfig() {
  const [config, setConfig] = useState<PlayerConfig>(musicPlayer.getConfig());

  useEffect(() => {
    // Update config when it changes
    setConfig(musicPlayer.getConfig());
  }, []);

  return config;
}

// Hook for playback controls
export function usePlaybackControls() {
  const queryClient = useQueryClient();

  const playMutation = useMutation({
    mutationFn: async () => {
      await musicPlayer.play();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-state'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      musicPlayer.pause();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-state'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      musicPlayer.stop();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-state'] });
    },
  });

  const seekMutation = useMutation({
    mutationFn: async (time: number) => {
      await musicPlayer.seek(time);
    },
  });

  const nextMutation = useMutation({
    mutationFn: async () => {
      await musicPlayer.next();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-state'] });
    },
  });

  const previousMutation = useMutation({
    mutationFn: async () => {
      await musicPlayer.previous();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-state'] });
    },
  });

  const playTrackAtIndexMutation = useMutation({
    mutationFn: async (index: number) => {
      await musicPlayer.playTrackAtIndex(index);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-state'] });
    },
  });

  return {
    play: playMutation.mutate,
    pause: pauseMutation.mutate,
    stop: stopMutation.mutate,
    seek: seekMutation.mutate,
    next: nextMutation.mutate,
    previous: previousMutation.mutate,
    playTrackAtIndex: playTrackAtIndexMutation.mutate,
    isLoading: playMutation.isPending || pauseMutation.isPending || 
               stopMutation.isPending || nextMutation.isPending || 
               previousMutation.isPending || playTrackAtIndexMutation.isPending,
  };
}

// Hook for volume and playback rate controls
export function useAudioControls() {
  const setVolume = useCallback((volume: number) => {
    musicPlayer.setVolume(volume);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    musicPlayer.setPlaybackRate(rate);
  }, []);

  return {
    setVolume,
    setPlaybackRate,
  };
}

// Hook for queue management
export function useQueueControls() {
  const queryClient = useQueryClient();

  const setQueueMutation = useMutation({
    mutationFn: async (tracks: Track[]) => {
      musicPlayer.setQueue(tracks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-queue'] });
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async ({ track, position }: { track: Track; position?: number }) => {
      musicPlayer.addToQueue(track, position);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-queue'] });
    },
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: async (queueId: string) => {
      musicPlayer.removeFromQueue(queueId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-queue'] });
    },
  });

  const clearQueueMutation = useMutation({
    mutationFn: async () => {
      musicPlayer.clearQueue();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-queue'] });
    },
  });

  return {
    setQueue: setQueueMutation.mutate,
    addToQueue: addToQueueMutation.mutate,
    removeFromQueue: removeFromQueueMutation.mutate,
    clearQueue: clearQueueMutation.mutate,
    isLoading: setQueueMutation.isPending || addToQueueMutation.isPending || 
               removeFromQueueMutation.isPending || clearQueueMutation.isPending,
  };
}

// Hook for shuffle and repeat controls
export function usePlaybackModes() {
  const setShuffle = useCallback((enabled: boolean) => {
    musicPlayer.setShuffle(enabled);
  }, []);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    musicPlayer.setRepeatMode(mode);
  }, []);

  return {
    setShuffle,
    setRepeatMode,
  };
}

// Hook for current track information
export function useCurrentTrack() {
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(
    musicPlayer.getCurrentTrack()
  );

  useEffect(() => {
    const handleTrackChange: PlayerEventCallback = (track: QueueItem) => {
      setCurrentTrack(track);
    };

    const handleStateChange: PlayerEventCallback = (state: PlayerState) => {
      setCurrentTrack(state.currentTrack);
    };

    musicPlayer.on('trackChange', handleTrackChange);
    musicPlayer.on('stateChange', handleStateChange);

    // Get initial track
    setCurrentTrack(musicPlayer.getCurrentTrack());

    return () => {
      musicPlayer.off('trackChange', handleTrackChange);
      musicPlayer.off('stateChange', handleStateChange);
    };
  }, []);

  return currentTrack;
}

// Hook for queue information
export function useQueue() {
  const [queue, setQueue] = useState<QueueItem[]>(musicPlayer.getQueue());

  useEffect(() => {
    const handleQueueChange: PlayerEventCallback = (newQueue: QueueItem[]) => {
      setQueue(newQueue);
    };

    musicPlayer.on('queueChange', handleQueueChange);

    // Get initial queue
    setQueue(musicPlayer.getQueue());

    return () => {
      musicPlayer.off('queueChange', handleQueueChange);
    };
  }, []);

  return queue;
}

// Hook for time updates
export function useTimeUpdate() {
  const [timeInfo, setTimeInfo] = useState({
    currentTime: 0,
    duration: 0,
  });

  useEffect(() => {
    const handleTimeUpdate: PlayerEventCallback = (data: { currentTime: number; duration: number }) => {
      setTimeInfo(data);
    };

    const handleStateChange: PlayerEventCallback = (state: PlayerState) => {
      setTimeInfo({
        currentTime: state.currentTime,
        duration: state.duration,
      });
    };

    musicPlayer.on('timeUpdate', handleTimeUpdate);
    musicPlayer.on('stateChange', handleStateChange);

    // Get initial time info
    const state = musicPlayer.getState();
    setTimeInfo({
      currentTime: state.currentTime,
      duration: state.duration,
    });

    return () => {
      musicPlayer.off('timeUpdate', handleTimeUpdate);
      musicPlayer.off('stateChange', handleStateChange);
    };
  }, []);

  return timeInfo;
}

// Hook for volume changes
export function useVolumeControl() {
  const [volume, setVolumeState] = useState(musicPlayer.getState().volume);

  useEffect(() => {
    const handleVolumeChange: PlayerEventCallback = (newVolume: number) => {
      setVolumeState(newVolume);
    };

    const handleStateChange: PlayerEventCallback = (state: PlayerState) => {
      setVolumeState(state.volume);
    };

    musicPlayer.on('volumeChange', handleVolumeChange);
    musicPlayer.on('stateChange', handleStateChange);

    // Get initial volume
    setVolumeState(musicPlayer.getState().volume);

    return () => {
      musicPlayer.off('volumeChange', handleVolumeChange);
      musicPlayer.off('stateChange', handleStateChange);
    };
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    musicPlayer.setVolume(newVolume);
  }, []);

  return {
    volume,
    setVolume,
  };
}

// Hook for error handling
export function usePlayerErrors() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError: PlayerEventCallback = (errorData: any) => {
      setError(errorData?.message || 'An error occurred');
    };

    const handleStateChange: PlayerEventCallback = (state: PlayerState) => {
      setError(state.error);
    };

    musicPlayer.on('error', handleError);
    musicPlayer.on('stateChange', handleStateChange);

    // Get initial error state
    setError(musicPlayer.getState().error);

    return () => {
      musicPlayer.off('error', handleError);
      musicPlayer.off('stateChange', handleStateChange);
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    clearError,
  };
}

// Hook for player events
export function usePlayerEvent(event: PlayerEvent, callback: PlayerEventCallback) {
  useEffect(() => {
    musicPlayer.on(event, callback);

    return () => {
      musicPlayer.off(event, callback);
    };
  }, [event, callback]);
}

// Comprehensive hook that combines all player functionality
export function useMusicPlayer() {
  const state = useMusicPlayerState();
  const config = useMusicPlayerConfig();
  const playbackControls = usePlaybackControls();
  const audioControls = useAudioControls();
  const queueControls = useQueueControls();
  const playbackModes = usePlaybackModes();
  const currentTrack = useCurrentTrack();
  const queue = useQueue();
  const timeInfo = useTimeUpdate();
  const volumeControl = useVolumeControl();
  const { error, clearError } = usePlayerErrors();

  return {
    // State
    state,
    config,
    currentTrack,
    queue,
    timeInfo,
    volume: volumeControl.volume,
    error,

    // Controls
    ...playbackControls,
    ...audioControls,
    ...queueControls,
    ...playbackModes,
    setVolume: volumeControl.setVolume,
    clearError,

    // Computed properties
    isPlaying: state.playbackState === 'playing',
    isPaused: state.playbackState === 'paused',
    isLoading: state.loading || playbackControls.isLoading || queueControls.isLoading,
    hasQueue: queue.length > 0,
    canGoNext: state.currentIndex < queue.length - 1 || state.repeatMode === 'all',
    canGoPrevious: state.currentIndex > 0 || state.repeatMode === 'all',
    progress: timeInfo.duration > 0 ? timeInfo.currentTime / timeInfo.duration : 0,
  };
}

// Hook for initializing the player (should be used once in the app)
export function usePlayerInitialization() {
  useEffect(() => {
    // Load saved state when the app starts
    musicPlayer.loadState();

    // Cleanup on unmount
    return () => {
      musicPlayer.destroy();
    };
  }, []);
}

// Hook for keyboard shortcuts
export function usePlayerKeyboardShortcuts() {
  const { play, pause, next, previous, setVolume } = useMusicPlayer();
  const { volume } = useVolumeControl();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (musicPlayer.getState().playbackState === 'playing') {
            pause();
          } else {
            play();
          }
          break;

        case 'ArrowRight':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            next();
          }
          break;

        case 'ArrowLeft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            previous();
          }
          break;

        case 'ArrowUp':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setVolume(Math.min(1, volume + 0.1));
          }
          break;

        case 'ArrowDown':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setVolume(Math.max(0, volume - 0.1));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [play, pause, next, previous, setVolume, volume]);
}

// Hook for media session API integration
export function useMediaSession() {
  const currentTrack = useCurrentTrack();
  const { play, pause, next, previous } = usePlaybackControls();
  const state = useMusicPlayerState();

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: currentTrack.thumbnail ? [
          { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ] : undefined,
      });

      // Set playback state
      navigator.mediaSession.playbackState = 
        state.playbackState === 'playing' ? 'playing' : 'paused';

      // Set action handlers
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('previoustrack', () => previous());
    }
  }, [currentTrack, state.playbackState, play, pause, next, previous]);
}