import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchResult, SearchFilters } from '../store/types';
import { queryKeys } from '../query/client';

interface SearchResponse {
  query: string;
  filters?: SearchFilters;
  results: SearchResult[];
  count: number;
}

interface SearchSuggestionsResponse {
  query: string;
  suggestions: string[];
  count: number;
}

interface TrendingResponse {
  category: string;
  results: SearchResult[];
  count: number;
  lastUpdated: string;
}

// Search YouTube videos
export function useYouTubeSearch(query: string, filters?: SearchFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.search(query, filters),
    queryFn: async (): Promise<SearchResponse> => {
      const params = new URLSearchParams({ q: query });
      
      if (filters?.duration) params.append('duration', filters.duration);
      if (filters?.uploadDate) params.append('upload_date', filters.uploadDate);
      if (filters?.sortBy) params.append('sort_by', filters.sortBy);

      const response = await fetch(`/api/youtube/search?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Search failed');
      }

      return response.json();
    },
    enabled: enabled && query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Search with mutation for more control
export function useYouTubeSearchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ query, filters }: { query: string; filters?: SearchFilters }): Promise<SearchResponse> => {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, filters }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Search failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Cache the search results
      queryClient.setQueryData(queryKeys.search(data.query, data.filters), data);
    },
  });
}

// Get search suggestions
export function useYouTubeSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.searchSuggestions(query),
    queryFn: async (): Promise<SearchSuggestionsResponse> => {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`/api/youtube/suggestions?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get suggestions');
      }

      return response.json();
    },
    enabled: enabled && query.length >= 2,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

// Get trending music
export function useYouTubeTrending() {
  return useQuery({
    queryKey: queryKeys.trending(),
    queryFn: async (): Promise<TrendingResponse> => {
      const response = await fetch('/api/youtube/trending');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get trending music');
      }

      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

// Get video information
export function useYouTubeVideoInfo(videoId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.videoInfo(videoId),
    queryFn: async () => {
      const response = await fetch(`/api/youtube/video/${videoId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get video info');
      }

      return response.json();
    },
    enabled: enabled && !!videoId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Get channel information
export function useYouTubeChannelInfo(channelId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.channelInfo(channelId),
    queryFn: async () => {
      const response = await fetch(`/api/youtube/channel/${channelId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get channel info');
      }

      return response.json();
    },
    enabled: enabled && !!channelId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

// Get playlist information
export function useYouTubePlaylistInfo(playlistId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.playlistInfo(playlistId),
    queryFn: async () => {
      const response = await fetch(`/api/youtube/playlist/${playlistId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get playlist info');
      }

      return response.json();
    },
    enabled: enabled && !!playlistId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}