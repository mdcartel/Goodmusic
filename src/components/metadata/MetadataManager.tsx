'use client';

import React, { useState } from 'react';
import { useMetadataManager, useAllMetadata } from '@/lib/hooks/useMetadataExtractor';
import { MetadataList } from './MetadataList';
import { MetadataEditor } from './MetadataEditor';
import { MetadataStats } from './MetadataStats';
import { BatchProcessor } from './BatchProcessor';
import { TrackMetadata } from '@/lib/services/metadata-extractor';
import { 
  MusicalNoteIcon,
  PencilIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface MetadataManagerProps {
  className?: string;
}

type TabType = 'library' | 'editor' | 'batch' | 'stats';

export function MetadataManager({ className = '' }: MetadataManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [selectedMetadata, setSelectedMetadata] = useState<TrackMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: allMetadata = [], isLoading } = useAllMetadata();
  const metadataManager = useMetadataManager();

  const tabs = [
    {
      id: 'library' as TabType,
      name: 'Library',
      icon: MusicalNoteIcon,
      count: allMetadata.length,
    },
    {
      id: 'editor' as TabType,
      name: 'Editor',
      icon: PencilIcon,
      count: 0,
    },
    {
      id: 'batch' as TabType,
      name: 'Batch Tools',
      icon: Cog6ToothIcon,
      count: 0,
    },
    {
      id: 'stats' as TabType,
      name: 'Statistics',
      icon: ChartBarIcon,
      count: 0,
    },
  ];

  const filteredMetadata = allMetadata.filter(metadata => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      metadata.title.toLowerCase().includes(query) ||
      metadata.artist.toLowerCase().includes(query) ||
      metadata.album?.toLowerCase().includes(query) ||
      metadata.genre?.toLowerCase().includes(query)
    );
  });

  const handleEditMetadata = (metadata: TrackMetadata) => {
    setSelectedMetadata(metadata);
    setActiveTab('editor');
  };

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Metadata Manager</h2>
          
          {/* Search Bar */}
          {activeTab === 'library' && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {(isLoading || metadataManager.isLoading) && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">
                {isLoading ? 'Loading metadata...' : 'Processing...'}
              </span>
            </div>
          </div>
        )}

        {/* Error display */}
        {metadataManager.hasError && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <div className="flex items-center space-x-2 text-red-400">
              <span className="text-sm">
                An error occurred while processing metadata
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
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-gray-800'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'library' && (
          <MetadataList
            metadata={filteredMetadata}
            onEdit={handleEditMetadata}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'editor' && (
          <MetadataEditor
            metadata={selectedMetadata}
            onSave={(updatedMetadata) => {
              if (updatedMetadata.id) {
                metadataManager.editMetadata({
                  metadataId: updatedMetadata.id,
                  updates: updatedMetadata
                });
              }
            }}
            onCancel={() => setSelectedMetadata(null)}
          />
        )}

        {activeTab === 'batch' && (
          <BatchProcessor />
        )}

        {activeTab === 'stats' && (
          <MetadataStats />
        )}
      </div>
    </div>
  );
}

export default MetadataManager;