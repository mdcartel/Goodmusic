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

    try {
      const streamUrl = await getStreamUrl(url);
      return NextResponse.json({
        success: true,
        streamUrl
      });
    } catch (ytdlpError) {
      console.warn('yt-dlp stream extraction failed, using mock:', ytdlpError.message);
      
      // Return mock stream URL
      return NextResponse.json({
        success: true,
        streamUrl: '/api/sample-audio',
        mock: true
      });
    }
  } catch (error) {
    console.error('Stream API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

function getStreamUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '--get-url',
      '--format', 'bestaudio[ext=m4a]/bestaudio/best',
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
        const streamUrl = output.trim();
        if (streamUrl) {
          resolve(streamUrl);
        } else {
          reject(new Error('No stream URL returned'));
        }
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${error}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      ytdlp.kill();
      reject(new Error('yt-dlp stream extraction timeout'));
    }, 30000);
  });
}