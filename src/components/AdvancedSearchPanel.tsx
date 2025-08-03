'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Clock, Calendar, TrendingUp, X, ChevronDown } from 'lucide-react';
import { SearchFilters } from '@/lib/store/types';
import { useYouTubeSearch, useYouTubeSearchSuggestions } from '@/lib/hooks/useYouTubeSearch';
import { useAppStore } from '@/lib/store';
import { debounce } from '@/lib/utils';

interface AdvancedSearchPanelProps {
  onSearchResults?: (results: any[]) => void;
  className?: string;
}

export function AdvancedSearchPanel({ onSearchResults, className = '' }: AdvancedSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const { setSearchQuery, setSearchResults, setSearchFilters, setIsSearching } = useAppStore();

  // Search with debouncing
  const debouncedQuery = useCallback(
    debounce((searchQuery: string) => {
      if (searchQuery.trim()) {
        setSearchQuery(searchQuery);
      }
    }, 300),
    []
  );

  // Search suggestions
  const { data: suggestionsData } = useYouTubeSearchSuggestions(
    query,
    query.length >= 2 && showSuggestions
  );

  // Main search
  const { data: searchData, isLoading, error } = useYouTubeSearch(
    query,
    filters,
    query.length > 0
  );

  // Update search state when results change
  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData.results);
      setSearchFilters(filters);
      onSearchResults?.(searchData.results);
    }
  }, [searchData, filters, setSearchResults, setSearchFilters, onSearchResults]);

  // Update loading state
  useEffect(() => {
    setIsSearching(isLoading);
  }, [isLoading, setIsSearching]);

  // Handle search input change
  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedQuery(value);
    setShowSuggestions(value.length >= 2);
    setSelectedSuggestionIndex(-1);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setSearchFilters(newFilters);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setSearchFilters({});
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    debouncedQuery(suggestion);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || !suggestionsData?.suggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestionsData.suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(suggestionsData.suggestions[selectedSuggestionIndex]);
        } else if (query.trim()) {
          setShowSuggestions(false);
          debouncedQuery(query);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      {/* Search Input */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(query.length >= 2)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search for music, artists, albums..."
            className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-500 dark:placeholder-gray-400"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestionsData?.suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 
                        border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestionsData.suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionSelect(suggestion)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600
                          text-gray-900 dark:text-white transition-colors
                          ${index === selectedSuggestionIndex ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
              >
                <Search className="inline w-4 h-4 mr-2 text-gray-400" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 
                   rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {Object.keys(filters).length}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 
                     dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          {/* Duration Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Duration
            </label>
            <select
              value={filters.duration || ''}
              onChange={(e) => handleFilterChange('duration', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Any duration</option>
              <option value="short">Short (&lt; 4 minutes)</option>
              <option value="medium">Medium (4-20 minutes)</option>
              <option value="long">Long (&gt; 20 minutes)</option>
            </select>
          </div>

          {/* Upload Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Upload Date
            </label>
            <select
              value={filters.uploadDate || ''}
              onChange={(e) => handleFilterChange('uploadDate', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Any time</option>
              <option value="hour">Last hour</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <TrendingUp className="inline w-4 h-4 mr-1" />
              Sort By
            </label>
            <select
              value={filters.sortBy || 'relevance'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Upload date</option>
              <option value="views">View count</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>
      )}

      {/* Search Results Count */}
      {searchData && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Found {searchData.count} results
          {query && ` for "${query}"`}
          {hasActiveFilters && ' with filters applied'}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 
                      rounded-lg text-red-700 dark:text-red-300">
          <p className="text-sm">
            Search failed: {error.message}
          </p>
        </div>
      )}
    </div>
  );
}