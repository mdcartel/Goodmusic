// Logs API endpoint for debugging (development only)

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorMiddleware, ValidationError, ForbiddenError } from '@/lib/errorHandler';
import { log, logger, LogLevel } from '@/lib/logger';

async function getLogsHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenError('Logs endpoint is only available in development mode');
    }

    const { searchParams } = new URL(request.url);
    const levelParam = searchParams.get('level');
    const limitParam = searchParams.get('limit');
    const clearParam = searchParams.get('clear');

    log.debug('Logs requested', 'Logs', { level: levelParam, limit: limitParam, clear: clearParam });

    // Handle clear logs request
    if (clearParam === 'true') {
      logger.clearLogs();
      log.info('Logs cleared', 'Logs');
      return NextResponse.json({
        success: true,
        message: 'Logs cleared successfully'
      });
    }

    // Parse parameters
    let level: LogLevel | undefined;
    if (levelParam) {
      const levelMap: Record<string, LogLevel> = {
        'error': LogLevel.ERROR,
        'warn': LogLevel.WARN,
        'info': LogLevel.INFO,
        'debug': LogLevel.DEBUG
      };
      
      level = levelMap[levelParam.toLowerCase()];
      if (level === undefined) {
        throw new ValidationError(`Invalid log level: ${levelParam}. Valid levels: error, warn, info, debug`);
      }
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      throw new ValidationError('Limit must be a number between 1 and 1000');
    }

    // Get logs
    const logs = logger.getLogs(level, limit);
    const stats = logger.getLogStats();

    const duration = Date.now() - startTime;
    log.debug('Logs fetched successfully', 'Logs', { 
      count: logs.length, 
      level: levelParam || 'all',
      duration 
    });

    return NextResponse.json({
      success: true,
      data: {
        logs,
        stats,
        filters: {
          level: levelParam || 'all',
          limit
        },
        meta: {
          total: logs.length,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Failed to fetch logs', 'Logs', { duration }, error as Error);
    throw error; // Re-throw to be handled by middleware
  }
}

async function deleteLogsHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenError('Logs endpoint is only available in development mode');
    }

    log.info('Clearing all logs', 'Logs');
    logger.clearLogs();

    const duration = Date.now() - startTime;
    log.info('Logs cleared successfully', 'Logs', { duration });

    return NextResponse.json({
      success: true,
      message: 'All logs cleared successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Failed to clear logs', 'Logs', { duration }, error as Error);
    throw error; // Re-throw to be handled by middleware
  }
}

// GET /api/logs - Get system logs (development only)
export const GET = apiErrorMiddleware(getLogsHandler);

// DELETE /api/logs - Clear all logs (development only)
export const DELETE = apiErrorMiddleware(deleteLogsHandler);