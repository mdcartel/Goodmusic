import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enhancedDatabase, DatabaseStats, BackupOptions, RestoreOptions } from '../database/enhanced-database';
import { MigrationResult, DatabaseVersion } from '../database/migrations';

// Hook for database statistics
export function useDatabaseStats() {
  return useQuery({
    queryKey: ['database-stats'],
    queryFn: async (): Promise<DatabaseStats> => {
      return enhancedDatabase.getStats();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Hook for database integrity check
export function useDatabaseIntegrityCheck() {
  return useQuery({
    queryKey: ['database-integrity'],
    queryFn: async (): Promise<{ isValid: boolean; errors: string[] }> => {
      return enhancedDatabase.checkIntegrity();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

// Hook for migration status
export function useMigrationStatus() {
  return useQuery({
    queryKey: ['migration-status'],
    queryFn: async () => {
      const migrationManager = enhancedDatabase.getMigrationManager();
      if (!migrationManager) {
        throw new Error('Migration manager not available');
      }
      return migrationManager.getStatus();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for database backup
export function useDatabaseBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: BackupOptions = {}): Promise<string> => {
      return enhancedDatabase.backup(options);
    },
    onSuccess: () => {
      // Invalidate stats after backup
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
    },
  });
}

// Hook for database restore
export function useDatabaseRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      backupPath,
      options = {}
    }: {
      backupPath: string;
      options?: RestoreOptions;
    }): Promise<void> => {
      return enhancedDatabase.restore(backupPath, options);
    },
    onSuccess: () => {
      // Invalidate all queries after restore
      queryClient.invalidateQueries();
    },
  });
}

// Hook for database optimization
export function useDatabaseOptimization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      return enhancedDatabase.optimize();
    },
    onSuccess: () => {
      // Invalidate stats after optimization
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
    },
  });
}

// Hook for running migrations
export function useMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetVersion?: number): Promise<MigrationResult> => {
      const migrationManager = enhancedDatabase.getMigrationManager();
      if (!migrationManager) {
        throw new Error('Migration manager not available');
      }
      return migrationManager.migrate(targetVersion);
    },
    onSuccess: () => {
      // Invalidate migration status and stats
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
    },
  });
}

// Hook for rolling back migrations
export function useMigrationRollback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetVersion: number): Promise<MigrationResult> => {
      const migrationManager = enhancedDatabase.getMigrationManager();
      if (!migrationManager) {
        throw new Error('Migration manager not available');
      }
      return migrationManager.rollback(targetVersion);
    },
    onSuccess: () => {
      // Invalidate migration status and stats
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
    },
  });
}

// Hook for custom database queries
export function useDatabaseQuery<T = any>(
  queryKey: string[],
  sql: string,
  params: any[] = [],
  options: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  } = {}
) {
  return useQuery({
    queryKey: ['database-query', ...queryKey],
    queryFn: async (): Promise<T[]> => {
      return enhancedDatabase.all<T>(sql, params);
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime || 1 * 60 * 1000, // 1 minute
    gcTime: options.gcTime || 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for database mutations
export function useDatabaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sql,
      params = []
    }: {
      sql: string;
      params?: any[];
    }): Promise<{ changes: number; lastID: number }> => {
      return enhancedDatabase.run(sql, params);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['database-query'] });
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
    },
  });
}

// Hook for database transactions
export function useDatabaseTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> => {
      return enhancedDatabase.transaction(queries);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['database-query'] });
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
    },
  });
}

// Hook for settings management
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<Array<{ key: string; value: string; category: string }>> => {
      return enhancedDatabase.all('SELECT key, value, category FROM settings ORDER BY category, key');
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for updating settings
export function useSettingsUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      category = 'general'
    }: {
      key: string;
      value: string;
      category?: string;
    }): Promise<void> => {
      await enhancedDatabase.run(
        'INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)',
        [key, value, category]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// Hook for getting a specific setting
export function useSetting(key: string, defaultValue?: string) {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: async (): Promise<string | undefined> => {
      const result = await enhancedDatabase.get<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [key]
      );
      return result?.value || defaultValue;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for activity log
export function useActivityLog(limit: number = 50) {
  return useQuery({
    queryKey: ['activity-log', limit],
    queryFn: async (): Promise<Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      details: any;
      timestamp: string;
    }>> => {
      const results = await enhancedDatabase.all(
        'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      
      return results.map((row: any) => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        details: row.details ? JSON.parse(row.details) : null,
        timestamp: row.timestamp,
      }));
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for logging activity
export function useActivityLogger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      details
    }: {
      action: string;
      entityType: string;
      entityId: string;
      details?: any;
    }): Promise<void> => {
      const id = Math.random().toString(36).substring(2, 15);
      await enhancedDatabase.run(
        'INSERT INTO activity_log (id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [id, action, entityType, entityId, details ? JSON.stringify(details) : null]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });
}

// Comprehensive hook that combines all database functionality
export function useDatabaseManager() {
  const stats = useDatabaseStats();
  const integrity = useDatabaseIntegrityCheck();
  const migrationStatus = useMigrationStatus();
  const backup = useDatabaseBackup();
  const restore = useDatabaseRestore();
  const optimize = useDatabaseOptimization();
  const migrate = useMigration();
  const rollback = useMigrationRollback();
  const settings = useSettings();
  const updateSetting = useSettingsUpdate();
  const activityLog = useActivityLog();
  const logActivity = useActivityLogger();

  return {
    // Data
    stats: stats.data,
    integrity: integrity.data,
    migrationStatus: migrationStatus.data,
    settings: settings.data,
    activityLog: activityLog.data,

    // Operations
    backup: backup.mutate,
    restore: restore.mutate,
    optimize: optimize.mutate,
    migrate: migrate.mutate,
    rollback: rollback.mutate,
    updateSetting: updateSetting.mutate,
    logActivity: logActivity.mutate,

    // Loading states
    isLoadingStats: stats.isLoading,
    isCheckingIntegrity: integrity.isLoading,
    isLoadingMigrationStatus: migrationStatus.isLoading,
    isLoadingSettings: settings.isLoading,
    isLoadingActivityLog: activityLog.isLoading,
    isBackingUp: backup.isPending,
    isRestoring: restore.isPending,
    isOptimizing: optimize.isPending,
    isMigrating: migrate.isPending,
    isRollingBack: rollback.isPending,
    isUpdatingSetting: updateSetting.isPending,
    isLoggingActivity: logActivity.isPending,

    // Errors
    statsError: stats.error,
    integrityError: integrity.error,
    migrationStatusError: migrationStatus.error,
    settingsError: settings.error,
    activityLogError: activityLog.error,
    backupError: backup.error,
    restoreError: restore.error,
    optimizeError: optimize.error,
    migrateError: migrate.error,
    rollbackError: rollback.error,
    updateSettingError: updateSetting.error,
    logActivityError: logActivity.error,

    // Helper functions
    isLoading: stats.isLoading || 
               integrity.isLoading || 
               migrationStatus.isLoading || 
               settings.isLoading || 
               activityLog.isLoading,

    hasError: !!(stats.error || 
                 integrity.error || 
                 migrationStatus.error || 
                 settings.error || 
                 activityLog.error),

    isOperating: backup.isPending || 
                 restore.isPending || 
                 optimize.isPending || 
                 migrate.isPending || 
                 rollback.isPending,

    // Computed properties
    databaseHealth: {
      isHealthy: integrity.data?.isValid && !stats.error,
      needsOptimization: stats.data ? stats.data.freePages > stats.data.pageCount * 0.1 : false,
      needsMigration: migrationStatus.data ? 
        migrationStatus.data.currentVersion < migrationStatus.data.latestVersion : false,
    },

    // Utility functions
    formatSize: (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    },

    formatDate: (dateString: string) => {
      return new Date(dateString).toLocaleString();
    },
  };
}

// Utility functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}