import { useState, useCallback } from 'react';
import { AudioExtractionResult, AudioStreamInfo, AudioQuality, AudioFormat } from '../lib/services/audio-extraction';

interface ExtractionOptions {
  quality?: AudioQuality;
  format?: AudioFormat;
  includeMetadata?: boolean;
  maxRetries?: number;
}

interface StreamUrlResult {
  streamUrl: string;
  videoId: string;
  quality: string;
  expiresAt: Date;
}

interface QualityOptionsResult {
  videoId: string;
  qualities: AudioStreamInfo[];
  totalOptions: number;
}

interface CacheStats {
  cacheSize: number;
  cachedEntries: number;
  entries: string[];
}

export const useAudioExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGettingStream, setIsGettingStream] = useState(false);
  const [isGettingQualities, setIsGettingQualities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<AudioExtractionResult | null>(null);

  const extractAudio = useCallback(async (videoId: string, options?: ExtractionOptions) => {
    setIsExtracting(true);
    setError(null);

    try {
      const response = await fetch('/api/audio/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          options: options || {}
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Audio extraction failed');
      }

      setExtractionResult(data.data);
      return data.data as AudioExtractionResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audio extraction failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const getStreamUrl = useCallback(async (videoId: string, quality: AudioQuality = 'best') => {
    setIsGettingStream(true);
    setError(null);

    try {
      const response = await fetch(`/api/audio/stream?videoId=${videoId}&quality=${quality}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get stream URL');
      }

      return {
        ...data.data,
        expiresAt: new Date(data.data.expiresAt)
      } as StreamUrlResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get stream URL';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGettingStream(false);
    }
  }, []);

  const getQualityOptions = useCallback(async (videoId: string) => {
    setIsGettingQualities(true);
    setError(null);

    try {
      const response = await fetch(`/api/audio/qualities?videoId=${videoId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get quality options');
      }

      return data.data as QualityOptionsResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get quality options';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGettingQualities(false);
    }
  }, []);

  const getCacheStats = useCallback(async () => {
    try {
      const response = await fetch('/api/audio/cache');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get cache stats');
      }

      return data.data as CacheStats;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get cache stats';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      const response = await fetch('/api/audio/cache', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to clear cache');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResult = useCallback(() => {
    setExtractionResult(null);
  }, []);

  return {
    // State
    isExtracting,
    isGettingStream,
    isGettingQualities,
    error,
    extractionResult,

    // Actions
    extractAudio,
    getStreamUrl,
    getQualityOptions,
    getCacheStats,
    clearCache,
    clearError,
    clearResult,
  };
};