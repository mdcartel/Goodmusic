'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { retryAsync, RetryOptions, retryStrategies } from '@/lib/retryMechanism';

export interface ErrorHandlingOptions {
  showToast?: boolean;
  retryOptions?: RetryOptions;
  onError?: (error: Error) => void;
  onRetry?: (error: Error, attempt: number) => void;
  onSuccess?: () => void;
}

export function useErrorHandling() {
  const toast = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback((
    error: Error,
    context?: string,
    options: ErrorHandlingOptions = {}
  ) => {
    const {
      showToast = true,
      onError
    } = options;

    console.error(`Error${context ? ` in ${context}` : ''}:`, error);

    if (showToast) {
      toast.error(
        'Something went wrong',
        error.message || 'An unexpected error occurred',
        {
          action: {
            label: 'Dismiss',
            onClick: () => {}
          }
        }
      );
    }

    onError?.(error);
  }, [toast]);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    options: ErrorHandlingOptions = {}
  ): Promise<T | null> => {
    const {
      showToast = true,
      retryOptions = {},
      onError,
      onRetry,
      onSuccess
    } = options;

    setIsRetrying(true);
    setRetryCount(0);

    try {
      const result = await retryAsync(operation, {
        maxAttempts: 3,
        delay: 1000,
        shouldRetry: retryStrategies.networkErrors,
        ...retryOptions,
        onRetry: (error, attempt) => {
          setRetryCount(attempt);
          
          if (showToast && attempt === 1) {
            toast.warning(
              'Retrying...',
              `Attempting to retry ${context.toLowerCase()}`,
              { duration: 2000 }
            );
          }

          onRetry?.(error, attempt);
        }
      });

      if (showToast && retryCount > 0) {
        toast.success(
          'Success!',
          `${context} completed successfully after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'}`
        );
      }

      onSuccess?.();
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      handleError(err, context, { showToast, onError });
      return null;
    } finally {
      setIsRetrying(false);
      setRetryCount(0);
    }
  }, [handleError, toast, retryCount]);

  const createRetryableOperation = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    context: string,
    options: ErrorHandlingOptions = {}
  ) => {
    return async (...args: T): Promise<R | null> => {
      return executeWithRetry(() => operation(...args), context, options);
    };
  }, [executeWithRetry]);

  return {
    handleError,
    executeWithRetry,
    createRetryableOperation,
    isRetrying,
    retryCount
  };
}

// Specific hooks for common operations
export function useApiErrorHandling() {
  const { handleError, executeWithRetry } = useErrorHandling();

  const handleApiError = useCallback((error: Error, endpoint?: string) => {
    let message = error.message;
    let title = 'API Error';

    // Handle specific API errors
    if (error.message.includes('404')) {
      title = 'Not Found';
      message = 'The requested resource was not found';
    } else if (error.message.includes('500')) {
      title = 'Server Error';
      message = 'The server encountered an error. Please try again later.';
    } else if (error.message.includes('network')) {
      title = 'Network Error';
      message = 'Please check your internet connection and try again.';
    }

    handleError(new Error(message), endpoint, {
      showToast: true
    });
  }, [handleError]);

  const executeApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T | null> => {
    return executeWithRetry(apiCall, `API call to ${endpoint}`, {
      retryOptions: {
        shouldRetry: (error) => {
          // Retry network errors and server errors, but not client errors
          return retryStrategies.networkErrors(error) || 
                 retryStrategies.serverErrors(error);
        }
      }
    });
  }, [executeWithRetry]);

  return {
    handleApiError,
    executeApiCall
  };
}

export function useDownloadErrorHandling() {
  const { handleError, executeWithRetry } = useErrorHandling();

  const handleDownloadError = useCallback((error: Error, songTitle?: string) => {
    let message = error.message;
    let title = 'Download Failed';

    if (error.message.includes('yt-dlp')) {
      title = 'YouTube Extraction Failed';
      message = 'Unable to extract audio from YouTube. The video might be unavailable or restricted.';
    } else if (error.message.includes('network')) {
      title = 'Network Error';
      message = 'Download failed due to network issues. Please try again.';
    } else if (error.message.includes('storage')) {
      title = 'Storage Error';
      message = 'Unable to save the file. Please check your storage space.';
    }

    handleError(new Error(message), songTitle ? `downloading "${songTitle}"` : 'download');
  }, [handleError]);

  const executeDownload = useCallback(async <T>(
    downloadOperation: () => Promise<T>,
    songTitle: string
  ): Promise<T | null> => {
    return executeWithRetry(downloadOperation, `Download of "${songTitle}"`, {
      retryOptions: {
        maxAttempts: 2, // Downloads are expensive, limit retries
        delay: 2000,
        shouldRetry: (error) => {
          // Only retry network errors for downloads
          return retryStrategies.networkErrors(error);
        }
      }
    });
  }, [executeWithRetry]);

  return {
    handleDownloadError,
    executeDownload
  };
}

export function useStreamingErrorHandling() {
  const { handleError, executeWithRetry } = useErrorHandling();

  const handleStreamingError = useCallback((error: Error, songTitle?: string) => {
    let message = error.message;
    let title = 'Playback Failed';

    if (error.message.includes('yt-dlp')) {
      title = 'Stream Unavailable';
      message = 'Unable to stream this song. It might be unavailable or restricted.';
    } else if (error.message.includes('network')) {
      title = 'Connection Error';
      message = 'Streaming failed due to network issues. Please try again.';
    } else if (error.message.includes('format')) {
      title = 'Format Error';
      message = 'This audio format is not supported by your browser.';
    }

    handleError(new Error(message), songTitle ? `streaming "${songTitle}"` : 'streaming');
  }, [handleError]);

  const executeStream = useCallback(async <T>(
    streamOperation: () => Promise<T>,
    songTitle: string
  ): Promise<T | null> => {
    return executeWithRetry(streamOperation, `Streaming "${songTitle}"`, {
      retryOptions: {
        maxAttempts: 2,
        delay: 1000,
        shouldRetry: retryStrategies.networkErrors
      }
    });
  }, [executeWithRetry]);

  return {
    handleStreamingError,
    executeStream
  };
}