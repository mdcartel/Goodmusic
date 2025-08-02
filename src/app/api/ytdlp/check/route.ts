import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In Vercel environment, we'll use mock data for now
    // yt-dlp requires special setup for serverless environments
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'Running in Vercel environment - using mock data for demo',
        environment: 'vercel'
      });
    }

    // For local development, try to check yt-dlp
    try {
      const { execSync } = require('child_process');
      execSync('yt-dlp --version', { stdio: 'pipe' });
      
      return NextResponse.json({
        success: true,
        available: true,
        message: 'yt-dlp is available',
        environment: 'local'
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'yt-dlp not available, using mock data',
        environment: 'local'
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: true,
      available: false,
      message: 'Using mock data for demo',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}