import { NextRequest, NextResponse } from 'next/server';
import { mockSongs } from '@/lib/mockData';
import { extendedMockSongs } from '@/lib/mockDataExtended';
import { SongsResponse } from '@/types';
import { validateMoodQuery, validatePaginationParams, validateSongArray } from '@/lib/validation';
import { apiErrorMiddleware, ValidationError, NotFoundError } from '@/lib/errorHandler';
import { log } from '@/lib/logger';

// Combine all mock songs for testing
const allMockSongs = [...mockSongs, ...extendedMockSongs];

async function getSongsHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const moodParam = searchParams.get('mood');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    log.debug('Fetching songs', 'API', { mood: moodParam, page: pageParam, limit: limitParam });
    
    // Validate and sanitize inputs
    const mood = validateMoodQuery(moodParam);
    const { page, limit } = validatePaginationParams(pageParam, limitParam);
    
    // Validate all songs before filtering
    const validSongs = validateSongArray(allMockSongs);
    
    if (validSongs.length === 0) {
      throw new NotFoundError('No songs available');
    }
    
    // Filter by mood if specified
    let filteredSongs = validSongs;
    if (mood) {
      filteredSongs = validSongs.filter(song => 
        song.mood.includes(mood)
      );
      
      if (filteredSongs.length === 0) {
        log.info(`No songs found for mood: ${mood}`, 'API');
        // Don't throw error, just return empty results
      }
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSongs = filteredSongs.slice(startIndex, endIndex);
    
    const response: SongsResponse = {
      songs: paginatedSongs,
      mood: mood || 'all',
      total: filteredSongs.length
    };
    
    const duration = Date.now() - startTime;
    log.info(`Songs fetched successfully`, 'API', { 
      mood: mood || 'all', 
      count: paginatedSongs.length, 
      total: filteredSongs.length,
      duration 
    });
    
    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Failed to fetch songs', 'API', { duration }, error as Error);
    throw error; // Re-throw to be handled by middleware
  }
}

export const GET = apiErrorMiddleware(getSongsHandler);