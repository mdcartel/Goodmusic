'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Song } from '@/types';
import { useAudioPlayer, AudioPlayerState, AudioPlayerActions } from '@/hooks/useAudioPlayer';

interface AudioContextType {
  state: AudioPlayerState;
  actions: AudioPlayerActions;
  playFromMood: (songs: Song[], selectedSong?: Song) => void;
  addSongsToQueue: (songs: Song[]) => void;
  isCurrentSong: (songId: string) => boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const { state, actions } = useAudioPlayer({
    volume: 0.7,
    onSongChange: (song) => {
      // Optional: Add analytics or logging here
      if (song) {
        console.log('Now playing:', song.title);
      }
    },
    onPlayStateChange: (isPlaying) => {
      // Optional: Update document title or favicon
      if (typeof document !== 'undefined') {
        document.title = isPlaying && state.currentSong 
          ? `♪ ${state.currentSong.title} - VibePipe`
          : 'VibePipe - Music for Your Mood';
      }
    }
  });

  // Play songs from a mood selection
  const playFromMood = (songs: Song[], selectedSong?: Song) => {
    if (songs.length === 0) return;

    // Set the entire mood as the queue
    actions.setQueue(songs);

    // If a specific song is selected, play it; otherwise play the first song
    const songToPlay = selectedSong || songs[0];
    actions.play(songToPlay);
  };

  // Add multiple songs to the current queue
  const addSongsToQueue = (songs: Song[]) => {
    songs.forEach(song => {
      actions.addToQueue(song);
    });
  };

  // Check if a song is currently playing
  const isCurrentSong = (songId: string): boolean => {
    return state.currentSong?.id === songId;
  };

  const contextValue: AudioContextType = {
    state,
    actions,
    playFromMood,
    addSongsToQueue,
    isCurrentSong
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}