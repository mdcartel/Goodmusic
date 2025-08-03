'use client';

import React, { useState, useEffect } from 'react';
import { Music, TrendingUp, Search as SearchIcon } from 'lucide-react';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';
import { SearchResultsGrid } from './SearchResultsGrid';
import { SearchHistory } from './SearchHistory';
import { useYouTubeTrending } from '@/lib/hooks/useYouTubeSearch';
import { useAppStore } from '@/lib/store';
import { SearchResult } from '@/lib/store/types';

interface SearchPageProps {
  className?: string;
}

export function SearchPage({ className = '' }: SearchPageProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  const { 
    searchQuery, 
    searchResults: storeSearchResults, 
    isSearching,
    setSearchQuery 
  } = useAppStore();

  // Get trending music for initial display
  const { data: trendingData, isLoading: trendingLoading } = useYouTubeTrending();

  // Update local search results when store changes
  useEffect(() => {
    setSearchResults(storeSearchResults);
  }, [storeSearchResults]);

  // Handle search from history
  const handleHistorySearch = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  };

  // Handle play action
  const handlePlay = (result: SearchResult) => {
    console.log('Playing:', result.title);
    // The play functionality is handled in the SearchResultCard component
  };

  // Handle download action
  const handleDownload = (result: SearchResult) => {
    console.log('Downloading:', result.title);
    // TODO: Implement download functionality
  };

  // Handle add to playlist action
  const handleAddToPlaylist = (result: SearchResult) => {
    console.log('Adding to playlist:', result.title);
    // TODO: Implement add to playlist functionality
  };

  // Determine what to display
  const hasSearchQuery = searchQuery && searchQuery.trim().length > 0;
  const hasSearchResults = searchResults.length > 0;
  const showTrending = !hasSearchQuery && !isSearching;
  const showEmptyState = hasSearchQuery && !isSearching && !hasSearchResults;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Music Search
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Discover and stream music from YouTube without ads
              </p>
            </div>
          </div>
        </div>

        {/* Search Panel */}
        <div className="mb-8">
          <AdvancedSearchPanel
            onSearchResults={setSearchResults}
            className="mb-6"
          />
          
          {/* Search History Toggle */}
          {!hasSearchQuery && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 
                         dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 
                         transition-colors"
              >
                <SearchIcon className="w-4 h-4" />
                <span>{showHistory ? 'Hide' : 'Show'} search history</span>
              </button>
            </div>
          )}
        </div>

        {/* Search History */}
        {showHistory && !hasSearchQuery && (
          <div className="mb-8">
            <SearchHistory
              onSearchSelect={handleHistorySearch}
              maxItems={10}
            />
          </div>
        )}

        {/* Content Area */}
        <div className="space-y-8">
          {/* Search Results */}
          {hasSearchQuery && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Search Results
                  {hasSearchResults && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({searchResults.length} found)
                    </span>
                  )}
                </h2>
              </div>

              <SearchResultsGrid
                results={searchResults}
                isLoading={isSearching}
                onPlay={handlePlay}
                onDownload={handleDownload}
                onAddToPlaylist={handleAddToPlaylist}
              />
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-gray-400 dark:text-gray-500">
                <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-sm mb-4">
                  Try different keywords or check your spelling
                </p>
                <div className="space-y-2 text-sm">
                  <p>Search suggestions:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['trending music', 'pop hits', 'indie rock', 'electronic'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleHistorySearch(suggestion)}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                                 dark:hover:bg-gray-600 rounded-full transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trending Music */}
          {showTrending && (
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Trending Music
                </h2>
              </div>

              <SearchResultsGrid
                results={trendingData?.results || []}
                isLoading={trendingLoading}
                onPlay={handlePlay}
                onDownload={handleDownload}
                onAddToPlaylist={handleAddToPlaylist}
              />

              {trendingData?.results.length === 0 && !trendingLoading && (
                <div className="text-center py-12">
                  <div className="text-gray-400 dark:text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      Trending music is not available right now
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Powered by NewPipe-style scraping • No ads • No tracking • Privacy-first
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}