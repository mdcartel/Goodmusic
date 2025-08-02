// Mock streaming endpoint for development when yt-dlp is not available
// This provides sample audio files for testing the streaming functionality

import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    videoId: string;
  };
}

// Sample audio URLs for testing (using free audio samples)
const SAMPLE_AUDIO_URLS = [
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav',
  'https://www.soundjay.com/misc/sounds/success-fanfare-trumpets.wav',
  'https://file-examples.com/storage/fe68c1b7c1a9fd42b4c2bb7/2017/11/file_example_MP3_700KB.mp3',
  'https://file-examples.com/storage/fe68c1b7c1a9fd42b4c2bb7/2017/11/file_example_MP3_1MG.mp3'
];

// GET /api/mock-stream/[videoId] - Provide mock streaming URL
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { videoId } = params;
    const { searchParams } = new URL(request.url);
    const quality = searchParams.get('quality') || 'best';

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Select a sample audio URL based on video ID (for consistency)
    const urlIndex = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % SAMPLE_AUDIO_URLS.length;
    const mockStreamUrl = SAMPLE_AUDIO_URLS[urlIndex];

    // Return mock stream information
    const response = {
      success: true,
      videoId,
      streamUrl: mockStreamUrl,
      quality,
      format: 'audio',
      duration: 30, // Mock 30 second duration
      title: `Mock Audio Sample ${videoId}`,
      note: 'This is a mock stream URL for development. Install yt-dlp for real YouTube streaming.',
      timestamp: new Date().toISOString()
    };

    // Set appropriate headers
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'Content-Type': 'application/json'
    });

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('Mock streaming error:', error);
    return NextResponse.json(
      { 
        error: 'Mock streaming failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}