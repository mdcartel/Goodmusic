/**
 * YouTube URL utilities for video ID extraction and validation
 */

export interface YouTubeVideoInfo {
  videoId: string;
  url: string;
  isValid: boolean;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmedInput = input.trim();

  // Direct video ID (11 characters, alphanumeric + _ and -)
  const directIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (directIdPattern.test(trimmedInput)) {
    return trimmedInput;
  }

  // YouTube URL patterns
  const patterns = [
    // Standard watch URL
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URL
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // YouTube Music
    /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Mobile URL
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Gaming URL
    /(?:gaming\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmedInput.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate if a string is a valid YouTube URL or video ID
 */
export function validateYouTubeUrl(input: string): boolean {
  return extractVideoId(input) !== null;
}

/**
 * Get YouTube video info from URL or video ID
 */
export function getVideoInfo(input: string): YouTubeVideoInfo {
  const videoId = extractVideoId(input);
  const isValid = videoId !== null;

  return {
    videoId: videoId || '',
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
    isValid,
  };
}

/**
 * Generate YouTube thumbnail URL
 */
export function getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
  if (!videoId || !validateVideoId(videoId)) {
    return '';
  }

  const qualityMap = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg',
    high: 'hqdefault.jpg',
    standard: 'sddefault.jpg',
    maxres: 'maxresdefault.jpg',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
}

/**
 * Validate video ID format
 */
export function validateVideoId(videoId: string): boolean {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }

  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  return videoIdPattern.test(videoId);
}

/**
 * Generate various YouTube URLs for a video ID
 */
export function generateUrls(videoId: string) {
  if (!validateVideoId(videoId)) {
    throw new Error('Invalid video ID');
  }

  return {
    watch: `https://www.youtube.com/watch?v=${videoId}`,
    short: `https://youtu.be/${videoId}`,
    embed: `https://www.youtube.com/embed/${videoId}`,
    music: `https://music.youtube.com/watch?v=${videoId}`,
    mobile: `https://m.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Parse YouTube URL parameters
 */
export function parseUrlParameters(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  } catch {
    return {};
  }
}

/**
 * Get playlist ID from YouTube URL if present
 */
export function extractPlaylistId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('list');
  } catch {
    return null;
  }
}

/**
 * Get timestamp from YouTube URL if present
 */
export function extractTimestamp(url: string): number | null {
  try {
    const urlObj = new URL(url);
    const t = urlObj.searchParams.get('t');
    const start = urlObj.searchParams.get('start');
    
    if (t) {
      // Parse formats like "1m30s", "90s", "90"
      const timeMatch = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1] || '0');
        const minutes = parseInt(timeMatch[2] || '0');
        const seconds = parseInt(timeMatch[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
      }
      
      // Just a number
      const numericTime = parseInt(t);
      if (!isNaN(numericTime)) {
        return numericTime;
      }
    }
    
    if (start) {
      const startTime = parseInt(start);
      if (!isNaN(startTime)) {
        return startTime;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Format seconds to YouTube timestamp format
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h${minutes}m${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Check if URL is a YouTube domain
 */
export function isYouTubeDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    const youtubeDomains = [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'gaming.youtube.com',
      'youtu.be',
    ];
    
    return youtubeDomains.includes(hostname);
  } catch {
    return false;
  }
}

/**
 * Sanitize video title for filename
 */
export function sanitizeTitle(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
}

/**
 * Generate safe filename from video info
 */
export function generateFilename(title: string, artist?: string, videoId?: string, extension: string = 'mp3'): string {
  const sanitizedTitle = sanitizeTitle(title);
  const sanitizedArtist = artist ? sanitizeTitle(artist) : '';
  
  let filename = '';
  
  if (sanitizedArtist && sanitizedTitle) {
    filename = `${sanitizedArtist} - ${sanitizedTitle}`;
  } else if (sanitizedTitle) {
    filename = sanitizedTitle;
  } else if (videoId) {
    filename = videoId;
  } else {
    filename = 'unknown';
  }
  
  // Ensure filename is not empty and add extension
  filename = filename || 'unknown';
  
  // Remove extension if already present
  const extensionRegex = new RegExp(`\\.${extension}$`, 'i');
  filename = filename.replace(extensionRegex, '');
  
  return `${filename}.${extension}`;
}