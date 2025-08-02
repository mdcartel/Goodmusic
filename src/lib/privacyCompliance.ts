// Privacy compliance utilities for VibePipe MVP
// Ensures the app never collects or transmits personal information

import { privacyManager } from './privacyManager';
import { log } from './logger';

/**
 * Data validation rules to ensure privacy compliance
 */
export class PrivacyCompliance {
  // Fields that should never be collected or stored
  private static readonly FORBIDDEN_FIELDS = [
    'email', 'phone', 'name', 'firstName', 'lastName', 'fullName',
    'address', 'location', 'coordinates', 'latitude', 'longitude',
    'ip', 'ipAddress', 'deviceId', 'userId', 'accountId', 'socialId',
    'socialMedia', 'contacts', 'calendar', 'photos', 'files',
    'browsingHistory', 'searchHistory', 'personalInfo', 'pii',
    'creditCard', 'payment', 'ssn', 'passport', 'license'
  ];

  // URL patterns that should never be logged or stored
  private static readonly FORBIDDEN_URL_PATTERNS = [
    /\/api\/auth/,
    /\/login/,
    /\/register/,
    /\/profile/,
    /\/account/,
    /token=/,
    /password=/,
    /email=/,
    /phone=/
  ];

  /**
   * Validate that data doesn't contain personal information
   */
  static validateData<T>(data: T, context: string = 'unknown'): boolean {
    try {
      const dataString = JSON.stringify(data).toLowerCase();
      
      // Check for forbidden fields
      for (const field of this.FORBIDDEN_FIELDS) {
        if (dataString.includes(field.toLowerCase())) {
          log.warn(`Privacy violation detected: ${field} found in ${context}`, 'Privacy', {
            context,
            field,
            dataPreview: dataString.substring(0, 100)
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      log.error('Failed to validate data for privacy compliance', 'Privacy', { context }, error as Error);
      return false;
    }
  }

  /**
   * Sanitize data by removing any potential personal information
   */
  static sanitizeData<T>(data: T, context: string = 'unknown'): T {
    try {
      if (typeof data !== 'object' || data === null) {
        return data;
      }

      const sanitized = { ...data } as any;

      // Remove forbidden fields
      this.FORBIDDEN_FIELDS.forEach(field => {
        const variations = [
          field,
          field.toLowerCase(),
          field.toUpperCase(),
          field.replace(/([A-Z])/g, '_$1').toLowerCase(),
          field.replace(/([A-Z])/g, '-$1').toLowerCase()
        ];

        variations.forEach(variation => {
          if (variation in sanitized) {
            delete sanitized[variation];
            log.info(`Removed forbidden field: ${variation} from ${context}`, 'Privacy');
          }
        });
      });

      // Recursively sanitize nested objects
      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeData(sanitized[key], `${context}.${key}`);
        }
      });

      return sanitized;
    } catch (error) {
      log.error('Failed to sanitize data', 'Privacy', { context }, error as Error);
      return data;
    }
  }

  /**
   * Validate URL to ensure it doesn't contain sensitive information
   */
  static validateUrl(url: string): boolean {
    try {
      // Check against forbidden patterns
      for (const pattern of this.FORBIDDEN_URL_PATTERNS) {
        if (pattern.test(url)) {
          log.warn(`Privacy violation: Forbidden URL pattern detected`, 'Privacy', {
            url: url.substring(0, 50) + '...',
            pattern: pattern.toString()
          });
          return false;
        }
      }

      // Check for common personal data in query parameters
      const urlObj = new URL(url, 'https://example.com');
      const params = urlObj.searchParams;
      
      for (const [key, value] of params.entries()) {
        if (this.FORBIDDEN_FIELDS.some(field => 
          key.toLowerCase().includes(field.toLowerCase()) ||
          value.toLowerCase().includes(field.toLowerCase())
        )) {
          log.warn(`Privacy violation: Personal data in URL parameters`, 'Privacy', {
            parameter: key,
            url: url.substring(0, 50) + '...'
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      log.error('Failed to validate URL for privacy compliance', 'Privacy', { url }, error as Error);
      return false;
    }
  }

  /**
   * Sanitize URL by removing sensitive parameters
   */
  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'https://example.com');
      const params = urlObj.searchParams;
      
      // Remove forbidden parameters
      for (const [key, value] of params.entries()) {
        if (this.FORBIDDEN_FIELDS.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          params.delete(key);
          log.info(`Removed sensitive parameter: ${key}`, 'Privacy');
        }
      }

      return urlObj.toString();
    } catch (error) {
      log.error('Failed to sanitize URL', 'Privacy', { url }, error as Error);
      return url;
    }
  }

  /**
   * Check if data collection is allowed for a specific type
   */
  static canCollectData(dataType: string): boolean {
    return privacyManager.isDataCollectionAllowed(dataType);
  }

  /**
   * Log data collection attempt (for audit purposes)
   */
  static logDataCollection(dataType: string, allowed: boolean, context: string = 'unknown'): void {
    log.info('Data collection attempt', 'Privacy', {
      dataType,
      allowed,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Validate and sanitize data before storage
   */
  static prepareForStorage<T>(data: T, dataType: string, context: string = 'unknown'): T | null {
    // Check if data collection is allowed
    if (!this.canCollectData(dataType)) {
      this.logDataCollection(dataType, false, context);
      return null;
    }

    // Validate data doesn't contain personal information
    if (!this.validateData(data, context)) {
      log.warn(`Data rejected due to privacy violation`, 'Privacy', { dataType, context });
      return null;
    }

    // Sanitize data as an extra precaution
    const sanitized = this.sanitizeData(data, context);
    
    this.logDataCollection(dataType, true, context);
    return sanitized;
  }

  /**
   * Create a privacy-compliant error report
   */
  static createErrorReport(error: Error, context: string = 'unknown'): Record<string, any> {
    const report = {
      message: error.message,
      name: error.name,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
    };

    // Sanitize the error report
    return this.sanitizeData(report, 'error-report');
  }

  /**
   * Check if current environment allows data collection
   */
  static isDataCollectionEnvironment(): boolean {
    // Never collect data in development or test environments
    if (typeof process !== 'undefined') {
      const env = process.env.NODE_ENV;
      if (env === 'development' || env === 'test') {
        return false;
      }
    }

    // Check user's privacy settings
    const settings = privacyManager.getPrivacySettings();
    return settings.dataCollection.allowUsageAnalytics;
  }

  /**
   * Generate a privacy compliance report
   */
  static generateComplianceReport(): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Run data audit
      const auditReport = privacyManager.auditStoredData();
      
      if (auditReport.personalDataFound) {
        issues.push('Personal data detected in stored data');
        recommendations.push('Review and remove personal data from storage');
      }

      // Check storage usage
      if (auditReport.storageUsage.total > 5 * 1024 * 1024) { // 5MB
        issues.push('High storage usage detected');
        recommendations.push('Consider implementing data cleanup policies');
      }

      // Check data types
      const allowedTypes = ['mood_preferences', 'volume_settings', 'playback_settings', 'download_history', 'favorites'];
      const unauthorizedTypes = auditReport.dataTypes.filter(type => 
        !allowedTypes.some(allowed => type.includes(allowed))
      );

      if (unauthorizedTypes.length > 0) {
        issues.push(`Unauthorized data types found: ${unauthorizedTypes.join(', ')}`);
        recommendations.push('Review data collection practices');
      }

      const compliant = issues.length === 0;

      log.info('Privacy compliance report generated', 'Privacy', {
        compliant,
        issuesCount: issues.length,
        recommendationsCount: recommendations.length
      });

      return { compliant, issues, recommendations };
    } catch (error) {
      log.error('Failed to generate compliance report', 'Privacy', {}, error as Error);
      return {
        compliant: false,
        issues: ['Failed to generate compliance report'],
        recommendations: ['Manual privacy review recommended']
      };
    }
  }
}

// Export convenience functions
export const PrivacyUtils = {
  validate: PrivacyCompliance.validateData,
  sanitize: PrivacyCompliance.sanitizeData,
  validateUrl: PrivacyCompliance.validateUrl,
  sanitizeUrl: PrivacyCompliance.sanitizeUrl,
  canCollect: PrivacyCompliance.canCollectData,
  prepareForStorage: PrivacyCompliance.prepareForStorage,
  createErrorReport: PrivacyCompliance.createErrorReport,
  isCollectionAllowed: PrivacyCompliance.isDataCollectionEnvironment,
  generateReport: PrivacyCompliance.generateComplianceReport
};