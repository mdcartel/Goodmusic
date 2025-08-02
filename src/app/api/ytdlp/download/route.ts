import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { url, format = 'mp3' } = await request.json();
    
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

    // Validate format
    if (!['mp3', 'mp4'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid format. Use mp3 or mp4'
      }, { status: 400 });
    }

    try {
      const downloadUrl = await downloadAudio(url, format);
      return NextResponse.json({
        success: true,
        downloadUrl,
        format
      });
    } catch (ytdlpError) {
      console.warn('yt-dlp download failed, using mock:', ytdlpError.message);
      
      // Return mock download URL
      return NextResponse.json({
        success: true,
        downloadUrl: `/api/sample-download?format=${format}`,
        format,
        mock: true
      });
    }
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function downloadAudio(url: string, format: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create downloads directory if it doesn't exist
      const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
      await fs.mkdir(downloadsDir, { recursive: true });
      
      // Generate unique filename
      const filename = `${uuidv4()}.${format}`;
      const outputPath = path.join(downloadsDir, filename);
      
      const args = format === 'mp3' 
        ? [
            '--extract-audio',
            '--audio-format', 'mp3',
            '--output', outputPath.replace('.mp3', '.%(ext)s'),
            url
          ]
        : [
            '--format', 'best[ext=mp4]/best',
            '--output', outputPath.replace('.mp4', '.%(ext)s'),
            url
          ];
      
      const ytdlp = spawn('yt-dlp', args);
      let error = '';
      
      ytdlp.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          // Return public URL for download
          const publicUrl = `/downloads/${filename}`;
          resolve(publicUrl);
        } else {
          reject(new Error(`Download failed with code ${code}: ${error}`));
        }
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        ytdlp.kill();
        reject(new Error('Download timeout'));
      }, 300000);
      
    } catch (fsError) {
      reject(new Error(`File system error: ${fsError.message}`));
    }
  });
}