/**
 * @jest-environment node
 */

import { GET } from '../songs/route';
import { NextRequest } from 'next/server';

// Mock the data factory and constants
jest.mock('@/lib/dataFactory', () => ({
  DataFactory: {
    getSongsByMood: jest.fn()
  }
}));

jest.mock('@/lib/constants', () => ({
  MOODS: [
    { id: 'chill', name: 'Chill', keywords: ['chill', 'relax'] },
    { id: 'hype', name: 'Hype', keywords: ['hype', 'energy'] }
  ]
}));

import { DataFactory } from '@/lib/dataFactory';

const mockDataFactory = DataFactory as jest.Mocked<typeof DataFactory>;

describe('/api/songs', () => {
  const mockSongs = [
    {
      id: 'song1',
      title: 'Chill Song',
      artist: 'Chill Artist',
      thumbnail: 'https://example.com/thumb1.jpg',
      duration: '3:30',
      mood: ['chill'],
      youtubeUrl: 'https://youtube.com/watch?v=test1'
    },
    {
      id: 'song2',
      title: 'Another Chill Song',
      artist: 'Another Artist',
      thumbnail: 'https://example.com/thumb2.jpg',
      duration: '4:15',
      mood: ['chill'],
      youtubeUrl: 'https://youtube.com/watch?v=test2'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataFactory.getSongsByMood.mockReturnValue(mockSongs);
  });

  it('returns songs for valid mood', async () => {
    const request = new NextRequest('http://localhost:3000/api/songs?mood=chill');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      songs: mockSongs,
      mood: 'chill',
      total: 2
    });
    expect(mockDataFactory.getSongsByMood).toHaveBeenCalledWith('chill');
  });

  it('returns all songs when no mood specified', async () => {
    const allSongs = [...mockSongs, {
      id: 'song3',
      title: 'Hype Song',
      artist: 'Hype Artist',
      thumbnail: 'https://example.com/thumb3.jpg',
      duration: '3:45',
      mood: ['hype'],
      youtubeUrl: 'https://youtube.com/watch?v=test3'
    }];

    mockDataFactory.getSongsByMood.mockReturnValue(allSongs);

    const request = new NextRequest('http://localhost:3000/api/songs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      songs: allSongs,
      mood: 'all',
      total: 3
    });
    expect(mockDataFactory.getSongsByMood).toHaveBeenCalledWith('all');
  });

  it('returns 400 for invalid mood', async () => {
    const request = new NextRequest('http://localhost:3000/api/songs?mood=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Invalid mood',
      validMoods: ['chill', 'hype']
    });
  });

  it('handles empty results', async () => {
    mockDataFactory.getSongsByMood.mockReturnValue([]);

    const request = new NextRequest('http://localhost:3000/api/songs?mood=chill');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      songs: [],
      mood: 'chill',
      total: 0
    });
  });

  it('handles data factory errors', async () => {
    mockDataFactory.getSongsByMood.mockImplementation(() => {
      throw new Error('Data factory error');
    });

    const request = new NextRequest('http://localhost:3000/api/songs?mood=chill');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch songs'
    });
  });

  it('supports limit parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/songs?mood=chill&limit=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.songs).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it('supports offset parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/songs?mood=chill&offset=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.songs).toHaveLength(1);
    expect(data.songs[0].id).toBe('song2');
  });

  it('validates limit parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/songs?mood=chill&limit=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid limit parameter');
  });

  it('validates offset parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/songs?mood=chill&offset=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid offset parameter');
  });

  it('handles case-insensitive mood parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/songs?mood=CHILL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mood).toBe('chill');
    expect(mockDataFactory.getSongsByMood).toHaveBeenCalledWith('chill');
  });
});