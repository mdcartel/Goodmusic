import { NextResponse } from 'next/server';
import { runExtractionTests } from '@/lib/testExtraction';

export async function GET() {
  try {
    const testResults = await runExtractionTests();

    return NextResponse.json({
      status: testResults.overall ? 'success' : 'partial_failure',
      timestamp: new Date().toISOString(),
      results: testResults.results,
      stats: testResults.stats,
      summary: {
        totalTests: Object.keys(testResults.results).length,
        passed: Object.values(testResults.results).filter(r => r.success).length,
        failed: Object.values(testResults.results).filter(r => !r.success).length,
        averageDuration: Math.round(
          Object.values(testResults.results).reduce((sum, r) => sum + r.duration, 0) / 
          Object.keys(testResults.results).length
        )
      }
    });
  } catch (error) {
    console.error('Error running extraction tests:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Test execution failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}