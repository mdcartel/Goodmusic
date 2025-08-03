'use client';

import React, { useState, useEffect } from 'react';
import { Clock, X, Search, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
}

interface SearchHistoryProps {
  onSearchSelect?: (query: string) => void;
  maxItems?: number;
  className?: string;
}

export function SearchHistory({ onSearchSelect, maxItems = 10, className = '' }: SearchHistoryProps) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const { searchQuery, searchResults } = useAppStore();

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('search-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setSearchHistory(parsed);
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('search-history', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);

  // Add new search to history when search query changes
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      const existingIndex = searchHistory.findIndex(item => 
        item.query.toLowerCase() === searchQuery.toLowerCase()
      );

      const newItem: SearchHistoryItem = {
        id: Date.now().toString(),
        query: searchQuery,
        timestamp: new Date(),
        resultsCount: searchResults.length,
      };

      setSearchHistory(prev => {
        let newHistory = [...prev];
        
        // Remove existing item if found
        if (existingIndex >= 0) {
          newHistory.splice(existingIndex, 1);
        }
        
        // Add new item at the beginning
        newHistory.unshift(newItem);
        
        // Limit to maxItems
        return newHistory.slice(0, maxItems);
      });
    }
  }, [searchQuery, searchResults.length, maxItems]);

  // Remove item from history
  const removeHistoryItem = (id: string) => {
    setSearchHistory(prev => prev.filter(item => item.id !== id));
  };

  // Clear all history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search-history');
  };

  // Handle search selection
  const handleSearchSelect = (query: string) => {
    onSearchSelect?.(query);
    setShowHistory(false);
  };

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-medium text-gray-900 dark:text-white">Recent Searches</h3>
        </div>
        
        <button
          onClick={clearHistory}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 
                   dark:hover:text-gray-200 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* History Items */}
      <div className="max-h-64 overflow-y-auto">
        {searchHistory.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 
                     dark:hover:bg-gray-700 transition-colors group"
          >
            <button
              onClick={() => handleSearchSelect(item.query)}
              className="flex items-center space-x-3 flex-1 text-left"
            >
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.query}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{item.resultsCount} results</span>
                  <span>•</span>
                  <span>{formatRelativeTime(item.timestamp)}</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => removeHistoryItem(item.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg 
                       hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Popular Searches Suggestion */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Popular searches
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {getPopularSearches().map((search) => (
            <button
              key={search}
              onClick={() => handleSearchSelect(search)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 
                       hover:bg-gray-200 dark:hover:bg-gray-600 
                       text-gray-700 dark:text-gray-300 rounded-full transition-colors"
            >
              {search}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

// Helper function to get popular search suggestions
function getPopularSearches(): string[] {
  return [
    'trending music',
    'pop hits 2024',
    'indie rock',
    'electronic music',
    'jazz classics',
    'hip hop',
  ];
}