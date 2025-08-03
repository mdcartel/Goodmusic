'use client';

import React, { useState } from 'react';
import { useDatabaseManager } from '@/lib/hooks/useDatabase';
import { DatabaseStats } from './DatabaseStats';
import { MigrationManager } from './MigrationManager';
import { BackupRestore } from './BackupRestore';
import { DatabaseSettings } from './DatabaseSettings';
import { ActivityLog } from './ActivityLog';
import {
  CircleStackIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface DatabaseManagerProps {
  className?: string;
}

type TabType = 'overview' | 'migrations' | 'backup' | 'settings' | 'activity';

export function DatabaseManager({ className = '' }: DatabaseManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const databaseManager = useDatabaseManager();

  const tabs = [
    {
      id: 'overview' as TabType,
      name: 'Overview',
      icon: CircleStackIcon,
    },
    {
      id: 'migrations' as TabType,
      name: 'Migrations',
      icon: ArrowPathIcon,
      badge: databaseManager.databaseHealth.needsMigration,
    },
    {
      id: 'backup' as TabType,
      name: 'Backup & Restore',
      icon: DocumentArrowUpIcon,
    },
    {
      id: 'settings' as TabType,
      name: 'Settings',
      icon: Cog6ToothIcon,
    },
    {
      id: 'activity' as TabType,
      name: 'Activity Log',
      icon: ClockIcon,
    },
  ];

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Database Manager</h2>
          
          {/* Database Health Indicator */}
          <div className="flex items-center space-x-2">
            {databaseManager.integrity?.isValid ? (
              <div className="flex items-center space-x-1 text-green-400">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="text-sm">Healthy</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-400">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm">Issues Detected</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {databaseManager.stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-blue-400 font-semibold">
                {databaseManager.formatSize(databaseManager.stats.size)}
              </div>
              <div className="text-gray-400">Database Size</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-green-400 font-semibold">
                {databaseManager.stats.tableCount}
              </div>
              <div className="text-gray-400">Tables</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-purple-400 font-semibold">
                {databaseManager.migrationStatus?.currentVersion || 0}
              </div>
              <div className="text-gray-400">Schema Version</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-yellow-400 font-semibold">
                {databaseManager.stats.freePages}
              </div>
              <div className="text-gray-400">Free Pages</div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {databaseManager.isLoading && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading database information...</span>
            </div>
          </div>
        )}

        {/* Error display */}
        {databaseManager.hasError && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <div className="flex items-center space-x-2 text-red-400">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span className="text-sm">
                Database error detected. Check the logs for details.
              </span>
            </div>
          </div>
        )}

        {/* Operation in progress */}
        {databaseManager.isOperating && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">
                Database operation in progress...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-gray-800'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                
                {tab.badge && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <DatabaseStats
            stats={databaseManager.stats}
            integrity={databaseManager.integrity}
            migrationStatus={databaseManager.migrationStatus}
            onOptimize={databaseManager.optimize}
            isOptimizing={databaseManager.isOptimizing}
          />
        )}

        {activeTab === 'migrations' && (
          <MigrationManager
            migrationStatus={databaseManager.migrationStatus}
            onMigrate={databaseManager.migrate}
            onRollback={databaseManager.rollback}
            isMigrating={databaseManager.isMigrating}
            isRollingBack={databaseManager.isRollingBack}
            error={databaseManager.migrateError || databaseManager.rollbackError}
          />
        )}

        {activeTab === 'backup' && (
          <BackupRestore
            onBackup={databaseManager.backup}
            onRestore={databaseManager.restore}
            isBackingUp={databaseManager.isBackingUp}
            isRestoring={databaseManager.isRestoring}
            backupError={databaseManager.backupError}
            restoreError={databaseManager.restoreError}
          />
        )}

        {activeTab === 'settings' && (
          <DatabaseSettings
            settings={databaseManager.settings}
            onUpdateSetting={databaseManager.updateSetting}
            isUpdating={databaseManager.isUpdatingSetting}
            error={databaseManager.updateSettingError}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityLog
            activities={databaseManager.activityLog}
            isLoading={databaseManager.isLoadingActivityLog}
            error={databaseManager.activityLogError}
            formatDate={databaseManager.formatDate}
          />
        )}
      </div>
    </div>
  );
}

export default DatabaseManager;