'use client';

import { useState, useEffect, useCallback } from 'react';
import { privacyManager, PrivacySettings, DataAuditReport } from '@/lib/privacyManager';
import { log } from '@/lib/logger';

export function usePrivacy() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [auditReport, setAuditReport] = useState<DataAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(() => {
    try {
      const privacySettings = privacyManager.getPrivacySettings();
      setSettings(privacySettings);
      setIsLoading(false);
    } catch (error) {
      log.error('Failed to load privacy settings', 'Privacy', {}, error as Error);
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<PrivacySettings>) => {
    try {
      const success = privacyManager.updatePrivacySettings(updates);
      if (success && settings) {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        log.info('Privacy settings updated', 'Privacy', updates);
      }
      return success;
    } catch (error) {
      log.error('Failed to update privacy settings', 'Privacy', updates, error as Error);
      return false;
    }
  }, [settings]);

  const runAudit = useCallback(() => {
    try {
      const report = privacyManager.auditStoredData();
      setAuditReport(report);
      log.info('Privacy audit completed', 'Privacy', {
        personalDataFound: report.personalDataFound,
        dataTypesCount: report.dataTypes.length
      });
      return report;
    } catch (error) {
      log.error('Failed to run privacy audit', 'Privacy', {}, error as Error);
      return null;
    }
  }, []);

  const clearDataCategory = useCallback((category: 'favorites' | 'history' | 'downloads' | 'chat' | 'preferences') => {
    try {
      const success = privacyManager.clearDataCategory(category);
      if (success) {
        // Refresh audit report after clearing data
        runAudit();
        log.info(`Cleared data category: ${category}`, 'Privacy');
      }
      return success;
    } catch (error) {
      log.error(`Failed to clear data category: ${category}`, 'Privacy', {}, error as Error);
      return false;
    }
  }, [runAudit]);

  const clearAllData = useCallback(() => {
    try {
      const success = privacyManager.clearAllUserData();
      if (success) {
        log.info('All user data cleared', 'Privacy');
      }
      return success;
    } catch (error) {
      log.error('Failed to clear all user data', 'Privacy', {}, error as Error);
      return false;
    }
  }, []);

  const exportData = useCallback(() => {
    try {
      const exportedData = privacyManager.exportUserData();
      log.info('User data exported', 'Privacy', { size: exportedData.length });
      return exportedData;
    } catch (error) {
      log.error('Failed to export user data', 'Privacy', {}, error as Error);
      return null;
    }
  }, []);

  const isDataCollectionAllowed = useCallback((dataType: string) => {
    return privacyManager.isDataCollectionAllowed(dataType);
  }, []);

  const sanitizeData = useCallback(<T>(data: T): T => {
    return privacyManager.sanitizeData(data);
  }, []);

  const scheduleCleanup = useCallback(() => {
    try {
      privacyManager.scheduleDataCleanup();
      log.info('Data cleanup scheduled', 'Privacy');
    } catch (error) {
      log.error('Failed to schedule data cleanup', 'Privacy', {}, error as Error);
    }
  }, []);

  return {
    // State
    settings,
    auditReport,
    isLoading,
    
    // Actions
    updateSettings,
    runAudit,
    clearDataCategory,
    clearAllData,
    exportData,
    
    // Utilities
    isDataCollectionAllowed,
    sanitizeData,
    scheduleCleanup,
    
    // Refresh
    loadSettings
  };
}

export function useDataCollection() {
  const { isDataCollectionAllowed, sanitizeData } = usePrivacy();

  const canCollect = useCallback((dataType: string) => {
    return isDataCollectionAllowed(dataType);
  }, [isDataCollectionAllowed]);

  const sanitize = useCallback(<T>(data: T): T => {
    return sanitizeData(data);
  }, [sanitizeData]);

  const collectData = useCallback(<T>(dataType: string, data: T): T | null => {
    if (!canCollect(dataType)) {
      log.warn(`Data collection not allowed for type: ${dataType}`, 'Privacy');
      return null;
    }
    
    return sanitize(data);
  }, [canCollect, sanitize]);

  return {
    canCollect,
    sanitize,
    collectData
  };
}