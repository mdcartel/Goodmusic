import { NextRequest, NextResponse } from 'next/server';
import { ChannelService } from '../../../lib/services/channelService';
import { YouTubeChannelScraper } from '../../../lib/services/youtubeChannelScraper';
import path from 'path';

const channelService = ChannelService.getInstance(
  path.join(process.cwd(), 'data', 'goodmusic.db')
);

const channelScraper = YouTubeChannelScraper.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filter: any = {};
    const sort: any = {};
    
    // Parse filter parameters
    if (searchParams.get('search')) {
      filter.search = searchParams.get('search');
    }
    
    if (searchParams.get('is_subscribed')) {
      filter.is_subscribed = searchParams.get('is_subscribed') === 'true';
    }
    
    if (searchParams.get('verified')) {
      filter.verified = searchParams.get('verified') === 'true';
    }
    
    if (searchParams.get('category')) {
      filter.category = searchParams.get('category');
    }
    
    if (searchParams.get('country')) {
      filter.country = searchParams.get('country');
    }
    
    if (searchParams.get('language')) {
      filter.language = searchParams.get('language');
    }

    // Parse sort parameters
    if (searchParams.get('sort_field')) {
      sort.field = searchParams.get('sort_field');
    }
    
    if (searchParams.get('sort_order')) {
      sort.order = searchParams.get('sort_order');
    }

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const channels = await channelService.getChannels(
      Object.keys(filter).length > 0 ? filter : undefined,
      Object.keys(sort).length > 0 ? sort : undefined,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      data: channels
    });

  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get channels',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel_url, scrape_data = true } = body;

    if (!channel_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel URL is required'
        },
        { status: 400 }
      );
    }

    let channelData: any = {
      youtube_id: channel_url // Will be processed by upsertChannel
    };

    // Scrape channel data if requested
    if (scrape_data) {
      const scrapingResult = await channelScraper.scrapeChannel(channel_url);
      
      if (scrapingResult.success) {
        channelData = {
          ...channelData,
          ...scrapingResult.channel
        };
      } else {
        console.warn('Channel scraping failed:', sc