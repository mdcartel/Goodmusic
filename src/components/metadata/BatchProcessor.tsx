'use client';

import React, { useState } from 'react';
import { useMetadataWithProgress, useBatchMetadataEmbedding } from '@/lib/hooks/useMetadataExtractor';
import { BatchProgress, MetadataExtractionOptions, MetadataEmbeddingOptions } from '@/lib/services/metadata-extractor';
import {
  PlayIcon,
  StopIcon,
  DocumentArrowDownIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export function BatchProcessor() {
  const [videoIds, setVideoIds] = useState('');
  const [extractionOptions, setExtractionOptions] = useState<MetadataExtractionOptions>({
    includeThumbnail: true,
    thumbnailQuality: 'high',
    includeUploadInfo: true,
    includeStatistics: true,
  });
  
  const [embeddingOptions, setEmbeddingOptions] = useState<MetadataEmbeddingOptions>({
    embedThumbnail: true,
    overwriteExisting: true,
    preserveOriginal: true,
  });

  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [results, setResults] = useState<{
    successful: any[];
    failed: Array<{ videoId?: string; filePath?: string; error: string }>;
  } | null>(null);

  const { extractWithProgress, isLoading: isExtracting } = useMetadataWithProgress();
  const batchEmbedding = useBatchMetadataEmbedding();

  const handleExtractMetadata = async () => {
    const ids = videoIds
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Extract video ID from various YouTube URL formats
        const match = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : line;
      })
      .filter(id => id.length === 11); // YouTube video IDs are 11 characters

    if (ids.length === 0) {
      alert('Please enter valid YouTube video IDs or URLs');
      return;
    }

    setResults(null);
    setProgress(null);

    try {
      const result = await extractWithProgress(ids, extractionOptions, setProgress);
      setResults(result);
    } catch (error) {
      console.error('Batch extraction failed:', error);
      setResults({
        successful: [],
        failed: [{ error: error instanceof Error ? error.message : String(error) }]
      });
    }
  };

  const handleEmbedMetadata = async () => {
    // This would require file paths and metadata - simplified for demo
    alert('Metadata embedding feature coming soon!');
  };

  const parseVideoIds = () => {
    return videoIds
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0).length;
  };

  return (
    <div className="space-y-6">
      {/* Metadata Extraction */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
          <DocumentArrowDownIcon className="w-5 h-5" />
          <span>Batch Metadata Extraction</span>
        </h3>

        <div className="space-y-4">
          {/* Video IDs Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube Video IDs or URLs (one per line)
            </label>
            <textarea
              value={videoIds}
              onChange={(e) => setVideoIds(e.target.value)}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical font-mono text-sm"
              placeholder="dQw4w9WgXcQ&#10;https://www.youtube.com/watch?v=dQw4w9WgXcQ&#10;https://youtu.be/dQw4w9WgXcQ"
            />
            <p className="text-xs text-gray-400 mt-1">
              {parseVideoIds()} video(s) detected
            </p>
          </div>

          {/* Extraction Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Extraction Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={extractionOptions.includeThumbnail}
                    onChange={(e) => setExtractionOptions(prev => ({
                      ...prev,
                      includeThumbnail: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Download thumbnails</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={extractionOptions.includeUploadInfo}
                    onChange={(e) => setExtractionOptions(prev => ({
                      ...prev,
                      includeUploadInfo: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Include upload info</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={extractionOptions.includeStatistics}
                    onChange={(e) => setExtractionOptions(prev => ({
                      ...prev,
                      includeStatistics: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Include statistics</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Thumbnail Quality
                </label>
                <select
                  value={extractionOptions.thumbnailQuality}
                  onChange={(e) => setExtractionOptions(prev => ({
                    ...prev,
                    thumbnailQuality: e.target.value as any
                  }))}
                  disabled={!extractionOptions.includeThumbnail}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="low">Low (120x90)</option>
                  <option value="medium">Medium (320x180)</option>
                  <option value="high">High (480x360)</option>
                  <option value="maxres">Max Resolution (1280x720)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Progress */}
          {progress && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                <span>
                  Processing {progress.current ? `"${progress.current}"` : '...'}
                </span>
                <span>{progress.completed}/{progress.total}</span>
              </div>
              
              <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{Math.round(progress.percentage)}% complete</span>
                {progress.failed > 0 && (
                  <span className="text-red-400">{progress.failed} failed</span>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">Results</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>{results.successful.length} successful</span>
                </div>
                
                <div className="flex items-center space-x-2 text-red-400">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>{results.failed.length} failed</span>
                </div>
              </div>

              {results.failed.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-red-400 mb-2">Failed items:</h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {results.failed.map((failure, index) => (
                      <div key={index} className="text-xs text-red-300 bg-red-900/20 p-2 rounded">
                        {failure.videoId && <span className="font-mono">{failure.videoId}: </span>}
                        {failure.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleExtractMetadata}
            disabled={isExtracting || parseVideoIds() === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isExtracting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                <span>Start Extraction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metadata Embedding */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
          <CogIcon className="w-5 h-5" />
          <span>Batch Metadata Embedding</span>
        </h3>

        <div className="space-y-4">
          {/* Embedding Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Embedding Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={embeddingOptions.embedThumbnail}
                    onChange={(e) => setEmbeddingOptions(prev => ({
                      ...prev,
                      embedThumbnail: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Embed thumbnails as album art</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={embeddingOptions.overwriteExisting}
                    onChange={(e) => setEmbeddingOptions(prev => ({
                      ...prev,
                      overwriteExisting: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Overwrite existing metadata</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={embeddingOptions.preserveOriginal}
                    onChange={(e) => setEmbeddingOptions(prev => ({
                      ...prev,
                      preserveOriginal: e.target.checked
                    }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Create backup of original files</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Output Format
                </label>
                <select
                  value={embeddingOptions.outputFormat || 'same'}
                  onChange={(e) => setEmbeddingOptions(prev => ({
                    ...prev,
                    outputFormat: e.target.value === 'same' ? undefined : e.target.value as any
                  }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="same">Keep original format</option>
                  <option value="mp3">Convert to MP3</option>
                  <option value="m4a">Convert to M4A</option>
                  <option value="flac">Convert to FLAC</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300">
                <p className="font-medium mb-1">Coming Soon</p>
                <p>
                  Batch metadata embedding will allow you to automatically embed extracted metadata 
                  into your downloaded audio files. This feature requires integration with FFmpeg 
                  and will be available in a future update.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleEmbedMetadata}
            disabled={true}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 cursor-not-allowed text-gray-400 rounded-lg"
          >
            <CogIcon className="w-4 h-4" />
            <span>Start Embedding (Coming Soon)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchProcessor;