import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid YouTube URL'
      }, { status: 400 });
    }

    // Check if we're in Vercel environment
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      // In Vercel, return mock data for demo purposes
      const mockInfo = generateMockInfo(url);
      return NextResponse.json({
        success: true,
        info: mockInfo,
        mock: true,
        message: 'Demo mode - using mock data in Vercel environment'
      });
    }

    // For local development, try to extract info using yt-dlp
    try {
      const info = await extractVideoInfo(url);
      return NextResponse.json({
        success: true,
        info
      });
    } catch (ytdlpError) {
      console.warn('yt-dlp extraction failed, using mock data:', ytdlpError);
      
      // Return mock data if yt-dlp fails
      const mockInfo = generateMockInfo(url);
      
      return NextResponse.json({
        success: true,
        info: mockInfo,
        mock: true,
        message: 'yt-dlp not available - using mock data'
      });
    }
  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

function generateMockInfo(url: string) {
  // Extract video ID from URL for more realistic mock data
  const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : 'mock_' + Date.now();
  
  return {
    id: videoId,
    title: 'Demo Audio Track - GoodMusic',
    uploader: 'GoodMusic Demo',
    duration: 180,
    thumbnail: '/api/placeholder-thumbnail',
    url: '/api/sample-audio',
    formats: [{
      format_id: 'demo',
      ext: 'mp3',
      quality: 'medium',
      filesize: 3145728
    }]
  };
}

async function extractVideoInfo(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      
      const args = [
        '--dump-json',
        '--no-playlist',
        '--format', 'best[ext=mp4]/best',
        url
      ];
      
      const ytdlp = spawn('yt-dlp', args);
      let output = '';
      let error = '';
      
      ytdlp.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      ytdlp.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });
      
      ytdlp.on('close', (code: number) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve(info);
          } catch (parseError) {
            reject(new Error(`Failed to parse yt-dlp output: ${parseError}`));
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${error}`));
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        ytdlp.kill();
        reject(new Error('yt-dlp extraction timeout'));
      }, 30000);
    } catch (error) {
      reject(new Error(`Failed to spawn yt-dlp: ${error}`));
    }
  });
}

