'use client';

import React, { useState, useEffect } from 'react';
import { SearchBar } from '../../components/search/SearchBar';
import { AdvancedSearchPanel } from '../../components/search/AdvancedSearchPanel';
import { SongCard } from '../../components/songs/SongCard';
import { useSearch } from '../../hooks/useSearch';
import { useAdvancedSearch } from '../../hooks/useAdvancedSearch';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Song } from '../../types';
import { Settings, Clock, TrendingUp } from 'lucide-react';

interface SearchOptions {
  query: string;
  filters?: any;
  sortBy?: string;
  sortOrder?: string;
  fuzzySearch?: boolean;
}

export default function SearchPage() {
  const { searchResults: basicResults, isLoading: basicLoading, error: basicError, search: basicSearch } = useSearch();
  const { 
    searchResults: advancedResults, 
    isLoading: advancedLoading, 
    error: advancedError, 
    search: advancedSearch,
    searchHistory,
    savedSearches 
  } = useAdvancedSearch();
  
  const [query, setQuery] = useState('');
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);

  // Determine which results to show
  const currentResults = useAdvancedSearch ? advancedResults : basicResults;
  const isLoading = useAdvancedSearch ? advancedLoading : basicLoading;
  const error = useAdvancedSearch ? advancedError : basicError;

  const handleBasicSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setUseAdvancedSearch(false);
    basicSearch(searchQuery);
  };

  const handleAdvancedSearch = (options: SearchOptions) => {
    setQuery(options.query);
    setUseAdvancedSearch(true);
    advancedSearch(options);
  };

  const formatSearchTime = (time: number) => {
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Search Music</h1>
          <Button
            variant={showAdvancedPanel ? "default" : "outline"}
            onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
            className="flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced Search
          </Button>
        </div>
        
        {showAdvancedPanel ? (
          <AdvancedSearchPanel 
            onSearch={handleAdvancedSearch}
            isLoading={isLoading}
            initialQuery={query}
          />
        ) : (
          <SearchBar onSearch={handleBasicSearch} />
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {isLoading && (
          <div className="mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Searching...</p>
          </div>
        )}
        
        {/* Search Results */}
        {currentResults && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">
                  Search Results
                </h2>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {currentResults.songs?.length || 0} of {currentResults.totalCount || 0} results
                  </Badge>
                  {currentResults.searchTime && (
                    <Badge variant="outline" className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatSearchTime(currentResults.searchTime)}
                    </Badge>
                  )}
                  {useAdvancedSearch && (
                    <Badge variant="default">
                      Advanced Search
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Search Suggestions */}
            {currentResults.suggestions && currentResults.suggestions.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Related Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {currentResults.suggestions.map((suggestion, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (showAdvancedPanel) {
                            handleAdvancedSearch({ query: suggestion });
                          } else {
                            handleBasicSearch(suggestion);
                          }
                        }}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Grid */}
            {currentResults.songs && currentResults.songs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentResults.songs.map((song: Song) => (
                  <SongCard key={song.id} song={song} />
                ))}
              </div>
            ) : (
              <div className="mt-8 text-center text-gray-600">
                <p>No results found{query && ` for "${query}"`}</p>
                <p className="text-sm mt-2">Try different keywords, use advanced search, or check your spelling</p>
              </div>
            )}

            {/* Load More Button */}
            {currentResults.songs && currentResults.songs.length < currentResults.totalCount && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Implement pagination logic here
                    console.log('Load more results');
                  }}
                  disabled={isLoading}
                >
                  Load More Results ({currentResults.totalCount - currentResults.songs.length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {!showAdvancedPanel && (searchHistory.length > 0 || savedSearches.length > 0) && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2" />
                    Recent Searches
                  </CardTitle>
                  <CardDescription>
                    Your last {Math.min(searchHistory.length, 5)} searches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {searchHistory.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => handleBasicSearch(item.query)}
                      >
                        <span className="text-sm">{item.query}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.resultCount}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {savedSearches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Saved Searches
                  </CardTitle>
                  <CardDescription>
                    Your {savedSearches.length} saved search{savedSearches.length !== 1 ? 'es' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {savedSearches.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => {
                          setShowAdvancedPanel(true);
                          handleAdvancedSearch({
                            query: item.query,
                            filters: item.filters
                          });
                        }}
                      >
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <p className="text-xs text-muted-foreground">"{item.query}"</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.useCount}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}