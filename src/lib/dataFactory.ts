// Data factory for creating and managing VibePipe data instances

import { Song, Mood, Download, ChatMessage, ChatSession } from '@/types';
import { generateId } from './utils';
import { validateSong, validateMood, validateDownload, validateChatMessage, validateChatSession } from './validation';

export class DataFactory {
  // Song factory methods
  static createSong(data: Omit<Song, 'id'> & { id?: string }): Song {
    const song: Song = {
      id: data.id || generateId(),
      title: data.title,
      artist: data.artist,
      thumbnail: data.thumbnail,
      duration: data.duration,
      mood: data.mood,
      youtubeUrl: data.youtubeUrl,
      extractedAt: data.extractedAt,
      streamUrl: data.streamUrl
    };

    if (!validateSong(song)) {
      throw new Error('Invalid song data provided');
    }

    return song;
  }

  static createSongFromYouTube(youtubeData: {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    youtubeUrl: string;
  }, mood: string[]): Song {
    return this.createSong({
      title: youtubeData.title,
      thumbnail: youtubeData.thumbnail,
      duration: this.formatDuration(youtubeData.duration),
      mood,
      youtubeUrl: youtubeData.youtubeUrl,
      extractedAt: new Date()
    });
  }

  // Mood factory methods
  static createMood(data: Omit<Mood, 'id'> & { id?: string }): Mood {
    const mood: Mood = {
      id: data.id || data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      emoji: data.emoji,
      color: data.color,
      description: data.description,
      keywords: data.keywords
    };

    if (!validateMood(mood)) {
      throw new Error('Invalid mood data provided');
    }

    return mood;
  }

  // Download factory methods
  static createDownload(data: {
    songId: string;
    format: 'mp3' | 'mp4';
    quality?: string;
  }): Download {
    const download: Download = {
      id: generateId(),
      songId: data.songId,
      format: data.format,
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    };

    if (!validateDownload(download)) {
      throw new Error('Invalid download data provided');
    }

    return download;
  }

  static updateDownloadProgress(download: Download, progress: number, status?: Download['status']): Download {
    const updated: Download = {
      ...download,
      progress: Math.max(0, Math.min(100, progress)),
      status: status || download.status
    };

    if (status === 'completed' && !updated.completedAt) {
      updated.completedAt = new Date();
    }

    if (!validateDownload(updated)) {
      throw new Error('Invalid download update data');
    }

    return updated;
  }

  static markDownloadFailed(download: Download, error: string): Download {
    const updated: Download = {
      ...download,
      status: 'failed',
      error,
      progress: 0
    };

    if (!validateDownload(updated)) {
      throw new Error('Invalid download failure data');
    }

    return updated;
  }

  // Chat message factory methods
  static createUserMessage(text: string): ChatMessage {
    const message: ChatMessage = {
      id: generateId(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    if (!validateChatMessage(message)) {
      throw new Error('Invalid user message data');
    }

    return message;
  }

  static createBotMessage(text: string, suggestedSongs?: Song[]): ChatMessage {
    const message: ChatMessage = {
      id: generateId(),
      text: text.trim(),
      sender: 'bot',
      timestamp: new Date(),
      suggestedSongs
    };

    if (!validateChatMessage(message)) {
      throw new Error('Invalid bot message data');
    }

    return message;
  }

  // Chat session factory methods
  static createChatSession(initialMessage?: ChatMessage): ChatSession {
    const session: ChatSession = {
      id: generateId(),
      messages: initialMessage ? [initialMessage] : [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    if (!validateChatSession(session)) {
      throw new Error('Invalid chat session data');
    }

    return session;
  }

  static addMessageToSession(session: ChatSession, message: ChatMessage): ChatSession {
    const updated: ChatSession = {
      ...session,
      messages: [...session.messages, message],
      lastActivity: new Date(),
      currentMood: message.sender === 'user' ? this.extractMoodFromMessage(message.text) : session.currentMood
    };

    if (!validateChatSession(updated)) {
      throw new Error('Invalid chat session update');
    }

    return updated;
  }

  // Utility methods
  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static extractMoodFromMessage(text: string): string | undefined {
    const moodKeywords = {
      chill: ['chill', 'relax', 'calm', 'peaceful', 'zen'],
      heartbreak: ['sad', 'heartbreak', 'depressed', 'down', 'hurt', 'pain'],
      hype: ['hype', 'energy', 'pump', 'excited', 'motivated'],
      nostalgic: ['nostalgic', 'memories', 'throwback', 'old', 'vintage'],
      focus: ['focus', 'study', 'work', 'concentrate', 'productive'],
      party: ['party', 'dance', 'celebrate', 'fun', 'upbeat']
    };

    const lowerText = text.toLowerCase();
    
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return mood;
      }
    }

    return undefined;
  }

  // Batch operations
  static createSongBatch(songsData: Array<Omit<Song, 'id'> & { id?: string }>): Song[] {
    return songsData.map(data => this.createSong(data));
  }

  static createDownloadBatch(downloadsData: Array<{ songId: string; format: 'mp3' | 'mp4' }>): Download[] {
    return downloadsData.map(data => this.createDownload(data));
  }

  // Data transformation utilities
  static songToDownloadableFormat(song: Song): {
    id: string;
    title: string;
    artist?: string;
    youtubeUrl: string;
    availableFormats: Array<'mp3' | 'mp4'>;
  } {
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      youtubeUrl: song.youtubeUrl,
      availableFormats: ['mp3', 'mp4']
    };
  }

  static downloadToStatusInfo(download: Download): {
    id: string;
    status: string;
    progress: number;
    isComplete: boolean;
    isFailed: boolean;
    errorMessage?: string;
  } {
    return {
      id: download.id,
      status: download.status,
      progress: download.progress,
      isComplete: download.status === 'completed',
      isFailed: download.status === 'failed',
      errorMessage: download.error
    };
  }
}