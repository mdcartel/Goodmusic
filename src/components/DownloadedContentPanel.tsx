'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Music, 
  Search, 
  Filter, 
  Play, 
  Trash2, 
  RefreshCw,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Download,
  FolderOpen,
  Settings
} from 'lucide-react';
import { Button } from '@/components';

interface DownloadedSong {
  id: string;
  title: string;
  artist?: string;
  thumbnail: string;
  duration: string;
  mood: string[];
  downloadId: string;
  filePath: string;
  fileSize: number;
  downloadedAt: string;
  format: 'mp3' | 'mp4';
  isAvailable: boolean;
}

interface ContentStats {
  totalSongs: number;
  totalSize: number;
  byFormat: Record<string, number>;
  byMood: Record<string, number>;
  availableSongs: number;
  unavailableSongs: number;
  oldestDownload: string | null;
  newestDownload: string | null;
}

interface DownloadedContentPanelProps {
  className?: string;
  onPlay?: (song: DownloadedSong) => void;
}

export default function DownloadedContentPanel({ 
  className, 
  onPlay 
}: DownloadedContentPanelProps) {
  const [songs, setSongs] = useState<DownloadedSong[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  useEffect(() => {
    loadDownloadedContent();
    loadContentStats();
  }, [searchQuery, selectedMood, selectedFormat]);

  const loadDownloadedContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedMood) params.set('mood', selectedMood);
      if (selectedFormat) params.set('format', selectedFormat);

      const response = await fetch(`/api/downloaded?action=list&${params}`);
      const data = await response.json();

      if (data.success) {
        setSongs(data.data.songs);
      } else {
        setError(data.error || 'Failed to load downloaded content');
      }
    } catch (err) {
      setError('Network error loading downloaded content');
      console.error('Downloaded content error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadContentStats = async () => {
    try {
      const response = await fetch('/api/downloaded?action=stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Stats loading error:', err);
    }
  };

  const rebuildIndex = async () => {
    try {
      setIsRebuilding(true);
      
      const response = await fetch('/api/downloaded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rebuild-index' })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDownloadedContent();
        await loadContentStats();
      } else {
        setError(data.error || 'Failed to rebuild index');
      }
    } catch (err) {
      setError('Network error rebuilding index');
      console.error('Rebuild error:', err);
    } finally {
      setIsRebuilding(false);
    }
  };

  const removeSong = async (downloadId: string) => {
    try {
      const response = await fetch(`/api/downloaded?downloadId=${downloadId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDownloadedContent();
        await loadContentStats();
      } else {
        setError(data.error || 'Failed to remove song');
      }
    } catch (err) {
      setError('Network error removing song');
      console.error('Remove error:', err);
    }
  };

  const handlePlay = (song: DownloadedSong) => {
    if (onPlay) {
      onPlay(song);
    } else {
      console.log('Playing downloaded song:', song.title);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMoodColor = (mood: string) => {
    const moodColors: Record<string, string> = {
      chill: 'bg-blue-500',
      heartbreak: 'bg-red-500',
      hype: 'bg-orange-500',
      nostalgic: 'bg-purple-500',
      focus: 'bg-green-500',
      party: 'bg-pink-500'
    };
    return moodColors[mood] || 'bg-gray-500';
  };

  const uniqueMoods = stats ? Object.keys(stats.byMood) : [];
  const uniqueFormats = stats ? Object.keys(stats.byFormat) : [];

  if (loading && songs.length === 0) {
    return (
      <div className={cn("bg-gray-800 rounded-lg border border-gray-700 p-6", className)}>
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
            <span className="text-gray-300">Loading downloaded content...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-gray-800 rounded-lg border border-gray-700", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Music className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Downloaded Music</h2>
            {stats && (
              <span className="text-sm text-gray-400">({stats.totalSongs} songs)</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Filter className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={rebuildIndex}
              variant="ghost"
              size="sm"
              loading={isRebuilding}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Rebuild
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{stats.totalSongs}</div>
              <div className="text-xs text-gray-500">Total Songs</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-400">
                {formatFileSize(stats.totalSize)}
              </div>
              <div className="text-xs text-gray-500">Total Size</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-400">{stats.availableSongs}</div>
              <div className="text-xs text-gray-500">Available</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-400">{stats.unavailableSongs}</div>
              <div className="text-xs text-gray-500">Unavailable</div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search downloaded music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm text-white"
                >
                  <option value="">All Moods</option>
                  {uniqueMoods.map(mood => (
                    <option key={mood} value={mood}>{mood}</option>
                  ))}
                </select>

                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm text-white"
                >
                  <option value="">All Formats</option>
                  {uniqueFormats.map(format => (
                    <option key={format} value={format}>{format.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border-b border-gray-700">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="sm"
              className="ml-auto p-1"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="max-h-96 overflow-y-auto">
        {songs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No downloaded music found</p>
            <p className="text-sm">
              {searchQuery || selectedMood || selectedFormat
                ? "No songs match your current filters"
                : "Download some music to see it here"
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {songs.map((song) => (
              <div key={song.downloadId} className="p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {song.thumbnail ? (
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Music className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-white truncate">
                          {song.title}
                        </h3>
                        {!song.isAvailable && (
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                      </div>
                      
                      {song.artist && (
                        <p className="text-sm text-gray-400 truncate mb-1">
                          {song.artist}
                        </p>
                      )}

                      {/* Mood Tags */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {song.mood.slice(0, 3).map((mood) => (
                          <span
                            key={mood}
                            className={cn(
                              "text-xs px-2 py-1 rounded-full text-white font-medium",
                              getMoodColor(mood)
                            )}
                          >
                            {mood}
                          </span>
                        ))}
                        {song.mood.length > 3 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-600 text-gray-300">
                            +{song.mood.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span className="flex items-center space-x-1">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            song.isAvailable ? "bg-green-400" : "bg-red-400"
                          )} />
                          <span>{song.isAvailable ? 'Available' : 'Unavailable'}</span>
                        </span>
                        <span>{song.format.toUpperCase()}</span>
                        <span>{formatFileSize(song.fileSize)}</span>
                        <span>{formatDate(song.downloadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 ml-4">
                    {song.isAvailable && (
                      <Button
                        onClick={() => handlePlay(song)}
                        variant="ghost"
                        size="sm"
                        className="p-2 text-green-400 hover:text-green-300"
                        title="Play from local file"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-gray-400 hover:text-white"
                      title="Open file location"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      onClick={() => removeSong(song.downloadId)}
                      variant="ghost"
                      size="sm"
                      className="p-2 text-red-400 hover:text-red-300"
                      title="Remove from downloads"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}