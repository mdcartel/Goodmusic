'use client';

import React, { useState, useRef, useCallback } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  progress: number;
  onSeek: (time: number) => void;
  compact?: boolean;
}

export function ProgressBar({
  currentTime,
  duration,
  progress,
  onSeek,
  compact = false,
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressFromEvent = useCallback((event: React.MouseEvent | MouseEvent): number => {
    if (!progressBarRef.current) return 0;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    
    return Math.max(0, Math.min(1, x / width));
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    
    const newProgress = getProgressFromEvent(event);
    setDragProgress(newProgress);
    
    const handleMouseMove = (e: MouseEvent) => {
      const newProgress = getProgressFromEvent(e);
      setDragProgress(newProgress);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      const finalProgress = getProgressFromEvent(e);
      const seekTime = finalProgress * duration;
      
      if (isFinite(seekTime) && seekTime >= 0) {
        onSeek(seekTime);
      }
      
      setIsDragging(false);
      setDragProgress(0);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [getProgressFromEvent, duration, onSeek]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (isDragging) return;
    
    const newProgress = getProgressFromEvent(event);
    const seekTime = newProgress * duration;
    
    if (isFinite(seekTime) && seekTime >= 0) {
      onSeek(seekTime);
    }
  }, [isDragging, getProgressFromEvent, duration, onSeek]);

  const displayProgress = isDragging ? dragProgress : progress;
  const displayTime = isDragging ? dragProgress * duration : currentTime;

  return (
    <div className="flex items-center space-x-3">
      {/* Current Time */}
      {!compact && (
        <div className="text-xs text-gray-400 w-10 text-right">
          {formatTime(displayTime)}
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex-1 relative">
        <div
          ref={progressBarRef}
          className={`w-full bg-gray-700 rounded-full cursor-pointer ${compact ? 'h-1' : 'h-2'}`}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        >
          {/* Progress Fill */}
          <div
            className={`bg-blue-500 rounded-full transition-all duration-150 ${compact ? 'h-1' : 'h-2'}`}
            style={{ width: `${displayProgress * 100}%` }}
          />
          
          {/* Progress Handle */}
          {!compact && (
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full transition-all duration-150 ${
                isDragging ? 'scale-125' : 'scale-100'
              }`}
              style={{ left: `calc(${displayProgress * 100}% - 6px)` }}
            />
          )}
        </div>

        {/* Hover Time Tooltip */}
        {!compact && (
          <div className="absolute -top-8 left-0 right-0 pointer-events-none">
            <div
              className={`absolute bg-gray-800 text-white text-xs px-2 py-1 rounded transform -translate-x-1/2 transition-opacity duration-150 ${
                isDragging ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ left: `${displayProgress * 100}%` }}
            >
              {formatTime(displayTime)}
            </div>
          </div>
        )}
      </div>

      {/* Duration */}
      {!compact && (
        <div className="text-xs text-gray-400 w-10">
          {formatTime(duration)}
        </div>
      )}

      {/* Compact mode time display */}
      {compact && (
        <div className="text-xs text-gray-400 whitespace-nowrap">
          {formatTime(displayTime)} / {formatTime(duration)}
        </div>
      )}
    </div>
  );
}

export default ProgressBar;