'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Settings,
  Download,
  Loader2,
  AlertCircle,
  Headphones
} from 'lucide-react';
import { useAudioPlayback, useAudioQualitySelector } from '@/lib/hooks/useAudioExtraction';
import { useAppStore } from '@/lib/store';
import { AudioQuality } from '@/lib/services/audio-extraction';
import { formatDuration } from '@/lib/utils';

interface AudioPlayerAdvancedProps {
  className?: string;
}

export function AudioPlayerAdvanced({ className = '' }: AudioPlayerAdvancedProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>('best');
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { player, nextSong, previousSong, setVolume: setStoreVolume } = useAppStore();
  const { currentSong } = player;

  // Audio extraction hooks
  const {
    streamingUrl,
    streamingLoading,
    streamingError,
    isGettingStream,
    getStreamingUrl,
  } = useAudioPlayback(currentSong?.youtubeId || '', !!currentSong);

  const {
    qualityOptions,
    isLoadingOptions,
    getUrlForQuality,
    loadQualityOptions,
  } = useAudioQualitySelector(currentSong?.youtubeId || '');

  // Update audio source when streaming URL changes
  useEffect(() => {
    if (streamingUrl && audioRef.current) {
      audioRef.current.src = streamingUrl;
      setError(null);
    }
  }, [streamingUrl]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsBuffering(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      nextSong();
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setError('Failed to load audio');
      setIsPlaying(false);
      setIsBuffering(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [nextSong]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Sync volume with store
  useEffect(() => {
    setStoreVolume(volume);
  }, [volume, setStoreVolume]);

  const handlePlayPause = async () => {
    if (!currentSong) return;

    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        // If no source, get streaming URL first
        if (!audio.src && !streamingUrl) {
          setIsBuffering(true);
          await getStreamingUrl(selectedQuality);
        }
        
        await audio.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
      setError('Playback failed');
      setIsBuffering(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleQualityChange = async (quality: AudioQuality) => {
    try {
      setIsBuffering(true);
      setSelectedQuality(quality);
      
      const newUrl = await getUrlForQuality(quality);
      
      if (audioRef.current) {
        const wasPlaying = isPlaying;
        const currentTimeBackup = currentTime;
        
        audioRef.current.src = newUrl;
        audioRef.current.currentTime = currentTimeBackup;
        
        if (wasPlaying) {
          await audioRef.current.play();
        }
      }
      
      setShowQualitySelector(false);
    } catch (error) {
      console.error('Quality change error:', error);
      setError('Failed to change quality');
    } finally {
      setIsBuffering(false);
    }
  };

  if (!currentSong) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Headphones className="w-8 h-8 mr-3" />
          <span>No song selected</span>
        </div>
      </div>
    );
  }

  const isLoading = streamingLoading || isGettingStream || isBuffering;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Song Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {/* Thumbnail */}
          <div className="relative w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
            {currentSong.thumbnail ? (
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Headphones className="w-6 h-6 text-gray-400" />
              </div>
            )}
            
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Song Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {currentSong.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {currentSong.artist}
            </p>
            {error && (
              <div className="flex items-center mt-1 text-red-500 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                {error}
              </div>
            )}
          </div>

          {/* Quality Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowQualitySelector(!showQualitySelector);
                if (!showQualitySelector && qualityOptions.length === 0) {
                  loadQualityOptions();
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Audio Quality"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {showQualitySelector && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 
                            border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg 
                            py-2 z-50 min-w-[150px]">
                <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-1">
                  Audio Quality
                </div>
                
                {isLoadingOptions ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading...
                  </div>
                ) : (
                  <>
                    {['best', '320', '192', '128'].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => handleQualityChange(quality as AudioQuality)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 
                                 dark:hover:bg-gray-700 transition-colors ${
                          selectedQuality === quality 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {quality === 'best' ? 'Best Available' : `${quality} kbps`}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                     slider-thumb:appearance-none slider-thumb:w-4 slider-thumb:h-4 
                     slider-thumb:bg-blue-500 slider-thumb:rounded-full slider-thumb:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={previousSong}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handlePlayPause}
            disabled={isLoading || !!streamingError}
            className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
                     text-white rounded-full transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Next"
          >
            <SkipForward className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMute}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                     slider-thumb:appearance-none slider-thumb:w-3 slider-thumb:h-3 
                     slider-thumb:bg-blue-500 slider-thumb:rounded-full slider-thumb:cursor-pointer"
          />

          <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}