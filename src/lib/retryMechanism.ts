// Retry mechanism utilities for failed operations

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    shouldRetry = () => true,
    onRetry
  } = options;

  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Call retry callback
      onRetry?.(lastError, attempt);

      // Wait before retrying
      await sleep(currentDelay);

      // Increase delay for next attempt (exponential backoff)
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
    }
  }

  throw new RetryError(
    `Operation failed after ${maxAttempts} attempts: ${lastError!.message}`,
    maxAttempts,
    lastError!
  );
}

/**
 * Retry a sync operation
 */
export function retry<T>(
  operation: () => T,
  options: Omit<RetryOptions, 'onRetry'> & {
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): T {
  const {
    maxAttempts = 3,
    shouldRetry = () => true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Call retry callback
      onRetry?.(lastError, attempt);
    }
  }

  throw new RetryError(
    `Operation failed after ${maxAttempts} attempts: ${lastError!.message}`,
    maxAttempts,
    lastError!
  );
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Common retry strategies
 */
export const retryStrategies = {
  // Retry network errors but not client errors (4xx)
  networkErrors: (error: Error) => {
    if (error.message.includes('fetch')) return true;
    if (error.message.includes('network')) return true;
    if (error.message.includes('timeout')) return true;
    if (error.message.includes('ECONNREFUSED')) return true;
    if (error.message.includes('ENOTFOUND')) return true;
    return false;
  },

  // Retry server errors (5xx) but not client errors (4xx)
  serverErrors: (error: Error) => {
    if (error.message.includes('500')) return true;
    if (error.message.includes('502')) return true;
    if (error.message.includes('503')) return true;
    if (error.message.includes('504')) return true;
    return false;
  },

  // Retry all errors except specific ones
  allExcept: (excludeMessages: string[]) => (error: Error) => {
    return !excludeMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
};

/**
 * Retry with exponential backoff and jitter
 */
export async function retryWithJitter<T>(
  operation: () => Promise<T>,
  options: RetryOptions & { jitter?: boolean } = {}
): Promise<T> {
  const { jitter = true, ...retryOptions } = options;

  return retryAsync(operation, {
    ...retryOptions,
    delay: jitter && retryOptions.delay 
      ? retryOptions.delay + Math.random() * 1000 
      : retryOptions.delay
  });
}

/**
 * Create a retryable version of a function
 */
export function makeRetryable<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return async (...args: T): Promise<R> => {
    return retryAsync(() => fn(...args), options);
  };
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset() {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}