import { useState, useCallback } from 'react';
import { 
  LibraryView, 
  LibraryFilter, 
  LibrarySortOptions, 
  LibraryStats, 
  LibrarySearchResult,
  LibraryDiscovery 
} from '../types/library';

export const useLibrary = () => {
  const [libraryViews, setLibraryViews] = useState<Record<string, LibraryView>>({});
  const [libraryStats, setLibraryStats] = useState<LibraryStats | null>(null);
  const [searchResults, setSearchResults] = useState<LibrarySearchResult | null>(null);
  const [discoveryRecommendations, setDiscoveryRecommendations] = useState<LibraryDiscovery | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLibraryView = useCallback(async (
    type: 'artist' | 'album' | 'genre' | 'year' | 'recently_added' | 'recently_played' | 'favorites',
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit?: number,
    offset?: number
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type
      });

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
              // Handle range objects
              if ('from' in value && 'to' in value) {
                params.append(`${key}_from`, String(value.from));
                params.append(`${key}_to`, String(value.to));
              } else if ('min' in value && 'max' in value) {
                params.append(`${key}_min`, String(value.min));
                params.append(`${key}_max`, String(value.max));
              }
            } else if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else {
              params.append(key, String(value));
            }
          }
        });
      }

      if (sort) {
        if (sort.field) params.append('sort_field', sort.field);
        if (sort.order) params.append('sort_order', sort.order);
        if (sort.secondary_field) params.append('secondary_field', sort.secondary_field);
        if (sort.secondary_order) params.append('secondary_order', sort.secondary_order);
      }

      if (limit) params.append('limit', String(limit));
      if (offset) params.append('offset', String(offset));

      const response = await fetch(`/api/library/views?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get library view');
      }

      const libraryView = {
        ...data.data,
        items: data.data.items.map((item: any) => ({
          ...item,
          first_added: new Date(item.first_added),
          last_played: item.last_played ? new Date(item.last_played) : undefined
        }))
      };

      setLibraryViews(prev => ({
        ...prev,
        [type]: libraryView
      }));

      return libraryView;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get library view';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLibraryStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/library/stats');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get library stats');
      }

      const stats = {
        ...data.data,
        recently_added: data.data.recently_added.map((song: any) => ({
          ...song,
          added_at: new Date(song.added_at),
          last_played: song.last_played ? new Date(song.last_played) : undefined
        })),
        recently_played: data.data.recently_played.map((song: any) => ({
          ...song,
          added_at: new Date(song.added_at),
          last_played: song.last_played ? new Date(song.last_played) : undefined
        })),
        top_rated: data.data.top_rated.map((song: any) => ({
          ...song,
          added_at: new Date(song.added_at),
          last_played: song.last_played ? new Date(song.last_played) : undefined
        }))
      };

      setLibraryStats(stats);
      return stats;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get library stats';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchLibrary = useCallback(async (
    query: string,
    filter?: LibraryFilter,
    limit: number = 50
  ) => {
    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(limit)
      });

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
              // Handle range objects
              if ('from' in value && 'to' in value) {
                params.append(`${key}_from`, String(value.from));
                params.append(`${key}_to`, String(value.to));
              }
            } else if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else {
              params.append(key, String(value));
            }
          }
        });
      }

      const response = await fetch(`/api/library/search?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to search library');
      }

      const searchResult = {
        ...data.data,
        songs: data.data.songs.map((song: any) => ({
          ...song,
          added_at: new Date(song.added_at),
          last_played: song.last_played ? new Date(song.last_played) : undefined
        })),
        artists: data.data.artists.map((artist: any) => ({
          ...artist,
          first_added: new Date(artist.first_added),
          last_played: artist.last_played ? new Date(artist.last_played) : undefined
        })),
        albums: data.data.albums.map((album: any) => ({
          ...album,
          first_added: new Date(album.first_added),
          last_played: album.last_played ? new Date(album.last_played) : undefined
        })),
        genres: data.data.genres.map((genre: any) => ({
          ...genre,
          first_added: new Date(genre.first_added),
          last_played: genre.last_played ? new Date(genre.last_played) : undefined
        }))
      };

      setSearchResults(searchResult);
      return searchResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search library';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const addToFavorites = useCallback(async (songId: string, userId?: string) => {
    setError(null);

    try {
      const response = await fetch('/api/library/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_id: songId,
          user_id: userId
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add to favorites');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to favorites';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const removeFromFavorites = useCallback(async (songId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/library/favorites?song_id=${songId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove from favorites');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from favorites';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const recordPlay = useCallback(async (
    songId: string,
    playDuration: number,
    completed: boolean,
    source: string = 'manual',
    context?: string
  ) => {
    setError(null);

    try {
      const response = await fetch('/api/library/recently-played', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_id: songId,
          play_duration: playDuration,
          completed,
          source,
          context
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to record play');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record play';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getDiscoveryRecommendations = useCallback(async (userId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (userId) {
        params.append('user_id', userId);
      }

      const response = await fetch(`/api/library/discovery?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get discovery recommendations');
      }

      const recommendations = {
        ...data.data,
        recommended_artists: data.data.recommended_artists.map((artist: any) => ({
          ...artist,
          first_added: new Date(artist.first_added),
          last_played: artist.last_played ? new Date(artist.last_played) : undefined
        })),
        recommended_albums: data.data.recommended_albums.map((album: any) => ({
          ...album,
          first_added: new Date(album.first_added),
          last_played: album.last_played ? new Date(album.last_played) : undefined
        })),
        recommended_genres: data.data.recommended_genres.map((genre: any) => ({
          ...genre,
          first_added: new Date(genre.first_added),
          last_played: genre.last_played ? new Date(genre.last_played) : undefined
        })),
        similar_songs: data.data.similar_songs.map((song: any) => ({
          ...song,
          added_at: new Date(song.added_at),
          last_played: song.last_played ? new Date(song.last_played) : undefined
        })),
        trending_songs: data.data.trending_songs.map((song: any) => ({
          ...song,
          added_at: new Date(song.added_at),
          last_played: song.last_played ? new Date(song.last_played) : undefined
        })),
        rediscover_songs: data.data.rediscover_songs.map((song: any) => ({
          ...song,
          added_at: new Date(song.added_at),
          last_played: song.last_played ? new Date(song.last_played) : undefined
        })),
        based_on_history: data.data.based_on_history.map((recommendation: any) => ({
          ...recommendation,
          songs: recommendation.songs.map((song: any) => ({
            ...song,
            added_at: new Date(song.added_at),
            last_played: song.last_played ? new Date(song.last_played) : undefined
          }))
        }))
      };

      setDiscoveryRecommendations(recommendations);
      return recommendations;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get discovery recommendations';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSearchResults = useCallback(() => {
    setSearchResults(null);
  }, []);

  return {
    // State
    libraryViews,
    libraryStats,
    searchResults,
    discoveryRecommendations,
    isLoading,
    isSearching,
    error,

    // Actions
    getLibraryView,
    getLibraryStats,
    searchLibrary,
    addToFavorites,
    removeFromFavorites,
    recordPlay,
    getDiscoveryRecommendations,
    clearError,
    clearSearchResults,
  };
};