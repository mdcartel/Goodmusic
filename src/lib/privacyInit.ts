// Privacy initialization for VibePipe MVP
// Ensures privacy compliance from app startup

import { privacyManager } from './privacyManager';
import { PrivacyCompliance } from './privacyCompliance';
import { log } from './logger';

/**
 * Initialize privacy system and perform compliance checks
 */
export async function initializePrivacy(): Promise<void> {
  try {
    log.info('Initializing privacy system', 'Privacy');

    // Schedule automatic data cleanup
    privacyManager.scheduleDataCleanup();

    // Run initial privacy audit
    const auditReport = privacyManager.auditStoredData();
    
    if (auditReport.personalDataFound) {
      log.warn('Personal data detected during initialization', 'Privacy', {
        dataTypes: auditReport.dataTypes,
        recommendations: auditReport.recommendations
      });
    }

    // Generate compliance report
    const complianceReport = PrivacyCompliance.generateComplianceReport();
    
    if (!complianceReport.compliant) {
      log.warn('Privacy compliance issues detected', 'Privacy', {
        issues: complianceReport.issues,
        recommendations: complianceReport.recommendations
      });
    }

    // Log privacy initialization success
    log.info('Privacy system initialized successfully', 'Privacy', {
      compliant: complianceReport.compliant,
      storageUsed: auditReport.storageUsage.total,
      dataTypes: auditReport.dataTypes.length
    });

  } catch (error) {
    log.error('Failed to initialize privacy system', 'Privacy', {}, error as Error);
  }
}

/**
 * Privacy-compliant data collection wrapper
 */
export function collectData<T>(dataType: string, data: T, context: string = 'unknown'): T | null {
  try {
    // Check if data collection is allowed
    if (!PrivacyCompliance.canCollectData(dataType)) {
      log.debug(`Data collection not allowed for type: ${dataType}`, 'Privacy', { context });
      return null;
    }

    // Prepare data for storage (validate and sanitize)
    const preparedData = PrivacyCompliance.prepareForStorage(data, dataType, context);
    
    if (preparedData === null) {
      log.warn(`Data preparation failed for type: ${dataType}`, 'Privacy', { context });
      return null;
    }

    return preparedData;
  } catch (error) {
    log.error('Failed to collect data', 'Privacy', { dataType, context }, error as Error);
    return null;
  }
}

/**
 * Privacy-compliant error reporting
 */
export function reportError(error: Error, context: string = 'unknown'): void {
  try {
    // Check if error reporting is allowed
    if (!PrivacyCompliance.canCollectData('error_reporting')) {
      return;
    }

    // Create privacy-compliant error report
    const errorReport = PrivacyCompliance.createErrorReport(error, context);
    
    // Log the error (this stays local, no external transmission)
    log.error('Application error reported', 'Privacy', errorReport);

  } catch (reportingError) {
    // Fallback logging if error reporting fails
    log.error('Failed to report error', 'Privacy', { 
      originalError: error.message,
      context 
    }, reportingError as Error);
  }
}

/**
 * Privacy-compliant analytics event
 */
export function trackEvent(eventName: string, properties: Record<string, any> = {}, context: string = 'unknown'): void {
  try {
    // Check if analytics is allowed
    if (!PrivacyCompliance.canCollectData('usage_analytics')) {
      return;
    }

    // Sanitize event properties
    const sanitizedProperties = PrivacyCompliance.sanitizeData(properties, `analytics-${eventName}`);
    
    // Validate no personal data is included
    if (!PrivacyCompliance.validateData(sanitizedProperties, `analytics-${eventName}`)) {
      log.warn(`Analytics event rejected due to privacy violation: ${eventName}`, 'Privacy');
      return;
    }

    // Log the event (this stays local, no external transmission)
    log.info('Analytics event tracked', 'Privacy', {
      event: eventName,
      properties: sanitizedProperties,
      context,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error('Failed to track analytics event', 'Privacy', { eventName, context }, error as Error);
  }
}

/**
 * Check if the app is running in a privacy-compliant manner
 */
export function checkPrivacyCompliance(): {
  compliant: boolean;
  issues: string[];
  actions: string[];
} {
  try {
    const complianceReport = PrivacyCompliance.generateComplianceReport();
    const auditReport = privacyManager.auditStoredData();
    
    const actions: string[] = [];
    
    if (auditReport.personalDataFound) {
      actions.push('Clear personal data from storage');
    }
    
    if (auditReport.storageUsage.percentage > 80) {
      actions.push('Clean up old data to free storage space');
    }
    
    if (complianceReport.issues.length > 0) {
      actions.push('Review data collection practices');
    }

    return {
      compliant: complianceReport.compliant && !auditReport.personalDataFound,
      issues: [...complianceReport.issues, ...auditReport.recommendations],
      actions
    };
  } catch (error) {
    log.error('Failed to check privacy compliance', 'Privacy', {}, error as Error);
    return {
      compliant: false,
      issues: ['Failed to check compliance'],
      actions: ['Manual privacy review required']
    };
  }
}

// Export privacy utilities for use throughout the app
export const Privacy = {
  init: initializePrivacy,
  collectData,
  reportError,
  trackEvent,
  checkCompliance: checkPrivacyCompliance,
  
  // Direct access to managers
  manager: privacyManager,
  compliance: PrivacyCompliance
};