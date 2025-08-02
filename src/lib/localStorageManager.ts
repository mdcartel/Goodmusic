// Enhanced Local Storage Management System for VibePipe MVP
// Provides comprehensive user preferences, history, and data management

import { Song, Download, ChatSession, Mood } from '@/types';
import { log } from './logger';
import { PrivacyCompliance } from './privacyCompliance';

// Storage keys with versioning for future migrations
export const STORAGE_KEYS = {
  // User Preferences
  USER_PREFERENCES: 'vibepipe_user_preferences_v1',
  MOOD_HISTORY: 'vibepipe_mood_history_v1',
  PLAYBACK_SETTINGS: 'vibepipe_playback_settings_v1',
  
  // Content Management
  FAVORITES: 'vibepipe_favorites_v1',
  RECENTLY_PLAYED: 'vibepipe_recently_played_v1',
  DOWNLOAD_HISTORY: 'vibepipe_download_history_v1',
  CHAT_HISTORY: 'vibepipe_chat_history_v1',
  
  // App State
  APP_SETTINGS: 'vibepipe_app_settings_v1',
  DISCOVERY_INSIGHTS: 'vibepipe_discovery_insights_v1',
  
  // Metadata
  STORAGE_VERSION: 'vibepipe_storage_version',
  LAST_BACKUP: 'vibepipe_last_backup'
} as const;

// Current storage version for migrations
const CURRENT_STORAGE_VERSION = '1.0.0';

// User preferences interface
export interface UserPreferences {
  selectedMood: string | null;
  preferredMoods: string[];
  moodHistory: MoodHistoryEntry[];
  lastActiveDate: string;
  totalSongsPlayed: number;
  totalDownloads: number;
  favoriteGenres: string[];
  discoveryPreferences: {
    enableChatSuggestions: boolean;
    enableMoodRecommendations: boolean;
    enableAutoplay: boolean;
  };
}

// Mood history entry
export interface MoodHistoryEntry {
  mood: string;
  timestamp: string;
  songsPlayed: number;
  duration: number; // in minutes
}

// Playback settings
export interface PlaybackSettings {
  volume: number;
  isMuted: boolean;
  isRepeat: boolean;
  isShuffle: boolean;
  crossfade: number;
  equalizer: {
    enabled: boolean;
    preset: string;
    bands: number[];
  };
  quality: 'low' | 'medium' | 'high' | 'auto';
}

// App settings
export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  notifications: {
    downloadComplete: boolean;
    newSuggestions: boolean;
    errors: boolean;
  };
  privacy: {
    shareUsageData: boolean;
    enableAnalytics: boolean;
    clearDataOnExit: boolean;
  };
  ui: {
    compactMode: boolean;
    showThumbnails: boolean;
    animationsEnabled: boolean;
  };
}

// Discovery insights for personalization
export interface DiscoveryInsights {
  topMoods: Array<{ mood: string; count: number; lastUsed: string }>;
  listeningPatterns: {
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
    sessionDuration: number[];
  };
  musicPreferences: {
    averageSongDuration: number;
    preferredFormats: Record<string, number>;
    skipRate: number;
  };
  chatbotInteractions: {
    totalSessions: number;
    averageSessionLength: number;
    mostCommonTopics: string[];
  };
}

// Storage quota information
export interface StorageQuota {
  used: number;
  available: number;
  total: number;
  percentage: number;
  itemCounts: Record<string, number>;
}

class LocalStorageManager {
  private static instance: LocalStorageManager;
  private isClient: boolean;

  private constructor() {
    this.isClient = typeof window !== 'undefined';
    this.initializeStorage();
  }

  public static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  // Initialize storage with default values
  private initializeStorage(): void {
    if (!this.isClient) return;

    try {
      // Check storage version and migrate if needed
      const currentVersion = this.getItem(STORAGE_KEYS.STORAGE_VERSION, '0.0.0');
      if (currentVersion !== CURRENT_STORAGE_VERSION) {
        this.migrateStorage(currentVersion, CURRENT_STORAGE_VERSION);
      }

      // Validate and fix corrupted data
      this.validateAndFixStorageData();

      // Initialize default preferences if not exists
      if (!localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)) {
        this.setUserPreferences(this.getDefaultUserPreferences());
      }

      if (!localStorage.getItem(STORAGE_KEYS.PLAYBACK_SETTINGS)) {
        this.setPlaybackSettings(this.getDefaultPlaybackSettings());
      }

      if (!localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)) {
        this.setAppSettings(this.getDefaultAppSettings());
      }

      log.info('Local storage initialized successfully', 'Storage');
    } catch (error) {
      log.error('Failed to initialize local storage', 'Storage', {}, error as Error);
      // If initialization fails completely, clear all data and start fresh
      this.clearAllData();
    }
  }

  // Generic storage methods with error handling
  private setItem<T>(key: string, value: T): boolean {
    if (!this.isClient) return false;

    try {
      // Privacy compliance check
      const sanitizedValue = PrivacyCompliance.sanitizeData(value, `storage-${key}`);
      if (!PrivacyCompliance.validateData(sanitizedValue, `storage-${key}`)) {
        log.warn(`Data rejected due to privacy violation: ${key}`, 'Storage');
        return false;
      }

      const serialized = JSON.stringify(sanitizedValue);
      localStorage.setItem(key, serialized);
      log.debug(`Stored item: ${key}`, 'Storage', { size: serialized.length });
      return true;
    } catch (error) {
      log.error(`Failed to store item: ${key}`, 'Storage', { key }, error as Error);
      
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }
      return false;
    }
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.isClient) return defaultValue;

    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      const parsed = JSON.parse(item);
      log.debug(`Retrieved item: ${key}`, 'Storage');
      return parsed;
    } catch (error) {
      log.error(`Failed to retrieve item: ${key}`, 'Storage', { key }, error as Error);
      return defaultValue;
    }
  }

  private removeItem(key: string): boolean {
    if (!this.isClient) return false;

    try {
      localStorage.removeItem(key);
      log.debug(`Removed item: ${key}`, 'Storage');
      return true;
    } catch (error) {
      log.error(`Failed to remove item: ${key}`, 'Storage', { key }, error as Error);
      return false;
    }
  }

  // User Preferences Management
  public getUserPreferences(): UserPreferences {
    return this.getItem(STORAGE_KEYS.USER_PREFERENCES, this.getDefaultUserPreferences());
  }

  public setUserPreferences(preferences: UserPreferences): boolean {
    return this.setItem(STORAGE_KEYS.USER_PREFERENCES, {
      ...preferences,
      lastActiveDate: new Date().toISOString()
    });
  }

  public updateUserPreferences(updates: Partial<UserPreferences>): boolean {
    const current = this.getUserPreferences();
    return this.setUserPreferences({ ...current, ...updates });
  }

  private getDefaultUserPreferences(): UserPreferences {
    return {
      selectedMood: null,
      preferredMoods: [],
      moodHistory: [],
      lastActiveDate: new Date().toISOString(),
      totalSongsPlayed: 0,
      totalDownloads: 0,
      favoriteGenres: [],
      discoveryPreferences: {
        enableChatSuggestions: true,
        enableMoodRecommendations: true,
        enableAutoplay: false
      }
    };
  }

  // Mood History Management
  public addMoodToHistory(mood: string, songsPlayed: number = 0, duration: number = 0): boolean {
    const preferences = this.getUserPreferences();
    const now = new Date().toISOString();
    
    // Ensure moodHistory is an array
    if (!Array.isArray(preferences.moodHistory)) {
      preferences.moodHistory = [];
    }
    
    // Ensure preferredMoods is an array
    if (!Array.isArray(preferences.preferredMoods)) {
      preferences.preferredMoods = [];
    }
    
    // Update mood history
    const existingEntry = preferences.moodHistory.find(entry => 
      entry.mood === mood && 
      new Date(entry.timestamp).toDateString() === new Date().toDateString()
    );

    if (existingEntry) {
      existingEntry.songsPlayed += songsPlayed;
      existingEntry.duration += duration;
    } else {
      preferences.moodHistory.unshift({
        mood,
        timestamp: now,
        songsPlayed,
        duration
      });
    }

    // Keep only last 100 entries
    preferences.moodHistory = preferences.moodHistory.slice(0, 100);

    // Update preferred moods
    if (!preferences.preferredMoods.includes(mood)) {
      preferences.preferredMoods.unshift(mood);
      preferences.preferredMoods = preferences.preferredMoods.slice(0, 10);
    }

    preferences.selectedMood = mood;
    return this.setUserPreferences(preferences);
  }

  public getMoodHistory(limit: number = 50): MoodHistoryEntry[] {
    const preferences = this.getUserPreferences();
    if (!Array.isArray(preferences.moodHistory)) {
      log.warn('Mood history is not an array, resetting to empty array', 'Storage');
      preferences.moodHistory = [];
      this.setUserPreferences(preferences);
      return [];
    }
    return preferences.moodHistory.slice(0, limit);
  }

  public getTopMoods(limit: number = 5): Array<{ mood: string; count: number; lastUsed: string }> {
    const history = this.getMoodHistory();
    const moodCounts = new Map<string, { count: number; lastUsed: string }>();

    history.forEach(entry => {
      const existing = moodCounts.get(entry.mood);
      if (existing) {
        existing.count += entry.songsPlayed;
        if (new Date(entry.timestamp) > new Date(existing.lastUsed)) {
          existing.lastUsed = entry.timestamp;
        }
      } else {
        moodCounts.set(entry.mood, {
          count: entry.songsPlayed,
          lastUsed: entry.timestamp
        });
      }
    });

    return Array.from(moodCounts.entries())
      .map(([mood, data]) => ({ mood, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Playback Settings Management
  public getPlaybackSettings(): PlaybackSettings {
    return this.getItem(STORAGE_KEYS.PLAYBACK_SETTINGS, this.getDefaultPlaybackSettings());
  }

  public setPlaybackSettings(settings: PlaybackSettings): boolean {
    return this.setItem(STORAGE_KEYS.PLAYBACK_SETTINGS, settings);
  }

  public updatePlaybackSettings(updates: Partial<PlaybackSettings>): boolean {
    const current = this.getPlaybackSettings();
    return this.setPlaybackSettings({ ...current, ...updates });
  }

  private getDefaultPlaybackSettings(): PlaybackSettings {
    return {
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
      quality: 'auto'
    };
  }

  // App Settings Management
  public getAppSettings(): AppSettings {
    return this.getItem(STORAGE_KEYS.APP_SETTINGS, this.getDefaultAppSettings());
  }

  public setAppSettings(settings: AppSettings): boolean {
    return this.setItem(STORAGE_KEYS.APP_SETTINGS, settings);
  }

  public updateAppSettings(updates: Partial<AppSettings>): boolean {
    const current = this.getAppSettings();
    return this.setAppSettings({ ...current, ...updates });
  }

  private getDefaultAppSettings(): AppSettings {
    return {
      theme: 'dark',
      language: 'en',
      notifications: {
        downloadComplete: true,
        newSuggestions: true,
        errors: true
      },
      privacy: {
        shareUsageData: false,
        enableAnalytics: false,
        clearDataOnExit: false
      },
      ui: {
        compactMode: false,
        showThumbnails: true,
        animationsEnabled: true
      }
    };
  }

  // Favorites Management
  public getFavorites(): Song[] {
    const favorites = this.getItem<Song[]>(STORAGE_KEYS.FAVORITES, []);
    if (!Array.isArray(favorites)) {
      log.warn('Favorites is not an array, resetting to empty array', 'Storage');
      this.setItem(STORAGE_KEYS.FAVORITES, []);
      return [];
    }
    return favorites;
  }

  public addToFavorites(song: Song): boolean {
    const favorites = this.getFavorites();
    if (!favorites.some(fav => fav.id === song.id)) {
      favorites.unshift(song);
      const success = this.setItem(STORAGE_KEYS.FAVORITES, favorites);
      
      if (success) {
        // Update user stats
        const preferences = this.getUserPreferences();
        this.updateUserPreferences(preferences);
        log.info(`Added song to favorites: ${song.title}`, 'Storage');
      }
      
      return success;
    }
    return true; // Already in favorites
  }

  public removeFromFavorites(songId: string): boolean {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(song => song.id !== songId);
    const success = this.setItem(STORAGE_KEYS.FAVORITES, filtered);
    
    if (success) {
      log.info(`Removed song from favorites: ${songId}`, 'Storage');
    }
    
    return success;
  }

  public isFavorite(songId: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some(fav => fav.id === songId);
  }

  public getFavoritesByMood(mood: string): Song[] {
    const favorites = this.getFavorites();
    return favorites.filter(song => song.mood.includes(mood));
  }

  // Recently Played Management
  public getRecentlyPlayed(): Song[] {
    const recent = this.getItem<Song[]>(STORAGE_KEYS.RECENTLY_PLAYED, []);
    if (!Array.isArray(recent)) {
      log.warn('Recently played is not an array, resetting to empty array', 'Storage');
      this.setItem(STORAGE_KEYS.RECENTLY_PLAYED, []);
      return [];
    }
    return recent;
  }

  public addToRecentlyPlayed(song: Song): boolean {
    const recent = this.getRecentlyPlayed();
    // Remove if already exists
    const filtered = recent.filter(s => s.id !== song.id);
    // Add to beginning
    filtered.unshift(song);
    // Keep only last 100
    const trimmed = filtered.slice(0, 100);
    
    const success = this.setItem(STORAGE_KEYS.RECENTLY_PLAYED, trimmed);
    
    if (success) {
      // Update user stats
      const preferences = this.getUserPreferences();
      preferences.totalSongsPlayed += 1;
      this.updateUserPreferences(preferences);
      log.debug(`Added song to recently played: ${song.title}`, 'Storage');
    }
    
    return success;
  }

  public clearRecentlyPlayed(): boolean {
    return this.removeItem(STORAGE_KEYS.RECENTLY_PLAYED);
  }

  // Download History Management
  public getDownloadHistory(): Download[] {
    const history = this.getItem<Download[]>(STORAGE_KEYS.DOWNLOAD_HISTORY, []);
    // Ensure we have an array and convert date strings back to Date objects
    if (!Array.isArray(history)) {
      log.warn('Download history is not an array, resetting to empty array', 'Storage');
      this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, []);
      return [];
    }
    
    return history.map(download => ({
      ...download,
      createdAt: new Date(download.createdAt),
      completedAt: download.completedAt ? new Date(download.completedAt) : undefined
    }));
  }

  public addToDownloadHistory(download: Download): boolean {
    const history = this.getDownloadHistory();
    const existingIndex = history.findIndex(d => d.id === download.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = download;
    } else {
      history.unshift(download); // Add to beginning
      
      // Update user stats
      if (download.status === 'completed') {
        const preferences = this.getUserPreferences();
        preferences.totalDownloads += 1;
        this.updateUserPreferences(preferences);
      }
    }
    
    // Keep only last 200 downloads
    const trimmedHistory = history.slice(0, 200);
    const success = this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, trimmedHistory);
    
    if (success) {
      log.debug(`Updated download history: ${download.id}`, 'Storage');
    }
    
    return success;
  }

  public removeFromDownloadHistory(downloadId: string): boolean {
    const history = this.getDownloadHistory();
    const filtered = history.filter(d => d.id !== downloadId);
    return this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, filtered);
  }

  public getDownloadsByStatus(status: Download['status']): Download[] {
    const history = this.getDownloadHistory();
    return history.filter(d => d.status === status);
  }

  public getDownloadStats(): {
    total: number;
    completed: number;
    failed: number;
    totalSize: number;
  } {
    const history = this.getDownloadHistory();
    const stats = {
      total: history.length,
      completed: 0,
      failed: 0,
      totalSize: 0
    };

    history.forEach(download => {
      if (download.status === 'completed') {
        stats.completed++;
        stats.totalSize += download.fileSize || 0;
      } else if (download.status === 'failed') {
        stats.failed++;
      }
    });

    return stats;
  }

  // Chat History Management
  public getChatHistory(): ChatSession[] {
    const history = this.getItem<ChatSession[]>(STORAGE_KEYS.CHAT_HISTORY, []);
    // Ensure we have an array and convert date strings back to Date objects
    if (!Array.isArray(history)) {
      log.warn('Chat history is not an array, resetting to empty array', 'Storage');
      this.setItem(STORAGE_KEYS.CHAT_HISTORY, []);
      return [];
    }
    
    return history.map(session => ({
      ...session,
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity),
      messages: Array.isArray(session.messages) ? session.messages.map(message => ({
        ...message,
        timestamp: new Date(message.timestamp)
      })) : []
    }));
  }

  public saveChatSession(session: ChatSession): boolean {
    const history = this.getChatHistory();
    const existingIndex = history.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = session;
    } else {
      history.unshift(session); // Add to beginning
    }
    
    // Keep only last 20 chat sessions
    const trimmedHistory = history.slice(0, 20);
    const success = this.setItem(STORAGE_KEYS.CHAT_HISTORY, trimmedHistory);
    
    if (success) {
      log.debug(`Saved chat session: ${session.id}`, 'Storage');
    }
    
    return success;
  }

  public removeChatSession(sessionId: string): boolean {
    const history = this.getChatHistory();
    const filtered = history.filter(s => s.id !== sessionId);
    return this.setItem(STORAGE_KEYS.CHAT_HISTORY, filtered);
  }

  // Discovery Insights Management
  public getDiscoveryInsights(): DiscoveryInsights {
    return this.getItem(STORAGE_KEYS.DISCOVERY_INSIGHTS, this.getDefaultDiscoveryInsights());
  }

  public updateDiscoveryInsights(updates: Partial<DiscoveryInsights>): boolean {
    const current = this.getDiscoveryInsights();
    return this.setItem(STORAGE_KEYS.DISCOVERY_INSIGHTS, { ...current, ...updates });
  }

  private getDefaultDiscoveryInsights(): DiscoveryInsights {
    return {
      topMoods: [],
      listeningPatterns: {
        timeOfDay: {},
        dayOfWeek: {},
        sessionDuration: []
      },
      musicPreferences: {
        averageSongDuration: 0,
        preferredFormats: {},
        skipRate: 0
      },
      chatbotInteractions: {
        totalSessions: 0,
        averageSessionLength: 0,
        mostCommonTopics: []
      }
    };
  }

  // Storage Management
  public getStorageQuota(): StorageQuota {
    if (!this.isClient) {
      return { used: 0, available: 0, total: 0, percentage: 0, itemCounts: {} };
    }

    let totalUsed = 0;
    const itemCounts: Record<string, number> = {};

    // Calculate usage for each storage key
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        const size = new Blob([item]).size;
        totalUsed += size;
        itemCounts[key] = size;
      }
    });

    // Estimate total available storage (5MB typical limit)
    const estimatedTotal = 5 * 1024 * 1024; // 5MB
    const available = Math.max(0, estimatedTotal - totalUsed);
    const percentage = (totalUsed / estimatedTotal) * 100;

    return {
      used: totalUsed,
      available,
      total: estimatedTotal,
      percentage,
      itemCounts
    };
  }

  public cleanupOldData(): boolean {
    try {
      // Clean up old recently played (keep last 50)
      const recentlyPlayed = this.getRecentlyPlayed();
      if (Array.isArray(recentlyPlayed) && recentlyPlayed.length > 50) {
        this.setItem(STORAGE_KEYS.RECENTLY_PLAYED, recentlyPlayed.slice(0, 50));
      }

      // Clean up old download history (keep last 100)
      const downloadHistory = this.getDownloadHistory();
      if (Array.isArray(downloadHistory) && downloadHistory.length > 100) {
        this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, downloadHistory.slice(0, 100));
      }

      // Clean up old chat history (keep last 10)
      const chatHistory = this.getChatHistory();
      if (Array.isArray(chatHistory) && chatHistory.length > 10) {
        this.setItem(STORAGE_KEYS.CHAT_HISTORY, chatHistory.slice(0, 10));
      }

      // Clean up old mood history (keep last 50)
      const preferences = this.getUserPreferences();
      if (preferences && Array.isArray(preferences.moodHistory) && preferences.moodHistory.length > 50) {
        preferences.moodHistory = preferences.moodHistory.slice(0, 50);
        this.setUserPreferences(preferences);
      }

      log.info('Cleaned up old data successfully', 'Storage');
      return true;
    } catch (error) {
      log.error('Failed to cleanup old data', 'Storage', {}, error as Error);
      return false;
    }
  }

  private handleQuotaExceeded(): void {
    log.warn('Storage quota exceeded, attempting cleanup', 'Storage');
    
    // Try to free up space by cleaning old data
    this.cleanupOldData();
    
    // If still having issues, remove oldest items
    const quota = this.getStorageQuota();
    if (quota.percentage > 90) {
      // Remove oldest recently played
      const recentlyPlayed = this.getRecentlyPlayed();
      if (Array.isArray(recentlyPlayed)) {
        this.setItem(STORAGE_KEYS.RECENTLY_PLAYED, recentlyPlayed.slice(0, 25));
      }
      
      // Remove oldest download history
      const downloadHistory = this.getDownloadHistory();
      if (Array.isArray(downloadHistory)) {
        this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, downloadHistory.slice(0, 50));
      }
      
      log.info('Emergency cleanup completed', 'Storage');
    }
  }

  // Data Export/Import
  public exportAllData(): string {
    const data = {
      version: CURRENT_STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      userPreferences: this.getUserPreferences(),
      playbackSettings: this.getPlaybackSettings(),
      appSettings: this.getAppSettings(),
      favorites: this.getFavorites(),
      recentlyPlayed: this.getRecentlyPlayed(),
      downloadHistory: this.getDownloadHistory(),
      chatHistory: this.getChatHistory(),
      discoveryInsights: this.getDiscoveryInsights()
    };
    
    log.info('Exported all user data', 'Storage', { size: JSON.stringify(data).length });
    return JSON.stringify(data, null, 2);
  }

  public importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.version || !data.exportedAt) {
        throw new Error('Invalid data format');
      }

      // Import each data type
      if (data.userPreferences) this.setUserPreferences(data.userPreferences);
      if (data.playbackSettings) this.setPlaybackSettings(data.playbackSettings);
      if (data.appSettings) this.setAppSettings(data.appSettings);
      if (data.favorites) this.setItem(STORAGE_KEYS.FAVORITES, data.favorites);
      if (data.recentlyPlayed) this.setItem(STORAGE_KEYS.RECENTLY_PLAYED, data.recentlyPlayed);
      if (data.downloadHistory) this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, data.downloadHistory);
      if (data.chatHistory) this.setItem(STORAGE_KEYS.CHAT_HISTORY, data.chatHistory);
      if (data.discoveryInsights) this.setItem(STORAGE_KEYS.DISCOVERY_INSIGHTS, data.discoveryInsights);
      
      // Update last backup timestamp
      this.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
      
      log.info('Imported all user data successfully', 'Storage');
      return true;
    } catch (error) {
      log.error('Failed to import data', 'Storage', {}, error as Error);
      return false;
    }
  }

  // Clear all data
  public clearAllData(): boolean {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        this.removeItem(key);
      });
      
      // Reinitialize with defaults
      this.initializeStorage();
      
      log.info('Cleared all user data', 'Storage');
      return true;
    } catch (error) {
      log.error('Failed to clear all data', 'Storage', {}, error as Error);
      return false;
    }
  }

  // Validate and fix corrupted storage data
  private validateAndFixStorageData(): void {
    try {
      // Check and fix array-type storage items
      const arrayKeys = [
        STORAGE_KEYS.FAVORITES,
        STORAGE_KEYS.RECENTLY_PLAYED,
        STORAGE_KEYS.DOWNLOAD_HISTORY,
        STORAGE_KEYS.CHAT_HISTORY
      ];

      arrayKeys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (!Array.isArray(parsed)) {
              log.warn(`Fixing corrupted array data for key: ${key}`, 'Storage');
              localStorage.setItem(key, JSON.stringify([]));
            }
          } catch (parseError) {
            log.warn(`Fixing corrupted JSON data for key: ${key}`, 'Storage');
            localStorage.setItem(key, JSON.stringify([]));
          }
        }
      });

      // Check and fix user preferences
      const prefsItem = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (prefsItem) {
        try {
          const prefs = JSON.parse(prefsItem);
          if (!prefs || typeof prefs !== 'object') {
            throw new Error('Invalid preferences object');
          }
          
          // Ensure required array fields exist
          if (!Array.isArray(prefs.moodHistory)) {
            prefs.moodHistory = [];
          }
          if (!Array.isArray(prefs.preferredMoods)) {
            prefs.preferredMoods = [];
          }
          if (!Array.isArray(prefs.favoriteGenres)) {
            prefs.favoriteGenres = [];
          }
          
          localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
        } catch (error) {
          log.warn('Fixing corrupted user preferences', 'Storage');
          localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(this.getDefaultUserPreferences()));
        }
      }

      log.debug('Storage data validation completed', 'Storage');
    } catch (error) {
      log.error('Failed to validate storage data', 'Storage', {}, error as Error);
    }
  }

  // Storage migration
  private migrateStorage(fromVersion: string, toVersion: string): void {
    log.info(`Migrating storage from ${fromVersion} to ${toVersion}`, 'Storage');
    
    try {
      // Migration logic would go here
      // For now, just update the version
      this.setItem(STORAGE_KEYS.STORAGE_VERSION, toVersion);
      
      log.info('Storage migration completed successfully', 'Storage');
    } catch (error) {
      log.error('Storage migration failed', 'Storage', { fromVersion, toVersion }, error as Error);
    }
  }

  // Backup management
  public createBackup(): string {
    const backup = this.exportAllData();
    this.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
    return backup;
  }

  public getLastBackupDate(): Date | null {
    const lastBackup = this.getItem<string | null>(STORAGE_KEYS.LAST_BACKUP, null);
    return lastBackup ? new Date(lastBackup) : null;
  }
}

// Export singleton instance
export const localStorageManager = LocalStorageManager.getInstance();

// Export convenience functions for backward compatibility
export const LocalStorage = {
  // User preferences
  getUserPreferences: () => localStorageManager.getUserPreferences(),
  setUserPreferences: (prefs: UserPreferences) => localStorageManager.setUserPreferences(prefs),
  updateUserPreferences: (updates: Partial<UserPreferences>) => localStorageManager.updateUserPreferences(updates),
  
  // Mood management
  getSelectedMood: () => localStorageManager.getUserPreferences().selectedMood,
  setSelectedMood: (mood: string) => {
    localStorageManager.addMoodToHistory(mood);
    return true;
  },
  clearSelectedMood: () => localStorageManager.updateUserPreferences({ selectedMood: null }),
  
  // Playback settings
  getVolume: () => localStorageManager.getPlaybackSettings().volume,
  setVolume: (volume: number) => localStorageManager.updatePlaybackSettings({ volume }),
  
  // Favorites
  getFavorites: () => localStorageManager.getFavorites(),
  addToFavorites: (song: Song) => localStorageManager.addToFavorites(song),
  removeFromFavorites: (songId: string) => localStorageManager.removeFromFavorites(songId),
  isFavorite: (songId: string) => localStorageManager.isFavorite(songId),
  
  // Recently played
  getRecentlyPlayed: () => localStorageManager.getRecentlyPlayed(),
  addToRecentlyPlayed: (song: Song) => localStorageManager.addToRecentlyPlayed(song),
  clearRecentlyPlayed: () => localStorageManager.clearRecentlyPlayed(),
  
  // Download history
  getDownloadHistory: () => localStorageManager.getDownloadHistory(),
  addToDownloadHistory: (download: Download) => localStorageManager.addToDownloadHistory(download),
  removeFromDownloadHistory: (downloadId: string) => localStorageManager.removeFromDownloadHistory(downloadId),
  clearDownloadHistory: () => localStorageManager.removeItem(STORAGE_KEYS.DOWNLOAD_HISTORY),
  
  // Chat history
  getChatHistory: () => localStorageManager.getChatHistory(),
  saveChatSession: (session: ChatSession) => localStorageManager.saveChatSession(session),
  removeChatSession: (sessionId: string) => localStorageManager.removeChatSession(sessionId),
  clearChatHistory: () => localStorageManager.removeItem(STORAGE_KEYS.CHAT_HISTORY),
  
  // Data management
  exportData: () => localStorageManager.exportAllData(),
  importData: (data: string) => localStorageManager.importAllData(data),
  clearAllData: () => localStorageManager.clearAllData(),
  getStorageInfo: () => localStorageManager.getStorageQuota()
};