// Constants and configuration for VibePipe MVP

export const MOODS = [
  {
    id: 'chill',
    name: 'Chill',
    emoji: '😌',
    color: 'bg-blue-500',
    description: 'Relaxed and peaceful vibes',
    keywords: ['chill', 'relax', 'calm', 'peaceful', 'ambient']
  },
  {
    id: 'heartbreak',
    name: 'Heartbreak',
    emoji: '💔',
    color: 'bg-red-500',
    description: 'Emotional and melancholic tracks',
    keywords: ['sad', 'heartbreak', 'emotional', 'melancholy', 'breakup']
  },
  {
    id: 'hype',
    name: 'Hype',
    emoji: '🔥',
    color: 'bg-orange-500',
    description: 'High energy and motivational',
    keywords: ['hype', 'energy', 'pump', 'motivation', 'workout']
  },
  {
    id: 'nostalgic',
    name: 'Nostalgic',
    emoji: '🌅',
    color: 'bg-purple-500',
    description: 'Throwback and vintage feels',
    keywords: ['nostalgic', 'throwback', 'vintage', 'memories', 'classic']
  },
  {
    id: 'focus',
    name: 'Focus',
    emoji: '🎯',
    color: 'bg-green-500',
    description: 'Concentration and productivity',
    keywords: ['focus', 'study', 'work', 'concentration', 'productivity']
  },
  {
    id: 'party',
    name: 'Party',
    emoji: '🎉',
    color: 'bg-pink-500',
    description: 'Fun and celebratory vibes',
    keywords: ['party', 'dance', 'celebration', 'fun', 'upbeat']
  }
] as const;

export const DOWNLOAD_FORMATS = ['mp3', 'mp4'] as const;

export const DOWNLOAD_QUALITIES = {
  mp3: ['128', '192', '320'],
  mp4: ['360p', '720p', '1080p']
} as const;

export const API_ENDPOINTS = {
  SONGS: '/api/songs',
  MOODS: '/api/moods',
  EXTRACT: '/api/extract',
  DOWNLOAD: '/api/download',
  CHAT: '/api/chat',
  STREAM: '/api/stream'
} as const;

export const STORAGE_KEYS = {
  SELECTED_MOOD: 'vibepipe_selected_mood',
  VOLUME: 'vibepipe_volume',
  DOWNLOAD_HISTORY: 'vibepipe_download_history',
  CHAT_HISTORY: 'vibepipe_chat_history'
} as const;

export const DOWNLOAD_DIR = '/Android/data/com.vibepipe.app/files/Music/';
export const NOMEDIA_FILE = '.nomedia';