// Test utilities for YouTube extraction service

import { ExtractionService } from './extractionService';

export interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
  data?: Record<string, unknown>;
}

export class ExtractionTester {
  private extractionService: ExtractionService;

  constructor() {
    this.extractionService = ExtractionService.getInstance();
  }

  async testBasicExtraction(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test with a known working video (Rick Roll - always available)
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = await this.extractionService.extractVideoInfo(testUrl, {
        timeout: 15000
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        return {
          success: true,
          duration,
          data: {
            title: result.data.title,
            duration: result.data.duration,
            id: result.data.id,
            cached: result.cached
          }
        };
      } else {
        return {
          success: false,
          duration,
          error: result.error || 'Unknown extraction error'
        };
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }

  async testStreamUrlExtraction(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = await this.extractionService.getStreamUrl(testUrl, 'best[height<=480]');

      const duration = Date.now() - startTime;

      if (result.success && result.streamUrl) {
        return {
          success: true,
          duration,
          data: {
            streamUrl: result.streamUrl.substring(0, 100) + '...', // Truncate for display
            hasValidUrl: result.streamUrl.startsWith('http')
          }
        };
      } else {
        return {
          success: false,
          duration,
          error: result.error || 'Failed to get stream URL'
        };
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Stream test failed'
      };
    }
  }

  async testInvalidUrl(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const invalidUrl = 'https://www.youtube.com/watch?v=invalid123';
      const result = await this.extractionService.extractVideoInfo(invalidUrl, {
        timeout: 10000
      });

      const duration = Date.now() - startTime;

      // This should fail, so success = false is expected
      return {
        success: !result.success, // Inverted because we expect failure
        duration,
        data: {
          expectedFailure: true,
          actualResult: result.success,
          error: result.error
        }
      };
    } catch (error) {
      return {
        success: true, // Exception is expected for invalid URL
        duration: Date.now() - startTime,
        data: {
          expectedFailure: true,
          error: error instanceof Error ? error.message : 'Expected error'
        }
      };
    }
  }

  async testCaching(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // First request (should not be cached)
      const firstResult = await this.extractionService.extractVideoInfo(testUrl);
      const firstTime = Date.now();
      
      // Second request (should be cached)
      const secondResult = await this.extractionService.extractVideoInfo(testUrl);
      const secondTime = Date.now();

      const totalDuration = secondTime - startTime;
      const firstDuration = firstTime - startTime;
      const secondDuration = secondTime - firstTime;

      return {
        success: firstResult.success && secondResult.success && secondResult.cached === true,
        duration: totalDuration,
        data: {
          firstRequestCached: firstResult.cached || false,
          secondRequestCached: secondResult.cached || false,
          firstDuration,
          secondDuration,
          speedImprovement: firstDuration > 0 ? ((firstDuration - secondDuration) / firstDuration * 100).toFixed(1) + '%' : 'N/A'
        }
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Caching test failed'
      };
    }
  }

  async runAllTests(): Promise<{
    overall: boolean;
    results: {
      basicExtraction: TestResult;
      streamUrl: TestResult;
      invalidUrl: TestResult;
      caching: TestResult;
    };
    stats: Record<string, unknown>;
  }> {
    console.log('Running YouTube extraction tests...');

    const results = {
      basicExtraction: await this.testBasicExtraction(),
      streamUrl: await this.testStreamUrlExtraction(),
      invalidUrl: await this.testInvalidUrl(),
      caching: await this.testCaching()
    };

    const overall = Object.values(results).every(result => result.success);
    const stats = this.extractionService.getStats();

    return {
      overall,
      results,
      stats
    };
  }
}

// Utility function for API testing
export async function runExtractionTests() {
  const tester = new ExtractionTester();
  return await tester.runAllTests();
}