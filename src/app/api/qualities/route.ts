import { NextRequest, NextResponse } from 'next/server';
import { ExtractionService } from '@/lib/extractionService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    const extractionService = ExtractionService.getInstance();
    const result = await extractionService.getVideoQualities(youtubeUrl);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to get video qualities' },
        { status: 400 }
      );
    }

    // Filter and organize qualities
    const audioQualities = result.qualities?.filter(q => 
      q.acodec && q.acodec !== 'none' && (!q.vcodec || q.vcodec === 'none')
    ) || [];

    const videoQualities = result.qualities?.filter(q => 
      q.vcodec && q.vcodec !== 'none' && q.acodec && q.acodec !== 'none'
    ) || [];

    return NextResponse.json({
      success: true,
      qualities: {
        audio: audioQualities.slice(0, 5), // Limit to top 5
        video: videoQualities.slice(0, 10), // Limit to top 10
        all: result.qualities?.slice(0, 20) || [] // All formats, limited
      }
    });

  } catch (error) {
    console.error('Error getting video qualities:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get qualities' },
      { status: 500 }
    );
  }
}