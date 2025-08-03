'use client';

import React, { useState } from 'react';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DatabaseSettingsProps {
  settings: Array<{ key: string; value: string; category: string }> | undefined;
  onUpdateSetting: (params: { key: string; value: string; category?: string }) => void;
  isUpdating: boolean;
  error: any;
}

export function DatabaseSettings({ settings, onUpdateSetting, isUpdating, error }: DatabaseSettingsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-blue-400">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  const categories = ['all', ...Array.from(new Set(settings.map(s => s.category)))];
  
  const filteredSettings = settings.filter(setting => {
    const matchesSearch = !searchQuery || 
      setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.value.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || setting.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedSettings = filteredSettings.reduce((groups, setting) => {
    const category = setting.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(setting);
    return groups;
  }, {} as Record<string, typeof settings>);

  const handleEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditingValue(value);
  };

  const handleSave = (key: string, category: string) => {
    onUpdateSetting({ key, value: editingValue, category });
    setEditingKey(null);
    setEditingValue('');
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">
            Failed to update setting: {error.message}
          </p>
        </div>
      )}

      {/* Settings Groups */}
      <div className="space-y-6">
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <div key={category}>
            <h3 className="text-lg font-medium text-white mb-4 capitalize">
              {category} Settings
            </h3>
            
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-700">
                {categorySettings.map((setting) => (
                  <div key={setting.key} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{setting.key}</span>
                          <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                            {setting.category}
                          </span>
                        </div>
                        
                        <div className="mt-1">
                          {editingKey === setting.key ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSave(setting.key, setting.category);
                                  } else if (e.key === 'Escape') {
                                    handleCancel();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleSave(setting.key, setting.category)}
                                disabled={isUpdating}
                                className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                                title="Save"
                              >
                                <CheckIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                disabled={isUpdating}
                                className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                                title="Cancel"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-300 text-sm font-mono">
                                {setting.value}
                              </span>
                              <button
                                onClick={() => handleEdit(setting.key, setting.value)}
                                className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Edit"
                              >
                                <PencilIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {editingKey !== setting.key && (
                        <button
                          onClick={() => handleEdit(setting.key, setting.value)}
                          className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Edit setting"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredSettings.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-lg font-medium mb-2">No settings found</p>
          <p className="text-sm">
            {searchQuery 
              ? `No settings match "${searchQuery}"`
              : 'No settings available in this category'
            }
          </p>
        </div>
      )}

      {/* Settings Info */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-2">Settings Information:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Settings are automatically saved when changed</li>
            <li>Changes take effect immediately</li>
            <li>Some settings may require an application restart</li>
            <li>Use caution when modifying system settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DatabaseSettings;