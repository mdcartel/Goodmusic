'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAudioExtraction } from '../../hooks/useAudioExtraction';
import { AudioQuality, AudioFormat } from '../../lib/services/audio-extraction';
import { 
  Play, 
  Download, 
  Music, 
  Clock, 
  FileAudio, 
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  BarChart3
} from 'lucide-react';

interface AudioExtractionPanelProps {
  onStreamUrl?: (url: string) => void;
  onExtractionComplete?: (result: any) => void;
}

export const AudioExtractionPanel: React.FC<AudioExtractionPanelProps> = ({
  onStreamUrl,
  onExtractionComplete
}) => {
  const [videoId, setVideoId] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>('best');
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>('m4a');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const {
    isExtracting,
    isGettingStream,
    isGettingQualities,
    error,
    extractionResult,
    extractAudio,
    getStreamUrl,
    getQualityOptions,
    getCacheStats,
    clearCache,
    clearError,
    clearResult
  } = useAudioExtraction();

  const extractVideoId = (input: string): string => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^[a-zA-Z0-9_-]{11}$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return input; // Return as-is if no pattern matches
  };

  const handleExtractAudio = async () => {
    if (!videoId.trim()) return;

    clearError();
    const extractedVideoId = extractVideoId(videoId.trim());

    try {
      const result = await extractAudio(extractedVideoId, {
        quality: selectedQuality,
        format: selectedFormat,
        includeMetadata,
        maxRetries: 3
      });

      if (onExtractionComplete) {
        onExtractionComplete(result);
      }
    } catch (err) {
      console.error('Extraction failed:', err);
    }
  };

  const handleGetStreamUrl = async () => {
    if (!videoId.trim()) return;

    clearError();
    const extractedVideoId = extractVideoId(videoId.trim());

    try {
      const result = await getStreamUrl(extractedVideoId, selectedQuality);
      
      if (onStreamUrl) {
        onStreamUrl(result.streamUrl);
      }
    } catch (err) {
      console.error('Stream URL failed:', err);
    }
  };

  const handleGetQualities = async () => {
    if (!videoId.trim()) return;

    clearError();
    const extractedVideoId = extractVideoId(videoId.trim());

    try {
      const result = await getQualityOptions(extractedVideoId);
      console.log('Quality options:', result);
    } catch (err) {
      console.error('Get qualities failed:', err);
    }
  };

  const handleGetCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (err) {
      console.error('Get cache stats failed:', err);
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      setCacheStats(null);
    } catch (err) {
      console.error('Clear cache failed:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Music className="h-5 w-5 mr-2" />
            Audio Extraction
          </CardTitle>
          <CardDescription>
            Extract audio streams from YouTube videos using yt-dlp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Input */}
          <div className="space-y-2">
            <Label htmlFor="video-input">YouTube URL or Video ID</Label>
            <Input
              id="video-input"
              placeholder="https://www.youtube.com/watch?v=... or video ID"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={selectedQuality} onValueChange={(value: AudioQuality) => setSelectedQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best">Best Available</SelectItem>
                  <SelectItem value="320">320 kbps</SelectItem>
                  <SelectItem value="192">192 kbps</SelectItem>
                  <SelectItem value="128">128 kbps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={selectedFormat} onValueChange={(value: AudioFormat) => setSelectedFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m4a">M4A</SelectItem>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="opus">OPUS</SelectItem>
                  <SelectItem value="webm">WebM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="metadata"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="metadata" className="text-sm">Include Metadata</Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExtractAudio}
              disabled={!videoId.trim() || isExtracting}
              className="flex items-center"
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileAudio className="h-4 w-4 mr-2" />
              )}
              Extract Audio
            </Button>

            <Button
              variant="outline"
              onClick={handleGetStreamUrl}
              disabled={!videoId.trim() || isGettingStream}
              className="flex items-center"
            >
              {isGettingStream ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Get Stream URL
            </Button>

            <Button
              variant="outline"
              onClick={handleGetQualities}
              disabled={!videoId.trim() || isGettingQualities}
              className="flex items-center"
            >
              {isGettingQualities ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Get Qualities
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="ml-auto"
              >
                ×
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extraction Results */}
      {extractionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Extraction Results
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearResult}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" className="space-y-4">
              <TabsList>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="streams">Streams</TabsTrigger>
                <TabsTrigger value="best">Best Stream</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm text-muted-foreground">{extractionResult.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Artist</Label>
                    <p className="text-sm text-muted-foreground">{extractionResult.artist}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Duration</Label>
                    <p className="text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDuration(extractionResult.duration)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Video ID</Label>
                    <p className="text-sm text-muted-foreground font-mono">{extractionResult.videoId}</p>
                  </div>
                </div>
                
                {extractionResult.thumbnail && (
                  <div>
                    <Label className="text-sm font-medium">Thumbnail</Label>
                    <img 
                      src={extractionResult.thumbnail} 
                      alt="Video thumbnail"
                      className="mt-2 rounded-md max-w-xs"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="streams" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Available Streams ({extractionResult.streams.length})
                  </Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {extractionResult.streams.map((stream, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{stream.format.toUpperCase()}</Badge>
                            <Badge variant="secondary">{stream.bitrate} kbps</Badge>
                            <Badge variant="outline">{stream.quality}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatFileSize(stream.fileSize)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stream.sampleRate} Hz • {stream.channels} channels
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="best" className="space-y-4">
                <div className="p-4 border rounded-md bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Best Stream Selected</Label>
                    <div className="flex items-center space-x-2">
                      <Badge>{extractionResult.bestStream.format.toUpperCase()}</Badge>
                      <Badge variant="secondary">{extractionResult.bestStream.bitrate} kbps</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Quality:</span> {extractionResult.bestStream.quality}
                    </div>
                    <div>
                      <span className="font-medium">File Size:</span> {formatFileSize(extractionResult.bestStream.fileSize)}
                    </div>
                    <div>
                      <span className="font-medium">Sample Rate:</span> {extractionResult.bestStream.sampleRate} Hz
                    </div>
                    <div>
                      <span className="font-medium">Channels:</span> {extractionResult.bestStream.channels}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <Label className="text-xs font-medium">Stream URL (expires at {extractionResult.bestStream.expiresAt.toLocaleString()})</Label>
                    <div className="mt-1 p-2 bg-white rounded text-xs font-mono break-all">
                      {extractionResult.bestStream.url}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Manage extraction cache for better performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleGetCacheStats}
              className="flex items-center"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Get Stats
            </Button>
            <Button
              variant="outline"
              onClick={handleClearCache}
              className="flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>

          {cacheStats && (
            <div className="p-3 border rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Cache Size:</span> {cacheStats.cacheSize} entries
                </div>
                <div>
                  <span className="font-medium">Cached Entries:</span> {cacheStats.cachedEntries}
                </div>
              </div>
              
              {cacheStats.entries.length > 0 && (
                <div className="mt-3">
                  <Label className="text-xs font-medium">Cached Video IDs:</Label>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {cacheStats.entries.slice(0, 5).join(', ')}
                    {cacheStats.entries.length > 5 && ` ... and ${cacheStats.entries.length - 5} more`}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};