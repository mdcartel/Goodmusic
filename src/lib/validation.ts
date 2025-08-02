// Data validation functions for VibePipe MVP

import { Song, Mood, Download, ChatMessage, ChatSession } from '@/types';
import { validateYouTubeUrl } from './utils';

// Song validation
export function validateSong(song: Partial<Song>): song is Song {
  return !!(
    song.id &&
    typeof song.id === 'string' &&
    song.title &&
    typeof song.title === 'string' &&
    song.thumbnail &&
    typeof song.thumbnail === 'string' &&
    song.duration &&
    typeof song.duration === 'string' &&
    song.mood &&
    Array.isArray(song.mood) &&
    song.mood.length > 0 &&
    song.youtubeUrl &&
    typeof song.youtubeUrl === 'string' &&
    validateYouTubeUrl(song.youtubeUrl)
  );
}

export function sanitizeSong(song: Partial<Song>): Partial<Song> {
  return {
    ...song,
    id: typeof song.id === 'string' ? song.id.trim() : song.id,
    title: typeof song.title === 'string' ? song.title.trim() : song.title,
    artist: typeof song.artist === 'string' ? song.artist.trim() : song.artist,
    thumbnail: typeof song.thumbnail === 'string' ? song.thumbnail.trim() : song.thumbnail,
    duration: typeof song.duration === 'string' ? song.duration.trim() : song.duration,
    youtubeUrl: typeof song.youtubeUrl === 'string' ? song.youtubeUrl.trim() : song.youtubeUrl,
    mood: Array.isArray(song.mood) ? song.mood.map(m => m.toLowerCase().trim()) : song.mood
  };
}

// Mood validation
export function validateMood(mood: Partial<Mood>): mood is Mood {
  return !!(
    mood.id &&
    typeof mood.id === 'string' &&
    mood.name &&
    typeof mood.name === 'string' &&
    mood.emoji &&
    typeof mood.emoji === 'string' &&
    mood.color &&
    typeof mood.color === 'string' &&
    mood.description &&
    typeof mood.description === 'string' &&
    mood.keywords &&
    Array.isArray(mood.keywords) &&
    mood.keywords.length > 0
  );
}

export function sanitizeMood(mood: Partial<Mood>): Partial<Mood> {
  return {
    ...mood,
    id: typeof mood.id === 'string' ? mood.id.toLowerCase().trim() : mood.id,
    name: typeof mood.name === 'string' ? mood.name.trim() : mood.name,
    emoji: typeof mood.emoji === 'string' ? mood.emoji.trim() : mood.emoji,
    color: typeof mood.color === 'string' ? mood.color.trim() : mood.color,
    description: typeof mood.description === 'string' ? mood.description.trim() : mood.description,
    keywords: Array.isArray(mood.keywords) ? mood.keywords.map(k => k.toLowerCase().trim()) : mood.keywords
  };
}

// Download validation
export function validateDownload(download: Partial<Download>): download is Download {
  const validStatuses = ['queued', 'processing', 'completed', 'failed'];
  const validFormats = ['mp3', 'mp4'];
  
  return !!(
    download.id &&
    typeof download.id === 'string' &&
    download.songId &&
    typeof download.songId === 'string' &&
    download.format &&
    validFormats.includes(download.format) &&
    download.status &&
    validStatuses.includes(download.status) &&
    typeof download.progress === 'number' &&
    download.progress >= 0 &&
    download.progress <= 100 &&
    download.createdAt &&
    download.createdAt instanceof Date
  );
}

export function sanitizeDownload(download: Partial<Download>): Partial<Download> {
  return {
    ...download,
    id: typeof download.id === 'string' ? download.id.trim() : download.id,
    songId: typeof download.songId === 'string' ? download.songId.trim() : download.songId,
    format: download.format === 'mp3' || download.format === 'mp4' ? download.format : undefined,
    status: ['queued', 'processing', 'completed', 'failed'].includes(download.status as string) 
      ? download.status as Download['status'] 
      : undefined,
    progress: typeof download.progress === 'number' 
      ? Math.max(0, Math.min(100, download.progress)) 
      : download.progress,
    filePath: typeof download.filePath === 'string' ? download.filePath.trim() : download.filePath,
    error: typeof download.error === 'string' ? download.error.trim() : download.error
  };
}

// Chat message validation
export function validateChatMessage(message: Partial<ChatMessage>): message is ChatMessage {
  const validSenders = ['user', 'bot'];
  
  return !!(
    message.id &&
    typeof message.id === 'string' &&
    message.text &&
    typeof message.text === 'string' &&
    message.sender &&
    validSenders.includes(message.sender) &&
    message.timestamp &&
    message.timestamp instanceof Date
  );
}

export function sanitizeChatMessage(message: Partial<ChatMessage>): Partial<ChatMessage> {
  return {
    ...message,
    id: typeof message.id === 'string' ? message.id.trim() : message.id,
    text: typeof message.text === 'string' ? message.text.trim() : message.text,
    sender: message.sender === 'user' || message.sender === 'bot' ? message.sender : undefined,
    suggestedSongs: Array.isArray(message.suggestedSongs) 
      ? message.suggestedSongs.filter(validateSong)
      : message.suggestedSongs
  };
}

// Chat session validation
export function validateChatSession(session: Partial<ChatSession>): session is ChatSession {
  return !!(
    session.id &&
    typeof session.id === 'string' &&
    session.messages &&
    Array.isArray(session.messages) &&
    session.createdAt &&
    session.createdAt instanceof Date &&
    session.lastActivity &&
    session.lastActivity instanceof Date
  );
}

export function sanitizeChatSession(session: Partial<ChatSession>): Partial<ChatSession> {
  return {
    ...session,
    id: typeof session.id === 'string' ? session.id.trim() : session.id,
    messages: Array.isArray(session.messages) 
      ? session.messages.filter(validateChatMessage)
      : session.messages,
    currentMood: typeof session.currentMood === 'string' 
      ? session.currentMood.toLowerCase().trim() 
      : session.currentMood
  };
}

// Batch validation helpers
export function validateSongArray(songs: unknown[]): Song[] {
  return songs.filter((song): song is Song => 
    typeof song === 'object' && song !== null && validateSong(song)
  );
}

export function validateMoodArray(moods: unknown[]): Mood[] {
  return moods.filter((mood): mood is Mood => 
    typeof mood === 'object' && mood !== null && validateMood(mood)
  );
}

// API request validation
export function validateMoodQuery(mood: unknown): string | null {
  if (typeof mood !== 'string') return null;
  const trimmed = mood.toLowerCase().trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validatePaginationParams(page: unknown, limit: unknown): { page: number; limit: number } {
  const parsedPage = typeof page === 'string' ? parseInt(page, 10) : 1;
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : 20;
  
  return {
    page: Math.max(1, isNaN(parsedPage) ? 1 : parsedPage),
    limit: Math.max(1, Math.min(100, isNaN(parsedLimit) ? 20 : parsedLimit))
  };
}