import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AudioExtractionResult, 
  AudioExtractionOptions, 
  AudioStreamInfo,
  AudioQuality 
} from '../services/audio-extraction';
import { queryKeys } from '../query/client';

interface AudioExtractionResponse {
  success: boolean;
  videoId: string;
  options: AudioExtractionOptions;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  streams: AudioStreamInfo[];
  bestStream: AudioStreamInfo;
  extractedAt: string;
}

interface StreamingUrlResponse {
  success: boolean;
  videoId: string;
  quality: AudioQuality;
  streamingUrl: string;
  expiresAt: string;
}

interface QualityOptionsResponse {
  success: boolean;
  videoId: string;
  qualityOptions: AudioStreamInfo[];
  count: number;
}

// Extract audio with full options
export function useAudioExtraction(
  videoId: string,
  options: AudioExtractionOptions = {
    quality: 'best',
    format: 'm4a',
    includeMetadata: true,
    maxRetries: 3,
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.audioUrl(videoId, `${options.quality}-${options.format}`),
    queryFn: async (): Promise<AudioExtractionResponse> => {
      const params = new URLSearchParams({
        quality: options.quality,
        format: options.format,
        metadata: options.includeMetadata?.toString() || 'true',
        retries: options.maxRetries?.toString() || '3',
      });

      const response = await fetch(`/api/audio/extract/${videoId}?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Audio extraction failed');
      }

      return response.json();
    },
    enabled: enabled && !!videoId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
}

// Extract audio with mutation for more control
export function useAudioExtractionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      videoId, 
      options 
    }: { 
      videoId: string; 
      options: AudioExtractionOptions 
    }): Promise<AudioExtractionResponse> => {
      const response = await fetch(`/api/audio/extract/${videoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Audio extraction failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Cache the extraction result
      queryClient.setQueryData(
        queryKeys.audioUrl(data.videoId, `${data.options.quality}-${data.options.format}`),
        data
      );
    },
  });
}

// Get streaming URL for immediate playback
export function useStreamingUrl(
  videoId: string,
  quality: AudioQuality = 'best',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['streaming-url', videoId, quality],
    queryFn: async (): Promise<StreamingUrlResponse> => {
      const params = new URLSearchParams({ quality });
      const response = await fetch(`/api/audio/stream/${videoId}?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get streaming URL');
      }

      return response.json();
    },
    enabled: enabled && !!videoId,
    staleTime: 5 * 60 * 1000, // 5 minutes (URLs expire quickly)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
}

// Get streaming URL with mutation
export function useStreamingUrlMutation() {
  return useMutation({
    mutationFn: async ({ 
      videoId, 
      quality = 'best' 
    }: { 
      videoId: string; 
      quality?: AudioQuality 
    }): Promise<StreamingUrlResponse> => {
      const params = new URLSearchParams({ quality });
      const response = await fetch(`/api/audio/stream/${videoId}?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get streaming URL');
      }

      return response.json();
    },
  });
}

// Get quality options for a video
export function useQualityOptions(videoId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['quality-options', videoId],
    queryFn: async (): Promise<QualityOptionsResponse> => {
      const response = await fetch(`/api/audio/quality/${videoId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get quality options');
      }

      return response.json();
    },
    enabled: enabled && !!videoId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
  });
}

// Custom hook for audio playback preparation
export function useAudioPlayback(videoId: string, autoExtract: boolean = false) {
  const streamingQuery = useStreamingUrl(videoId, 'best', autoExtract);
  const extractionQuery = useAudioExtraction(
    videoId,
    { quality: 'best', format: 'm4a' },
    false // Don't auto-fetch, only when needed
  );

  const streamingMutation = useStreamingUrlMutation();
  const extractionMutation = useAudioExtractionMutation();

  // Get streaming URL quickly for immediate playback
  const getStreamingUrl = async (quality: AudioQuality = 'best') => {
    try {
      const result = await streamingMutation.mutateAsync({ videoId, quality });
      return result.streamingUrl;
    } catch (error) {
      console.error('Failed to get streaming URL:', error);
      throw error;
    }
  };

  // Get full extraction with all quality options
  const getFullExtraction = async (options?: AudioExtractionOptions) => {
    try {
      const result = await extractionMutation.mutateAsync({
        videoId,
        options: options || { quality: 'best', format: 'm4a' },
      });
      return result;
    } catch (error) {
      console.error('Failed to extract audio:', error);
      throw error;
    }
  };

  return {
    // Quick streaming URL (cached)
    streamingUrl: streamingQuery.data?.streamingUrl,
    streamingLoading: streamingQuery.isLoading,
    streamingError: streamingQuery.error,
    
    // Full extraction data (when needed)
    extraction: extractionQuery.data,
    extractionLoading: extractionQuery.isLoading,
    extractionError: extractionQuery.error,
    
    // Mutation states
    isGettingStream: streamingMutation.isPending,
    isExtracting: extractionMutation.isPending,
    
    // Actions
    getStreamingUrl,
    getFullExtraction,
    
    // Refetch functions
    refetchStreaming: streamingQuery.refetch,
    refetchExtraction: extractionQuery.refetch,
  };
}

// Hook for managing audio quality selection
export function useAudioQualitySelector(videoId: string) {
  const qualityQuery = useQualityOptions(videoId, false);
  const streamingMutation = useStreamingUrlMutation();

  const getUrlForQuality = async (quality: AudioQuality) => {
    const result = await streamingMutation.mutateAsync({ videoId, quality });
    return result.streamingUrl;
  };

  return {
    qualityOptions: qualityQuery.data?.qualityOptions || [],
    isLoadingOptions: qualityQuery.isLoading,
    optionsError: qualityQuery.error,
    
    isGettingUrl: streamingMutation.isPending,
    urlError: streamingMutation.error,
    
    getUrlForQuality,
    loadQualityOptions: qualityQuery.refetch,
  };
}