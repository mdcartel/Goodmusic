// Centralized error handling for API routes

import { NextRequest, NextResponse } from 'next/server';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, details);
  }
}

export class YouTubeExtractionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'YOUTUBE_EXTRACTION_ERROR', true, details);
  }
}

export class DownloadError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DOWNLOAD_ERROR', true, details);
  }
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: any;
    timestamp: string;
    path?: string;
    requestId?: string;
  };
  suggestion?: string;
}

// Generate user-friendly error suggestions
function getErrorSuggestion(error: ApiError): string | undefined {
  switch (error.code) {
    case 'YOUTUBE_EXTRACTION_ERROR':
      return 'Try refreshing the page or check if the video is still available on YouTube.';
    case 'DOWNLOAD_ERROR':
      return 'Check your internet connection and try downloading again.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Please wait a moment before making another request.';
    case 'VALIDATION_ERROR':
      return 'Please check your input and try again.';
    case 'NOT_FOUND':
      return 'The requested resource might have been moved or deleted.';
    case 'EXTERNAL_SERVICE_ERROR':
      return 'This appears to be a temporary issue. Please try again in a few minutes.';
    default:
      return undefined;
  }
}

// Main error handler function
export function handleApiError(
  error: unknown,
  request?: NextRequest,
  context?: { path?: string; requestId?: string }
): NextResponse<ErrorResponse> {
  let apiError: ApiError;

  // Convert unknown error to ApiError
  if (error instanceof AppError) {
    apiError = error;
  } else if (error instanceof Error) {
    // Handle known error types
    if (error.message.includes('yt-dlp')) {
      apiError = new YouTubeExtractionError(error.message);
    } else if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      apiError = new NotFoundError();
    } else if (error.message.includes('timeout')) {
      apiError = new ExternalServiceError('External', 'Request timeout');
    } else {
      apiError = new AppError(error.message, 500, 'INTERNAL_ERROR', false);
    }
  } else {
    apiError = new AppError('An unexpected error occurred', 500, 'UNKNOWN_ERROR', false);
  }

  // Log error for debugging
  logError(apiError, request, context);

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: apiError.message,
      code: apiError.code,
      statusCode: apiError.statusCode,
      details: process.env.NODE_ENV === 'development' ? apiError.details : undefined,
      timestamp: new Date().toISOString(),
      path: context?.path || request?.nextUrl?.pathname,
      requestId: context?.requestId || generateRequestId()
    },
    suggestion: getErrorSuggestion(apiError)
  };

  return NextResponse.json(errorResponse, { 
    status: apiError.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': errorResponse.error.requestId || ''
    }
  });
}

// Async wrapper for API route handlers
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args.find(arg => arg instanceof NextRequest) as NextRequest | undefined;
      return handleApiError(error, request);
    }
  };
}

// Middleware wrapper for API routes
export function apiErrorMiddleware(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Add request ID to headers for tracking
      const response = await handler(request, { ...context, requestId });
      
      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - startTime;
        console.log(`✅ ${request.method} ${request.nextUrl.pathname} - ${response.status} (${duration}ms) [${requestId}]`);
      }

      return response;
    } catch (error) {
      return handleApiError(error, request, { 
        path: request.nextUrl.pathname, 
        requestId 
      });
    }
  };
}

// Error logging function
function logError(
  error: ApiError, 
  request?: NextRequest, 
  context?: { path?: string; requestId?: string }
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: context?.requestId,
    path: context?.path || request?.nextUrl?.pathname,
    method: request?.method,
    userAgent: request?.headers.get('user-agent'),
    ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip'),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      isOperational: error.isOperational,
      details: error.details
    }
  };

  // Log based on error severity
  if (error.statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(logData, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('⚠️ Client Error:', JSON.stringify(logData, null, 2));
  } else {
    console.info('ℹ️ Info:', JSON.stringify(logData, null, 2));
  }

  // In production, you would send this to your logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service (e.g., Winston, Sentry, CloudWatch)
    // logToExternalService(logData);
  }
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validation helper
export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, { missing });
  }
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): void {
  const now = Date.now();
  const key = identifier;
  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (current.count >= maxRequests) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((current.resetTime - now) / 1000)} seconds.`);
  }

  current.count++;
}

// Health check helper
export function createHealthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
}