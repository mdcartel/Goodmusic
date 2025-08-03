'use client';

import React from 'react';
import { DatabaseStats as StatsType } from '@/lib/database/enhanced-database';
import { formatBytes } from '@/lib/hooks/useDatabase';
import {
  CircleStackIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface DatabaseStatsProps {
  stats: StatsType | undefined;
  integrity: { isValid: boolean; errors: string[] } | undefined;
  migrationStatus: any;
  onOptimize: () => void;
  isOptimizing: boolean;
}

export function DatabaseStats({ 
  stats, 
  integrity, 
  migrationStatus, 
  onOptimize, 
  isOptimizing 
}: DatabaseStatsProps) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-blue-400">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading database statistics...</span>
        </div>
      </div>
    );
  }

  const utilizationPercentage = stats.pageCount > 0 
    ? ((stats.pageCount - stats.freePages) / stats.pageCount) * 100 
    : 0;

  const needsOptimization = stats.freePages > stats.pageCount * 0.1;

  return (
    <div className="space-y-6">
      {/* Database Health */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Database Health</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              {integrity?.isValid ? (
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm font-medium text-gray-300">Integrity Check</span>
            </div>
            
            <div className={`text-lg font-bold ${integrity?.isValid ? 'text-green-400' : 'text-red-400'}`}>
              {integrity?.isValid ? 'Passed' : 'Failed'}
            </div>
            
            {integrity?.errors && integrity.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-300">
                {integrity.errors.slice(0, 3).map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
                {integrity.errors.length > 3 && (
                  <div>... and {integrity.errors.length - 3} more errors</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <WrenchScrewdriverIcon className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Optimization</span>
            </div>
            
            <div className={`text-lg font-bold ${needsOptimization ? 'text-yellow-400' : 'text-green-400'}`}>
              {needsOptimization ? 'Recommended' : 'Not Needed'}
            </div>
            
            <div className="mt-2">
              <button
                onClick={onOptimize}
                disabled={isOptimizing}
                className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                {isOptimizing ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-3 h-3" />
                    <span>Optimize Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Information */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Storage Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CircleStackIcon className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Database Size</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {formatBytes(stats.size)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.pageCount.toLocaleString()} pages × {formatBytes(stats.pageSize)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-300">Space Utilization</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {utilizationPercentage.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${utilizationPercentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.freePages.toLocaleString()} free pages
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TableCellsIcon className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Schema Objects</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {stats.tableCount + stats.indexCount}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.tableCount} tables, {stats.indexCount} indexes
            </div>
          </div>
        </div>
      </div>

      {/* Table Statistics */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Table Statistics</h3>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Row Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estimated Size
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.tables
                  .sort((a, b) => b.rowCount - a.rowCount)
                  .map((table) => (
                    <tr key={table.name} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {table.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {table.rowCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {table.size > 0 ? formatBytes(table.size) : 'N/A'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          
          {stats.tables.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <TableCellsIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p>No tables found in database</p>
            </div>
          )}
        </div>
      </div>

      {/* Migration Status */}
      {migrationStatus && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Schema Status</h3>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Current Version:</span>
                <span className="text-white ml-2 font-semibold">
                  {migrationStatus.currentVersion}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Latest Version:</span>
                <span className="text-white ml-2 font-semibold">
                  {migrationStatus.latestVersion}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Pending Migrations:</span>
                <span className={`ml-2 font-semibold ${
                  migrationStatus.pendingMigrations.length > 0 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {migrationStatus.pendingMigrations.length}
                </span>
              </div>
            </div>

            {migrationStatus.pendingMigrations.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
                <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>
                    Database schema is outdated. Consider running migrations.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Recommendations */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Recommendations</h3>
        
        <div className="space-y-3">
          {needsOptimization && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium">Optimization Recommended</p>
                  <p className="text-yellow-300 text-sm mt-1">
                    Your database has {stats.freePages.toLocaleString()} free pages ({((stats.freePages / stats.pageCount) * 100).toFixed(1)}% of total). 
                    Running VACUUM can reclaim this space and improve performance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {migrationStatus?.pendingMigrations.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <ArrowPathIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-medium">Schema Update Available</p>
                  <p className="text-blue-300 text-sm mt-1">
                    {migrationStatus.pendingMigrations.length} pending migration(s) available. 
                    Update your schema to access new features and improvements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!integrity?.isValid && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Integrity Issues Detected</p>
                  <p className="text-red-300 text-sm mt-1">
                    Database integrity check failed. Consider creating a backup and investigating the issues.
                  </p>
                </div>
              </div>
            </div>
          )}

          {integrity?.isValid && !needsOptimization && migrationStatus?.pendingMigrations.length === 0 && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium">Database is Healthy</p>
                  <p className="text-green-300 text-sm mt-1">
                    Your database is in good condition with no immediate maintenance required.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DatabaseStats;