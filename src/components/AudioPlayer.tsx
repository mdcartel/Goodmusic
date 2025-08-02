'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Song } from '@/types';
import { cn } from '@/lib/utils';
import { LocalStorage } from '@/lib/storage';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Shuffle,
  Heart,
  List
} from 'lucide-react';
import { Button } from '@/components';
import { useStreamingErrorHandling } from '@/hooks/useErrorHandling';
import { useToast } from '@/contexts/ToastContext';

interface AudioPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onVolumeChange?: (volume: number) => void;
  onShowQueue?: () => void;
  queueLength?: number;
  className?: string;
}

export default function AudioPlayer({
  currentSong,
  isPlaying,
  onPlayPause,
  onSeek,
  onNext,
  onPrevious,
  onVolumeChange,
  onShowQueue,
  queueLength = 0,
  className
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  
  const { executeStream } = useStreamingErrorHandling();
  const toast = useToast();

  // Load saved volume on mount
  useEffect(() => {
    const savedVolume = LocalStorage.getVolume();
    setVolume(savedVolume);
    if (audioRef.current) {
      audioRef.current.volume = savedVolume;
    }
  }, []);

  // Fetch stream URL when song changes
  useEffect(() => {
    if (currentSong) {
      fetchStreamUrl(currentSong);
    } else {
      setStreamUrl(null);
      setError(null);
    }
  }, [currentSong]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current || !streamUrl) return;

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
        toast.error('Playback Error', 'Unable to play the audio. Please try again.');
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, streamUrl]);

  const fetchStreamUrl = async (song: Song) => {
    setIsLoading(true);
    setError(null);
    
    const result = await executeStream(async () => {
      const response = await fetch(`/api/stream/${song.id}?quality=best[height<=720]`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.suggestion) {
          throw new Error(`${errorData.error}\n\n💡 ${errorData.suggestion}`);
        }
        
        throw new Error(errorData.error || 'Failed to get stream URL');
      }
      
      const data = await response.json();
      return data.streamUrl;
    }, song.title);

    if (result) {
      setStreamUrl(result);
    } else {
      setError('Failed to load audio stream');
    }
    
    setIsLoading(false);
  };

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (isRepeat) {
      // Repeat current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (onNext) {
      // Play next song
      onNext();
    }
  }, [isRepeat, onNext]);

  const handleError = useCallback(() => {
    setError('Audio playback error');
    setIsLoading(false);
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audioRef.current.currentTime = newTime;
    onSeek(newTime);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current || !audioRef.current) return;

    const rect = volumeRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, clickX / rect.width));
    
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
    
    LocalStorage.setVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleRepeat = () => {
    setIsRepeat(!isRepeat);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite functionality
  };

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = (isMuted ? 0 : volume) * 100;

  if (!currentSong) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 z-50",
      className
    )}>
      {/* Hidden Audio Element */}
      {streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          preload="metadata"
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Song Info */}
          <div className="flex items-center space-x-3 mb-3">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate">{currentSong.title}</h4>
              {currentSong.artist && (
                <p className="text-gray-400 text-sm truncate">{currentSong.artist}</p>
              )}
            </div>
            <Button
              onClick={toggleFavorite}
              variant="ghost"
              size="sm"
              className={cn("p-2", isFavorite && "text-red-500")}
            >
              <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div
              ref={progressRef}
              className="h-2 bg-gray-700 rounded-full cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-150"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-6">
            <Button
              onClick={onPrevious}
              variant="ghost"
              size="sm"
              disabled={!onPrevious}
              className="p-2"
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              onClick={onPlayPause}
              variant="primary"
              size="lg"
              loading={isLoading}
              className="rounded-full w-12 h-12"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>

            <Button
              onClick={onNext}
              variant="ghost"
              size="sm"
              disabled={!onNext}
              className="p-2"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Song Info */}
          <div className="flex items-center space-x-3 w-1/4">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-14 h-14 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-white font-medium truncate">{currentSong.title}</h4>
              {currentSong.artist && (
                <p className="text-gray-400 text-sm truncate">{currentSong.artist}</p>
              )}
            </div>
            <Button
              onClick={toggleFavorite}
              variant="ghost"
              size="sm"
              className={cn("p-2", isFavorite && "text-red-500")}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </Button>
          </div>

          {/* Main Controls */}
          <div className="flex-1 flex flex-col items-center space-y-2">
            {/* Control Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={toggleShuffle}
                variant="ghost"
                size="sm"
                className={cn("p-2", isShuffle && "text-purple-400")}
              >
                <Shuffle className="w-4 h-4" />
              </Button>

              <Button
                onClick={onPrevious}
                variant="ghost"
                size="sm"
                disabled={!onPrevious}
                className="p-2"
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              <Button
                onClick={onPlayPause}
                variant="primary"
                size="lg"
                loading={isLoading}
                className="rounded-full w-10 h-10"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>

              <Button
                onClick={onNext}
                variant="ghost"
                size="sm"
                disabled={!onNext}
                className="p-2"
              >
                <SkipForward className="w-5 h-5" />
              </Button>

              <Button
                onClick={toggleRepeat}
                variant="ghost"
                size="sm"
                className={cn("p-2", isRepeat && "text-purple-400")}
              >
                <Repeat className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center space-x-3 w-full max-w-md">
              <span className="text-xs text-gray-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div
                ref={progressRef}
                className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-150"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume Controls */}
          <div className="flex items-center space-x-3 w-1/4 justify-end">
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            <div
              ref={volumeRef}
              className="w-20 h-2 bg-gray-700 rounded-full cursor-pointer"
              onClick={handleVolumeClick}
            >
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-150"
                style={{ width: `${volumePercentage}%` }}
              />
            </div>

            <Button
              onClick={onShowQueue}
              variant="ghost"
              size="sm"
              className="p-2 relative"
            >
              <List className="w-4 h-4" />
              {queueLength > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {queueLength > 99 ? '99+' : queueLength}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}