import { NextResponse } from 'next/server';
import { DataFactory } from '@/lib/dataFactory';
import { validateSong, validateMood, validateDownload, validateChatMessage } from '@/lib/validation';
import { mockSongs, mockMoods } from '@/lib/mockData';
import { extendedMockSongs, mockDownloads, mockChatMessages } from '@/lib/mockDataExtended';

export async function GET() {
  try {
    // Test data validation
    const validationResults = {
      songs: {
        mockSongs: mockSongs.every(validateSong),
        extendedSongs: extendedMockSongs.every(validateSong),
        total: mockSongs.length + extendedMockSongs.length
      },
      moods: {
        valid: mockMoods.every(validateMood),
        total: mockMoods.length
      },
      downloads: {
        valid: mockDownloads.every(validateDownload),
        total: mockDownloads.length
      },
      chatMessages: {
        valid: mockChatMessages.every(validateChatMessage),
        total: mockChatMessages.length
      }
    };

    // Test data factory
    const factoryTests = {
      createSong: (() => {
        try {
          const song = DataFactory.createSong({
            title: 'Test Factory Song',
            thumbnail: 'https://example.com/thumb.jpg',
            duration: '3:30',
            mood: ['test'],
            youtubeUrl: 'https://www.youtube.com/watch?v=test'
          });
          return { success: true, id: song.id };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })(),
      
      createDownload: (() => {
        try {
          const download = DataFactory.createDownload({
            songId: 'test-song',
            format: 'mp3'
          });
          return { success: true, id: download.id };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })(),
      
      createUserMessage: (() => {
        try {
          const message = DataFactory.createUserMessage('Test message');
          return { success: true, id: message.id };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })()
    };

    // Test mood filtering
    const moodFilterTest = {
      chillSongs: [...mockSongs, ...extendedMockSongs].filter(song => song.mood.includes('chill')).length,
      hypeSongs: [...mockSongs, ...extendedMockSongs].filter(song => song.mood.includes('hype')).length,
      heartbreakSongs: [...mockSongs, ...extendedMockSongs].filter(song => song.mood.includes('heartbreak')).length
    };

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      validation: validationResults,
      factory: factoryTests,
      moodFiltering: moodFilterTest,
      summary: {
        allValidationsPass: Object.values(validationResults).every(result => 
          typeof result === 'object' && 'valid' in result ? result.valid : 
          typeof result === 'object' && 'mockSongs' in result ? result.mockSongs && result.extendedSongs : false
        ),
        allFactoryTestsPass: Object.values(factoryTests).every(test => test.success),
        totalDataItems: validationResults.songs.total + validationResults.moods.total + 
                       validationResults.downloads.total + validationResults.chatMessages.total
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in data test:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}