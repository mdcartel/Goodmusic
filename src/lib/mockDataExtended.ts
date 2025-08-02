// Extended mock data for comprehensive testing

import { Song, Download, ChatMessage, ChatSession } from '@/types';
import { generateId } from './utils';

// Additional mock songs for testing different scenarios
export const extendedMockSongs: Song[] = [
  // Electronic/Chill
  {
    id: 'song-9',
    title: 'Midnight City',
    artist: 'M83',
    thumbnail: 'https://img.youtube.com/vi/dX3k_QDnzHE/maxresdefault.jpg',
    duration: '4:03',
    mood: ['chill', 'nostalgic'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dX3k_QDnzHE'
  },
  // Hip-Hop/Hype
  {
    id: 'song-10',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    thumbnail: 'https://img.youtube.com/vi/tvTRZJ-4EyI/maxresdefault.jpg',
    duration: '2:57',
    mood: ['hype', 'focus'],
    youtubeUrl: 'https://www.youtube.com/watch?v=tvTRZJ-4EyI'
  },
  // Indie/Heartbreak
  {
    id: 'song-11',
    title: 'Mad World',
    artist: 'Gary Jules',
    thumbnail: 'https://img.youtube.com/vi/4N3N1MlvVc4/maxresdefault.jpg',
    duration: '3:07',
    mood: ['heartbreak', 'chill'],
    youtubeUrl: 'https://www.youtube.com/watch?v=4N3N1MlvVc4'
  },
  // Classical/Focus
  {
    id: 'song-12',
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    thumbnail: 'https://img.youtube.com/vi/CvFH_6DNRCY/maxresdefault.jpg',
    duration: '5:20',
    mood: ['focus', 'chill'],
    youtubeUrl: 'https://www.youtube.com/watch?v=CvFH_6DNRCY'
  },
  // Rock/Party
  {
    id: 'song-13',
    title: 'Don\'t Stop Me Now',
    artist: 'Queen',
    thumbnail: 'https://img.youtube.com/vi/HgzGwKwLmgM/maxresdefault.jpg',
    duration: '3:29',
    mood: ['party', 'hype'],
    youtubeUrl: 'https://www.youtube.com/watch?v=HgzGwKwLmgM'
  },
  // Ambient/Focus
  {
    id: 'song-14',
    title: 'An Ending (Ascent)',
    artist: 'Brian Eno',
    thumbnail: 'https://img.youtube.com/vi/It4WxQ6dnn0/maxresdefault.jpg',
    duration: '3:15',
    mood: ['focus', 'chill'],
    youtubeUrl: 'https://www.youtube.com/watch?v=It4WxQ6dnn0'
  }
];

// Mock download data for testing
export const mockDownloads: Download[] = [
  {
    id: 'dl-1',
    songId: 'song-1',
    format: 'mp3',
    status: 'completed',
    progress: 100,
    filePath: '/downloads/lofi-hip-hop-study-mix.mp3',
    fileSize: 8547328, // ~8.5MB
    createdAt: new Date('2025-01-15T10:30:00Z'),
    completedAt: new Date('2025-01-15T10:32:15Z')
  },
  {
    id: 'dl-2',
    songId: 'song-3',
    format: 'mp4',
    status: 'processing',
    progress: 65,
    createdAt: new Date('2025-01-15T11:00:00Z')
  },
  {
    id: 'dl-3',
    songId: 'song-7',
    format: 'mp3',
    status: 'failed',
    progress: 0,
    error: 'Network timeout during download',
    createdAt: new Date('2025-01-15T09:45:00Z')
  },
  {
    id: 'dl-4',
    songId: 'song-5',
    format: 'mp3',
    status: 'queued',
    progress: 0,
    createdAt: new Date('2025-01-15T11:15:00Z')
  }
];

// Mock chat messages for testing
export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    text: 'Hey, I\'m feeling really down today. Can you help me find some music?',
    sender: 'user',
    timestamp: new Date('2025-01-15T14:30:00Z')
  },
  {
    id: 'msg-2',
    text: 'I\'m sorry you\'re going through a tough time 💔 Music can be healing - here are some tracks that understand.',
    sender: 'bot',
    timestamp: new Date('2025-01-15T14:30:15Z'),
    suggestedSongs: [
      {
        id: 'song-2',
        title: 'Someone Like You',
        artist: 'Adele',
        thumbnail: 'https://img.youtube.com/vi/hLQl3WQQoQ0/maxresdefault.jpg',
        duration: '4:47',
        mood: ['heartbreak', 'nostalgic'],
        youtubeUrl: 'https://www.youtube.com/watch?v=hLQl3WQQoQ0'
      },
      {
        id: 'song-11',
        title: 'Mad World',
        artist: 'Gary Jules',
        thumbnail: 'https://img.youtube.com/vi/4N3N1MlvVc4/maxresdefault.jpg',
        duration: '3:07',
        mood: ['heartbreak', 'chill'],
        youtubeUrl: 'https://www.youtube.com/watch?v=4N3N1MlvVc4'
      }
    ]
  },
  {
    id: 'msg-3',
    text: 'Thanks, these are perfect. Do you have anything more upbeat for later?',
    sender: 'user',
    timestamp: new Date('2025-01-15T14:35:00Z')
  },
  {
    id: 'msg-4',
    text: 'Absolutely! When you\'re ready to lift your spirits, these tracks will help you feel better 🌟',
    sender: 'bot',
    timestamp: new Date('2025-01-15T14:35:10Z'),
    suggestedSongs: [
      {
        id: 'song-13',
        title: 'Don\'t Stop Me Now',
        artist: 'Queen',
        thumbnail: 'https://img.youtube.com/vi/HgzGwKwLmgM/maxresdefault.jpg',
        duration: '3:29',
        mood: ['party', 'hype'],
        youtubeUrl: 'https://www.youtube.com/watch?v=HgzGwKwLmgM'
      }
    ]
  }
];

// Mock chat session for testing
export const mockChatSession: ChatSession = {
  id: 'session-1',
  messages: mockChatMessages,
  currentMood: 'heartbreak',
  createdAt: new Date('2025-01-15T14:30:00Z'),
  lastActivity: new Date('2025-01-15T14:35:10Z')
};

// Helper functions for generating test data
export function generateMockSong(overrides: Partial<Song> = {}): Song {
  const defaultSong: Song = {
    id: generateId(),
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '3:30',
    mood: ['chill'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  };
  
  return { ...defaultSong, ...overrides };
}

export function generateMockDownload(overrides: Partial<Download> = {}): Download {
  const defaultDownload: Download = {
    id: generateId(),
    songId: 'test-song',
    format: 'mp3',
    status: 'queued',
    progress: 0,
    createdAt: new Date()
  };
  
  return { ...defaultDownload, ...overrides };
}

export function generateMockChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  const defaultMessage: ChatMessage = {
    id: generateId(),
    text: 'Test message',
    sender: 'user',
    timestamp: new Date()
  };
  
  return { ...defaultMessage, ...overrides };
}

// Test data sets for different scenarios
export const testScenarios = {
  // Empty states
  emptySongs: [],
  emptyDownloads: [],
  emptyMessages: [],
  
  // Error states
  invalidSongs: [
    { id: '', title: 'Invalid Song' }, // Missing required fields
    { id: 'valid', title: 'Valid Song', youtubeUrl: 'not-a-url' } // Invalid URL
  ],
  
  // Large datasets for performance testing
  largeSongSet: Array.from({ length: 100 }, (_, i) => generateMockSong({
    id: `perf-song-${i}`,
    title: `Performance Test Song ${i}`,
    mood: i % 2 === 0 ? ['chill'] : ['hype']
  })),
  
  // Mixed mood scenarios
  multiMoodSongs: [
    generateMockSong({ mood: ['chill', 'focus', 'nostalgic'] }),
    generateMockSong({ mood: ['hype', 'party'] }),
    generateMockSong({ mood: ['heartbreak'] })
  ]
};