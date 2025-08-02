'use client';

import { useState, useEffect } from 'react';
import { Song } from '@/types';
import SongCard from './SongCard';
import { LoadingSpinner, EmptyState, Button } from '@/components';
import { cn } from '@/lib/utils';
import { Play, Plus, RefreshCw } from 'lucide-react';
import { useApiErrorHandling } from '@/hooks/useErrorHandling';
import { useToast } from '@/contexts/ToastContext';

interface SongGridProps {
  selectedMood: string | null;
  onPlay: (song: Song) => void;
  onDownload: (song: Song, format: 'mp3' | 'mp4') => void;
  currentlyPlaying?: string | null;
  onPlayAll?: (songs: Song[]) => void;
  onAddAllToQueue?: (songs: Song[]) => void;
  className?: string;
}

export default function SongGrid({
  selectedMood,
  onPlay,
  onDownload,
  currentlyPlaying,
  onPlayAll,
  onAddAllToQueue,
  className
}: SongGridProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  
  const { executeApiCall } = useApiErrorHandling();
  const toast = useToast();

  // Fetch songs when mood changes
  useEffect(() => {
    if (selectedMood) {
      fetchSongs(selectedMood);
    } else {
      setSongs([]);
    }
  }, [selectedMood]);

  const fetchSongs = async (mood: string) => {
    setIsLoading(true);
    setError(null);
    
    const result = await executeApiCall(async () => {
      const response = await fetch(`/api/songs?mood=${encodeURIComponent(mood)}&limit=12`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch songs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.songs || [];
    }, `/api/songs?mood=${mood}`);

    if (result) {
      setSongs(result);
      if (result.length === 0) {
        toast.info('No songs found', `No songs available for ${mood} mood right now`);
      }
    } else {
      setError('Failed to load songs');
      setSongs([]);
    }
    
    setIsLoading(false);
  };

  const handlePlay = async (song: Song) => {
    setLoadingSongId(song.id);
    try {
      await onPlay(song);
    } finally {
      setLoadingSongId(null);
    }
  };

  const handleDownload = async (song: Song, format: 'mp3' | 'mp4') => {
    try {
      await onDownload(song, format);
      // TODO: Show success notification
    } catch (error) {
      console.error('Download failed:', error);
      // TODO: Show error notification
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-400">Loading songs...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("w-full", className)}>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">😔</div>
          <h3 className="text-xl font-semibold text-white mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button
            onClick={() => selectedMood && fetchSongs(selectedMood)}
            variant="primary"
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    );
  }

  // No mood selected
  if (!selectedMood) {
    return (
      <div className={cn("w-full", className)}>
        <EmptyState
          icon="🎵"
          title="Choose Your Vibe"
          description="Select a mood above to discover music that matches your feelings"
        />
      </div>
    );
  }

  // Empty results
  if (songs.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <EmptyState
          icon="🔍"
          title="No songs found"
          description={`We couldn't find any songs for ${selectedMood} mood`}
          actionLabel="Refresh"
          onAction={() => fetchSongs(selectedMood)}
        />
      </div>
    );
  }

  // Songs grid
  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <div className="text-center sm:text-left">
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-1">
            {selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Vibes
          </h3>
          <p className="text-sm sm:text-base text-gray-400">
            {songs.length} song{songs.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          {songs.length > 0 && (
            <>
              {onPlayAll && (
                <Button
                  onClick={() => onPlayAll(songs)}
                  variant="primary"
                  size="sm"
                  className="flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Play All</span>
                </Button>
              )}
              
              {onAddAllToQueue && (
                <Button
                  onClick={() => onAddAllToQueue(songs)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Queue</span>
                </Button>
              )}
            </>
          )}
          
          <Button
            onClick={() => fetchSongs(selectedMood)}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Songs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
        {songs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            onPlay={handlePlay}
            onDownload={handleDownload}
            isPlaying={currentlyPlaying === song.id}
            isLoading={loadingSongId === song.id}
          />
        ))}
      </div>

      {/* Load More Button (for future pagination) */}
      {songs.length >= 12 && (
        <div className="text-center mt-6 sm:mt-8">
          <button
            className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
            onClick={() => {
              // TODO: Implement pagination
              console.log('Load more songs');
            }}
          >
            Load More Songs
          </button>
        </div>
      )}
    </div>
  );
}