import { renderHook, act } from '@testing-library/react';
import { useUserPreferences, usePlaybackSettings, useFavorites } from '../useUserPreferences';
import { localStorageManager } from '@/lib/localStorageManager';

// Mock dependencies
jest.mock('@/lib/localStorageManager');
jest.mock('@/lib/logger');

const mockLocalStorageManager = localStorageManager as jest.Mocked<typeof localStorageManager>;

describe('useUserPreferences', () => {
  const mockPreferences = {
    selectedMood: 'chill',
    preferredMoods: ['chill', 'focus'],
    moodHistory: [],
    lastActiveDate: new Date().toISOString(),
    totalSongsPlayed: 10,
    totalDownloads: 5,
    favoriteGenres: ['electronic'],
    discoveryPreferences: {
      enableChatSuggestions: true,
      enableMoodRecommendations: true,
      enableAutoplay: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorageManager.getUserPreferences.mockReturnValue(mockPreferences);
    mockLocalStorageManager.updateUserPreferences.mockReturnValue(true);
  });

  it('loads user preferences on mount', () => {
    const { result } = renderHook(() => useUserPreferences());

    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.isLoading).toBe(false);
    expect(mockLocalStorageManager.getUserPreferences).toHaveBeenCalled();
  });

  it('updates preferences successfully', async () => {
    const { result } = renderHook(() => useUserPreferences());

    const updates = { selectedMood: 'hype' };

    await act(async () => {
      const success = result.current.updatePreferences(updates);
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updateUserPreferences).toHaveBeenCalledWith(updates);
  });

  it('sets selected mood', async () => {
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      const success = result.current.setSelectedMood('hype');
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updateUserPreferences).toHaveBeenCalledWith({
      selectedMood: 'hype'
    });
  });

  it('adds preferred mood', async () => {
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      const success = result.current.addPreferredMood('hype');
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updateUserPreferences).toHaveBeenCalledWith({
      preferredMoods: ['hype', 'chill', 'focus']
    });
  });

  it('does not add duplicate preferred mood', async () => {
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      const success = result.current.addPreferredMood('chill'); // Already exists
      expect(success).toBe(true);
    });

    // Should not call update since mood already exists
    expect(mockLocalStorageManager.updateUserPreferences).not.toHaveBeenCalled();
  });

  it('removes preferred mood', async () => {
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      const success = result.current.removePreferredMood('chill');
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updateUserPreferences).toHaveBeenCalledWith({
      preferredMoods: ['focus']
    });
  });

  it('updates discovery preferences', async () => {
    const { result } = renderHook(() => useUserPreferences());

    const updates = { enableAutoplay: true };

    await act(async () => {
      const success = result.current.updateDiscoveryPreferences(updates);
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updateUserPreferences).toHaveBeenCalledWith({
      discoveryPreferences: {
        enableChatSuggestions: true,
        enableMoodRecommendations: true,
        enableAutoplay: true
      }
    });
  });

  it('increments songs played counter', async () => {
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      const success = result.current.incrementSongsPlayed();
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updateUserPreferences).toHaveBeenCalledWith({
      totalSongsPlayed: 11
    });
  });

  it('handles update failure', async () => {
    mockLocalStorageManager.updateUserPreferences.mockReturnValue(false);
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      const success = result.current.updatePreferences({ selectedMood: 'hype' });
      expect(success).toBe(false);
    });
  });
});

describe('usePlaybackSettings', () => {
  const mockSettings = {
    volume: 0.7,
    isMuted: false,
    isRepeat: false,
    isShuffle: false,
    crossfade: 0,
    equalizer: {
      enabled: false,
      preset: 'flat',
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    quality: 'auto' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorageManager.getPlaybackSettings.mockReturnValue(mockSettings);
    mockLocalStorageManager.updatePlaybackSettings.mockReturnValue(true);
  });

  it('loads playback settings on mount', () => {
    const { result } = renderHook(() => usePlaybackSettings());

    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets volume', async () => {
    const { result } = renderHook(() => usePlaybackSettings());

    await act(async () => {
      const success = result.current.setVolume(0.8);
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updatePlaybackSettings).toHaveBeenCalledWith({
      volume: 0.8
    });
  });

  it('clamps volume to valid range', async () => {
    const { result } = renderHook(() => usePlaybackSettings());

    await act(async () => {
      result.current.setVolume(1.5); // Above max
    });

    expect(mockLocalStorageManager.updatePlaybackSettings).toHaveBeenCalledWith({
      volume: 1.0
    });

    await act(async () => {
      result.current.setVolume(-0.5); // Below min
    });

    expect(mockLocalStorageManager.updatePlaybackSettings).toHaveBeenCalledWith({
      volume: 0.0
    });
  });

  it('toggles mute', async () => {
    const { result } = renderHook(() => usePlaybackSettings());

    await act(async () => {
      const success = result.current.toggleMute();
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updatePlaybackSettings).toHaveBeenCalledWith({
      isMuted: true
    });
  });

  it('toggles repeat', async () => {
    const { result } = renderHook(() => usePlaybackSettings());

    await act(async () => {
      const success = result.current.toggleRepeat();
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updatePlaybackSettings).toHaveBeenCalledWith({
      isRepeat: true
    });
  });

  it('toggles shuffle', async () => {
    const { result } = renderHook(() => usePlaybackSettings());

    await act(async () => {
      const success = result.current.toggleShuffle();
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updatePlaybackSettings).toHaveBeenCalledWith({
      isShuffle: true
    });
  });

  it('updates equalizer settings', async () => {
    const { result } = renderHook(() => usePlaybackSettings());

    const equalizerUpdates = { enabled: true, preset: 'rock' };

    await act(async () => {
      const success = result.current.updateEqualizer(equalizerUpdates);
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.updatePlaybackSettings).toHaveBeenCalledWith({
      equalizer: {
        enabled: true,
        preset: 'rock',
        bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    });
  });
});

describe('useFavorites', () => {
  const mockSong = {
    id: 'song1',
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail: 'test.jpg',
    duration: '3:30',
    mood: ['chill'],
    youtubeUrl: 'https://youtube.com/test'
  };

  const mockFavorites = [mockSong];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorageManager.getFavorites.mockReturnValue(mockFavorites);
    mockLocalStorageManager.addToFavorites.mockReturnValue(true);
    mockLocalStorageManager.removeFromFavorites.mockReturnValue(true);
    mockLocalStorageManager.isFavorite.mockReturnValue(false);
    mockLocalStorageManager.getFavoritesByMood.mockReturnValue([mockSong]);
  });

  it('loads favorites on mount', () => {
    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual(mockFavorites);
    expect(result.current.isLoading).toBe(false);
  });

  it('adds song to favorites', async () => {
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      const success = result.current.addToFavorites(mockSong);
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.addToFavorites).toHaveBeenCalledWith(mockSong);
  });

  it('removes song from favorites', async () => {
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      const success = result.current.removeFromFavorites('song1');
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.removeFromFavorites).toHaveBeenCalledWith('song1');
  });

  it('toggles favorite status', async () => {
    mockLocalStorageManager.isFavorite.mockReturnValue(false);
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      const success = result.current.toggleFavorite(mockSong);
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.addToFavorites).toHaveBeenCalledWith(mockSong);

    // Test removing when already favorite
    mockLocalStorageManager.isFavorite.mockReturnValue(true);

    await act(async () => {
      const success = result.current.toggleFavorite(mockSong);
      expect(success).toBe(true);
    });

    expect(mockLocalStorageManager.removeFromFavorites).toHaveBeenCalledWith(mockSong.id);
  });

  it('checks if song is favorite', () => {
    mockLocalStorageManager.isFavorite.mockReturnValue(true);
    const { result } = renderHook(() => useFavorites());

    const isFav = result.current.isFavorite('song1');
    expect(isFav).toBe(true);
    expect(mockLocalStorageManager.isFavorite).toHaveBeenCalledWith('song1');
  });

  it('gets favorites by mood', () => {
    const { result } = renderHook(() => useFavorites());

    const chillFavorites = result.current.getFavoritesByMood('chill');
    expect(chillFavorites).toEqual([mockSong]);
    expect(mockLocalStorageManager.getFavoritesByMood).toHaveBeenCalledWith('chill');
  });
});