import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

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

    // Try to extract info using yt-dlp
    try {
      const info = await extractVideoInfo(url);
      return NextResponse.json({
        success: true,
        info
      });
    } catch (ytdlpError) {
      console.warn('yt-dlp extraction failed, using mock data:', ytdlpError.message);
      
      // Return mock data if yt-dlp fails
      const mockInfo = {
        id: 'mock_' + Date.now(),
        title: 'Sample Audio Track',
        uploader: 'VibePipe Demo',
        duration: 180,
        thumbnail: '/api/placeholder-thumbnail',
        url: '/api/sample-audio',
        formats: [{
          format_id: 'mock',
          ext: 'mp3',
          quality: 'medium',
          filesize: 3145728
        }]
      };
      
      return NextResponse.json({
        success: true,
        info: mockInfo,
        mock: true
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

function extractVideoInfo(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--format', 'best[ext=mp4]/best',
      url
    ];
    
    const ytdlp = spawn('yt-dlp', args);
    let output = '';
    let error = '';
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          resolve(info);
        } catch (parseError) {
          reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`));
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
  });
}