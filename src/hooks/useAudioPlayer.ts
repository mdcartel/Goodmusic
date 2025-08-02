'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Song } from '@/types';
import { localStorageManager } from '@/lib/localStorageManager';

interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  volume?: number;
  onSongChange?: (song: Song | null) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export interface AudioPlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
  queue: Song[];
  currentIndex: number;
  isRepeat: boolean;
  isShuffle: boolean;
}

export interface AudioPlayerActions {
  play: (song?: Song) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setQueue: (songs: Song[]) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  jumpToIndex: (index: number) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const {
    volume: initialVolume = 0.7,
    onSongChange,
    onPlayStateChange
  } = options;

  const [state, setState] = useState<AudioPlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    isMuted: false,
    isLoading: false,
    error: null,
    queue: [],
    currentIndex: -1,
    isRepeat: false,
    isShuffle: false
  });

  const shuffleIndexes = useRef<number[]>([]);
  const shufflePosition = useRef(0);

  // Load saved settings on mount
  useEffect(() => {
    const playbackSettings = localStorageManager.getPlaybackSettings();
    setState(prev => ({ 
      ...prev, 
      volume: playbackSettings.volume,
      isMuted: playbackSettings.isMuted,
      isRepeat: playbackSettings.isRepeat,
      isShuffle: playbackSettings.isShuffle
    }));
  }, []);

  // Generate shuffle order
  const generateShuffleOrder = useCallback((queueLength: number, currentIndex: number) => {
    const indexes = Array.from({ length: queueLength }, (_, i) => i);
    
    // Remove current index from shuffle
    const filteredIndexes = indexes.filter(i => i !== currentIndex);
    
    // Fisher-Yates shuffle
    for (let i = filteredIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredIndexes[i], filteredIndexes[j]] = [filteredIndexes[j], filteredIndexes[i]];
    }
    
    return filteredIndexes;
  }, []);

  const play = useCallback((song?: Song) => {
    setState(prev => {
      const baseState = { ...prev, isLoading: true, error: null, isPlaying: true };
      
      if (!song) {
        return baseState;
      }
      
      // Playing a new song
      const existingIndex = prev.queue.findIndex(s => s.id === song.id);
      
      let newQueue = prev.queue;
      let newCurrentIndex = prev.currentIndex;
      
      if (existingIndex >= 0) {
        // Song is in queue, jump to it
        newCurrentIndex = existingIndex;
      } else {
        // Add song to queue and play it
        newQueue = [...prev.queue, song];
        newCurrentIndex = prev.queue.length;
      }
      
      // Add to recently played
      localStorageManager.addToRecentlyPlayed(song);
      
      // Generate new shuffle order if shuffle is enabled
      if (prev.isShuffle) {
        shuffleIndexes.current = generateShuffleOrder(newQueue.length, newCurrentIndex);
        shufflePosition.current = 0;
      }
      
      return {
        ...baseState,
        currentSong: song,
        queue: newQueue,
        currentIndex: newCurrentIndex
      };
    });
    
    onSongChange?.(song || state.currentSong);
    onPlayStateChange?.(true);
  }, [state.currentSong, onSongChange, onPlayStateChange, generateShuffleOrder]);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ 
      ...prev, 
      volume: clampedVolume,
      isMuted: clampedVolume === 0
    }));
    localStorageManager.updatePlaybackSettings({ volume: clampedVolume });
  }, []);

  const toggleMute = useCallback(() => {
    setState(prev => {
      const newMuted = !prev.isMuted;
      localStorageManager.updatePlaybackSettings({ isMuted: newMuted });
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  const getNextIndex = useCallback(() => {
    const { queue, currentIndex, isShuffle, isRepeat } = state;
    
    if (queue.length === 0) return -1;
    
    if (isRepeat && queue.length === 1) {
      return currentIndex;
    }
    
    if (isShuffle) {
      if (shuffleIndexes.current.length === 0) {
        shuffleIndexes.current = generateShuffleOrder(queue.length, currentIndex);
        shufflePosition.current = 0;
      }
      
      if (shufflePosition.current < shuffleIndexes.current.length - 1) {
        shufflePosition.current++;
        return shuffleIndexes.current[shufflePosition.current];
      } else if (isRepeat) {
        shufflePosition.current = 0;
        return shuffleIndexes.current[0];
      }
      
      return -1;
    }
    
    // Normal sequential playback
    if (currentIndex < queue.length - 1) {
      return currentIndex + 1;
    } else if (isRepeat) {
      return 0;
    }
    
    return -1;
  }, [state, generateShuffleOrder]);

  const getPreviousIndex = useCallback(() => {
    const { queue, currentIndex, isShuffle } = state;
    
    if (queue.length === 0) return -1;
    
    if (isShuffle) {
      if (shufflePosition.current > 0) {
        shufflePosition.current--;
        return shuffleIndexes.current[shufflePosition.current];
      }
      return -1;
    }
    
    // Normal sequential playback
    return currentIndex > 0 ? currentIndex - 1 : -1;
  }, [state]);

  const next = useCallback(() => {
    const nextIndex = getNextIndex();
    
    if (nextIndex >= 0 && nextIndex < state.queue.length) {
      const nextSong = state.queue[nextIndex];
      setState(prev => ({
        ...prev,
        currentSong: nextSong,
        currentIndex: nextIndex,
        isLoading: true,
        error: null
      }));
      
      onSongChange?.(nextSong);
    } else {
      // End of queue
      setState(prev => ({ ...prev, isPlaying: false }));
      onPlayStateChange?.(false);
    }
  }, [getNextIndex, state.queue, onSongChange, onPlayStateChange]);

  const previous = useCallback(() => {
    const prevIndex = getPreviousIndex();
    
    if (prevIndex >= 0 && prevIndex < state.queue.length) {
      const prevSong = state.queue[prevIndex];
      setState(prev => ({
        ...prev,
        currentSong: prevSong,
        currentIndex: prevIndex,
        isLoading: true,
        error: null
      }));
      
      onSongChange?.(prevSong);
    }
  }, [getPreviousIndex, state.queue, onSongChange]);

  const addToQueue = useCallback((song: Song) => {
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, song]
    }));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState(prev => {
      const newQueue = prev.queue.filter((_, i) => i !== index);
      let newCurrentIndex = prev.currentIndex;
      
      if (index < prev.currentIndex) {
        newCurrentIndex--;
      } else if (index === prev.currentIndex) {
        // Current song was removed
        newCurrentIndex = -1;
      }
      
      return {
        ...prev,
        queue: newQueue,
        currentIndex: newCurrentIndex,
        currentSong: newCurrentIndex >= 0 ? newQueue[newCurrentIndex] : null
      };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: [],
      currentIndex: -1,
      currentSong: null,
      isPlaying: false
    }));
    
    shuffleIndexes.current = [];
    shufflePosition.current = 0;
    
    onSongChange?.(null);
    onPlayStateChange?.(false);
  }, [onSongChange, onPlayStateChange]);

  const setQueue = useCallback((songs: Song[]) => {
    setState(prev => ({
      ...prev,
      queue: songs,
      currentIndex: songs.length > 0 ? 0 : -1,
      currentSong: songs.length > 0 ? songs[0] : null
    }));
    
    if (state.isShuffle && songs.length > 0) {
      shuffleIndexes.current = generateShuffleOrder(songs.length, 0);
      shufflePosition.current = 0;
    }
  }, [state.isShuffle, generateShuffleOrder]);

  const toggleRepeat = useCallback(() => {
    setState(prev => {
      const newRepeat = !prev.isRepeat;
      localStorageManager.updatePlaybackSettings({ isRepeat: newRepeat });
      return { ...prev, isRepeat: newRepeat };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => {
      const newShuffle = !prev.isShuffle;
      
      if (newShuffle && prev.queue.length > 0) {
        shuffleIndexes.current = generateShuffleOrder(prev.queue.length, prev.currentIndex);
        shufflePosition.current = 0;
      } else {
        shuffleIndexes.current = [];
        shufflePosition.current = 0;
      }
      
      localStorageManager.updatePlaybackSettings({ isShuffle: newShuffle });
      return { ...prev, isShuffle: newShuffle };
    });
  }, [generateShuffleOrder]);

  const jumpToIndex = useCallback((index: number) => {
    if (index >= 0 && index < state.queue.length) {
      const song = state.queue[index];
      setState(prev => ({
        ...prev,
        currentSong: song,
        currentIndex: index,
        isLoading: true,
        error: null
      }));
      
      onSongChange?.(song);
    }
  }, [state.queue, onSongChange]);

  // Update internal state methods
  const updateCurrentTime = useCallback((time: number) => {
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const updateDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, duration }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const actions: AudioPlayerActions = {
    play,
    pause,
    toggle,
    seek,
    setVolume,
    toggleMute,
    next,
    previous,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueue,
    toggleRepeat,
    toggleShuffle,
    jumpToIndex
  };

  const internalActions = {
    updateCurrentTime,
    updateDuration,
    setLoading,
    setError
  };

  return {
    state,
    actions,
    internalActions
  };
}