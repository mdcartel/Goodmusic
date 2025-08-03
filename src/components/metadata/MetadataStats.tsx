'use client';

import React from 'react';
import { useMetadataStats } from '@/lib/hooks/useMetadataExtractor';
import { formatDuration } from '@/lib/hooks/useMetadataExtractor';
import {
  MusicalNoteIcon,
  UserIcon,
  RectangleStackIcon,
  TagIcon,
  CalendarIcon,
  ClockIcon,
  PhotoIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export function MetadataStats() {
  const { data: stats, isLoading, error } = useMetadataStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-blue-400">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Failed to load statistics</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalTracks === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-medium text-white mb-2">No metadata statistics</h3>
          <p className="text-sm">Extract metadata from videos to see statistics here</p>
        </div>
      </div>
    );
  }

  const topGenres = Object.entries(stats.genreDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topYears = Object.entries(stats.yearDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={MusicalNoteIcon}
            label="Total Tracks"
            value={stats.totalTracks.toString()}
            color="text-blue-400"
          />
          
          <StatCard
            icon={UserIcon}
            label="Unique Artists"
            value={stats.uniqueArtists.toString()}
            color="text-green-400"
          />
          
          <StatCard
            icon={RectangleStackIcon}
            label="Unique Albums"
            value={stats.uniqueAlbums.toString()}
            color="text-purple-400"
          />
          
          <StatCard
            icon={PhotoIcon}
            label="With Thumbnails"
            value={stats.withThumbnails.toString()}
            color="text-yellow-400"
          />
        </div>
      </div>

      {/* Duration and Recent */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Content</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-gray-300">Total Duration</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {formatDuration(stats.totalDuration)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Average: {formatDuration(stats.totalDuration / stats.totalTracks)} per track
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <PlusIcon className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-medium text-gray-300">Recently Added</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {stats.recentlyAdded}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              In the last 24 hours
            </div>
          </div>
        </div>
      </div>

      {/* Genre Distribution */}
      {topGenres.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Top Genres</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="space-y-3">
              {topGenres.map(([genre, count], index) => {
                const percentage = (count / stats.totalTracks) * 100;
                return (
                  <div key={genre} className="flex items-center space-x-3">
                    <div className="w-6 text-center text-sm text-gray-400">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{genre}</span>
                        <span className="text-sm text-gray-400">{count} tracks</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {percentage.toFixed(1)}% of library
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Year Distribution */}
      {topYears.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Top Years</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {topYears.map(([year, count]) => {
                const percentage = (count / stats.totalTracks) * 100;
                return (
                  <div key={year} className="text-center">
                    <div className="text-lg font-bold text-white">{year}</div>
                    <div className="text-sm text-gray-400">{count} tracks</div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Coverage</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Tracks with albums:</span>
                <span className="text-white">
                  {Math.round((stats.uniqueAlbums / stats.totalTracks) * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tracks with genres:</span>
                <span className="text-white">
                  {Math.round((Object.values(stats.genreDistribution).reduce((a, b) => a + b, 0) / stats.totalTracks) * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tracks with years:</span>
                <span className="text-white">
                  {Math.round((Object.values(stats.yearDistribution).reduce((a, b) => a + b, 0) / stats.totalTracks) * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tracks with thumbnails:</span>
                <span className="text-white">
                  {Math.round((stats.withThumbnails / stats.totalTracks) * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Library Health</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Diversity score:</span>
                <span className="text-white">
                  {Math.min(100, Math.round((stats.uniqueArtists / stats.totalTracks) * 100))}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Genre variety:</span>
                <span className="text-white">
                  {Object.keys(stats.genreDistribution).length} genres
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Year range:</span>
                <span className="text-white">
                  {Object.keys(stats.yearDistribution).length > 0 
                    ? `${Math.min(...Object.keys(stats.yearDistribution).map(Number))} - ${Math.max(...Object.keys(stats.yearDistribution).map(Number))}`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg tracks per artist:</span>
                <span className="text-white">
                  {(stats.totalTracks / stats.uniqueArtists).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>
      <div className="text-sm text-gray-400 mt-1">
        {label}
      </div>
    </div>
  );
}

export default MetadataStats;