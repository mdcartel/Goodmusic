'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  HardDrive, 
  Shield, 
  FolderLock, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components';

interface StorageInfo {
  config: {
    platform: string;
    enablePrivacy: boolean;
    maxFileSize: number;
    allowedExtensions: string[];
  };
  directories: {
    music: string;
    temp: string;
    cache: string;
    metadata: string;
  };
  stats: {
    totalSize: number;
    availableSpace: number;
    fileCount: number;
  };
  integrity: {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  };
}

interface StoragePanelProps {
  className?: string;
}

export default function StoragePanel({ className }: StoragePanelProps) {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/storage');
      const data = await response.json();
      
      if (data.success) {
        setStorageInfo(data.data);
      } else {
        setError(data.error || 'Failed to load storage information');
      }
    } catch (err) {
      setError('Network error loading storage information');
      console.error('Storage info error:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeStorage = async () => {
    try {
      setIsInitializing(true);
      
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadStorageInfo(); // Reload info after initialization
      } else {
        setError(data.error || 'Failed to initialize storage');
      }
    } catch (err) {
      setError('Network error initializing storage');
      console.error('Storage init error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const cleanupTempFiles = async () => {
    try {
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup', hours: 24 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadStorageInfo(); // Reload info after cleanup
      } else {
        setError(data.error || 'Failed to cleanup temp files');
      }
    } catch (err) {
      setError('Network error during cleanup');
      console.error('Cleanup error:', err);
    }
  };

  const togglePrivacy = async () => {
    if (!storageInfo) return;
    
    try {
      const response = await fetch('/api/storage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enablePrivacy: !storageInfo.config.enablePrivacy 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadStorageInfo(); // Reload info after update
      } else {
        setError(data.error || 'Failed to update privacy settings');
      }
    } catch (err) {
      setError('Network error updating privacy settings');
      console.error('Privacy toggle error:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={cn("bg-gray-800 rounded-lg border border-gray-700 p-6", className)}>
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
            <span className="text-gray-300">Loading storage information...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-gray-800 rounded-lg border border-gray-700 p-6", className)}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Storage Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={loadStorageInfo} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!storageInfo) {
    return (
      <div className={cn("bg-gray-800 rounded-lg border border-gray-700 p-6", className)}>
        <div className="text-center">
          <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Storage Not Available</h3>
          <p className="text-gray-400 mb-4">Storage information could not be loaded</p>
          <Button onClick={initializeStorage} variant="primary" loading={isInitializing}>
            Initialize Storage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-gray-800 rounded-lg border border-gray-700", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Storage Management</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={loadStorageInfo}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={cleanupTempFiles}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Privacy Status */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Shield className={cn(
                "w-5 h-5",
                storageInfo.config.enablePrivacy ? "text-green-400" : "text-yellow-400"
              )} />
              <h3 className="font-semibold text-white">Privacy Protection</h3>
            </div>
            
            <Button
              onClick={togglePrivacy}
              variant={storageInfo.config.enablePrivacy ? "primary" : "ghost"}
              size="sm"
            >
              {storageInfo.config.enablePrivacy ? "Enabled" : "Disabled"}
            </Button>
          </div>
          
          <p className="text-sm text-gray-400 mb-3">
            {storageInfo.config.enablePrivacy 
              ? "Downloads are stored privately and won't appear in your device's gallery"
              : "Privacy protection is disabled - downloads may be visible to other apps"
            }
          </p>

          {storageInfo.config.enablePrivacy && (
            <div className="flex items-center space-x-2 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>.nomedia files created to prevent gallery indexing</span>
            </div>
          )}
        </div>

        {/* Storage Statistics */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Storage Statistics
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Total Size</div>
              <div className="text-lg font-semibold text-white">
                {formatFileSize(storageInfo.stats.totalSize)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400">Available Space</div>
              <div className="text-lg font-semibold text-white">
                {formatFileSize(storageInfo.stats.availableSpace)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400">File Count</div>
              <div className="text-lg font-semibold text-white">
                {storageInfo.stats.fileCount}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400">Platform</div>
              <div className="text-lg font-semibold text-white capitalize">
                {storageInfo.config.platform}
              </div>
            </div>
          </div>
        </div>

        {/* Directory Structure */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center">
            <FolderLock className="w-4 h-4 mr-2" />
            Directory Structure
          </h3>
          
          <div className="space-y-2">
            {Object.entries(storageInfo.directories).map(([name, path]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-b-0">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-sm font-medium text-gray-300 capitalize">{name}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{path}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Storage Integrity */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center">
              {storageInfo.integrity.isValid ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
              )}
              Storage Integrity
            </h3>
            
            <span className={cn(
              "text-xs px-2 py-1 rounded-full",
              storageInfo.integrity.isValid 
                ? "bg-green-900 text-green-300" 
                : "bg-yellow-900 text-yellow-300"
            )}>
              {storageInfo.integrity.isValid ? "Healthy" : "Issues Found"}
            </span>
          </div>

          {storageInfo.integrity.issues.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-yellow-400 mb-2">Issues:</h4>
              <ul className="space-y-1">
                {storageInfo.integrity.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-gray-400 flex items-start">
                    <span className="text-yellow-400 mr-2">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {storageInfo.integrity.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-2">Recommendations:</h4>
              <ul className="space-y-1">
                {storageInfo.integrity.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-400 flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3">Configuration</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Max File Size</span>
              <span className="text-sm text-white">
                {formatFileSize(storageInfo.config.maxFileSize)}
              </span>
            </div>
            
            <div className="flex items-start justify-between">
              <span className="text-sm text-gray-400">Allowed Extensions</span>
              <div className="flex flex-wrap gap-1">
                {storageInfo.config.allowedExtensions.map((ext) => (
                  <span key={ext} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}