'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  SpeakerArrowUpIcon
} from '@heroicons/react/24/outline';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVolume, setDragVolume] = useState(volume);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const getVolumeIcon = () => {
    if (volume === 0) return SpeakerXMarkIcon;
    if (volume < 0.5) return SpeakerWaveIcon;
    return SpeakerArrowUpIcon;
  };

  const VolumeIcon = getVolumeIcon();

  const getVolumeFromEvent = useCallback((event: React.MouseEvent | MouseEvent): number => {
    if (!volumeBarRef.current) return volume;
    
    const rect = volumeBarRef.current.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;
    
    // Invert because we want top to be high volume
    const newVolume = 1 - (y / height);
    return Math.max(0, Math.min(1, newVolume));
  }, [volume]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    
    const newVolume = getVolumeFromEvent(event);
    setDragVolume(newVolume);
    
    const handleMouseMove = (e: MouseEvent) => {
      const newVolume = getVolumeFromEvent(e);
      setDragVolume(newVolume);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      const finalVolume = getVolumeFromEvent(e);
      onVolumeChange(finalVolume);
      
      setIsDragging(false);
      setDragVolume(volume);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [getVolumeFromEvent, onVolumeChange, volume]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (isDragging) return;
    
    const newVolume = getVolumeFromEvent(event);
    onVolumeChange(newVolume);
  }, [isDragging, getVolumeFromEvent, onVolumeChange]);

  const handleMuteToggle = useCallback(() => {
    onVolumeChange(volume === 0 ? 0.8 : 0);
  }, [volume, onVolumeChange]);

  const displayVolume = isDragging ? dragVolume : volume;

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Volume Icon Button */}
      <button
        onClick={handleMuteToggle}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
        title={`${volume === 0 ? 'Unmute' : 'Mute'} (Ctrl+↑/↓)`}
      >
        <VolumeIcon className="w-5 h-5 text-gray-300" />
      </button>

      {/* Volume Slider */}
      <div 
        className={`absolute left-full ml-2 transition-all duration-200 ${
          isHovered || isDragging ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="bg-gray-800 rounded-lg p-2 shadow-lg">
          <div
            ref={volumeBarRef}
            className="w-4 h-20 bg-gray-600 rounded-full cursor-pointer relative"
            onMouseDown={handleMouseDown}
            onClick={handleClick}
          >
            {/* Volume Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-full transition-all duration-150"
              style={{ height: `${displayVolume * 100}%` }}
            />
            
            {/* Volume Handle */}
            <div
              className={`absolute left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full transition-all duration-150 ${
                isDragging ? 'scale-125' : 'scale-100'
              }`}
              style={{ bottom: `calc(${displayVolume * 100}% - 6px)` }}
            />
          </div>
          
          {/* Volume Percentage */}
          <div className="text-xs text-gray-400 text-center mt-1">
            {Math.round(displayVolume * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default VolumeControl;