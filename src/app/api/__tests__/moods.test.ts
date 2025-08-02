/**
 * @jest-environment node
 */

import { GET } from '../moods/route';
import { NextRequest } from 'next/server';

// Mock the constants
jest.mock('@/lib/constants', () => ({
  MOODS: [
    {
      id: 'chill',
      name: 'Chill',
      emoji: '😌',
      color: 'bg-blue-500',
      description: 'Relaxed and peaceful vibes',
      keywords: ['chill', 'relax', 'calm']
    },
    {
      id: 'hype',
      name: 'Hype',
      emoji: '🔥',
      color: 'bg-orange-500',
      description: 'High energy and motivational',
      keywords: ['hype', 'energy', 'pump']
    },
    {
      id: 'focus',
      name: 'Focus',
      emoji: '🎯',
      color: 'bg-green-500',
      description: 'Concentration and productivity',
      keywords: ['focus', 'study', 'work']
    }
  ]
}));

describe('/api/moods', () => {
  it('returns all available moods', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('moods');
    expect(data.moods).toHaveLength(3);
    
    // Check structure of first mood
    const firstMood = data.moods[0];
    expect(firstMood).toHaveProperty('id');
    expect(firstMood).toHaveProperty('name');
    expect(firstMood).toHaveProperty('emoji');
    expect(firstMood).toHaveProperty('color');
    expect(firstMood).toHaveProperty('description');
    expect(firstMood).toHaveProperty('keywords');
    expect(Array.isArray(firstMood.keywords)).toBe(true);
  });

  it('returns moods with correct data structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods');
    const response = await GET(request);
    const data = await response.json();

    const chillMood = data.moods.find((mood: any) => mood.id === 'chill');
    expect(chillMood).toEqual({
      id: 'chill',
      name: 'Chill',
      emoji: '😌',
      color: 'bg-blue-500',
      description: 'Relaxed and peaceful vibes',
      keywords: ['chill', 'relax', 'calm']
    });
  });

  it('includes all expected mood properties', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods');
    const response = await GET(request);
    const data = await response.json();

    data.moods.forEach((mood: any) => {
      expect(mood).toHaveProperty('id');
      expect(mood).toHaveProperty('name');
      expect(mood).toHaveProperty('emoji');
      expect(mood).toHaveProperty('color');
      expect(mood).toHaveProperty('description');
      expect(mood).toHaveProperty('keywords');
      
      expect(typeof mood.id).toBe('string');
      expect(typeof mood.name).toBe('string');
      expect(typeof mood.emoji).toBe('string');
      expect(typeof mood.color).toBe('string');
      expect(typeof mood.description).toBe('string');
      expect(Array.isArray(mood.keywords)).toBe(true);
    });
  });

  it('returns consistent response format', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toEqual({
      moods: expect.any(Array)
    });
  });

  it('sets correct content type header', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods');
    const response = await GET(request);

    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('returns 200 status code', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('handles request without query parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.moods).toHaveLength(3);
  });

  it('ignores query parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/moods?someParam=value');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.moods).toHaveLength(3);
  });

  it('returns moods in consistent order', async () => {
    const request1 = new NextRequest('http://localhost:3000/api/moods');
    const response1 = await GET(request1);
    const data1 = await response1.json();

    const request2 = new NextRequest('http://localhost:3000/api/moods');
    const response2 = await GET(request2);
    const data2 = await response2.json();

    expect(data1.moods).toEqual(data2.moods);
  });
});