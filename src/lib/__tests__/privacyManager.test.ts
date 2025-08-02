import { privacyManager, PrivacySettings } from '../privacyManager';
import { localStorageManager } from '../localStorageManager';

// Mock dependencies
jest.mock('../localStorageManager');
jest.mock('../logger');

const mockLocalStorageManager = localStorageManager as jest.Mocked<typeof localStorageManager>;

describe('PrivacyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default app settings
    mockLocalStorageManager.getAppSettings.mockReturnValue({
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
    });

    mockLocalStorageManager.updateAppSettings.mockReturnValue(true);
    mockLocalStorageManager.getStorageQuota.mockReturnValue({
      used: 1024,
      available: 4 * 1024 * 1024,
      total: 5 * 1024 * 1024,
      percentage: 0.02,
      itemCounts: {
        'vibepipe_favorites_v1': 512,
        'vibepipe_preferences_v1': 256
      }
    });
  });

  describe('getPrivacySettings', () => {
    it('returns current privacy settings', () => {
      const settings = privacyManager.getPrivacySettings();

      expect(settings).toEqual({
        dataCollection: {
          allowUsageAnalytics: false,
          allowErrorReporting: true,
          allowPerformanceMetrics: false
        },
        dataRetention: {
          maxHistoryDays: 90,
          maxDownloadHistory: 200,
          maxChatHistory: 20,
          autoCleanup: true
        },
        dataSharing: {
          shareWithThirdParties: false,
          allowTelemetry: false
        }
      });
    });
  });

  describe('updatePrivacySettings', () => {
    it('updates privacy settings successfully', () => {
      const updates: Partial<PrivacySettings> = {
        dataCollection: {
          allowUsageAnalytics: true,
          allowErrorReporting: true,
          allowPerformanceMetrics: false
        }
      };

      const result = privacyManager.updatePrivacySettings(updates);

      expect(result).toBe(true);
      expect(mockLocalStorageManager.updateAppSettings).toHaveBeenCalledWith({
        privacy: {
          enableAnalytics: true,
          shareUsageData: false,
          clearDataOnExit: false
        }
      });
    });

    it('handles update failure', () => {
      mockLocalStorageManager.updateAppSettings.mockReturnValue(false);

      const updates: Partial<PrivacySettings> = {
        dataCollection: {
          allowUsageAnalytics: true,
          allowErrorReporting: true,
          allowPerformanceMetrics: false
        }
      };

      const result = privacyManager.updatePrivacySettings(updates);

      expect(result).toBe(false);
    });
  });

  describe('auditStoredData', () => {
    it('performs data audit successfully', () => {
      mockLocalStorageManager.getUserPreferences.mockReturnValue({
        selectedMood: 'chill',
        preferredMoods: ['chill'],
        moodHistory: [],
        lastActiveDate: new Date().toISOString(),
        totalSongsPlayed: 5,
        totalDownloads: 2,
        favoriteGenres: [],
        discoveryPreferences: {
          enableChatSuggestions: true,
          enableMoodRecommendations: true,
          enableAutoplay: false
        }
      });

      mockLocalStorageManager.getFavorites.mockReturnValue([]);
      mockLocalStorageManager.getRecentlyPlayed.mockReturnValue([]);
      mockLocalStorageManager.getDownloadHistory.mockReturnValue([]);
      mockLocalStorageManager.getChatHistory.mockReturnValue([]);
      mockLocalStorageManager.getDiscoveryInsights.mockReturnValue({
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
      });

      const report = privacyManager.auditStoredData();

      expect(report.personalDataFound).toBe(false);
      expect(report.dataTypes).toContain('favorites');
      expect(report.dataTypes).toContain('preferences');
      expect(report.storageUsage.total).toBe(1024);
    });

    it('detects personal data in storage', () => {
      // Mock storage quota with suspicious data
      mockLocalStorageManager.getStorageQuota.mockReturnValue({
        used: 1024,
        available: 4 * 1024 * 1024,
        total: 5 * 1024 * 1024,
        percentage: 0.02,
        itemCounts: {
          'vibepipe_email_data': 512, // This should trigger personal data detection
          'vibepipe_preferences_v1': 256
        }
      });

      const report = privacyManager.auditStoredData();

      expect(report.personalDataFound).toBe(true);
      expect(report.recommendations).toContain('Review data type: email_data');
    });

    it('provides storage cleanup recommendations', () => {
      // Mock high storage usage
      mockLocalStorageManager.getStorageQuota.mockReturnValue({
        used: 4.5 * 1024 * 1024,
        available: 0.5 * 1024 * 1024,
        total: 5 * 1024 * 1024,
        percentage: 90,
        itemCounts: {
          'vibepipe_favorites_v1': 2 * 1024 * 1024,
          'vibepipe_preferences_v1': 2.5 * 1024 * 1024
        }
      });

      const report = privacyManager.auditStoredData();

      expect(report.recommendations).toContain('Consider cleaning up old data to free storage space');
    });
  });

  describe('clearDataCategory', () => {
    it('clears favorites successfully', () => {
      mockLocalStorageManager.getFavorites.mockReturnValue([
        {
          id: 'song1',
          title: 'Test Song',
          artist: 'Test Artist',
          thumbnail: 'test.jpg',
          duration: '3:30',
          mood: ['chill'],
          youtubeUrl: 'https://youtube.com/test'
        }
      ]);
      mockLocalStorageManager.removeFromFavorites.mockReturnValue(true);

      const result = privacyManager.clearDataCategory('favorites');

      expect(result).toBe(true);
      expect(mockLocalStorageManager.removeFromFavorites).toHaveBeenCalledWith('song1');
    });

    it('clears recently played history', () => {
      mockLocalStorageManager.clearRecentlyPlayed.mockReturnValue(true);

      const result = privacyManager.clearDataCategory('history');

      expect(result).toBe(true);
      expect(mockLocalStorageManager.clearRecentlyPlayed).toHaveBeenCalled();
    });

    it('clears download history', () => {
      mockLocalStorageManager.getDownloadHistory.mockReturnValue([
        {
          id: 'download1',
          songId: 'song1',
          format: 'mp3' as const,
          status: 'completed' as const,
          progress: 100,
          createdAt: new Date()
        }
      ]);
      mockLocalStorageManager.removeFromDownloadHistory.mockReturnValue(true);

      const result = privacyManager.clearDataCategory('downloads');

      expect(result).toBe(true);
      expect(mockLocalStorageManager.removeFromDownloadHistory).toHaveBeenCalledWith('download1');
    });

    it('resets preferences to defaults', () => {
      mockLocalStorageManager.setUserPreferences.mockReturnValue(true);

      const result = privacyManager.clearDataCategory('preferences');

      expect(result).toBe(true);
      expect(mockLocalStorageManager.setUserPreferences).toHaveBeenCalledWith({
        selectedMood: null,
        preferredMoods: [],
        moodHistory: [],
        lastActiveDate: expect.any(String),
        totalSongsPlayed: 0,
        totalDownloads: 0,
        favoriteGenres: [],
        discoveryPreferences: {
          enableChatSuggestions: true,
          enableMoodRecommendations: true,
          enableAutoplay: false
        }
      });
    });
  });

  describe('clearAllUserData', () => {
    it('clears all user data successfully', () => {
      mockLocalStorageManager.clearAllData.mockReturnValue(true);

      const result = privacyManager.clearAllUserData();

      expect(result).toBe(true);
      expect(mockLocalStorageManager.clearAllData).toHaveBeenCalled();
    });

    it('handles clear failure', () => {
      mockLocalStorageManager.clearAllData.mockReturnValue(false);

      const result = privacyManager.clearAllUserData();

      expect(result).toBe(false);
    });
  });

  describe('exportUserData', () => {
    it('exports user data in privacy-compliant format', () => {
      // Mock all data getters
      mockLocalStorageManager.getUserPreferences.mockReturnValue({
        selectedMood: 'chill',
        preferredMoods: ['chill'],
        moodHistory: [],
        lastActiveDate: new Date().toISOString(),
        totalSongsPlayed: 5,
        totalDownloads: 2,
        favoriteGenres: [],
        discoveryPreferences: {
          enableChatSuggestions: true,
          enableMoodRecommendations: true,
          enableAutoplay: false
        }
      });

      mockLocalStorageManager.getPlaybackSettings.mockReturnValue({
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
      });

      const exportedData = privacyManager.exportUserData();
      const parsed = JSON.parse(exportedData);

      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('version', '1.0.0');
      expect(parsed).toHaveProperty('appName', 'VibePipe MVP');
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('privacyNote');
      expect(parsed.privacyNote).toContain('no personal information');
    });
  });

  describe('isDataCollectionAllowed', () => {
    it('allows essential app functionality data', () => {
      const result = privacyManager.isDataCollectionAllowed('mood_preferences');
      expect(result).toBe(true);
    });

    it('respects usage analytics setting', () => {
      // Test when analytics is disabled (default)
      let result = privacyManager.isDataCollectionAllowed('usage_analytics');
      expect(result).toBe(false);

      // Mock analytics enabled
      mockLocalStorageManager.getAppSettings.mockReturnValue({
        ...mockLocalStorageManager.getAppSettings(),
        privacy: {
          shareUsageData: false,
          enableAnalytics: true,
          clearDataOnExit: false
        }
      });

      result = privacyManager.isDataCollectionAllowed('usage_analytics');
      expect(result).toBe(true);
    });

    it('always allows error reporting', () => {
      const result = privacyManager.isDataCollectionAllowed('error_reporting');
      expect(result).toBe(true);
    });

    it('denies unknown data types by default', () => {
      const result = privacyManager.isDataCollectionAllowed('unknown_data_type');
      expect(result).toBe(false);
    });
  });
});