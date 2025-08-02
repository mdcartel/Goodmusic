// Privacy-focused data handling system for VibePipe MVP
// Ensures no personal information collection and provides data management controls

import { localStorageManager } from './localStorageManager';
import { log } from './logger';

export interface PrivacySettings {
  dataCollection: {
    allowUsageAnalytics: boolean;
    allowErrorReporting: boolean;
    allowPerformanceMetrics: boolean;
  };
  dataRetention: {
    maxHistoryDays: number;
    maxDownloadHistory: number;
    maxChatHistory: number;
    autoCleanup: boolean;
  };
  dataSharing: {
    shareWithThirdParties: boolean;
    allowTelemetry: boolean;
  };
}

export interface DataAuditReport {
  personalDataFound: boolean;
  dataTypes: string[];
  storageUsage: {
    total: number;
    byCategory: Record<string, number>;
  };
  recommendations: string[];
}

class PrivacyManager {
  private static instance: PrivacyManager;
  
  // List of data fields that should never be collected
  private readonly FORBIDDEN_FIELDS = [
    'email', 'phone', 'name', 'address', 'location', 'ip', 'device_id',
    'user_id', 'account_id', 'social_media', 'contacts', 'calendar',
    'photos', 'files', 'browsing_history', 'search_history'
  ];

  // List of allowed data types for music app functionality
  private readonly ALLOWED_DATA_TYPES = [
    'mood_preferences', 'volume_settings', 'playback_settings',
    'download_history', 'favorites', 'recently_played', 'app_settings',
    'chat_history', 'discovery_insights'
  ];

  private constructor() {}

  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  /**
   * Get current privacy settings
   */
  public getPrivacySettings(): PrivacySettings {
    const appSettings = localStorageManager.getAppSettings();
    return {
      dataCollection: {
        allowUsageAnalytics: appSettings.privacy.enableAnalytics,
        allowErrorReporting: true, // Always allow for app stability
        allowPerformanceMetrics: false
      },
      dataRetention: {
        maxHistoryDays: 90,
        maxDownloadHistory: 200,
        maxChatHistory: 20,
        autoCleanup: true
      },
      dataSharing: {
        shareWithThirdParties: appSettings.privacy.shareUsageData,
        allowTelemetry: false
      }
    };
  }

  /**
   * Update privacy settings
   */
  public updatePrivacySettings(updates: Partial<PrivacySettings>): boolean {
    try {
      const current = this.getPrivacySettings();
      const newSettings = { ...current, ...updates };

      // Update app settings
      const success = localStorageManager.updateAppSettings({
        privacy: {
          enableAnalytics: newSettings.dataCollection.allowUsageAnalytics,
          shareUsageData: newSettings.dataSharing.shareWithThirdParties,
          clearDataOnExit: false // Keep data by default for better UX
        }
      });

      if (success) {
        log.info('Privacy settings updated', 'Privacy', newSettings);
      }

      return success;
    } catch (error) {
      log.error('Failed to update privacy settings', 'Privacy', {}, error as Error);
      return false;
    }
  }

  /**
   * Audit all stored data for privacy compliance
   */
  public auditStoredData(): DataAuditReport {
    try {
      const quota = localStorageManager.getStorageQuota();
      const report: DataAuditReport = {
        personalDataFound: false,
        dataTypes: [],
        storageUsage: {
          total: quota.used,
          byCategory: quota.itemCounts
        },
        recommendations: []
      };

      // Check each storage category
      Object.keys(quota.itemCounts).forEach(key => {
        // Extract data type from storage key
        const dataType = key.replace('vibepipe_', '').replace('_v1', '');
        report.dataTypes.push(dataType);

        // Check if this is an allowed data type
        if (!this.ALLOWED_DATA_TYPES.some(allowed => dataType.includes(allowed))) {
          report.personalDataFound = true;
          report.recommendations.push(`Review data type: ${dataType}`);
        }
      });

      // Check for forbidden fields in stored data
      const userData = this.getAllUserData();
      const dataString = JSON.stringify(userData).toLowerCase();
      
      this.FORBIDDEN_FIELDS.forEach(field => {
        if (dataString.includes(field)) {
          report.personalDataFound = true;
          report.recommendations.push(`Remove personal data field: ${field}`);
        }
      });

      // Storage usage recommendations
      if (quota.percentage > 80) {
        report.recommendations.push('Consider cleaning up old data to free storage space');
      }

      if (report.dataTypes.length > 10) {
        report.recommendations.push('Large number of data categories - review for necessity');
      }

      log.info('Data audit completed', 'Privacy', {
        personalDataFound: report.personalDataFound,
        dataTypesCount: report.dataTypes.length,
        storageUsed: quota.used
      });

      return report;
    } catch (error) {
      log.error('Failed to audit stored data', 'Privacy', {}, error as Error);
      return {
        personalDataFound: false,
        dataTypes: [],
        storageUsage: { total: 0, byCategory: {} },
        recommendations: ['Audit failed - manual review recommended']
      };
    }
  }

  /**
   * Get all user data for export or review
   */
  public getAllUserData(): Record<string, any> {
    try {
      const data = {
        userPreferences: localStorageManager.getUserPreferences(),
        playbackSettings: localStorageManager.getPlaybackSettings(),
        appSettings: localStorageManager.getAppSettings(),
        favorites: localStorageManager.getFavorites(),
        recentlyPlayed: localStorageManager.getRecentlyPlayed(),
        downloadHistory: localStorageManager.getDownloadHistory(),
        chatHistory: localStorageManager.getChatHistory(),
        discoveryInsights: localStorageManager.getDiscoveryInsights()
      };

      // Ensure all array fields are actually arrays
      if (!Array.isArray(data.favorites)) data.favorites = [];
      if (!Array.isArray(data.recentlyPlayed)) data.recentlyPlayed = [];
      if (!Array.isArray(data.downloadHistory)) data.downloadHistory = [];
      if (!Array.isArray(data.chatHistory)) data.chatHistory = [];

      return data;
    } catch (error) {
      log.error('Failed to get all user data', 'Privacy', {}, error as Error);
      return {
        userPreferences: {},
        playbackSettings: {},
        appSettings: {},
        favorites: [],
        recentlyPlayed: [],
        downloadHistory: [],
        chatHistory: [],
        discoveryInsights: {}
      };
    }
  }

  /**
   * Clear all user data (nuclear option)
   */
  public clearAllUserData(): boolean {
    try {
      const success = localStorageManager.clearAllData();
      
      if (success) {
        log.info('All user data cleared', 'Privacy');
      }
      
      return success;
    } catch (error) {
      log.error('Failed to clear all user data', 'Privacy', {}, error as Error);
      return false;
    }
  }

  /**
   * Clear specific data categories
   */
  public clearDataCategory(category: 'favorites' | 'history' | 'downloads' | 'chat' | 'preferences'): boolean {
    try {
      let success = false;

      switch (category) {
        case 'favorites':
          // Clear all favorites
          const favorites = localStorageManager.getFavorites();
          favorites.forEach(song => {
            localStorageManager.removeFromFavorites(song.id);
          });
          success = true;
          break;
        case 'history':
          success = localStorageManager.clearRecentlyPlayed();
          break;
        case 'downloads':
          // Clear download history by removing all entries
          const downloads = localStorageManager.getDownloadHistory();
          downloads.forEach(download => {
            localStorageManager.removeFromDownloadHistory(download.id);
          });
          success = true;
          break;
        case 'chat':
          // Clear chat history by removing all sessions
          const chatHistory = localStorageManager.getChatHistory();
          chatHistory.forEach(session => {
            localStorageManager.removeChatSession(session.id);
          });
          success = true;
          break;
        case 'preferences':
          // Reset to defaults instead of clearing completely
          const defaultPrefs = this.getDefaultUserPreferences();
          success = localStorageManager.setUserPreferences(defaultPrefs);
          break;
      }

      if (success) {
        log.info(`Cleared data category: ${category}`, 'Privacy');
      }

      return success;
    } catch (error) {
      log.error(`Failed to clear data category: ${category}`, 'Privacy', {}, error as Error);
      return false;
    }
  }

  /**
   * Get default user preferences (helper method)
   */
  private getDefaultUserPreferences() {
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

  /**
   * Sanitize data to remove any potential personal information
   */
  public sanitizeData<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data } as any;

    // Remove forbidden fields
    this.FORBIDDEN_FIELDS.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Check if data collection is compliant with privacy settings
   */
  public isDataCollectionAllowed(dataType: string): boolean {
    const settings = this.getPrivacySettings();
    
    // Always allow essential app functionality data
    if (this.ALLOWED_DATA_TYPES.includes(dataType)) {
      return true;
    }

    // Check specific data collection settings
    switch (dataType) {
      case 'usage_analytics':
        return settings.dataCollection.allowUsageAnalytics;
      case 'error_reporting':
        return settings.dataCollection.allowErrorReporting;
      case 'performance_metrics':
        return settings.dataCollection.allowPerformanceMetrics;
      default:
        return false; // Deny by default
    }
  }

  /**
   * Schedule automatic data cleanup based on retention settings
   */
  public scheduleDataCleanup(): void {
    const settings = this.getPrivacySettings();
    
    if (!settings.dataRetention.autoCleanup) {
      return;
    }

    try {
      // Clean up old data based on retention settings
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.dataRetention.maxHistoryDays);

      // This would typically run on app startup or periodically
      localStorageManager.cleanupOldData();
      
      log.info('Scheduled data cleanup completed', 'Privacy', {
        cutoffDate: cutoffDate.toISOString(),
        maxHistoryDays: settings.dataRetention.maxHistoryDays
      });
    } catch (error) {
      log.error('Failed to perform scheduled data cleanup', 'Privacy', {}, error as Error);
    }
  }

  /**
   * Export user data in a privacy-compliant format
   */
  public exportUserData(): string {
    try {
      const userData = this.getAllUserData();
      const sanitizedData = this.sanitizeData(userData);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        appName: 'VibePipe MVP',
        dataTypes: Object.keys(sanitizedData),
        data: sanitizedData,
        privacyNote: 'This export contains only non-personal music preferences and app settings. No personal information is included.'
      };

      log.info('User data exported', 'Privacy', {
        dataTypes: exportData.dataTypes,
        exportSize: JSON.stringify(exportData).length
      });

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      log.error('Failed to export user data', 'Privacy', {}, error as Error);
      return JSON.stringify({ error: 'Export failed' });
    }
  }
}

// Export singleton instance
export const privacyManager = PrivacyManager.getInstance();

// Export convenience functions
export const PrivacyUtils = {
  // Check if data collection is allowed
  canCollectData: (dataType: string) => privacyManager.isDataCollectionAllowed(dataType),
  
  // Sanitize data before storage
  sanitize: <T>(data: T) => privacyManager.sanitizeData(data),
  
  // Quick privacy audit
  auditData: () => privacyManager.auditStoredData(),
  
  // Clear all data
  clearAll: () => privacyManager.clearAllUserData(),
  
  // Export data
  exportData: () => privacyManager.exportUserData()
};