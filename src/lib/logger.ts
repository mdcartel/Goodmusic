// Centralized logging system for VibePipe MVP

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000; // Keep last 1000 logs in memory

  private constructor() {
    this.logLevel = this.getLogLevel();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      requestId: this.getCurrentRequestId(),
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    return entry;
  }

  private getCurrentRequestId(): string | undefined {
    // In a real application, you might get this from async local storage
    // For now, we'll return undefined
    return undefined;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelEmoji = {
      [LogLevel.ERROR]: '🚨',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.DEBUG]: '🐛'
    };

    const levelName = LogLevel[entry.level];
    const emoji = levelEmoji[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    let logMessage = `${emoji} [${timestamp}] ${levelName}`;
    
    if (entry.context) {
      logMessage += ` [${entry.context}]`;
    }
    
    if (entry.requestId) {
      logMessage += ` [${entry.requestId}]`;
    }
    
    logMessage += `: ${entry.message}`;

    return logMessage;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output
    const formattedMessage = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        if (entry.data) {
          console.error('Error Data:', JSON.stringify(entry.data, null, 2));
        }
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        if (entry.data) {
          console.warn('Warning Data:', JSON.stringify(entry.data, null, 2));
        }
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        if (entry.data) {
          console.info('Info Data:', JSON.stringify(entry.data, null, 2));
        }
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        if (entry.data) {
          console.debug('Debug Data:', JSON.stringify(entry.data, null, 2));
        }
        break;
    }

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // TODO: Implement external logging service integration
    // Examples: Winston, Sentry, CloudWatch, Datadog, etc.
    
    // For now, we'll just store it for potential future use
    if (entry.level <= LogLevel.WARN) {
      // Only send warnings and errors to external service to reduce noise
      // this.externalLogger.log(entry);
    }
  }

  // Public logging methods
  public error(message: string, context?: string, data?: any, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, data, error);
    this.writeLog(entry);
  }

  public warn(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, data);
    this.writeLog(entry);
  }

  public info(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, data);
    this.writeLog(entry);
  }

  public debug(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, data);
    this.writeLog(entry);
  }

  // Specialized logging methods
  public apiRequest(method: string, path: string, statusCode: number, duration: number, requestId?: string): void {
    const message = `${method} ${path} - ${statusCode} (${duration}ms)`;
    const data = { method, path, statusCode, duration, requestId };
    
    if (statusCode >= 500) {
      this.error(message, 'API', data);
    } else if (statusCode >= 400) {
      this.warn(message, 'API', data);
    } else {
      this.info(message, 'API', data);
    }
  }

  public youtubeExtraction(videoId: string, success: boolean, duration?: number, error?: Error): void {
    const message = `YouTube extraction ${success ? 'succeeded' : 'failed'} for video ${videoId}`;
    const data = { videoId, success, duration };
    
    if (success) {
      this.info(message, 'YouTube', data);
    } else {
      this.error(message, 'YouTube', data, error);
    }
  }

  public downloadOperation(songId: string, format: string, status: 'started' | 'completed' | 'failed', error?: Error): void {
    const message = `Download ${status} for song ${songId} (${format})`;
    const data = { songId, format, status };
    
    switch (status) {
      case 'started':
        this.info(message, 'Download', data);
        break;
      case 'completed':
        this.info(message, 'Download', data);
        break;
      case 'failed':
        this.error(message, 'Download', data, error);
        break;
    }
  }

  public streamingOperation(songId: string, status: 'started' | 'completed' | 'failed', error?: Error): void {
    const message = `Streaming ${status} for song ${songId}`;
    const data = { songId, status };
    
    switch (status) {
      case 'started':
        this.debug(message, 'Streaming', data);
        break;
      case 'completed':
        this.debug(message, 'Streaming', data);
        break;
      case 'failed':
        this.error(message, 'Streaming', data, error);
        break;
    }
  }

  public chatbotInteraction(sessionId: string, userMessage: string, botResponse: string, processingTime: number): void {
    const message = `Chatbot interaction completed in ${processingTime}ms`;
    const data = { 
      sessionId, 
      userMessage: userMessage.substring(0, 100), // Truncate for privacy
      responseLength: botResponse.length,
      processingTime 
    };
    
    this.info(message, 'Chatbot', data);
  }

  // Utility methods
  public getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public getLogStats(): { total: number; byLevel: Record<string, number> } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        ERROR: 0,
        WARN: 0,
        INFO: 0,
        DEBUG: 0
      }
    };

    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName]++;
    });

    return stats;
  }

  // Performance monitoring
  public startTimer(label: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.debug(`Timer "${label}" completed in ${duration}ms`, 'Performance', { label, duration });
      return duration;
    };
  }

  // Memory and system monitoring
  public logSystemInfo(): void {
    const memoryUsage = process.memoryUsage();
    const systemInfo = {
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    this.info('System information', 'System', systemInfo);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const log = {
  error: (message: string, context?: string, data?: any, error?: Error) => 
    logger.error(message, context, data, error),
  warn: (message: string, context?: string, data?: any) => 
    logger.warn(message, context, data),
  info: (message: string, context?: string, data?: any) => 
    logger.info(message, context, data),
  debug: (message: string, context?: string, data?: any) => 
    logger.debug(message, context, data),
  
  // Specialized loggers
  api: (method: string, path: string, statusCode: number, duration: number, requestId?: string) =>
    logger.apiRequest(method, path, statusCode, duration, requestId),
  youtube: (videoId: string, success: boolean, duration?: number, error?: Error) =>
    logger.youtubeExtraction(videoId, success, duration, error),
  download: (songId: string, format: string, status: 'started' | 'completed' | 'failed', error?: Error) =>
    logger.downloadOperation(songId, format, status, error),
  streaming: (songId: string, status: 'started' | 'completed' | 'failed', error?: Error) =>
    logger.streamingOperation(songId, status, error),
  chatbot: (sessionId: string, userMessage: string, botResponse: string, processingTime: number) =>
    logger.chatbotInteraction(sessionId, userMessage, botResponse, processingTime),
  
  // Utilities
  timer: (label: string) => logger.startTimer(label),
  system: () => logger.logSystemInfo()
};