import { NextResponse } from 'next/server';

export async function GET() {
  // Generate a simple SVG placeholder thumbnail
  const svg = `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="180" fill="#1f2937"/>
      <circle cx="160" cy="90" r="30" fill="#6366f1"/>
      <polygon points="150,75 150,105 175,90" fill="white"/>
      <text x="160" y="130" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">
        VibePipe Demo
      </text>
    </svg>
  `;
  
  const headers = new Headers();
  headers.set('Content-Type', 'image/svg+xml');
  headers.set('Cache-Control', 'public, max-age=86400');
  
  return new NextResponse(svg, { headers });
}