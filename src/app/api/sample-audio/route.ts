import { NextResponse } from 'next/server';

export async function GET() {
  // Return a simple audio tone for demo purposes
  // In a real implementation, you might serve a sample MP3 file
  
  const headers = new Headers();
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Content-Length', '0');
  headers.set('Cache-Control', 'public, max-age=3600');
  
  // Return empty response with proper headers
  // The frontend will handle this as a "no audio available" case
  return new NextResponse(null, {
    status: 204,
    headers
  });
}