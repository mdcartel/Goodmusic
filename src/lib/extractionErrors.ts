// Error handling utilities for YouTube extraction

export enum ExtractionErrorType {
  INVALID_URL = 'INVALID_URL',
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  AGE_RESTRICTED = 'AGE_RESTRICTED',
  GEO_BLOCKED = 'GEO_BLOCKED',
  COPYRIGHT = 'COPYRIGHT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN'
}

export interface ExtractionError {
  type: ExtractionErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestedAction?: string;
}

export class ExtractionErrorHandler {
  static parseError(error: string): ExtractionError {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('invalid') && lowerError.includes('url')) {
      return {
        type: ExtractionErrorType.INVALID_URL,
        message: error,
        userMessage: 'The YouTube URL you provided is not valid.',
        retryable: false,
        suggestedAction: 'Please check the URL and try again.'
      };
    }

    if (lowerError.includes('video unavailable') || lowerError.includes('not available')) {
      return {
        type: ExtractionErrorType.VIDEO_UNAVAILABLE,
        message: error,
        userMessage: 'This video is not available.',
        retryable: false,
        suggestedAction: 'The video may be private, deleted, or restricted.'
      };
    }

    if (lowerError.includes('age-restricted') || lowerError.includes('age restricted')) {
      return {
        type: ExtractionErrorType.AGE_RESTRICTED,
        message: error,
        userMessage: 'This video is age-restricted.',
        retryable: false,
        suggestedAction: 'Age-restricted videos cannot be processed.'
      };
    }

    if (lowerError.includes('geo-blocked') || lowerError.includes('not available in your country')) {
      return {
        type: ExtractionErrorType.GEO_BLOCKED,
        message: error,
        userMessage: 'This video is not available in your region.',
        retryable: false,
        suggestedAction: 'The video is blocked in your geographic location.'
      };
    }

    if (lowerError.includes('copyright')) {
      return {
        type: ExtractionErrorType.COPYRIGHT,
        message: error,
        userMessage: 'This video has copyright restrictions.',
        retryable: false,
        suggestedAction: 'The video cannot be processed due to copyright claims.'
      };
    }

    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return {
        type: ExtractionErrorType.NETWORK_ERROR,
        message: error,
        userMessage: 'Network connection error.',
        retryable: true,
        suggestedAction: 'Please check your internet connection and try again.'
      };
    }

    if (lowerError.includes('timeout')) {
      return {
        type: ExtractionErrorType.TIMEOUT,
        message: error,
        userMessage: 'The request timed out.',
        retryable: true,
        suggestedAction: 'The video may be too long or the server is busy. Try again later.'
      };
    }

    if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
      return {
        type: ExtractionErrorType.RATE_LIMITED,
        message: error,
        userMessage: 'Too many requests. Please wait before trying again.',
        retryable: true,
        suggestedAction: 'Wait a few minutes before making another request.'
      };
    }

    if (lowerError.includes('yt-dlp') && lowerError.includes('not available')) {
      return {
        type: ExtractionErrorType.SERVICE_UNAVAILABLE,
        message: error,
        userMessage: 'YouTube extraction service is not available.',
        retryable: false,
        suggestedAction: 'The extraction service needs to be installed. Please contact support.'
      };
    }

    return {
      type: ExtractionErrorType.UNKNOWN,
      message: error,
      userMessage: 'An unexpected error occurred.',
      retryable: true,
      suggestedAction: 'Please try again. If the problem persists, contact support.'
    };
  }

  static getRetryDelay(errorType: ExtractionErrorType, attemptNumber: number): number {
    const baseDelays: Record<ExtractionErrorType, number> = {
      [ExtractionErrorType.INVALID_URL]: 0,
      [ExtractionErrorType.VIDEO_UNAVAILABLE]: 0,
      [ExtractionErrorType.AGE_RESTRICTED]: 0,
      [ExtractionErrorType.GEO_BLOCKED]: 0,
      [ExtractionErrorType.COPYRIGHT]: 0,
      [ExtractionErrorType.NETWORK_ERROR]: 2000,
      [ExtractionErrorType.TIMEOUT]: 5000,
      [ExtractionErrorType.RATE_LIMITED]: 10000,
      [ExtractionErrorType.SERVICE_UNAVAILABLE]: 0,
      [ExtractionErrorType.UNKNOWN]: 3000
    };

    const baseDelay = baseDelays[errorType];
    
    // Exponential backoff for retryable errors
    if (baseDelay > 0) {
      return baseDelay * Math.pow(2, attemptNumber - 1);
    }

    return 0;
  }

  static shouldRetry(errorType: ExtractionErrorType, attemptNumber: number, maxAttempts: number = 3): boolean {
    if (attemptNumber >= maxAttempts) {
      return false;
    }

    const retryableErrors = [
      ExtractionErrorType.NETWORK_ERROR,
      ExtractionErrorType.TIMEOUT,
      ExtractionErrorType.RATE_LIMITED,
      ExtractionErrorType.UNKNOWN
    ];

    return retryableErrors.includes(errorType);
  }
}

// Utility function for handling extraction with retries
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  parseError: (error: string) => ExtractionError = ExtractionErrorHandler.parseError
): Promise<T> {
  let lastError: ExtractionError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const parsedError = parseError(errorMessage);
      lastError = parsedError;

      if (!ExtractionErrorHandler.shouldRetry(parsedError.type, attempt, maxAttempts)) {
        throw new Error(parsedError.userMessage);
      }

      const delay = ExtractionErrorHandler.getRetryDelay(parsedError.type, attempt);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(lastError?.userMessage || 'Operation failed after multiple attempts');
}