import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    // Check if yt-dlp is available
    execSync('yt-dlp --version', { stdio: 'pipe' });
    
    return NextResponse.json({
      success: true,
      available: true,
      message: 'yt-dlp is available'
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      available: false,
      message: 'yt-dlp not available, using mock data'
    });
  }
}