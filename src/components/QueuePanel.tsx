'use client';

import { useState } from 'react';
import { Song } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components';
import { 
  X, 
  Play, 
  Pause, 
  GripVertical, 
  Trash2,
  Music,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  className?: string;
}

export default function QueuePanel({
  isOpen,
  onClose,
  queue,
  currentIndex,
  isPlaying,
  onPlay,
  onRemove,
  onClear,
  className
}: QueuePanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const currentSong = queue[currentIndex];
  const upcomingSongs = queue.slice(currentIndex + 1);
  const previousSongs = queue.slice(0, currentIndex);

  return (
    <div className={cn(
      "fixed right-4 bottom-24 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-40",
      "transition-all duration-300",
      isMinimized ? "h-16" : "h-96",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Music className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Queue</h3>
          <span className="text-sm text-gray-400">({queue.length})</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsMinimized(!isMinimized)}
            variant="ghost"
            size="sm"
            className="p-1"
          >
            {isMinimized ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Queue Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
            {queue.length === 0 ? (
              <div className="text-center py-8">
                <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No songs in queue</p>
              </div>
            ) : (
              <>
                {/* Current Song */}
                {currentSong && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wide">
                      Now Playing
                    </h4>
                    <QueueItem
                      song={currentSong}
                      index={currentIndex}
                      isPlaying={isPlaying}
                      isCurrent={true}
                      onPlay={onPlay}
                      onRemove={onRemove}
                    />
                  </div>
                )}

                {/* Upcoming Songs */}
                {upcomingSongs.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                      Up Next ({upcomingSongs.length})
                    </h4>
                    <div className="space-y-2">
                      {upcomingSongs.map((song, index) => (
                        <QueueItem
                          key={`upcoming-${song.id}-${index}`}
                          song={song}
                          index={currentIndex + 1 + index}
                          isPlaying={false}
                          isCurrent={false}
                          onPlay={onPlay}
                          onRemove={onRemove}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Songs */}
                {previousSongs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                      Recently Played ({previousSongs.length})
                    </h4>
                    <div className="space-y-2">
                      {previousSongs.reverse().map((song, index) => (
                        <QueueItem
                          key={`previous-${song.id}-${index}`}
                          song={song}
                          index={previousSongs.length - 1 - index}
                          isPlaying={false}
                          isCurrent={false}
                          onPlay={onPlay}
                          onRemove={onRemove}
                          isPrevious={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {queue.length > 0 && (
            <div className="p-4 border-t border-gray-700">
              <Button
                onClick={onClear}
                variant="danger"
                size="sm"
                className="w-full flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Queue</span>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface QueueItemProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  isCurrent: boolean;
  isPrevious?: boolean;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
}

function QueueItem({ 
  song, 
  index, 
  isPlaying, 
  isCurrent, 
  isPrevious = false,
  onPlay, 
  onRemove 
}: QueueItemProps) {
  return (
    <div className={cn(
      "flex items-center space-x-3 p-2 rounded-lg transition-colors",
      "hover:bg-gray-800",
      isCurrent && "bg-purple-900/30 border border-purple-700/50",
      isPrevious && "opacity-60"
    )}>
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-gray-500" />
      </div>

      {/* Thumbnail */}
      <img
        src={song.thumbnail}
        alt={song.title}
        className="w-10 h-10 rounded object-cover"
      />

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "text-sm font-medium truncate",
          isCurrent ? "text-purple-300" : "text-white"
        )}>
          {song.title}
        </h4>
        {song.artist && (
          <p className="text-xs text-gray-400 truncate">{song.artist}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-1">
        <Button
          onClick={() => onPlay(index)}
          variant="ghost"
          size="sm"
          className="p-1"
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <Button
          onClick={() => onRemove(index)}
          variant="ghost"
          size="sm"
          className="p-1 text-gray-400 hover:text-red-400"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}