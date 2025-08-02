import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    ytdlp: false
  };

  // Check yt-dlp availability
  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
    health.ytdlp = true;
  } catch (error) {
    health.ytdlp = false;
  }

  return NextResponse.json(health);
}