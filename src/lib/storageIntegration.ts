// Integration utilities for the comprehensive local storage system
import { localStorageManager } from './localStorageManager';
import { Song } from '@/types';

/**
 * Utility functions to integrate the comprehensive storage system
 * with existing components and ensure data persistence
 */
export class StorageIntegration {
  /**
   * Initialize storage system and migrate any existing data
   */
  static async initialize(): Promise<void> {
    try {
      // The localStorageManager automatically initializes on first access
      const preferences = localStorageManager.getUserPreferences();
      console.log('Storage system initialized successfully', {
        totalSongsPlayed: preferences.totalSongsPlayed,
        totalDownloads: preferences.totalDownloads,
        favoriteCount: localStorageManager.getFavorites().length
      });
    } catch (error) {
      console.error('Failed to initialize storage system:', error);
    }
  }

  /**
   * Track user interaction with a song
   */
  static trackSongInteraction(song: Song, action: 'play' | 'download' | 'favorite'): void {
    try {
      switch (action) {
        case 'play':
          localStorageManager.addToRecentlyPlayed(song);
          // Add to mood history if song has mood
          if (song.mood.length > 0) {
            localStorageManager.addMoodToHistory(song.mood[0], 1, 0);
          }
          break;
        case 'favorite':
          localStorageManager.addToFavorites(song);
          break;
        case 'download':
          // Download tracking is handled by DownloadManager
          break;
      }
    } catch (error) {
      console.error('Failed to track song interaction:', error);
    }
  }

  /**
   * Get user's personalized recommendations based on storage data
   */
  static getPersonalizedData() {
    try {
      return {
        topMoods: localStorageManager.getTopMoods(5),
        favorites: localStorageManager.getFavorites().slice(0, 10),
        recentlyPlayed: localStorageManager.getRecentlyPlayed().slice(0, 10),
        preferences: localStorageManager.getUserPreferences(),
        playbackSettings: localStorageManager.getPlaybackSettings()
      };
    } catch (error) {
      console.error('Failed to get personalized data:', error);
      return null;
    }
  }
}