'use client';

import React, { useState } from 'react';
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface MigrationManagerProps {
  migrationStatus: any;
  onMigrate: (targetVersion?: number) => void;
  onRollback: (targetVersion: number) => void;
  isMigrating: boolean;
  isRollingBack: boolean;
  error: any;
}

export function MigrationManager({
  migrationStatus,
  onMigrate,
  onRollback,
  isMigrating,
  isRollingBack,
  error
}: MigrationManagerProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>();
  const [rollbackVersion, setRollbackVersion] = useState<number>(0);

  if (!migrationStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-blue-400">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading migration status...</span>
        </div>
      </div>
    );
  }

  const handleMigrate = () => {
    onMigrate(selectedVersion);
  };

  const handleRollback = () => {
    if (rollbackVersion >= 0 && rollbackVersion < migrationStatus.currentVersion) {
      onRollback(rollbackVersion);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Migration Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {migrationStatus.currentVersion}
            </div>
            <div className="text-sm text-gray-400 mt-1">Current Version</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {migrationStatus.latestVersion}
            </div>
            <div className="text-sm text-gray-400 mt-1">Latest Version</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${
              migrationStatus.pendingMigrations.length > 0 ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {migrationStatus.pendingMigrations.length}
            </div>
            <div className="text-sm text-gray-400 mt-1">Pending Migrations</div>
          </div>
        </div>

        {/* Status Message */}
        {migrationStatus.currentVersion === migrationStatus.latestVersion ? (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span className="text-sm">Database schema is up to date</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-400">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span className="text-sm">
                Database schema is outdated. {migrationStatus.pendingMigrations.length} migration(s) available.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Migration Error</p>
              <p className="text-red-300 text-sm mt-1">
                {error.message || 'An error occurred during migration'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Migration Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Run Migrations */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4 flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5" />
            <span>Run Migrations</span>
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Version (optional)
              </label>
              <select
                value={selectedVersion || ''}
                onChange={(e) => setSelectedVersion(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isMigrating || isRollingBack}
              >
                <option value="">Latest ({migrationStatus.latestVersion})</option>
                {migrationStatus.pendingMigrations.map((migration: any) => (
                  <option key={migration.version} value={migration.version}>
                    Version {migration.version} - {migration.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleMigrate}
              disabled={isMigrating || isRollingBack || migrationStatus.pendingMigrations.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isMigrating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Migrating...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  <span>Run Migrations</span>
                </>
              )}
            </button>

            {migrationStatus.pendingMigrations.length === 0 && (
              <p className="text-xs text-gray-400 text-center">
                No pending migrations available
              </p>
            )}
          </div>
        </div>

        {/* Rollback Migrations */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4 flex items-center space-x-2">
            <ArrowUturnLeftIcon className="w-5 h-5" />
            <span>Rollback Migrations</span>
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rollback to Version
              </label>
              <select
                value={rollbackVersion}
                onChange={(e) => setRollbackVersion(parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isMigrating || isRollingBack}
              >
                <option value={0}>Version 0 (Reset)</option>
                {migrationStatus.appliedMigrations
                  .filter((migration: any) => migration.version < migrationStatus.currentVersion)
                  .map((migration: any) => (
                    <option key={migration.version} value={migration.version}>
                      Version {migration.version} - {migration.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={handleRollback}
              disabled={isMigrating || isRollingBack || migrationStatus.currentVersion === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isRollingBack ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Rolling Back...</span>
                </>
              ) : (
                <>
                  <ArrowUturnLeftIcon className="w-4 h-4" />
                  <span>Rollback</span>
                </>
              )}
            </button>

            <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-xs">
                  Warning: Rolling back migrations may result in data loss. 
                  Create a backup before proceeding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applied Migrations */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Applied Migrations</h3>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {migrationStatus.appliedMigrations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Applied At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {migrationStatus.appliedMigrations
                    .sort((a: any, b: any) => b.version - a.version)
                    .map((migration: any) => (
                      <tr key={migration.version} className="hover:bg-gray-750">
                        <td className="px-4 py-3 text-sm font-medium text-white">
                          {migration.version}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {migration.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {new Date(migration.appliedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p>No migrations have been applied yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Migrations */}
      {migrationStatus.pendingMigrations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Pending Migrations</h3>
          
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {migrationStatus.pendingMigrations.map((migration: any) => (
                    <tr key={migration.version} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm font-medium text-yellow-400">
                        {migration.version}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {migration.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {migration.up.length} statements to execute
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MigrationManager;