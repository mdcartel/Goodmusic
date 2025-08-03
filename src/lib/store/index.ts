import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, Song, Playlist, Download, SearchResult, SearchFilters, AppSettings } from './types';

// Initial state
const initialState: AppState = {
  // Player state
  player: {
    currentSong: null,
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    playbackRate: 1,
    repeatMode: 'none',
    shuffleEnabled: false,
    isLoading: false,
  },
  
  // Library data
  songs: [],
  playlists: [],
  channels: [],
  downloads: [],
  
  // Search state
  searchResults: [],
  searchQuery: '',
  searchFilters: {},
  isSearching: false,
  
  // UI state
  currentView: 'search',
  selectedPlaylist: null,
  selectedChannel: null,
  
  // Settings
  settings: {
    theme: 'dark',
    downloadQuality: '192',
    downloadFormat: 'mp3',
    downloadPath: './downloads',
    includeMetadata: true,
    includeThumbnail: true,
    maxConcurrentDownloads: 3,
    playbackVolume: 0.8,
    repeatMode: 'none',
    shuffleEnabled: false,
  },
  
  // Loading states
  isLoading: false,
  error: null,
};

export interface AppActions {
  // Player actions
  playSong: (song: Song) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  previousSong: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  toggleShuffle: () => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  
  // Library actions
  addSong: (song: Song) => void;
  removeSong: (songId: string) => void;
  updateSong: (songId: string, updates: Partial<Song>) => void;
  setSongs: (songs: Song[]) => void;
  
  // Playlist actions
  createPlaylist: (name: string, description?: string) => void;
  deletePlaylist: (playlistId: string) => void;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;
  addToPlaylist: (playlistId: string, songs: Song[]) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;
  reorderPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  
  // Download actions
  addDownload: (download: Download) => void;
  updateDownload: (downloadId: string, updates: Partial<Download>) => void;
  removeDownload: (downloadId: string) => void;
  setDownloads: (downloads: Download[]) => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setIsSearching: (isSearching: boolean) => void;
  clearSearch: () => void;
  
  // UI actions
  setCurrentView: (view: AppState['currentView']) => void;
  setSelectedPlaylist: (playlistId: string | null) => void;
  setSelectedChannel: (channelId: string | null) => void;
  
  // Settings actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  // General actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Player actions
        playSong: (song: Song) => {
          set((state) => ({
            player: {
              ...state.player,
              currentSong: song,
              isPlaying: true,
              isLoading: true,
            },
          }));
        },
        
        pauseSong: () => {
          set((state) => ({
            player: { ...state.player, isPlaying: false },
          }));
        },
        
        resumeSong: () => {
          set((state) => ({
            player: { ...state.player, isPlaying: true },
          }));
        },
        
        nextSong: () => {
          const { player } = get();
          const { queue, currentIndex, repeatMode, shuffleEnabled } = player;
          
          if (queue.length === 0) return;
          
          let nextIndex = currentIndex + 1;
          
          if (repeatMode === 'one') {
            nextIndex = currentIndex;
          } else if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
              nextIndex = 0;
            } else {
              return; // End of queue
            }
          }
          
          set((state) => ({
            player: {
              ...state.player,
              currentIndex: nextIndex,
              currentSong: queue[nextIndex],
              isPlaying: true,
              isLoading: true,
            },
          }));
        },
        
        previousSong: () => {
          const { player } = get();
          const { queue, currentIndex } = player;
          
          if (queue.length === 0 || currentIndex <= 0) return;
          
          const prevIndex = currentIndex - 1;
          
          set((state) => ({
            player: {
              ...state.player,
              currentIndex: prevIndex,
              currentSong: queue[prevIndex],
              isPlaying: true,
              isLoading: true,
            },
          }));
        },
        
        seekTo: (time: number) => {
          set((state) => ({
            player: { ...state.player, currentTime: time },
          }));
        },
        
        setVolume: (volume: number) => {
          set((state) => ({
            player: { ...state.player, volume },
          }));
        },
        
        setPlaybackRate: (rate: number) => {
          set((state) => ({
            player: { ...state.player, playbackRate: rate },
          }));
        },
        
        setRepeatMode: (mode: 'none' | 'one' | 'all') => {
          set((state) => ({
            player: { ...state.player, repeatMode: mode },
          }));
        },
        
        toggleShuffle: () => {
          set((state) => ({
            player: { ...state.player, shuffleEnabled: !state.player.shuffleEnabled },
          }));
        },
        
        setQueue: (songs: Song[], startIndex = 0) => {
          set((state) => ({
            player: {
              ...state.player,
              queue: songs,
              currentIndex: startIndex,
              currentSong: songs[startIndex] || null,
            },
          }));
        },
        
        addToQueue: (song: Song) => {
          set((state) => ({
            player: {
              ...state.player,
              queue: [...state.player.queue, song],
            },
          }));
        },
        
        removeFromQueue: (index: number) => {
          set((state) => {
            const newQueue = state.player.queue.filter((_, i) => i !== index);
            const { currentIndex } = state.player;
            
            let newCurrentIndex = currentIndex;
            if (index < currentIndex) {
              newCurrentIndex = currentIndex - 1;
            } else if (index === currentIndex) {
              newCurrentIndex = Math.min(currentIndex, newQueue.length - 1);
            }
            
            return {
              player: {
                ...state.player,
                queue: newQueue,
                currentIndex: newCurrentIndex,
                currentSong: newQueue[newCurrentIndex] || null,
              },
            };
          });
        },
        
        reorderQueue: (fromIndex: number, toIndex: number) => {
          set((state) => {
            const newQueue = [...state.player.queue];
            const [movedSong] = newQueue.splice(fromIndex, 1);
            newQueue.splice(toIndex, 0, movedSong);
            
            // Update current index if needed
            let newCurrentIndex = state.player.currentIndex;
            if (fromIndex === state.player.currentIndex) {
              newCurrentIndex = toIndex;
            } else if (fromIndex < state.player.currentIndex && toIndex >= state.player.currentIndex) {
              newCurrentIndex = state.player.currentIndex - 1;
            } else if (fromIndex > state.player.currentIndex && toIndex <= state.player.currentIndex) {
              newCurrentIndex = state.player.currentIndex + 1;
            }
            
            return {
              player: {
                ...state.player,
                queue: newQueue,
                currentIndex: newCurrentIndex,
              },
            };
          });
        },
        
        // Library actions
        addSong: (song: Song) => {
          set((state) => ({
            songs: [...state.songs, song],
          }));
        },
        
        removeSong: (songId: string) => {
          set((state) => ({
            songs: state.songs.filter(song => song.id !== songId),
          }));
        },
        
        updateSong: (songId: string, updates: Partial<Song>) => {
          set((state) => ({
            songs: state.songs.map(song =>
              song.id === songId ? { ...song, ...updates } : song
            ),
          }));
        },
        
        setSongs: (songs: Song[]) => {
          set({ songs });
        },
        
        // Playlist actions
        createPlaylist: (name: string, description?: string) => {
          const newPlaylist: Playlist = {
            id: crypto.randomUUID(),
            name,
            description,
            songs: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            totalDuration: 0,
          };
          
          set((state) => ({
            playlists: [...state.playlists, newPlaylist],
          }));
        },
        
        deletePlaylist: (playlistId: string) => {
          set((state) => ({
            playlists: state.playlists.filter(playlist => playlist.id !== playlistId),
          }));
        },
        
        updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => {
          set((state) => ({
            playlists: state.playlists.map(playlist =>
              playlist.id === playlistId 
                ? { ...playlist, ...updates, updatedAt: new Date() }
                : playlist
            ),
          }));
        },
        
        addToPlaylist: (playlistId: string, songs: Song[]) => {
          set((state) => ({
            playlists: state.playlists.map(playlist =>
              playlist.id === playlistId
                ? {
                    ...playlist,
                    songs: [...playlist.songs, ...songs],
                    totalDuration: playlist.totalDuration + songs.reduce((sum, song) => sum + song.duration, 0),
                    updatedAt: new Date(),
                  }
                : playlist
            ),
          }));
        },
        
        removeFromPlaylist: (playlistId: string, songId: string) => {
          set((state) => ({
            playlists: state.playlists.map(playlist =>
              playlist.id === playlistId
                ? {
                    ...playlist,
                    songs: playlist.songs.filter(song => song.id !== songId),
                    totalDuration: playlist.songs
                      .filter(song => song.id !== songId)
                      .reduce((sum, song) => sum + song.duration, 0),
                    updatedAt: new Date(),
                  }
                : playlist
            ),
          }));
        },
        
        reorderPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => {
          set((state) => ({
            playlists: state.playlists.map(playlist =>
              playlist.id === playlistId
                ? {
                    ...playlist,
                    songs: (() => {
                      const newSongs = [...playlist.songs];
                      const [movedSong] = newSongs.splice(fromIndex, 1);
                      newSongs.splice(toIndex, 0, movedSong);
                      return newSongs;
                    })(),
                    updatedAt: new Date(),
                  }
                : playlist
            ),
          }));
        },
        
        setPlaylists: (playlists: Playlist[]) => {
          set({ playlists });
        },
        
        // Download actions
        addDownload: (download: Download) => {
          set((state) => ({
            downloads: [...state.downloads, download],
          }));
        },
        
        updateDownload: (downloadId: string, updates: Partial<Download>) => {
          set((state) => ({
            downloads: state.downloads.map(download =>
              download.id === downloadId ? { ...download, ...updates } : download
            ),
          }));
        },
        
        removeDownload: (downloadId: string) => {
          set((state) => ({
            downloads: state.downloads.filter(download => download.id !== downloadId),
          }));
        },
        
        setDownloads: (downloads: Download[]) => {
          set({ downloads });
        },
        
        // Search actions
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },
        
        setSearchResults: (results: SearchResult[]) => {
          set({ searchResults: results });
        },
        
        setSearchFilters: (filters: SearchFilters) => {
          set({ searchFilters: filters });
        },
        
        setIsSearching: (isSearching: boolean) => {
          set({ isSearching });
        },
        
        clearSearch: () => {
          set({
            searchResults: [],
            searchQuery: '',
            searchFilters: {},
            isSearching: false,
          });
        },
        
        // UI actions
        setCurrentView: (view: AppState['currentView']) => {
          set({ currentView: view });
        },
        
        setSelectedPlaylist: (playlistId: string | null) => {
          set({ selectedPlaylist: playlistId });
        },
        
        setSelectedChannel: (channelId: string | null) => {
          set({ selectedChannel: channelId });
        },
        
        // Settings actions
        updateSettings: (updates: Partial<AppSettings>) => {
          set((state) => ({
            settings: { ...state.settings, ...updates },
          }));
        },
        
        resetSettings: () => {
          set((state) => ({
            settings: initialState.settings,
          }));
        },
        
        // General actions
        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },
        
        setError: (error: string | null) => {
          set({ error });
        },
        
        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'goodmusic-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          songs: state.songs,
          playlists: state.playlists,
          settings: state.settings,
          // Don't persist player state, downloads, or search results
        }),
      }
    ),
    {
      name: 'GoodMusic Store',
    }
  )
);