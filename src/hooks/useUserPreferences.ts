'use client';

import { useState, useEffect, useCallback } from 'react';
import { localStorageManager, UserPreferences, PlaybackSettings, AppSettings } from '@/lib/localStorageManager';
import { Song } from '@/types';
import { log } from '@/lib/logger';

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => 
    localStorageManager.getUserPreferences()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load preferences on mount
    const loadPreferences = () => {
      try {
        const prefs = localStorageManager.getUserPreferences();
        setPreferences(prefs);
        setIsLoading(false);
      } catch (error) {
        log.error('Failed to load user preferences', 'Preferences', {}, error as Error);
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    try {
      const success = localStorageManager.updateUserPreferences(updates);
      if (success) {
        const newPreferences = localStorageManager.getUserPreferences();
        setPreferences(newPreferences);
        log.debug('Updated user preferences', 'Preferences', updates);
      }
      return success;
    } catch (error) {
      log.error('Failed to update user preferences', 'Preferences', updates, error as Error);
      return false;
    }
  }, []);

  const setSelectedMood = useCallback((mood: string) => {
    return updatePreferences({ selectedMood: mood });
  }, [updatePreferences]);

  const addPreferredMood = useCallback((mood: string) => {
    const current = preferences.preferredMoods;
    if (!current.includes(mood)) {
      const updated = [mood, ...current.slice(0, 9)]; // Keep top 10
      return updatePreferences({ preferredMoods: updated });
    }
    return true;
  }, [preferences.preferredMoods, updatePreferences]);

  const removePreferredMood = useCallback((mood: string) => {
    const updated = preferences.preferredMoods.filter(m => m !== mood);
    return updatePreferences({ preferredMoods: updated });
  }, [preferences.preferredMoods, updatePreferences]);

  const updateDiscoveryPreferences = useCallback((updates: Partial<UserPreferences['discoveryPreferences']>) => {
    const current = preferences.discoveryPreferences;
    return updatePreferences({
      discoveryPreferences: { ...current, ...updates }
    });
  }, [preferences.discoveryPreferences, updatePreferences]);

  const incrementSongsPlayed = useCallback(() => {
    return updatePreferences({
      totalSongsPlayed: preferences.totalSongsPlayed + 1
    });
  }, [preferences.totalSongsPlayed, updatePreferences]);

  const incrementDownloads = useCallback(() => {
    return updatePreferences({
      totalDownloads: preferences.totalDownloads + 1
    });
  }, [preferences.totalDownloads, updatePreferences]);

  return {
    preferences,
    isLoading,
    updatePreferences,
    setSelectedMood,
    addPreferredMood,
    removePreferredMood,
    updateDiscoveryPreferences,
    incrementSongsPlayed,
    incrementDownloads
  };
}

export function usePlaybackSettings() {
  const [settings, setSettings] = useState<PlaybackSettings>(() => 
    localStorageManager.getPlaybackSettings()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings on mount
    const loadSettings = () => {
      try {
        const playbackSettings = localStorageManager.getPlaybackSettings();
        setSettings(playbackSettings);
        setIsLoading(false);
      } catch (error) {
        log.error('Failed to load playback settings', 'Playback', {}, error as Error);
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = useCallback((updates: Partial<PlaybackSettings>) => {
    try {
      const success = localStorageManager.updatePlaybackSettings(updates);
      if (success) {
        const newSettings = localStorageManager.getPlaybackSettings();
        setSettings(newSettings);
        log.debug('Updated playback settings', 'Playback', updates);
      }
      return success;
    } catch (error) {
      log.error('Failed to update playback settings', 'Playback', updates, error as Error);
      return false;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    return updateSettings({ volume: clampedVolume });
  }, [updateSettings]);

  const toggleMute = useCallback(() => {
    return updateSettings({ isMuted: !settings.isMuted });
  }, [settings.isMuted, updateSettings]);

  const toggleRepeat = useCallback(() => {
    return updateSettings({ isRepeat: !settings.isRepeat });
  }, [settings.isRepeat, updateSettings]);

  const toggleShuffle = useCallback(() => {
    return updateSettings({ isShuffle: !settings.isShuffle });
  }, [settings.isShuffle, updateSettings]);

  const updateEqualizer = useCallback((updates: Partial<PlaybackSettings['equalizer']>) => {
    const current = settings.equalizer;
    return updateSettings({
      equalizer: { ...current, ...updates }
    });
  }, [settings.equalizer, updateSettings]);

  return {
    settings,
    isLoading,
    updateSettings,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    updateEqualizer
  };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => 
    localStorageManager.getAppSettings()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings on mount
    const loadSettings = () => {
      try {
        const appSettings = localStorageManager.getAppSettings();
        setSettings(appSettings);
        setIsLoading(false);
      } catch (error) {
        log.error('Failed to load app settings', 'AppSettings', {}, error as Error);
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    try {
      const success = localStorageManager.updateAppSettings(updates);
      if (success) {
        const newSettings = localStorageManager.getAppSettings();
        setSettings(newSettings);
        log.debug('Updated app settings', 'AppSettings', updates);
      }
      return success;
    } catch (error) {
      log.error('Failed to update app settings', 'AppSettings', updates, error as Error);
      return false;
    }
  }, []);

  const setTheme = useCallback((theme: AppSettings['theme']) => {
    return updateSettings({ theme });
  }, [updateSettings]);

  const updateNotifications = useCallback((updates: Partial<AppSettings['notifications']>) => {
    const current = settings.notifications;
    return updateSettings({
      notifications: { ...current, ...updates }
    });
  }, [settings.notifications, updateSettings]);

  const updatePrivacy = useCallback((updates: Partial<AppSettings['privacy']>) => {
    const current = settings.privacy;
    return updateSettings({
      privacy: { ...current, ...updates }
    });
  }, [settings.privacy, updateSettings]);

  const updateUI = useCallback((updates: Partial<AppSettings['ui']>) => {
    const current = settings.ui;
    return updateSettings({
      ui: { ...current, ...updates }
    });
  }, [settings.ui, updateSettings]);

  return {
    settings,
    isLoading,
    updateSettings,
    setTheme,
    updateNotifications,
    updatePrivacy,
    updateUI
  };
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Song[]>(() => 
    localStorageManager.getFavorites()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load favorites on mount
    const loadFavorites = () => {
      try {
        const favs = localStorageManager.getFavorites();
        setFavorites(favs);
        setIsLoading(false);
      } catch (error) {
        log.error('Failed to load favorites', 'Favorites', {}, error as Error);
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  const addToFavorites = useCallback((song: Song) => {
    try {
      const success = localStorageManager.addToFavorites(song);
      if (success) {
        const newFavorites = localStorageManager.getFavorites();
        setFavorites(newFavorites);
        log.info(`Added to favorites: ${song.title}`, 'Favorites');
      }
      return success;
    } catch (error) {
      log.error('Failed to add to favorites', 'Favorites', { songId: song.id }, error as Error);
      return false;
    }
  }, []);

  const removeFromFavorites = useCallback((songId: string) => {
    try {
      const success = localStorageManager.removeFromFavorites(songId);
      if (success) {
        const newFavorites = localStorageManager.getFavorites();
        setFavorites(newFavorites);
        log.info(`Removed from favorites: ${songId}`, 'Favorites');
      }
      return success;
    } catch (error) {
      log.error('Failed to remove from favorites', 'Favorites', { songId }, error as Error);
      return false;
    }
  }, []);

  const toggleFavorite = useCallback((song: Song) => {
    const isFav = localStorageManager.isFavorite(song.id);
    return isFav ? removeFromFavorites(song.id) : addToFavorites(song);
  }, [addToFavorites, removeFromFavorites]);

  const isFavorite = useCallback((songId: string) => {
    return localStorageManager.isFavorite(songId);
  }, []);

  const getFavoritesByMood = useCallback((mood: string) => {
    return localStorageManager.getFavoritesByMood(mood);
  }, []);

  return {
    favorites,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    getFavoritesByMood
  };
}

export function useRecentlyPlayed() {
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(() => 
    localStorageManager.getRecentlyPlayed()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load recently played on mount
    const loadRecentlyPlayed = () => {
      try {
        const recent = localStorageManager.getRecentlyPlayed();
        setRecentlyPlayed(recent);
        setIsLoading(false);
      } catch (error) {
        log.error('Failed to load recently played', 'RecentlyPlayed', {}, error as Error);
        setIsLoading(false);
      }
    };

    loadRecentlyPlayed();
  }, []);

  const addToRecentlyPlayed = useCallback((song: Song) => {
    try {
      const success = localStorageManager.addToRecentlyPlayed(song);
      if (success) {
        const newRecentlyPlayed = localStorageManager.getRecentlyPlayed();
        setRecentlyPlayed(newRecentlyPlayed);
        log.debug(`Added to recently played: ${song.title}`, 'RecentlyPlayed');
      }
      return success;
    } catch (error) {
      log.error('Failed to add to recently played', 'RecentlyPlayed', { songId: song.id }, error as Error);
      return false;
    }
  }, []);

  const clearRecentlyPlayed = useCallback(() => {
    try {
      const success = localStorageManager.clearRecentlyPlayed();
      if (success) {
        setRecentlyPlayed([]);
        log.info('Cleared recently played', 'RecentlyPlayed');
      }
      return success;
    } catch (error) {
      log.error('Failed to clear recently played', 'RecentlyPlayed', {}, error as Error);
      return false;
    }
  }, []);

  return {
    recentlyPlayed,
    isLoading,
    addToRecentlyPlayed,
    clearRecentlyPlayed
  };
}

export function useStorageQuota() {
  const [quota, setQuota] = useState(() => localStorageManager.getStorageQuota());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load quota on mount
    const loadQuota = () => {
      try {
        const storageQuota = localStorageManager.getStorageQuota();
        setQuota(storageQuota);
        setIsLoading(false);
      } catch (error) {
        log.error('Failed to load storage quota', 'Storage', {}, error as Error);
        setIsLoading(false);
      }
    };

    loadQuota();

    // Update quota periodically
    const interval = setInterval(loadQuota, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const refreshQuota = useCallback(() => {
    const newQuota = localStorageManager.getStorageQuota();
    setQuota(newQuota);
    return newQuota;
  }, []);

  const cleanupStorage = useCallback(() => {
    try {
      const success = localStorageManager.cleanupOldData();
      if (success) {
        refreshQuota();
        log.info('Storage cleanup completed', 'Storage');
      }
      return success;
    } catch (error) {
      log.error('Failed to cleanup storage', 'Storage', {}, error as Error);
      return false;
    }
  }, [refreshQuota]);

  return {
    quota,
    isLoading,
    refreshQuota,
    cleanupStorage
  };
}