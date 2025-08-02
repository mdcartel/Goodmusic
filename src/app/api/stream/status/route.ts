import { NextResponse } from 'next/server';
import { ExtractionService } from '@/lib/extractionService';
import { RateLimiter } from '@/lib/rateLimiter';

export async function GET() {
  try {
    const extractionService = ExtractionService.getInstance();
    const rateLimiter = RateLimiter.getInstance();

    const extractionStats = extractionService.getStats();
    const rateLimitStats = rateLimiter.getStats();

    const status = {
      streaming: {
        healthy: true,
        activeExtractions: extractionStats.activeExtractions,
        cacheSize: extractionStats.cacheSize,
        timestamp: new Date().toISOString()
      },
      rateLimiting: {
        activeClients: rateLimitStats.activeEntries,
        totalRequests: rateLimitStats.totalRequests
      },
      endpoints: {
        '/api/stream/[songId]': 'Get stream URL for a specific song',
        '/api/stream/proxy': 'Proxy stream with CORS headers',
        '/api/stream/status': 'Service status and statistics'
      },
      limits: {
        streamRequests: '30 per minute per client',
        extractRequests: '10 per minute per client',
        downloadRequests: '5 per minute per client'
      }
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Error getting stream status:', error);
    
    return NextResponse.json(
      {
        streaming: {
          healthy: false,
          error: error instanceof Error ? error.message : 'Status check failed',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}