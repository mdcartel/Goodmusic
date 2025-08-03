'use client';

import React, { useState } from 'react';
import { BackupOptions, RestoreOptions } from '@/lib/database/enhanced-database';
import {
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface BackupRestoreProps {
  onBackup: (options: BackupOptions) => void;
  onRestore: (params: { backupPath: string; options: RestoreOptions }) => void;
  isBackingUp: boolean;
  isRestoring: boolean;
  backupError: any;
  restoreError: any;
}

export function BackupRestore({
  onBackup,
  onRestore,
  isBackingUp,
  isRestoring,
  backupError,
  restoreError
}: BackupRestoreProps) {
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    compress: false,
    includeMetadata: true,
    excludeTables: []
  });

  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    overwrite: false,
    validateSchema: true,
    skipMigrations: false
  });

  const [backupPath, setBackupPath] = useState('');
  const [restorePath, setRestorePath] = useState('');

  const handleBackup = () => {
    const options: BackupOptions = {
      ...backupOptions,
      path: backupPath || undefined
    };
    onBackup(options);
  };

  const handleRestore = () => {
    if (!restorePath.trim()) {
      alert('Please specify a backup file path');
      return;
    }

    onRestore({
      backupPath: restorePath.trim(),
      options: restoreOptions
    });
  };

  const excludableTableOptions = [
    { value: 'search_history', label: 'Search History' },
    { value: 'activity_log', label: 'Activity Log' },
    { value: 'audio_extractions', label: 'Audio Extractions Log' },
    { value: 'thumbnails', label: 'Thumbnail Cache' }
  ];

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {(backupError || restoreError) && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">
                {backupError ? 'Backup Error' : 'Restore Error'}
              </p>
              <p className="text-red-300 text-sm mt-1">
                {(backupError || restoreError)?.message || 'An error occurred'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
            <DocumentArrowDownIcon className="w-5 h-5" />
            <span>Create Backup</span>
          </h3>

          <div className="space-y-4">
            {/* Backup Path */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Backup Path (optional)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={backupPath}
                  onChange={(e) => setBackupPath(e.target.value)}
                  placeholder="Leave empty for auto-generated path"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isBackingUp || isRestoring}
                />
                <button
                  type="button"
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  disabled={isBackingUp || isRestoring}
                >
                  <FolderIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                If not specified, backup will be saved with timestamp
              </p>
            </div>

            {/* Backup Options */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Backup Options
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={backupOptions.includeMetadata}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      includeMetadata: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    disabled={isBackingUp || isRestoring}
                  />
                  <span className="text-sm text-gray-300">Include metadata file</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={backupOptions.compress}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      compress: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    disabled={isBackingUp || isRestoring}
                  />
                  <span className="text-sm text-gray-300">Compress backup (coming soon)</span>
                </label>
              </div>
            </div>

            {/* Exclude Tables */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exclude Tables (optional)
              </label>
              <div className="space-y-2">
                {excludableTableOptions.map((table) => (
                  <label key={table.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={backupOptions.excludeTables?.includes(table.value) || false}
                      onChange={(e) => {
                        const excludeTables = backupOptions.excludeTables || [];
                        if (e.target.checked) {
                          setBackupOptions(prev => ({
                            ...prev,
                            excludeTables: [...excludeTables, table.value]
                          }));
                        } else {
                          setBackupOptions(prev => ({
                            ...prev,
                            excludeTables: excludeTables.filter(t => t !== table.value)
                          }));
                        }
                      }}
                      className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                      disabled={isBackingUp || isRestoring}
                    />
                    <span className="text-sm text-gray-300">{table.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Backup Button */}
            <button
              onClick={handleBackup}
              disabled={isBackingUp || isRestoring}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isBackingUp ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Backup...</span>
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span>Create Backup</span>
                </>
              )}
            </button>

            {/* Backup Info */}
            <div className="p-3 bg-blue-900/20 border border-blue-700 rounded">
              <div className="flex items-start space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Backup includes:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>All database tables and data</li>
                    <li>Schema structure and indexes</li>
                    <li>Settings and configuration</li>
                    {backupOptions.includeMetadata && <li>Backup metadata and timestamp</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Restore Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
            <DocumentArrowUpIcon className="w-5 h-5" />
            <span>Restore from Backup</span>
          </h3>

          <div className="space-y-4">
            {/* Restore Path */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Backup File Path *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={restorePath}
                  onChange={(e) => setRestorePath(e.target.value)}
                  placeholder="Path to backup file"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isBackingUp || isRestoring}
                />
                <button
                  type="button"
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  disabled={isBackingUp || isRestoring}
                >
                  <FolderIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Restore Options */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Restore Options
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={restoreOptions.validateSchema}
                    onChange={(e) => setRestoreOptions(prev => ({
                      ...prev,
                      validateSchema: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    disabled={isBackingUp || isRestoring}
                  />
                  <span className="text-sm text-gray-300">Validate backup schema</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={restoreOptions.overwrite}
                    onChange={(e) => setRestoreOptions(prev => ({
                      ...prev,
                      overwrite: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    disabled={isBackingUp || isRestoring}
                  />
                  <span className="text-sm text-gray-300">Overwrite without backup</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={restoreOptions.skipMigrations}
                    onChange={(e) => setRestoreOptions(prev => ({
                      ...prev,
                      skipMigrations: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    disabled={isBackingUp || isRestoring}
                  />
                  <span className="text-sm text-gray-300">Skip migrations after restore</span>
                </label>
              </div>
            </div>

            {/* Restore Button */}
            <button
              onClick={handleRestore}
              disabled={isBackingUp || isRestoring || !restorePath.trim()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isRestoring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Restoring...</span>
                </>
              ) : (
                <>
                  <DocumentArrowUpIcon className="w-4 h-4" />
                  <span>Restore Database</span>
                </>
              )}
            </button>

            {/* Restore Warning */}
            <div className="p-3 bg-red-900/20 border border-red-700 rounded">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-300">
                  <p className="font-medium mb-1">Warning:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>This will replace your current database</li>
                    <li>All current data will be lost unless overwrite is disabled</li>
                    <li>Create a backup before restoring if needed</li>
                    <li>The application will restart after restore</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Backups */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Recent Backups</h3>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center text-gray-400 py-8">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p>Backup history will be displayed here</p>
            <p className="text-sm mt-1">Create your first backup to see it listed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BackupRestore;