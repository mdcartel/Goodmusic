'use client';

import React from 'react';
import Image from 'next/image';
import { TrackMetadata } from '@/lib/services/metadata-extractor';
import { formatDuration, formatViewCount } from '@/lib/hooks/useMetadataExtractor';
import {
  PencilIcon,
  MusicalNoteIcon,
  EyeIcon,
  HeartIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface MetadataListProps {
  metadata: TrackMetadata[];
  onEdit: (metadata: TrackMetadata) => void;
  searchQuery?: string;
}

export function MetadataList({ metadata, onEdit, searchQuery = '' }: MetadataListProps) {
  if (metadata.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? 'No matching metadata found' : 'No metadata available'}
          </h3>
          <p className="text-sm">
            {searchQuery 
              ? `No tracks match "${searchQuery}"`
              : 'Extract metadata from videos to see them here'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {metadata.map((item) => (
        <MetadataListItem
          key={item.id}
          metadata={item}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

interface MetadataListItemProps {
  metadata: TrackMetadata;
  onEdit: (metadata: TrackMetadata) => void;
}

function MetadataListItem({ metadata, onEdit }: MetadataListItemProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start space-x-4">
        {/* Thumbnail */}
        <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
          {metadata.thumbnailPath ? (
            <Image
              src={metadata.thumbnailPath}
              alt={metadata.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : metadata.thumbnail ? (
            <Image
              src={metadata.thumbnail}
              alt={metadata.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MusicalNoteIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Metadata Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white truncate text-lg">
                {metadata.title}
              </h3>
              <p className="text-gray-300 truncate">
                {metadata.artist}
              </p>
              
              {metadata.album && (
                <p className="text-sm text-gray-400 truncate">
                  {metadata.album}
                </p>
              )}
            </div>

            {/* Edit Button */}
            <button
              onClick={() => onEdit(metadata)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
              title="Edit metadata"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Metadata Details */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {/* Duration */}
            <div className="flex items-center space-x-1 text-gray-400">
              <span>Duration:</span>
              <span className="text-gray-300">{formatDuration(metadata.duration)}</span>
            </div>

            {/* Genre */}
            {metadata.genre && (
              <div className="flex items-center space-x-1 text-gray-400">
                <TagIcon className="w-3 h-3" />
                <span className="text-gray-300">{metadata.genre}</span>
              </div>
            )}

            {/* Year */}
            {metadata.year && (
              <div className="flex items-center space-x-1 text-gray-400">
                <CalendarIcon className="w-3 h-3" />
                <span className="text-gray-300">{metadata.year}</span>
              </div>
            )}

            {/* View Count */}
            {metadata.viewCount && (
              <div className="flex items-center space-x-1 text-gray-400">
                <EyeIcon className="w-3 h-3" />
                <span className="text-gray-300">{formatViewCount(metadata.viewCount)}</span>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <span>Uploader: {metadata.uploader}</span>
            
            {metadata.likeCount && (
              <div className="flex items-center space-x-1">
                <HeartIcon className="w-3 h-3" />
                <span>{formatViewCount(metadata.likeCount)}</span>
              </div>
            )}
            
            <span>
              Extracted: {metadata.extractedAt.toLocaleDateString()}
            </span>
          </div>

          {/* Tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {metadata.tags.slice(0, 5).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {metadata.tags.length > 5 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                    +{metadata.tags.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Description Preview */}
          {metadata.description && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 line-clamp-2">
                {metadata.description.length > 150 
                  ? `${metadata.description.substring(0, 150)}...`
                  : metadata.description
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetadataList;