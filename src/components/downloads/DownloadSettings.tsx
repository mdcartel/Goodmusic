'use client';

import React, { useState } from 'react';
import { DownloadConfig, DownloadFormat, DownloadQuality } from '@/lib/services/download-manager';
import { useDownloadConfig } from '@/lib/hooks/useDownloadManager';

interface DownloadSettingsProps {
  config: DownloadConfig;
}

export function DownloadSettings({ config: initialConfig }: DownloadSettingsProps) {
  const { updateConfig, isUpdating } = useDownloadConfig();
  const [config, setConfig] = useState(initialConfig);

  const handleConfigChange = (key: keyof DownloadConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    updateConfig({ [key]: value });
  };

  const formatOptions: { value: DownloadFormat; label: string }[] = [
    { value: 'm4a', label: 'M4A (Recommended)' },
    { value: 'mp3', label: 'MP3' },
    { value: 'opus', label: 'Opus' },
    { value: 'webm', label: 'WebM' },
  ];

  const qualityOptions: { value: DownloadQuality; label: string }[] = [
    { value: '128', label: '128 kbps' },
    { value: '192', label: '192 kbps (Recommended)' },
    { value: '256', label: '256 kbps' },
    { value: '320', label: '320 kbps' },
    { value: 'best', label: 'Best Available' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Download Settings</h3>
        
        {/* General Settings */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Default Format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Format
              </label>
              <select
                value={config.defaultFormat}
                onChange={(e) => handleConfigChange('defaultFormat', e.target.value as DownloadFormat)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              >
                {formatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Quality
              </label>
              <select
                value={config.defaultQuality}
                onChange={(e) => handleConfigChange('defaultQuality', e.target.value as DownloadQuality)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              >
                {qualityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Output Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Output Directory
            </label>
            <input
              type="text"
              value={config.outputDirectory}
              onChange={(e) => handleConfigChange('outputDirectory', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="./downloads"
              disabled={isUpdating}
            />
            <p className="text-xs text-gray-400 mt-1">
              Path where downloaded files will be saved
            </p>
          </div>

          {/* File Name Template */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              File Name Template
            </label>
            <input
              type="text"
              value={config.fileNameTemplate}
              onChange={(e) => handleConfigChange('fileNameTemplate', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="{artist} - {title}"
              disabled={isUpdating}
            />
            <p className="text-xs text-gray-400 mt-1">
              Available variables: {'{artist}'}, {'{title}'}, {'{quality}'}, {'{format}'}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div>
        <h4 className="text-md font-medium text-white mb-4">Performance</h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Concurrent Downloads */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Concurrent Downloads
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.maxConcurrentDownloads}
                onChange={(e) => handleConfigChange('maxConcurrentDownloads', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              />
            </div>

            {/* Max Download Speed */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Download Speed (KB/s)
              </label>
              <input
                type="number"
                min="0"
                value={config.maxDownloadSpeed}
                onChange={(e) => handleConfigChange('maxDownloadSpeed', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 = Unlimited"
                disabled={isUpdating}
              />
              <p className="text-xs text-gray-400 mt-1">
                0 = Unlimited speed
              </p>
            </div>
          </div>

          {/* Max Retries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Retries
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={config.maxRetries}
                onChange={(e) => handleConfigChange('maxRetries', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Retry Delay (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="60000"
                step="1000"
                value={config.retryDelay}
                onChange={(e) => handleConfigChange('retryDelay', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Organization Settings */}
      <div>
        <h4 className="text-md font-medium text-white mb-4">File Organization</h4>
        
        <div className="space-y-4">
          {/* Create Artist Folders */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Create Artist Folders
              </label>
              <p className="text-xs text-gray-400">
                Organize downloads by artist name
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.createArtistFolders}
                onChange={(e) => handleConfigChange('createArtistFolders', e.target.checked)}
                className="sr-only peer"
                disabled={isUpdating}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Create Album Folders */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Create Album Folders
              </label>
              <p className="text-xs text-gray-400">
                Create subfolders for albums (when available)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.createAlbumFolders}
                onChange={(e) => handleConfigChange('createAlbumFolders', e.target.checked)}
                className="sr-only peer"
                disabled={isUpdating}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Behavior Settings */}
      <div>
        <h4 className="text-md font-medium text-white mb-4">Behavior</h4>
        
        <div className="space-y-4">
          {/* Resume Incomplete Downloads */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Resume Incomplete Downloads
              </label>
              <p className="text-xs text-gray-400">
                Automatically resume downloads on app restart
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.resumeIncompleteDownloads}
                onChange={(e) => handleConfigChange('resumeIncompleteDownloads', e.target.checked)}
                className="sr-only peer"
                disabled={isUpdating}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Retry Failed Downloads */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Auto-Retry Failed Downloads
              </label>
              <p className="text-xs text-gray-400">
                Automatically retry failed downloads
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.retryFailedDownloads}
                onChange={(e) => handleConfigChange('retryFailedDownloads', e.target.checked)}
                className="sr-only peer"
                disabled={isUpdating}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Cleanup Failed Downloads */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Cleanup Failed Downloads
              </label>
              <p className="text-xs text-gray-400">
                Remove partial files from failed downloads
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.cleanupFailedDownloads}
                onChange={(e) => handleConfigChange('cleanupFailedDownloads', e.target.checked)}
                className="sr-only peer"
                disabled={isUpdating}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      {isUpdating && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Saving settings...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DownloadSettings;