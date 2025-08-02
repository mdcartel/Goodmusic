'use client';

import { useState, useEffect } from 'react';
import { Mood } from '@/types';
import { cn } from '@/lib/utils';
import { useApiErrorHandling } from '@/hooks/useErrorHandling';
import { useToast } from '@/contexts/ToastContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { localStorageManager } from '@/lib/localStorageManager';

interface MoodSelectorProps {
  selectedMood: string | null;
  onMoodSelect: (mood: string) => void;
  moods?: Mood[];
  className?: string;
}

export default function MoodSelector({ 
  selectedMood, 
  onMoodSelect, 
  moods = [], 
  className 
}: MoodSelectorProps) {
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableMoods, setAvailableMoods] = useState<Mood[]>(moods);
  
  const { executeApiCall } = useApiErrorHandling();
  const { preferences, setSelectedMood: setUserSelectedMood } = useUserPreferences();
  const toast = useToast();

  // Fetch moods from API if not provided
  useEffect(() => {
    if (moods.length === 0) {
      fetchMoods();
    } else {
      setIsLoading(false);
    }
  }, [moods]);

  // Load selected mood from user preferences on mount
  useEffect(() => {
    const savedMood = preferences.selectedMood;
    if (savedMood && !selectedMood) {
      onMoodSelect(savedMood);
    }
  }, [selectedMood, onMoodSelect, preferences.selectedMood]);

  const fetchMoods = async () => {
    const result = await executeApiCall(async () => {
      const response = await fetch('/api/moods');
      if (!response.ok) {
        throw new Error(`Failed to fetch moods: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data.moods || [];
    }, '/api/moods');

    if (result) {
      setAvailableMoods(result);
    } else {
      // Fallback to default moods if API fails
      setAvailableMoods([]);
      toast.warning('Using Offline Mode', 'Could not load moods from server. Some features may be limited.');
    }
    
    setIsLoading(false);
  };

  const handleMoodSelect = (moodId: string) => {
    onMoodSelect(moodId);
    setUserSelectedMood(moodId);
    // Add to mood history
    localStorageManager.addMoodToHistory(moodId);
  };

  const clearSelection = () => {
    onMoodSelect('');
    setUserSelectedMood('');
  };

  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <h3 className="text-xl sm:text-2xl font-semibold text-white">
          Choose Your Vibe
        </h3>
        {selectedMood && (
          <button
            onClick={clearSelection}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-gray-800 self-start sm:self-auto"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Mood Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
        {availableMoods.map((mood) => {
          const isSelected = selectedMood === mood.id;
          const isHovered = hoveredMood === mood.id;
          
          return (
            <button
              key={mood.id}
              onClick={() => handleMoodSelect(mood.id)}
              onMouseEnter={() => setHoveredMood(mood.id)}
              onMouseLeave={() => setHoveredMood(null)}
              className={cn(
                "group relative aspect-square rounded-xl transition-all duration-300 transform",
                "border-2 border-transparent",
                "hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900",
                "active:scale-95 touch-manipulation",
                "min-h-[80px] sm:min-h-[100px]",
                isSelected && "scale-105 shadow-2xl shadow-purple-500/30 border-purple-500",
                !isSelected && "hover:border-gray-600"
              )}
              style={{
                background: isSelected || isHovered 
                  ? `linear-gradient(135deg, ${mood.color.replace('bg-', '')}-500, ${mood.color.replace('bg-', '')}-600)`
                  : 'rgb(31, 41, 55)' // gray-800
              }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 rounded-xl opacity-10">
                <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full p-2 sm:p-3 lg:p-4">
                {/* Emoji */}
                <div className={cn(
                  "text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-1 sm:mb-2 transition-transform duration-300",
                  (isSelected || isHovered) && "scale-110"
                )}>
                  {mood.emoji}
                </div>

                {/* Mood Name */}
                <div className={cn(
                  "text-xs sm:text-sm md:text-base font-medium text-center transition-colors duration-300 leading-tight",
                  isSelected ? "text-white" : "text-gray-300 group-hover:text-white"
                )}>
                  {mood.name}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
                  </div>
                )}
              </div>

              {/* Hover Description - Hidden on mobile */}
              {isHovered && !isSelected && (
                <div className="hidden md:block absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-20">
                  <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-gray-700 max-w-48">
                    {mood.description}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                      <div className="w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45" />
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Mood Info */}
      {selectedMood && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
          {(() => {
            const mood = availableMoods.find(m => m.id === selectedMood);
            if (!mood) return null;
            
            return (
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="text-2xl sm:text-3xl self-center sm:self-auto">{mood.emoji}</div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-base sm:text-lg font-semibold text-white">
                    {mood.name} Vibes
                  </h4>
                  <p className="text-gray-300 text-sm mt-1">
                    {mood.description}
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                    {mood.keywords.slice(0, 4).map((keyword) => (
                      <span
                        key={keyword}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Empty State */}
      {availableMoods.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">😔</div>
          <p className="text-gray-400">No moods available right now</p>
          <button
            onClick={fetchMoods}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}