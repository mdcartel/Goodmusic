// Streaming utilities and validation

export interface StreamValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

export interface StreamMetadata {
  contentType: string;
  contentLength?: number;
  acceptRanges: boolean;
  duration?: number;
  bitrate?: number;
}

export class StreamingUtils {
  // Validate and sanitize stream URLs
  static validateStreamUrl(url: string): StreamValidationResult {
    try {
      const parsedUrl = new URL(url);
      
      // Check if it's a valid YouTube stream URL
      const validHosts = [
        'googlevideo.com',
        'youtube.com',
        'youtu.be',
        'ytimg.com'
      ];

      const isValidHost = validHosts.some(host => 
        parsedUrl.hostname.includes(host)
      );

      if (!isValidHost) {
        return {
          valid: false,
          error: 'Invalid stream URL host'
        };
      }

      // Check for required parameters
      if (parsedUrl.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Stream URL must use HTTPS'
        };
      }

      return {
        valid: true,
        sanitizedUrl: url
      };

    } catch {
      return {
        valid: false,
        error: 'Malformed stream URL'
      };
    }
  }

  // Parse range header for partial content requests
  static parseRangeHeader(rangeHeader: string, contentLength: number): {
    start: number;
    end: number;
    length: number;
  } | null {
    try {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) return null;

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : contentLength - 1;

      if (start >= contentLength || end >= contentLength || start > end) {
        return null;
      }

      return {
        start,
        end,
        length: end - start + 1
      };

    } catch {
      return null;
    }
  }

  // Generate appropriate headers for streaming response
  static generateStreamHeaders(
    contentType: string,
    contentLength?: number,
    range?: { start: number; end: number; length: number },
    totalLength?: number
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Cache-Control': 'public, max-age=3600'
    };

    if (range && totalLength) {
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${totalLength}`;
      headers['Content-Length'] = range.length.toString();
    } else if (contentLength) {
      headers['Content-Length'] = contentLength.toString();
    }

    return headers;
  }

  // Detect content type from URL or headers
  static detectContentType(url: string, responseHeaders?: Headers): string {
    // Check response headers first
    if (responseHeaders) {
      const contentType = responseHeaders.get('content-type');
      if (contentType) return contentType;
    }

    // Fallback to URL-based detection
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('mime=audio%2Fmp4') || urlLower.includes('mime=audio/mp4')) {
      return 'audio/mp4';
    }
    
    if (urlLower.includes('mime=audio%2Fwebm') || urlLower.includes('mime=audio/webm')) {
      return 'audio/webm';
    }
    
    if (urlLower.includes('mime=video%2Fmp4') || urlLower.includes('mime=video/mp4')) {
      return 'video/mp4';
    }
    
    if (urlLower.includes('mime=video%2Fwebm') || urlLower.includes('mime=video/webm')) {
      return 'video/webm';
    }

    // Default fallback
    return 'audio/mpeg';
  }

  // Check if stream URL is expired
  static isStreamExpired(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const expire = parsedUrl.searchParams.get('expire');
      
      if (!expire) return false;
      
      const expireTime = parseInt(expire, 10) * 1000; // Convert to milliseconds
      return Date.now() > expireTime;
      
    } catch {
      return true; // Assume expired if we can't parse
    }
  }

  // Extract quality information from stream URL
  static extractQualityInfo(url: string): {
    quality?: string;
    itag?: string;
    fps?: number;
    bitrate?: number;
  } {
    try {
      const parsedUrl = new URL(url);
      
      return {
        quality: parsedUrl.searchParams.get('quality') || undefined,
        itag: parsedUrl.searchParams.get('itag') || undefined,
        fps: parsedUrl.searchParams.get('fps') ? 
          parseInt(parsedUrl.searchParams.get('fps')!, 10) : undefined,
        bitrate: parsedUrl.searchParams.get('bitrate') ? 
          parseInt(parsedUrl.searchParams.get('bitrate')!, 10) : undefined
      };
      
    } catch {
      return {};
    }
  }

  // Generate a proxy URL for the stream
  static generateProxyUrl(streamUrl: string, baseUrl: string): string {
    const proxyUrl = new URL('/api/stream/proxy', baseUrl);
    proxyUrl.searchParams.set('url', streamUrl);
    return proxyUrl.toString();
  }

  // Validate stream response
  static async validateStreamResponse(response: Response): Promise<{
    valid: boolean;
    error?: string;
    metadata?: StreamMetadata;
  }> {
    try {
      if (!response.ok) {
        return {
          valid: false,
          error: `Stream response error: ${response.status} ${response.statusText}`
        };
      }

      const contentType = response.headers.get('content-type') || 'unknown';
      const contentLength = response.headers.get('content-length');
      const acceptRanges = response.headers.get('accept-ranges') === 'bytes';

      // Check if it's a valid media type
      const validTypes = ['audio/', 'video/'];
      const isValidType = validTypes.some(type => contentType.includes(type));

      if (!isValidType && !contentType.includes('octet-stream')) {
        return {
          valid: false,
          error: `Invalid content type: ${contentType}`
        };
      }

      const metadata: StreamMetadata = {
        contentType,
        contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
        acceptRanges
      };

      return {
        valid: true,
        metadata
      };

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Stream validation failed'
      };
    }
  }
}