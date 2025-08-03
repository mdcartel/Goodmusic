'use client';

import React, { useState } from 'react';
import { Play, Download, Plus, MoreVertical, Clock, Eye, Calendar } from 'lucide-react';
import { SearchResult } from '@/lib/store/types';
import { useAppStore } from '@/lib/store';
import { formatDuration, formatNumber, formatDate } from '@/lib/utils';

interface SearchResultsGridProps {
  results: SearchResult[];
  isLoading?: boolean;
  onPlay?: (result: SearchResult) => void;
  onDownload?: (result: SearchResult) => void;
  onAddToPlaylist?: (result: SearchResult) => void;
  className?: string;
}

interface SearchResultCardProps {
  result: SearchResult;
  onPlay?: (result: SearchResult) => void;
  onDownload?: (result: SearchResult) => void;
  onAddToPlaylist?: (result: SearchResult) => void;
}

function SearchResultCard({ result, onPlay, onDownload, onAddToPlaylist }: SearchResultCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { playSong, addToQueue } = useAppStore();

  const handlePlay = () => {
    const song = {
      id: result.id,
      youtubeId: result.id,
      title: result.title,
      artist: result.artist,
      duration: result.duration,
      thumbnail: result.thumbnail,
      youtubeUrl: result.youtubeUrl,
      audioUrl: undefined,
      isDownloaded: false,
      addedAt: new Date(),
      playCount: 0,
    };

    playSong(song);
    onPlay?.(result);
  };

  const handleAddToQueue = () => {
    const song = {
      id: result.id,
      youtubeId: result.id,
      title: result.title,
      artist: result.artist,
      duration: result.duration,
      thumbnail: result.thumbnail,
      youtubeUrl: result.youtubeUrl,
      audioUrl: undefined,
      isDownloaded: false,
      addedAt: new Date(),
      playCount: 0,
    };

    addToQueue(song);
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg 
                    transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
        {!imageError && result.thumbnail ? (
          <img
            src={result.thumbnail}
            alt={result.title}
            className={`w-full h-full object-cover transition-opacity duration-200 
                       ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br 
                         from-blue-400 to-purple-500 text-white">
            <Play className="w-12 h-12" />
          </div>
        )}

        {/* Duration Badge */}
        {result.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white 
                         text-xs px-2 py-1 rounded">
            {formatDuration(result.duration)}
          </div>
        )}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 
                       transition-all duration-200 flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3
                     transform scale-90 group-hover:scale-100 transition-transform"
          >
            <Play className="w-6 h-6 text-gray-800 ml-1" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 
                      group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {result.title}
        </h3>

        {/* Artist */}
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-1">
          {result.artist}
        </p>

        {/* Metadata */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-500 space-x-3 mb-3">
          {result.viewCount > 0 && (
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{formatNumber(result.viewCount)} views</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(result.uploadDate)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlay}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 
                       text-white text-sm rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Play</span>
            </button>

            <button
              onClick={handleAddToQueue}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 
                       hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 
                       text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Queue</span>
            </button>
          </div>

          {/* More Options */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                       text-gray-500 dark:text-gray-400 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 
                            border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg 
                            py-1 z-10 min-w-[150px]">
                <button
                  onClick={() => {
                    onDownload?.(result);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 
                           dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    onAddToPlaylist?.(result);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 
                           dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Playlist</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden 
                    border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="aspect-video bg-gray-300 dark:bg-gray-600"></div>
      <div className="p-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-2"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-3"></div>
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

export function SearchResultsGrid({ 
  results, 
  isLoading, 
  onPlay, 
  onDownload, 
  onAddToPlaylist,
  className = '' 
}: SearchResultsGridProps) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 8 }).map((_, index) => (
          <LoadingSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-sm">Try adjusting your search terms or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {results.map((result) => (
        <SearchResultCard
          key={result.id}
          result={result}
          onPlay={onPlay}
          onDownload={onDownload}
          onAddToPlaylist={onAddToPlaylist}
        />
      ))}
    </div>
  );
}