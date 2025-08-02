'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface StorageStats {
  totalSize: number;
  downloadedFiles: number;
  availableSpace: number;
}

export default function StorageManager() {
  const [stats, setStats] = useState<StorageStats>({
    totalSize: 0,
    downloadedFiles: 0,
    availableSpace: 0
  });
  const { success, error } = useToast();

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      const response = await fetch('/api/storage');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      error('Failed to load storage stats');
    }
  };

  const clearStorage = async () => {
    try {
      const response = await fetch('/api/storage', { method: 'DELETE' });
      if (response.ok) {
        success('Storage cleared successfully');
        loadStorageStats();
      }
    } catch (err) {
      error('Failed to clear storage');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Storage Management</h3>
      <div className="space-y-2">
        <p>Total Size: {(stats.totalSize / 1024 / 1024).toFixed(2)} MB</p>
        <p>Downloaded Files: {stats.downloadedFiles}</p>
        <button
          onClick={clearStorage}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Storage
        </button>
      </div>
    </div>
  );
}