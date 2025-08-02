import { NextRequest, NextResponse } from 'next/server';
import { mockMoods } from '@/lib/mockData';
import { MoodsResponse } from '@/types';
import { validateMoodArray } from '@/lib/validation';
import { apiErrorMiddleware, NotFoundError } from '@/lib/errorHandler';
import { log } from '@/lib/logger';

async function getMoodsHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    log.debug('Fetching moods', 'API');
    
    // Validate all moods before returning
    const validMoods = validateMoodArray(mockMoods);
    
    if (validMoods.length === 0) {
      throw new NotFoundError('No moods available');
    }
    
    const response: MoodsResponse = {
      moods: validMoods
    };
    
    const duration = Date.now() - startTime;
    log.info('Moods fetched successfully', 'API', { 
      count: validMoods.length, 
      duration 
    });
    
    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Failed to fetch moods', 'API', { duration }, error as Error);
    throw error; // Re-throw to be handled by middleware
  }
}

export const GET = apiErrorMiddleware(getMoodsHandler);