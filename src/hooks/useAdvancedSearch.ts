import { useState, useCallback, useEffect } from 'react';
import { Song } from '../types';

interface SearchFilters {
  duration?: {
    min?: number;
    max?: number;
  };
  quality?: string[];
  format?: string[];
  dateAdded?: {
    from?: Date;
    to?: Date;
  };
  artist?: string;
  album?: string;
  genre?: string;
  year?: {
    from?: number;
    to?: number;
  };
  isDownloaded?: boolean;
  isFavorite?: boolean;
  playCount?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
    max?: number;
  };
}

interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'title' | 'artist' | 'album' | 'dateAdded' | 'playCount' | 'rating' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  fuzzySearch?: boolean;
}

interface SearchResult {
  songs: Song[];
  totalCount: number;
  searchTime: number;
  suggestions?: string[];
}

interface SearchHistory {
  id: string;
  query: string;
  filters?: SearchFilters;
  timestamp: Date;
  resultCount: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: SearchFilters;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

export const useAdvancedSearch = () => {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load search history and saved searches on mount
  useEffect(() => {
    loadSearchHistory();
    loadSavedSearches();
  }, []);

  const search = useCallback(async (options: SearchOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      setSearchResults(data.data);
      
      // Refresh search history after successful search
      loadSearchHistory();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSearchHistory = useCallback(async (limit: number = 20) => {
    try {
      const response = await fetch(`/api/search/history?limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        setSearchHistory(data.data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      }
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  }, []);

  const clearSearchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/search/history', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSearchHistory([]);
      } else {
        throw new Error(data.error || 'Failed to clear search history');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear search history';
      setError(errorMessage);
      console.error('Clear search history error:', err);
    }
  }, []);

  const loadSavedSearches = useCallback(async () => {
    try {
      const response = await fetch('/api/search/saved');
      const data = await response.json();

      if (data.success) {
        setSavedSearches(data.data.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          lastUsed: item.lastUsed ? new Date(item.lastUsed) : undefined
        })));
      }
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  }, []);

  const saveSearch = useCallback(async (name: string, query: string, filters?: SearchFilters) => {
    try {
      const response = await fetch('/api/search/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, query, filters }),
      });

      const data = await response.json();

      if (data.success) {
        loadSavedSearches(); // Refresh the list
        return data.data.id;
      } else {
        throw new Error(data.error || 'Failed to save search');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save search';
      setError(errorMessage);
      console.error('Save search error:', err);
      throw err;
    }
  }, [loadSavedSearches]);

  const useSavedSearch = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/search/saved/${id}`);
      const data = await response.json();

      if (data.success) {
        loadSavedSearches(); // Refresh to update usage stats
        return {
          ...data.data,
          createdAt: new Date(data.data.createdAt),
          lastUsed: data.data.lastUsed ? new Date(data.data.lastUsed) : undefined
        };
      } else {
        throw new Error(data.error || 'Failed to use saved search');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to use saved search';
      setError(errorMessage);
      console.error('Use saved search error:', err);
      throw err;
    }
  }, [loadSavedSearches]);

  const deleteSavedSearch = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/search/saved/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSavedSearches(prev => prev.filter(s => s.id !== id));
      } else {
        throw new Error(data.error || 'Failed to delete saved search');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete saved search';
      setError(errorMessage);
      console.error('Delete saved search error:', err);
      throw err;
    }
  }, []);

  const getSuggestions = useCallback(async (query: string, limit: number = 10) => {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data);
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get suggestions');
      }
    } catch (err) {
      console.error('Get suggestions error:', err);
      return [];
    }
  }, []);

  const getPopularTerms = useCallback(async (limit: number = 10) => {
    try {
      const response = await fetch(`/api/search/suggestions?limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get popular terms');
      }
    } catch (err) {
      console.error('Get popular terms error:', err);
      return [];
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  return {
    // State
    searchResults,
    isLoading,
    error,
    searchHistory,
    savedSearches,
    suggestions,

    // Actions
    search,
    clearResults,
    
    // History management
    loadSearchHistory,
    clearSearchHistory,
    
    // Saved searches management
    loadSavedSearches,
    saveSearch,
    useSavedSearch,
    deleteSavedSearch,
    
    // Suggestions
    getSuggestions,
    getPopularTerms,
  };
};