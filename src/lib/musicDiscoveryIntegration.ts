// Music Discovery Integration Service
// Bridges chatbot suggestions with main music discovery system

import { Song } from '@/types';
import { LocalStorage } from './storage';
import { EventEmitter } from 'events';

export interface MusicSuggestion {
  id: string;
  songs: Song[];
  source: 'chatbot' | 'mood' | 'manual';
  mood?: string;
  context?: string;
  timestamp: Date;
  sessionId?: string;
  played: boolean;
  addedToQueue: boolean;
}

export interface DiscoveryContext {
  currentMood?: string;
  recentSuggestions: MusicSuggestion[];
  userPreferences: {
    preferredMoods: string[];
    playedSongs: string[];
    favoriteSongs: string[];
    skipHistory: string[];
  };
  sessionHistory: {
    chatInteractions: number;
    songsPlayed: number;
    songsDownloaded: number;
    moodChanges: number;
  };
}

export class MusicDiscoveryIntegration extends EventEmitter {
  private static instance: MusicDiscoveryIntegration;
  private context: DiscoveryContext;
  private activeSuggestions: Map<string, MusicSuggestion> = new Map();

  private constructor() {
    super();
    this.context = this.initializeContext();
    this.loadPersistedData();
  }

  static getInstance(): MusicDiscoveryIntegration {
    if (!MusicDiscoveryIntegration.instance) {
      MusicDiscoveryIntegration.instance = new MusicDiscoveryIntegration();
    }
    return MusicDiscoveryIntegration.instance;
  }

  private initializeContext(): DiscoveryContext {
    return {
      recentSuggestions: [],
      userPreferences: {
        preferredMoods: [],
        playedSongs: [],
        favoriteSongs: [],
        skipHistory: []
      },
      sessionHistory: {
        chatInteractions: 0,
        songsPlayed: 0,
        songsDownloaded: 0,
        moodChanges: 0
      }
    };
  }

  // Add chatbot suggestions to the discovery system
  addChatbotSuggestion(
    songs: Song[], 
    mood?: string, 
    sessionId?: string, 
    context?: string
  ): string {
    const suggestionId = `chatbot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const suggestion: MusicSuggestion = {
      id: suggestionId,
      songs,
      source: 'chatbot',
      mood,
      context,
      timestamp: new Date(),
      sessionId,
      played: false,
      addedToQueue: false
    };

    // Add to active suggestions
    this.activeSuggestions.set(suggestionId, suggestion);
    
    // Add to context history
    this.context.recentSuggestions.unshift(suggestion);
    this.context.recentSuggestions = this.context.recentSuggestions.slice(0, 20); // Keep last 20

    // Update session history
    this.context.sessionHistory.chatInteractions++;

    // Update current mood if provided
    if (mood && mood !== this.context.currentMood) {
      this.context.currentMood = mood;
      this.context.sessionHistory.moodChanges++;
    }

    // Persist changes
    this.persistData();

    // Emit event for UI updates
    this.emit('suggestionAdded', suggestion);

    console.log(`🎵 Added chatbot suggestion: ${songs.length} songs for ${mood || 'general'} mood`);
    
    return suggestionId;
  }

  // Mark suggestion as played
  markSuggestionPlayed(suggestionId: string, songId: string): void {
    const suggestion = this.activeSuggestions.get(suggestionId);
    if (suggestion) {
      suggestion.played = true;
      
      // Add to played songs
      if (!this.context.userPreferences.playedSongs.includes(songId)) {
        this.context.userPreferences.playedSongs.unshift(songId);
        this.context.userPreferences.playedSongs = this.context.userPreferences.playedSongs.slice(0, 100);
      }

      // Update session history
      this.context.sessionHistory.songsPlayed++;

      // Learn from user behavior
      this.updatePreferences(suggestion, 'played');

      this.persistData();
      this.emit('suggestionPlayed', { suggestionId, songId });
    }
  }

  // Mark suggestion as added to queue
  markSuggestionQueued(suggestionId: string): void {
    const suggestion = this.activeSuggestions.get(suggestionId);
    if (suggestion) {
      suggestion.addedToQueue = true;
      
      // Learn from user behavior
      this.updatePreferences(suggestion, 'queued');

      this.persistData();
      this.emit('suggestionQueued', suggestionId);
    }
  }

  // Mark song as favorite
  markSongFavorite(songId: string): void {
    if (!this.context.userPreferences.favoriteSongs.includes(songId)) {
      this.context.userPreferences.favoriteSongs.unshift(songId);
      this.context.userPreferences.favoriteSongs = this.context.userPreferences.favoriteSongs.slice(0, 50);
      
      this.persistData();
      this.emit('songFavorited', songId);
    }
  }

  // Mark song as skipped
  markSongSkipped(songId: string): void {
    if (!this.context.userPreferences.skipHistory.includes(songId)) {
      this.context.userPreferences.skipHistory.unshift(songId);
      this.context.userPreferences.skipHistory = this.context.userPreferences.skipHistory.slice(0, 100);
      
      this.persistData();
      this.emit('songSkipped', songId);
    }
  }

  // Update user preferences based on behavior
  private updatePreferences(suggestion: MusicSuggestion, action: 'played' | 'queued' | 'skipped'): void {
    if (suggestion.mood && action !== 'skipped') {
      // Increase preference for this mood
      const moodIndex = this.context.userPreferences.preferredMoods.indexOf(suggestion.mood);
      if (moodIndex > -1) {
        // Move to front
        this.context.userPreferences.preferredMoods.splice(moodIndex, 1);
      }
      this.context.userPreferences.preferredMoods.unshift(suggestion.mood);
      this.context.userPreferences.preferredMoods = this.context.userPreferences.preferredMoods.slice(0, 10);
    }
  }

  // Get personalized song recommendations
  getPersonalizedRecommendations(mood?: string, limit: number = 10): Song[] {
    const allSuggestions = Array.from(this.activeSuggestions.values());
    
    // Filter by mood if specified
    const relevantSuggestions = mood 
      ? allSuggestions.filter(s => s.mood === mood)
      : allSuggestions;

    // Get all songs from relevant suggestions
    const allSongs = relevantSuggestions.flatMap(s => s.songs);
    
    // Remove duplicates and already played songs
    const uniqueSongs = allSongs.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id) &&
      !this.context.userPreferences.playedSongs.includes(song.id) &&
      !this.context.userPreferences.skipHistory.includes(song.id)
    );

    // Sort by relevance (favorites first, then by mood preference)
    const sortedSongs = uniqueSongs.sort((a, b) => {
      const aIsFavorite = this.context.userPreferences.favoriteSongs.includes(a.id);
      const bIsFavorite = this.context.userPreferences.favoriteSongs.includes(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      // Sort by mood preference
      if (mood) {
        const aMoodMatch = a.mood.includes(mood);
        const bMoodMatch = b.mood.includes(mood);
        
        if (aMoodMatch && !bMoodMatch) return -1;
        if (!aMoodMatch && bMoodMatch) return 1;
      }
      
      return 0;
    });

    return sortedSongs.slice(0, limit);
  }

  // Get discovery insights for UI
  getDiscoveryInsights(): {
    totalSuggestions: number;
    playedSuggestions: number;
    favoriteCount: number;
    topMoods: string[];
    recentActivity: string;
    suggestions: MusicSuggestion[];
  } {
    const suggestions = Array.from(this.activeSuggestions.values());
    const playedSuggestions = suggestions.filter(s => s.played).length;
    
    // Get top moods by frequency
    const moodCounts = suggestions.reduce((acc, s) => {
      if (s.mood) {
        acc[s.mood] = (acc[s.mood] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topMoods = Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([mood]) => mood);

    // Generate recent activity summary
    let recentActivity = 'No recent activity';
    if (this.context.sessionHistory.chatInteractions > 0) {
      recentActivity = `${this.context.sessionHistory.chatInteractions} chat interactions, ${this.context.sessionHistory.songsPlayed} songs played`;
    }

    return {
      totalSuggestions: suggestions.length,
      playedSuggestions,
      favoriteCount: this.context.userPreferences.favoriteSongs.length,
      topMoods,
      recentActivity,
      suggestions: this.context.recentSuggestions.slice(0, 10)
    };
  }

  // Clear old suggestions (older than 24 hours)
  cleanupOldSuggestions(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [id, suggestion] of this.activeSuggestions.entries()) {
      if (suggestion.timestamp.getTime() < cutoff) {
        this.activeSuggestions.delete(id);
      }
    }
    
    // Also clean context history
    this.context.recentSuggestions = this.context.recentSuggestions.filter(
      s => s.timestamp.getTime() >= cutoff
    );
    
    this.persistData();
    this.emit('suggestionsCleanedUp');
  }

  // Get current context
  getContext(): DiscoveryContext {
    return { ...this.context };
  }

  // Reset user preferences
  resetPreferences(): void {
    this.context.userPreferences = {
      preferredMoods: [],
      playedSongs: [],
      favoriteSongs: [],
      skipHistory: []
    };
    
    this.persistData();
    this.emit('preferencesReset');
  }

  // Load persisted data
  private loadPersistedData(): void {
    try {
      const stored = LocalStorage.getItem('music-discovery-context');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.context = {
          ...this.context,
          ...parsed,
          recentSuggestions: parsed.recentSuggestions?.map((s: any) => ({
            ...s,
            timestamp: new Date(s.timestamp)
          })) || []
        };
      }

      const storedSuggestions = LocalStorage.getItem('active-music-suggestions');
      if (storedSuggestions) {
        const parsed = JSON.parse(storedSuggestions);
        for (const [id, suggestion] of Object.entries(parsed)) {
          this.activeSuggestions.set(id, {
            ...(suggestion as MusicSuggestion),
            timestamp: new Date((suggestion as any).timestamp)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load music discovery data:', error);
    }
  }

  // Persist data
  private persistData(): void {
    try {
      LocalStorage.setItem('music-discovery-context', JSON.stringify(this.context));
      
      const suggestionsObj = Object.fromEntries(this.activeSuggestions);
      LocalStorage.setItem('active-music-suggestions', JSON.stringify(suggestionsObj));
    } catch (error) {
      console.error('Failed to persist music discovery data:', error);
    }
  }

  // Get suggestion by ID
  getSuggestion(suggestionId: string): MusicSuggestion | null {
    return this.activeSuggestions.get(suggestionId) || null;
  }

  // Remove suggestion
  removeSuggestion(suggestionId: string): boolean {
    const removed = this.activeSuggestions.delete(suggestionId);
    if (removed) {
      this.persistData();
      this.emit('suggestionRemoved', suggestionId);
    }
    return removed;
  }
}