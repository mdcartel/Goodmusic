import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  metadataExtractor, 
  TrackMetadata, 
  ThumbnailInfo,
  MetadataExtractionOptions,
  MetadataEmbeddingOptions,
  BatchProcessingOptions,
  BatchProgress
} from '../services/metadata-extractor';

// Hook for extracting metadata for a single video
export function useMetadataExtraction(
  videoId: string,
  options: MetadataExtractionOptions = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['metadata', videoId, options],
    queryFn: async (): Promise<TrackMetadata> => {
      return metadataExtractor.extractMetadata(videoId, options);
    },
    enabled: enabled && !!videoId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: (failureCount, error) => {
      // Don't retry if it's a client error
      if (error.message.includes('404') || error.message.includes('private')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for extracting metadata with mutation for more control
export function useMetadataExtractionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      options = {}
    }: {
      videoId: string;
      options?: MetadataExtractionOptions;
    }): Promise<TrackMetadata> => {
      return metadataExtractor.extractMetadata(videoId, options);
    },
    onSuccess: (data, variables) => {
      // Cache the successful result
      queryClient.setQueryData(
        ['metadata', variables.videoId, variables.options],
        data
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['metadata-list'] });
      queryClient.invalidateQueries({ queryKey: ['metadata-search'] });
    },
  });
}

// Hook for batch metadata extraction
export function useBatchMetadataExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoIds,
      options = {},
      batchOptions = {}
    }: {
      videoIds: string[];
      options?: MetadataExtractionOptions;
      batchOptions?: BatchProcessingOptions;
    }) => {
      return metadataExtractor.extractBatchMetadata(videoIds, options, batchOptions);
    },
    onSuccess: () => {
      // Invalidate all metadata queries
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
    },
  });
}

// Hook for getting existing metadata
export function useMetadata(videoId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['metadata-existing', videoId],
    queryFn: async (): Promise<TrackMetadata | null> => {
      return metadataExtractor.getMetadata(videoId);
    },
    enabled: enabled && !!videoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for getting metadata by ID
export function useMetadataById(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['metadata-by-id', id],
    queryFn: async (): Promise<TrackMetadata | null> => {
      return metadataExtractor.getMetadataById(id);
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for getting all metadata
export function useAllMetadata() {
  return useQuery({
    queryKey: ['metadata-list'],
    queryFn: async (): Promise<TrackMetadata[]> => {
      return metadataExtractor.getAllMetadata();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for searching metadata
export function useMetadataSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['metadata-search', query],
    queryFn: async (): Promise<TrackMetadata[]> => {
      return metadataExtractor.searchMetadata(query);
    },
    enabled: enabled && !!query && query.length > 2,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for downloading thumbnails
export function useThumbnailDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      thumbnailUrl,
      quality = 'high'
    }: {
      videoId: string;
      thumbnailUrl: string;
      quality?: 'low' | 'medium' | 'high' | 'maxres';
    }): Promise<ThumbnailInfo | null> => {
      return metadataExtractor.downloadThumbnail(videoId, thumbnailUrl, quality);
    },
    onSuccess: (data, variables) => {
      if (data) {
        // Cache the thumbnail info
        queryClient.setQueryData(
          ['thumbnail', variables.videoId, variables.quality],
          data
        );
      }
    },
  });
}

// Hook for embedding metadata
export function useMetadataEmbedding() {
  return useMutation({
    mutationFn: async ({
      audioFilePath,
      metadata,
      options = {}
    }: {
      audioFilePath: string;
      metadata: TrackMetadata;
      options?: MetadataEmbeddingOptions;
    }): Promise<boolean> => {
      return metadataExtractor.embedMetadata(audioFilePath, metadata, options);
    },
  });
}

// Hook for batch metadata embedding
export function useBatchMetadataEmbedding() {
  return useMutation({
    mutationFn: async ({
      files,
      options = {},
      batchOptions = {}
    }: {
      files: Array<{ audioFilePath: string; metadata: TrackMetadata }>;
      options?: MetadataEmbeddingOptions;
      batchOptions?: BatchProcessingOptions;
    }) => {
      return metadataExtractor.embedBatchMetadata(files, options, batchOptions);
    },
  });
}

// Hook for editing metadata
export function useMetadataEdit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      metadataId,
      updates
    }: {
      metadataId: string;
      updates: Partial<TrackMetadata>;
    }): Promise<TrackMetadata | null> => {
      return metadataExtractor.editMetadata(metadataId, updates);
    },
    onSuccess: (data, variables) => {
      if (data) {
        // Update cached metadata
        queryClient.setQueryData(
          ['metadata-by-id', variables.metadataId],
          data
        );
        
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          queryKey: ['metadata-existing', data.videoId] 
        });
        queryClient.invalidateQueries({ queryKey: ['metadata-list'] });
        queryClient.invalidateQueries({ queryKey: ['metadata-search'] });
      }
    },
  });
}

// Hook for metadata statistics
export function useMetadataStats() {
  return useQuery({
    queryKey: ['metadata-stats'],
    queryFn: async () => {
      const allMetadata = await metadataExtractor.getAllMetadata();
      
      const stats = {
        totalTracks: allMetadata.length,
        uniqueArtists: new Set(allMetadata.map(m => m.artist)).size,
        uniqueAlbums: new Set(allMetadata.filter(m => m.album).map(m => m.album)).size,
        genreDistribution: {} as Record<string, number>,
        yearDistribution: {} as Record<number, number>,
        totalDuration: allMetadata.reduce((sum, m) => sum + m.duration, 0),
        withThumbnails: allMetadata.filter(m => m.thumbnailPath).length,
        recentlyAdded: allMetadata.filter(m => {
          const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
          return m.extractedAt.getTime() > dayAgo;
        }).length,
      };

      // Calculate genre distribution
      allMetadata.forEach(metadata => {
        if (metadata.genre) {
          stats.genreDistribution[metadata.genre] = 
            (stats.genreDistribution[metadata.genre] || 0) + 1;
        }
      });

      // Calculate year distribution
      allMetadata.forEach(metadata => {
        if (metadata.year) {
          stats.yearDistribution[metadata.year] = 
            (stats.yearDistribution[metadata.year] || 0) + 1;
        }
      });

      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for metadata with progress tracking
export function useMetadataWithProgress() {
  const extractMetadata = useMetadataExtractionMutation();
  const batchExtract = useBatchMetadataExtraction();

  const extractWithProgress = async (
    videoIds: string[],
    options: MetadataExtractionOptions = {},
    onProgress?: (progress: BatchProgress) => void
  ) => {
    if (videoIds.length === 1) {
      // Single extraction
      onProgress?.({
        total: 1,
        completed: 0,
        failed: 0,
        current: videoIds[0],
        percentage: 0
      });

      try {
        const result = await extractMetadata.mutateAsync({
          videoId: videoIds[0],
          options
        });

        onProgress?.({
          total: 1,
          completed: 1,
          failed: 0,
          percentage: 100
        });

        return { successful: [result], failed: [] };
      } catch (error) {
        onProgress?.({
          total: 1,
          completed: 0,
          failed: 1,
          percentage: 100
        });

        return {
          successful: [],
          failed: [{
            videoId: videoIds[0],
            error: error instanceof Error ? error.message : String(error)
          }]
        };
      }
    } else {
      // Batch extraction
      return batchExtract.mutateAsync({
        videoIds,
        options,
        batchOptions: {
          progressCallback: onProgress
        }
      });
    }
  };

  return {
    extractWithProgress,
    isLoading: extractMetadata.isPending || batchExtract.isPending,
    error: extractMetadata.error || batchExtract.error,
  };
}

// Comprehensive hook that combines all metadata functionality
export function useMetadataManager() {
  const extractMutation = useMetadataExtractionMutation();
  const batchExtractMutation = useBatchMetadataExtraction();
  const thumbnailDownload = useThumbnailDownload();
  const embedMutation = useMetadataEmbedding();
  const batchEmbedMutation = useBatchMetadataEmbedding();
  const editMutation = useMetadataEdit();
  const stats = useMetadataStats();

  return {
    // Extraction
    extractMetadata: extractMutation.mutate,
    extractBatchMetadata: batchExtractMutation.mutate,
    
    // Thumbnails
    downloadThumbnail: thumbnailDownload.mutate,
    
    // Embedding
    embedMetadata: embedMutation.mutate,
    embedBatchMetadata: batchEmbedMutation.mutate,
    
    // Editing
    editMetadata: editMutation.mutate,
    
    // Statistics
    stats: stats.data,
    
    // Loading states
    isExtracting: extractMutation.isPending,
    isBatchExtracting: batchExtractMutation.isPending,
    isDownloadingThumbnail: thumbnailDownload.isPending,
    isEmbedding: embedMutation.isPending,
    isBatchEmbedding: batchEmbedMutation.isPending,
    isEditing: editMutation.isPending,
    isLoadingStats: stats.isLoading,
    
    // Errors
    extractError: extractMutation.error,
    batchExtractError: batchExtractMutation.error,
    thumbnailError: thumbnailDownload.error,
    embedError: embedMutation.error,
    batchEmbedError: batchEmbedMutation.error,
    editError: editMutation.error,
    statsError: stats.error,
    
    // Helper functions
    isLoading: extractMutation.isPending || 
               batchExtractMutation.isPending || 
               thumbnailDownload.isPending || 
               embedMutation.isPending || 
               batchEmbedMutation.isPending || 
               editMutation.isPending,
    
    hasError: !!(extractMutation.error || 
                 batchExtractMutation.error || 
                 thumbnailDownload.error || 
                 embedMutation.error || 
                 batchEmbedMutation.error || 
                 editMutation.error),
  };
}

// Utility functions
export function formatDuration(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatViewCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  if (count < 1000000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${(count / 1000000000).toFixed(1)}B`;
}