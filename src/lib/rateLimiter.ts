// Rate limiting utilities for API endpoints

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  async checkLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs
      };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    // Increment count
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime
    };
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [identifier, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(identifier);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }

  getStats(): {
    activeEntries: number;
    totalRequests: number;
  } {
    const totalRequests = Array.from(this.requests.values())
      .reduce((sum, entry) => sum + entry.count, 0);

    return {
      activeEntries: this.requests.size,
      totalRequests
    };
  }
}

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  // Include user agent for better uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const userAgentHash = userAgent.substring(0, 20); // First 20 chars
  
  return `${ip}-${userAgentHash}`;
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  STREAM: {
    limit: 30, // 30 requests
    windowMs: 60 * 1000 // per minute
  },
  EXTRACT: {
    limit: 10, // 10 requests
    windowMs: 60 * 1000 // per minute
  },
  DOWNLOAD: {
    limit: 5, // 5 requests
    windowMs: 60 * 1000 // per minute
  },
  GENERAL: {
    limit: 100, // 100 requests
    windowMs: 60 * 1000 // per minute
  }
} as const;

// Middleware function for Next.js API routes
export async function withRateLimit<T>(
  request: Request,
  config: { limit: number; windowMs: number },
  handler: () => Promise<T>
): Promise<T> {
  const rateLimiter = RateLimiter.getInstance();
  const identifier = getClientIdentifier(request);
  
  const result = await rateLimiter.checkLimit(
    identifier,
    config.limit,
    config.windowMs
  );

  if (!result.allowed) {
    const error = new Error('Rate limit exceeded') as Error & {
      status: number;
      retryAfter?: number;
      resetTime?: number;
    };
    error.status = 429;
    error.retryAfter = result.retryAfter;
    error.resetTime = result.resetTime;
    throw error;
  }

  return handler();
}