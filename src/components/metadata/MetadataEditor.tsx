'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { TrackMetadata } from '@/lib/services/metadata-extractor';
import { useThumbnailDownload } from '@/lib/hooks/useMetadataExtractor';
import {
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  MusicalNoteIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface MetadataEditorProps {
  metadata: TrackMetadata | null;
  onSave: (metadata: TrackMetadata) => void;
  onCancel: () => void;
}

export function MetadataEditor({ metadata, onSave, onCancel }: MetadataEditorProps) {
  const [formData, setFormData] = useState<Partial<TrackMetadata>>({});
  const [newTag, setNewTag] = useState('');
  const thumbnailDownload = useThumbnailDownload();

  useEffect(() => {
    if (metadata) {
      setFormData({
        ...metadata,
        tags: metadata.tags || []
      });
    } else {
      setFormData({
        title: '',
        artist: '',
        album: '',
        genre: '',
        year: undefined,
        trackNumber: undefined,
        totalTracks: undefined,
        tags: []
      });
    }
  }, [metadata]);

  const handleInputChange = (field: keyof TrackMetadata, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && formData.tags) {
      const updatedTags = [...formData.tags, newTag.trim()];
      setFormData(prev => ({
        ...prev,
        tags: updatedTags
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    if (formData.tags) {
      const updatedTags = formData.tags.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        tags: updatedTags
      }));
    }
  };

  const handleDownloadThumbnail = async (quality: 'low' | 'medium' | 'high' | 'maxres') => {
    if (formData.thumbnail && formData.videoId) {
      try {
        const result = await thumbnailDownload.mutateAsync({
          videoId: formData.videoId,
          thumbnailUrl: formData.thumbnail,
          quality
        });
        
        if (result) {
          setFormData(prev => ({
            ...prev,
            thumbnailPath: result.filePath
          }));
        }
      } catch (error) {
        console.error('Failed to download thumbnail:', error);
      }
    }
  };

  const handleSave = () => {
    if (formData.title && formData.artist) {
      onSave(formData as TrackMetadata);
    }
  };

  if (!metadata) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-medium text-white mb-2">No metadata selected</h3>
          <p className="text-sm">Select a track from the library to edit its metadata</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">Edit Metadata</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={!formData.title || !formData.artist}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              onClick={onCancel}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thumbnail Section */}
          <div className="lg:col-span-1">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">Thumbnail</h4>
              
              <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-600 mb-4">
                {formData.thumbnailPath ? (
                  <Image
                    src={formData.thumbnailPath}
                    alt={formData.title || 'Thumbnail'}
                    fill
                    className="object-cover"
                  />
                ) : formData.thumbnail ? (
                  <Image
                    src={formData.thumbnail}
                    alt={formData.title || 'Thumbnail'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {formData.thumbnail && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-2">Download quality:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['low', 'medium', 'high', 'maxres'] as const).map((quality) => (
                      <button
                        key={quality}
                        onClick={() => handleDownloadThumbnail(quality)}
                        disabled={thumbnailDownload.isPending}
                        className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded transition-colors"
                      >
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </button>
                    ))}
                  </div>
                  
                  {thumbnailDownload.isPending && (
                    <div className="flex items-center space-x-2 text-blue-400 text-xs">
                      <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Downloading...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter track title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Artist *
                </label>
                <input
                  type="text"
                  value={formData.artist || ''}
                  onChange={(e) => handleInputChange('artist', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter artist name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Album
                </label>
                <input
                  type="text"
                  value={formData.album || ''}
                  onChange={(e) => handleInputChange('album', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter album name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Album Artist
                </label>
                <input
                  type="text"
                  value={formData.albumArtist || ''}
                  onChange={(e) => handleInputChange('albumArtist', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter album artist"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genre
                </label>
                <input
                  type="text"
                  value={formData.genre || ''}
                  onChange={(e) => handleInputChange('genre', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter genre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.year || ''}
                  onChange={(e) => handleInputChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Year"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <input
                  type="text"
                  value={formData.language || ''}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Language"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Track Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.trackNumber || ''}
                  onChange={(e) => handleInputChange('trackNumber', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Track #"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Tracks
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalTracks || ''}
                  onChange={(e) => handleInputChange('totalTracks', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Total tracks"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags
              </label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags?.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 bg-gray-600 text-white px-2 py-1 rounded text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(index)}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a tag"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                placeholder="Enter description"
              />
            </div>

            {/* Read-only fields */}
            <div className="border-t border-gray-600 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Video Information (Read-only)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Video ID:</span>
                  <span className="text-gray-300 ml-2 font-mono">{formData.videoId}</span>
                </div>
                
                <div>
                  <span className="text-gray-400">Uploader:</span>
                  <span className="text-gray-300 ml-2">{formData.uploader}</span>
                </div>
                
                {formData.viewCount && (
                  <div>
                    <span className="text-gray-400">Views:</span>
                    <span className="text-gray-300 ml-2">{formData.viewCount.toLocaleString()}</span>
                  </div>
                )}
                
                {formData.likeCount && (
                  <div>
                    <span className="text-gray-400">Likes:</span>
                    <span className="text-gray-300 ml-2">{formData.likeCount.toLocaleString()}</span>
                  </div>
                )}
                
                {formData.uploadDate && (
                  <div>
                    <span className="text-gray-400">Upload Date:</span>
                    <span className="text-gray-300 ml-2">{formData.uploadDate.toLocaleDateString()}</span>
                  </div>
                )}
                
                <div>
                  <span className="text-gray-400">Extracted:</span>
                  <span className="text-gray-300 ml-2">{formData.extractedAt?.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetadataEditor;