'use client';

import React, { useState } from 'react';
import { 
  Filter, 
  Clock, 
  Calendar, 
  TrendingUp, 
  User, 
  List, 
  Music, 
  X,
  ChevronDown,
  Search
} from 'lucide-react';
import { SearchFilters } from '@/lib/store/types';

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

type SearchType = 'all' | 'music' | 'channels' | 'playlists';

interface ExtendedSearchFilters extends SearchFilters {
  searchType?: SearchType;
}

export function SearchFiltersPanel({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  className = '' 
}: SearchFiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('all');

  const extendedFilters = filters as ExtendedSearchFilters;
  const hasActiveFilters = Object.keys(filters).length > 0 || searchType !== 'all';

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters };
    
    if (value === undefined || value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    onFiltersChange(newFilters);
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    // You could extend this to modify the actual search query or filters
    // For now, it's mainly for UI indication
  };

  const clearAllFilters = () => {
    setSearchType('all');
    onClearFilters();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Search Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {Object.keys(filters).length + (searchType !== 'all' ? 1 : 0)}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Search Type Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { type: 'all' as SearchType, label: 'All', icon: Search },
          { type: 'music' as SearchType, label: 'Music', icon: Music },
          { type: 'channels' as SearchType, label: 'Channels', icon: User },
          { type: 'playlists' as SearchType, label: 'Playlists', icon: List },
        ].map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => handleSearchTypeChange(type)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              searchType === type
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Duration Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Clock className="w-4 h-4" />
              <span>Duration</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: '', label: 'Any' },
                { value: 'short', label: 'Short (< 4 min)' },
                { value: 'medium', label: 'Medium (4-20 min)' },
                { value: 'long', label: 'Long (> 20 min)' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange('duration', value || undefined)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    (filters.duration || '') === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Date Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Calendar className="w-4 h-4" />
              <span>Upload Date</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { value: '', label: 'Any time' },
                { value: 'hour', label: 'Last hour' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This week' },
                { value: 'month', label: 'This month' },
                { value: 'year', label: 'This year' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange('uploadDate', value || undefined)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    (filters.uploadDate || '') === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <TrendingUp className="w-4 h-4" />
              <span>Sort By</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'relevance', label: 'Relevance' },
                { value: 'date', label: 'Upload date' },
                { value: 'views', label: 'View count' },
                { value: 'rating', label: 'Rating' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange('sortBy', value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    (filters.sortBy || 'relevance') === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Type Specific Options */}
          {searchType === 'music' && (
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Music className="w-4 h-4" />
                <span>Music Type</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Songs',
                  'Albums',
                  'Live performances',
                  'Covers',
                  'Remixes',
                  'Instrumentals',
                ].map((type) => (
                  <button
                    key={type}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                             hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 
                             transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchType === 'channels' && (
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <User className="w-4 h-4" />
                <span>Channel Type</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Artists',
                  'Record labels',
                  'Music channels',
                  'Independent creators',
                  'Live venues',
                  'Radio stations',
                ].map((type) => (
                  <button
                    key={type}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                             hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 
                             transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchType === 'playlists' && (
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <List className="w-4 h-4" />
                <span>Playlist Type</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Curated playlists',
                  'Albums',
                  'Compilations',
                  'Genre mixes',
                  'Mood playlists',
                  'Decade collections',
                ].map((type) => (
                  <button
                    key={type}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                             hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 
                             transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !isExpanded && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700">
          <div className="flex flex-wrap gap-2">
            {searchType !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                Type: {searchType}
                <button
                  onClick={() => setSearchType('all')}
                  className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {Object.entries(filters).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full"
              >
                {key}: {value}
                <button
                  onClick={() => handleFilterChange(key as keyof SearchFilters, undefined)}
                  className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}