// Local storage utilities for VibePipe MVP

import { Song, Download, ChatSession } from '@/types';
import { STORAGE_KEYS } from './constants';

export class LocalStorage {
  // Generic storage methods
  private static setItem<T>(key: string, value: T): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Failed to save to localStorage (${key}):`, error);
    }
  }

  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
      return defaultValue;
    } catch (error) {
      console.error(`Failed to read from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  private static removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Failed to remove from localStorage (${key}):`, error);
    }
  }

  // Mood preferences
  static getSelectedMood(): string | null {
    return this.getItem(STORAGE_KEYS.SELECTED_MOOD, null);
  }

  static setSelectedMood(mood: string): void {
    this.setItem(STORAGE_KEYS.SELECTED_MOOD, mood);
  }

  static clearSelectedMood(): void {
    this.removeItem(STORAGE_KEYS.SELECTED_MOOD);
  }

  // Volume settings
  static getVolume(): number {
    return this.getItem(STORAGE_KEYS.VOLUME, 0.7);
  }

  static setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.setItem(STORAGE_KEYS.VOLUME, clampedVolume);
  }

  // Download history
  static getDownloadHistory(): Download[] {
    const history = this.getItem<Download[]>(STORAGE_KEYS.DOWNLOAD_HISTORY, []);
    // Convert date strings back to Date objects
    return history.map(download => ({
      ...download,
      createdAt: new Date(download.createdAt),
      completedAt: download.completedAt ? new Date(download.completedAt) : undefined
    }));
  }

  static addToDownloadHistory(download: Download): void {
    const history = this.getDownloadHistory();
    const existingIndex = history.findIndex(d => d.id === download.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = download;
    } else {
      history.unshift(download); // Add to beginning
    }
    
    // Keep only last 100 downloads
    const trimmedHistory = history.slice(0, 100);
    this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, trimmedHistory);
  }

  static removeFromDownloadHistory(downloadId: string): void {
    const history = this.getDownloadHistory();
    const filtered = history.filter(d => d.id !== downloadId);
    this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, filtered);
  }

  static clearDownloadHistory(): void {
    this.removeItem(STORAGE_KEYS.DOWNLOAD_HISTORY);
  }

  // Chat history
  static getChatHistory(): ChatSession[] {
    const history = this.getItem<ChatSession[]>(STORAGE_KEYS.CHAT_HISTORY, []);
    // Convert date strings back to Date objects
    return history.map(session => ({
      ...session,
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity),
      messages: session.messages.map(message => ({
        ...message,
        timestamp: new Date(message.timestamp)
      }))
    }));
  }

  static saveChatSession(session: ChatSession): void {
    const history = this.getChatHistory();
    const existingIndex = history.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = session;
    } else {
      history.unshift(session); // Add to beginning
    }
    
    // Keep only last 10 chat sessions
    const trimmedHistory = history.slice(0, 10);
    this.setItem(STORAGE_KEYS.CHAT_HISTORY, trimmedHistory);
  }

  static removeChatSession(sessionId: string): void {
    const history = this.getChatHistory();
    const filtered = history.filter(s => s.id !== sessionId);
    this.setItem(STORAGE_KEYS.CHAT_HISTORY, filtered);
  }

  static clearChatHistory(): void {
    this.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  }

  // Favorites (songs)
  static getFavorites(): Song[] {
    return this.getItem<Song[]>('vibepipe_favorites', []);
  }

  static addToFavorites(song: Song): void {
    const favorites = this.getFavorites();
    if (!favorites.some(fav => fav.id === song.id)) {
      favorites.unshift(song);
      this.setItem('vibepipe_favorites', favorites);
    }
  }

  static removeFromFavorites(songId: string): void {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(song => song.id !== songId);
    this.setItem('vibepipe_favorites', filtered);
  }

  static isFavorite(songId: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some(fav => fav.id === songId);
  }

  // Recently played
  static getRecentlyPlayed(): Song[] {
    return this.getItem<Song[]>('vibepipe_recently_played', []);
  }

  static addToRecentlyPlayed(song: Song): void {
    const recent = this.getRecentlyPlayed();
    // Remove if already exists
    const filtered = recent.filter(s => s.id !== song.id);
    // Add to beginning
    filtered.unshift(song);
    // Keep only last 50
    const trimmed = filtered.slice(0, 50);
    this.setItem('vibepipe_recently_played', trimmed);
  }

  static clearRecentlyPlayed(): void {
    this.removeItem('vibepipe_recently_played');
  }

  // Clear all data
  static clearAllData(): void {
    this.clearSelectedMood();
    this.clearDownloadHistory();
    this.clearChatHistory();
    this.removeItem('vibepipe_favorites');
    this.clearRecentlyPlayed();
    // Keep volume setting
  }

  // Export/Import data
  static exportData(): string {
    const data = {
      selectedMood: this.getSelectedMood(),
      volume: this.getVolume(),
      downloadHistory: this.getDownloadHistory(),
      chatHistory: this.getChatHistory(),
      favorites: this.getFavorites(),
      recentlyPlayed: this.getRecentlyPlayed(),
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.selectedMood) this.setSelectedMood(data.selectedMood);
      if (typeof data.volume === 'number') this.setVolume(data.volume);
      if (Array.isArray(data.downloadHistory)) {
        this.setItem(STORAGE_KEYS.DOWNLOAD_HISTORY, data.downloadHistory);
      }
      if (Array.isArray(data.chatHistory)) {
        this.setItem(STORAGE_KEYS.CHAT_HISTORY, data.chatHistory);
      }
      if (Array.isArray(data.favorites)) {
        this.setItem('vibepipe_favorites', data.favorites);
      }
      if (Array.isArray(data.recentlyPlayed)) {
        this.setItem('vibepipe_recently_played', data.recentlyPlayed);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Storage info
  static getStorageInfo(): {
    used: number;
    available: number;
    itemCount: number;
  } {
    if (typeof window === 'undefined') {
      return { used: 0, available: 0, itemCount: 0 };
    }

    let used = 0;
    let itemCount = 0;

    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('vibepipe_')) {
        used += localStorage[key].length;
        itemCount++;
      }
    }

    // Rough estimate of available space (5MB typical limit)
    const available = Math.max(0, 5 * 1024 * 1024 - used);

    return { used, available, itemCount };
  }
}