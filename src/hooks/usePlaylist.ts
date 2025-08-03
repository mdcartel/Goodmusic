import { useState, useCallback } from 'react';
import { Playlist, PlaylistFilter, PlaylistStats, SmartPlaylistCriteria } from '../types/playlist';
import { Song } from '../types';

interface CreatePlaylistOptions {
  name: string;
  description?: string;
  is_smart?: boolean;
  smart_criteria?: SmartPlaylistCriteria;
  options?: {
    is_public?: boolean;
    is_collaborative?: boolean;
    created_by?: string;
    tags?: string[];
    color?: string;
  };
}

export const usePlaylist = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<(Song & { position: number; added_at: Date })[]>([]);
  const [playlistStats, setPlaylistStats] = useState<PlaylistStats | null>(null);
  const [smartTemplates, setSmartTemplates] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPlaylists = useCallback(async (filter?: PlaylistFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else {
              params.append(key, String(value));
            }
          }
        });
      }

      const response = await fetch(`/api/playlists?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get playlists');
      }

      const playlistsWithDates = data.data.map((playlist: any) => ({
        ...playlist,
        created_at: new Date(playlist.created_at),
        updated_at: new Date(playlist.updated_at)
      }));

      setPlaylists(playlistsWithDates);
      return playlistsWithDates;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get playlists';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPlaylist = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/playlists/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get playlist');
      }

      const playlist = {
        ...data.data,
        created_at: new Date(data.data.created_at),
        updated_at: new Date(data.data.updated_at)
      };

      setCurrentPlaylist(playlist);
      return playlist;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPlaylist = useCallback(async (options: CreatePlaylistOptions) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create playlist');
      }

      const playlist = {
        ...data.data,
        created_at: new Date(data.data.created_at),
        updated_at: new Date(data.data.updated_at)
      };

      setPlaylists(prev => [playlist, ...prev]);
      return playlist;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updatePlaylist = useCallback(async (id: string, updates: Partial<Playlist>, userId?: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates, user_id: userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update playlist');
      }

      const updatedPlaylist = {
        ...data.data,
        created_at: new Date(data.data.created_at),
        updated_at: new Date(data.data.updated_at)
      };

      setPlaylists(prev => prev.map(p => p.id === id ? updatedPlaylist : p));
      
      if (currentPlaylist?.id === id) {
        setCurrentPlaylist(updatedPlaylist);
      }

      return updatedPlaylist;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [currentPlaylist]);

  const deletePlaylist = useCallback(async (id: string, userId?: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (userId) {
        params.append('user_id', userId);
      }

      const response = await fetch(`/api/playlists/${id}?${params.toString()}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete playlist');
      }

      setPlaylists(prev => prev.filter(p => p.id !== id));
      
      if (currentPlaylist?.id === id) {
        setCurrentPlaylist(null);
        setPlaylistSongs([]);
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [currentPlaylist]);

  const getPlaylistSongs = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/playlists/${id}/songs`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get playlist songs');
      }

      const songs = data.data.map((song: any) => ({
        ...song,
        added_at: new Date(song.added_at),
        last_played: song.last_played ? new Date(song.last_played) : undefined
      }));

      setPlaylistSongs(songs);
      return songs;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get playlist songs';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSongToPlaylist = useCallback(async (playlistId: string, songId: string, position?: number, userId?: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_id: songId,
          position,
          user_id: userId
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add song to playlist');
      }

      const updatedSongs = data.data.map((song: any) => ({
        ...song,
        added_at: new Date(song.added_at),
        last_played: song.last_played ? new Date(song.last_played) : undefined
      }));

      setPlaylistSongs(updatedSongs);
      
      // Update playlist song count in the playlists list
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, song_count: updatedSongs.length, updated_at: new Date() }
          : p
      ));

      return updatedSongs;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add song to playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const removeSongFromPlaylist = useCallback(async (playlistId: string, songId: string, userId?: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        song_id: songId,
        ...(userId && { user_id: userId })
      });

      const response = await fetch(`/api/playlists/${playlistId}/songs?${params.toString()}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove song from playlist');
      }

      const updatedSongs = data.data.map((song: any) => ({
        ...song,
        added_at: new Date(song.added_at),
        last_played: song.last_played ? new Date(song.last_played) : undefined
      }));

      setPlaylistSongs(updatedSongs);
      
      // Update playlist song count in the playlists list
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, song_count: updatedSongs.length, updated_at: new Date() }
          : p
      ));

      return updatedSongs;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove song from playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const reorderSong = useCallback(async (playlistId: string, songId: string, newPosition: number, userId?: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_id: songId,
          new_position: newPosition,
          user_id: userId
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reorder song in playlist');
      }

      const updatedSongs = data.data.map((song: any) => ({
        ...song,
        added_at: new Date(song.added_at),
        last_played: song.last_played ? new Date(song.last_played) : undefined
      }));

      setPlaylistSongs(updatedSongs);
      return updatedSongs;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder song in playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const getPlaylistStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/playlists/stats');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get playlist stats');
      }

      const stats = {
        ...data.data,
        recently_created: data.data.recently_created.map((p: any) => ({
          ...p,
          created_at: new Date(p.created_at),
          updated_at: new Date(p.updated_at)
        })),
        recently_updated: data.data.recently_updated.map((p: any) => ({
          ...p,
          created_at: new Date(p.created_at),
          updated_at: new Date(p.updated_at)
        }))
      };

      setPlaylistStats(stats);
      return stats;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get playlist stats';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSmartPlaylistTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/playlists/smart/templates');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get smart playlist templates');
      }

      setSmartTemplates(data.data);
      return data.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get smart playlist templates';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSmartPlaylist = useCallback(async (playlistId?: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/playlists/smart/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlist_id: playlistId
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update smart playlist');
      }

      if (playlistId && data.data) {
        const updatedPlaylist = {
          ...data.data,
          created_at: new Date(data.data.created_at),
          updated_at: new Date(data.data.updated_at)
        };

        setPlaylists(prev => prev.map(p => p.id === playlistId ? updatedPlaylist : p));
        
        if (currentPlaylist?.id === playlistId) {
          setCurrentPlaylist(updatedPlaylist);
          // Refresh songs if this playlist is currently viewed
          await getPlaylistSongs(playlistId);
        }
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update smart playlist';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [currentPlaylist, getPlaylistSongs]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearCurrentPlaylist = useCallback(() => {
    setCurrentPlaylist(null);
    setPlaylistSongs([]);
  }, []);

  return {
    // State
    playlists,
    currentPlaylist,
    playlistSongs,
    playlistStats,
    smartTemplates,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,

    // Actions
    getPlaylists,
    getPlaylist,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylistSongs,
    addSongToPlaylist,
    removeSongFromPlaylist,
    reorderSong,
    getPlaylistStats,
    getSmartPlaylistTemplates,
    updateSmartPlaylist,
    clearError,
    clearCurrentPlaylist,
  };
};