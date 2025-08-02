// Test file for local storage management system
import { localStorageManager } from '../localStorageManager';
import { Song } from '@/types';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('LocalStorageManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('should initialize with default preferences', () => {
    const preferences = localStorageManager.getUserPreferences();
    expect(preferences.selectedMood).toBeNull();
    expect(preferences.preferredMoods).toEqual([]);
    expect(preferences.totalSongsPlayed).toBe(0);
    expect(preferences.totalDownloads).toBe(0);
  });

  test('should save and retrieve user preferences', () => {
    const testPreferences = {
      selectedMood: 'chill',
      preferredMoods: ['chill', 'focus'],
      moodHistory: [],
      lastActiveDate: new Date().toISOString(),
      totalSongsPlayed: 5,
      totalDownloads: 2,
      favoriteGenres: ['electronic'],
      discoveryPreferences: {
        enableChatSuggestions: true,
        enableMoodRecommendations: true,
        enableAutoplay: false
      }
    };

    localStorageManager.setUserPreferences(testPreferences);
    const retrieved = localStorageManager.getUserPreferences();
    
    expect(retrieved.selectedMood).toBe('chill');
    expect(retrieved.totalSongsPlayed).toBe(5);
    expect(retrieved.totalDownloads).toBe(2);
  });

  test('should manage mood history', () => {
    localStorageManager.addMoodToHistory('chill', 3, 15);
    localStorageManager.addMoodToHistory('focus', 2, 10);
    
    const history = localStorageManager.getMoodHistory();
    expect(history).toHaveLength(2);
    expect(history[0].mood).toBe('focus'); // Most recent first
    expect(history[1].mood).toBe('chill');
    
    const topMoods = localStorageManager.getTopMoods();
    expect(topMoods).toHaveLength(2);
    expect(topMoods[0].mood).toBe('chill'); // Most played first
    expect(topMoods[0].count).toBe(3);
  });

  test('should manage favorites', () => {
    const testSong: Song = {
      id: 'test-song-1',
      title: 'Test Song',
      artist: 'Test Artist',
      thumbnail: 'test.jpg',
      duration: '3:30',
      mood: ['chill'],
      youtubeUrl: 'https://youtube.com/watch?v=test'
    };

    expect(localStorageManager.isFavorite(testSong.id)).toBe(false);
    
    localStorageManager.addToFavorites(testSong);
    expect(localStorageManager.isFavorite(testSong.id)).toBe(true);
    
    const favorites = localStorageManager.getFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe(testSong.id);
    
    localStorageManager.removeFromFavorites(testSong.id);
    expect(localStorageManager.isFavorite(testSong.id)).toBe(false);
  });

  test('should manage playback settings', () => {
    const settings = localStorageManager.getPlaybackSettings();
    expect(settings.volume).toBe(0.7); // Default volume
    
    localStorageManager.updatePlaybackSettings({ volume: 0.5, isMuted: true });
    
    const updatedSettings = localStorageManager.getPlaybackSettings();
    expect(updatedSettings.volume).toBe(0.5);
    expect(updatedSettings.isMuted).toBe(true);
  });

  test('should manage recently played songs', () => {
    const testSong: Song = {
      id: 'test-song-1',
      title: 'Test Song',
      artist: 'Test Artist',
      thumbnail: 'test.jpg',
      duration: '3:30',
      mood: ['chill'],
      youtubeUrl: 'https://youtube.com/watch?v=test'
    };

    localStorageManager.addToRecentlyPlayed(testSong);
    
    const recentlyPlayed = localStorageManager.getRecentlyPlayed();
    expect(recentlyPlayed).toHaveLength(1);
    expect(recentlyPlayed[0].id).toBe(testSong.id);
    
    // Adding the same song again should move it to the top
    localStorageManager.addToRecentlyPlayed(testSong);
    const updatedRecent = localStorageManager.getRecentlyPlayed();
    expect(updatedRecent).toHaveLength(1); // Still only one entry
  });

  test('should get storage quota information', () => {
    const quota = localStorageManager.getStorageQuota();
    expect(quota).toHaveProperty('used');
    expect(quota).toHaveProperty('available');
    expect(quota).toHaveProperty('total');
    expect(quota).toHaveProperty('percentage');
    expect(quota).toHaveProperty('itemCounts');
  });
});