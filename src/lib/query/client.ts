import { QueryClient } from '@tanstack/react-query';

// Create a client with NewPipe-style configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Don't refetch on window focus for privacy
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect to avoid unnecessary requests
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  // Search queries
  search: (query: string, filters?: any) => ['search', query, filters] as const,
  searchSuggestions: (query: string) => ['search-suggestions', query] as const,
  
  // Video/song queries
  videoInfo: (videoId: string) => ['video-info', videoId] as const,
  audioUrl: (videoId: string, quality?: string) => ['audio-url', videoId, quality] as const,
  
  // Channel queries
  channelInfo: (channelId: string) => ['channel-info', channelId] as const,
  channelVideos: (channelId: string) => ['channel-videos', channelId] as const,
  
  // Playlist queries
  playlistInfo: (playlistId: string) => ['playlist-info', playlistId] as const,
  
  // Trending and discovery
  trending: () => ['trending'] as const,
  recommendations: (videoId?: string) => ['recommendations', videoId] as const,
  
  // Local data queries
  localSongs: () => ['local-songs'] as const,
  localPlaylists: () => ['local-playlists'] as const,
  downloads: () => ['downloads'] as const,
  settings: () => ['settings'] as const,
} as const;