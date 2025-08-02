'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  Music, 
  Heart, 
  MessageCircle,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { MusicDiscoveryIntegration } from '@/lib/musicDiscoveryIntegration';

interface DiscoveryInsightsProps {
  className?: string;
}

export default function DiscoveryInsights({ className }: DiscoveryInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const discoveryIntegration = MusicDiscoveryIntegration.getInstance();
    
    const updateInsights = () => {
      const data = discoveryIntegration.getDiscoveryInsights();
      setInsights(data);
      
      // Show insights if there's meaningful data
      setIsVisible(data.totalSuggestions > 0 || data.favoriteCount > 0);
    };

    updateInsights();

    // Listen for updates
    const handleUpdate = () => updateInsights();
    discoveryIntegration.on('suggestionAdded', handleUpdate);
    discoveryIntegration.on('suggestionPlayed', handleUpdate);
    discoveryIntegration.on('songFavorited', handleUpdate);

    return () => {
      discoveryIntegration.off('suggestionAdded', handleUpdate);
      discoveryIntegration.off('suggestionPlayed', handleUpdate);
      discoveryIntegration.off('songFavorited', handleUpdate);
    };
  }, []);

  if (!isVisible || !insights) {
    return null;
  }

  const getMoodColor = (mood: string) => {
    const moodColors: Record<string, string> = {
      sad: 'bg-blue-500',
      happy: 'bg-yellow-500',
      angry: 'bg-red-500',
      anxious: 'bg-purple-500',
      lonely: 'bg-indigo-500',
      chill: 'bg-green-500',
      energetic: 'bg-orange-500'
    };
    return moodColors[mood] || 'bg-gray-500';
  };

  return (
    <div className={cn(
      "bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700 p-4",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Your Music Journey</h3>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full mx-auto mb-2">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-semibold text-white">{insights.totalSuggestions}</div>
          <div className="text-xs text-gray-400">Suggestions</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-full mx-auto mb-2">
            <Music className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-semibold text-white">{insights.playedSuggestions}</div>
          <div className="text-xs text-gray-400">Played</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-full mx-auto mb-2">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-semibold text-white">{insights.favoriteCount}</div>
          <div className="text-xs text-gray-400">Favorites</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-semibold text-white">{insights.topMoods.length}</div>
          <div className="text-xs text-gray-400">Moods</div>
        </div>
      </div>

      {/* Top Moods */}
      {insights.topMoods.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-300 mb-2">Your Top Moods</div>
          <div className="flex flex-wrap gap-2">
            {insights.topMoods.slice(0, 5).map((mood: string) => (
              <span
                key={mood}
                className={cn(
                  "text-xs px-3 py-1 rounded-full text-white font-medium capitalize",
                  getMoodColor(mood)
                )}
              >
                {mood}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="text-xs text-gray-400 border-t border-gray-700 pt-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-3 h-3" />
          <span>{insights.recentActivity}</span>
        </div>
      </div>

      {/* Recent Suggestions Preview */}
      {insights.suggestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-sm font-medium text-gray-300 mb-2">Recent Discoveries</div>
          <div className="space-y-1">
            {insights.suggestions.slice(0, 3).map((suggestion: any) => (
              <div key={suggestion.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    suggestion.played ? "bg-green-400" : "bg-gray-500"
                  )} />
                  <span className="text-gray-400">
                    {suggestion.songs.length} songs • {suggestion.mood || 'Mixed'}
                  </span>
                </div>
                <span className="text-gray-500">
                  {new Date(suggestion.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}