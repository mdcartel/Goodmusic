import { audioExtractor } from './audio-extractor';
import { database } from '../database';
import { generateId } from '../utils';

// Player state types
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export type RepeatMode = 'none' | 'one' | 'all';

// Track information
export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail?: string;
  url?: string;
  quality?: string;
  format?: string;
}

// Queue item with additional metadata
export interface QueueItem extends Track {
  queueId: string;
  addedAt: Date;
  playCount: number;
  lastPlayed?: Date;
}

// Player configuration
export interface PlayerConfig {
  volume: number;
  playbackRate: number;
  crossfadeDuration: number;
  gaplessPlayback: boolean;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  preloadNext: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
}

// Player state
export interface PlayerState {
  currentTrack: QueueItem | null;
  queue: QueueItem[];
  currentIndex: number;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  crossfadeEnabled: boolean;
  gaplessEnabled: boolean;
  loading: boolean;
  error: string | null;
}

// Player events
export type PlayerEvent = 
  | 'stateChange'
  | 'trackChange'
  | 'queueChange'
  | 'timeUpdate'
  | 'volumeChange'
  | 'error'
  | 'ended'
  | 'loaded';

export type PlayerEventCallback = (data?: any) => void;

class MusicPlayerService {
  private static instance: MusicPlayerService;
  private audio: HTMLAudioElement;
  private nextAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  
  private state: PlayerState = {
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    playbackRate: 1.0,
    repeatMode: 'none',
    shuffleEnabled: false,
    crossfadeEnabled: false,
    gaplessEnabled: true,
    loading: false,
    error: null,
  };

  private config: PlayerConfig = {
    volume: 0.8,
    playbackRate: 1.0,
    crossfadeDuration: 3000,
    gaplessPlayback: true,
    repeatMode: 'none',
    shuffleEnabled: false,
    preloadNext: true,
    fadeInDuration: 500,
    fadeOutDuration: 500,
  };

  private eventListeners: Map<PlayerEvent, PlayerEventCallback[]> = new Map();
  private crossfadeTimeout: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private shuffledIndices: number[] = [];
  private originalQueue: QueueItem[] = [];

  private constructor() {
    this.audio = new Audio();
    this.setupAudioElement();
    this.setupAudioContext();
    this.loadConfig();
    this.startTimeUpdates();
  }

  public static getInstance(): MusicPlayerService {
    if (!MusicPlayerService.instance) {
      MusicPlayerService.instance = new MusicPlayerService();
    }
    return MusicPlayerService.instance;
  }

  // Event management
  public on(event: PlayerEvent, callback: PlayerEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: PlayerEvent, callback: PlayerEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: PlayerEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Playback controls
  public async play(): Promise<void> {
    if (!this.state.currentTrack) {
      if (this.state.queue.length > 0) {
        await this.playTrackAtIndex(0);
      }
      return;
    }

    try {
      this.setState({ playbackState: 'loading' });
      
      if (!this.audio.src || this.audio.src === '') {
        await this.loadCurrentTrack();
      }

      await this.audio.play();
      this.setState({ playbackState: 'playing' });
      this.emit('stateChange', this.state);
      
      // Preload next track if enabled
      if (this.config.preloadNext) {
        this.preloadNextTrack();
      }
      
    } catch (error) {
      console.error('Playback error:', error);
      this.setState({ 
        playbackState: 'error', 
        error: error instanceof Error ? error.message : 'Playback failed' 
      });
      this.emit('error', error);
    }
  }

  public pause(): void {
    this.audio.pause();
    this.setState({ playbackState: 'paused' });
    this.emit('stateChange', this.state);
  }

  public stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.setState({ 
      playbackState: 'idle',
      currentTime: 0 
    });
    this.emit('stateChange', this.state);
  }

  public async seek(time: number): Promise<void> {
    if (this.audio.duration && time >= 0 && time <= this.audio.duration) {
      this.audio.currentTime = time;
      this.setState({ currentTime: time });
      this.emit('timeUpdate', { currentTime: time, duration: this.audio.duration });
    }
  }

  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.audio.volume = clampedVolume;
    this.config.volume = clampedVolume;
    this.setState({ volume: clampedVolume });
    
    if (this.gainNode) {
      this.gainNode.gain.value = clampedVolume;
    }
    
    this.emit('volumeChange', clampedVolume);
    this.saveConfig();
  }

  public setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    this.audio.playbackRate = clampedRate;
    this.config.playbackRate = clampedRate;
    this.setState({ playbackRate: clampedRate });
    this.saveConfig();
  }

  // Queue management
  public setQueue(tracks: Track[]): void {
    const queueItems: QueueItem[] = tracks.map(track => ({
      ...track,
      queueId: generateId(),
      addedAt: new Date(),
      playCount: 0,
    }));

    this.state.queue = queueItems;
    this.originalQueue = [...queueItems];
    this.state.currentIndex = -1;
    this.state.currentTrack = null;
    
    if (this.state.shuffleEnabled) {
      this.shuffleQueue();
    }
    
    this.emit('queueChange', this.state.queue);
    this.saveState();
  }

  public addToQueue(track: Track, position?: number): void {
    const queueItem: QueueItem = {
      ...track,
      queueId: generateId(),
      addedAt: new Date(),
      playCount: 0,
    };

    if (position !== undefined && position >= 0 && position <= this.state.queue.length) {
      this.state.queue.splice(position, 0, queueItem);
      this.originalQueue.splice(position, 0, queueItem);
      
      // Adjust current index if needed
      if (position <= this.state.currentIndex) {
        this.state.currentIndex++;
      }
    } else {
      this.state.queue.push(queueItem);
      this.originalQueue.push(queueItem);
    }

    if (this.state.shuffleEnabled) {
      this.updateShuffledIndices();
    }

    this.emit('queueChange', this.state.queue);
    this.saveState();
  }

  public removeFromQueue(queueId: string): void {
    const index = this.state.queue.findIndex(item => item.queueId === queueId);
    if (index === -1) return;

    this.state.queue.splice(index, 1);
    
    const originalIndex = this.originalQueue.findIndex(item => item.queueId === queueId);
    if (originalIndex !== -1) {
      this.originalQueue.splice(originalIndex, 1);
    }

    // Adjust current index
    if (index < this.state.currentIndex) {
      this.state.currentIndex--;
    } else if (index === this.state.currentIndex) {
      // Current track was removed
      if (this.state.queue.length === 0) {
        this.state.currentTrack = null;
        this.state.currentIndex = -1;
        this.stop();
      } else {
        // Play next track or adjust index
        if (this.state.currentIndex >= this.state.queue.length) {
          this.state.currentIndex = this.state.queue.length - 1;
        }
        this.state.currentTrack = this.state.queue[this.state.currentIndex] || null;
      }
    }

    if (this.state.shuffleEnabled) {
      this.updateShuffledIndices();
    }

    this.emit('queueChange', this.state.queue);
    this.saveState();
  }

  // Navigation
  public async next(): Promise<void> {
    const nextIndex = this.getNextTrackIndex();
    if (nextIndex !== -1) {
      await this.playTrackAtIndex(nextIndex);
    } else if (this.config.repeatMode === 'all' && this.state.queue.length > 0) {
      await this.playTrackAtIndex(0);
    } else {
      this.setState({ playbackState: 'ended' });
      this.emit('ended');
    }
  }

  public async previous(): Promise<void> {
    // If more than 3 seconds into the track, restart current track
    if (this.audio.currentTime > 3) {
      await this.seek(0);
      return;
    }

    const prevIndex = this.getPreviousTrackIndex();
    if (prevIndex !== -1) {
      await this.playTrackAtIndex(prevIndex);
    }
  }

  public async playTrackAtIndex(index: number): Promise<void> {
    if (index < 0 || index >= this.state.queue.length) return;

    const track = this.state.queue[index];
    this.state.currentIndex = index;
    this.state.currentTrack = track;

    // Update play count
    track.playCount++;
    track.lastPlayed = new Date();

    this.setState({ 
      currentTrack: track,
      currentIndex: index,
      playbackState: 'loading' 
    });

    try {
      await this.loadCurrentTrack();
      await this.play();
      
      this.emit('trackChange', track);
      this.saveState();
      
    } catch (error) {
      console.error('Failed to play track:', error);
      this.setState({ 
        playbackState: 'error',
        error: error instanceof Error ? error.message : 'Failed to load track'
      });
      this.emit('error', error);
    }
  }

  // Shuffle and repeat
  public setShuffle(enabled: boolean): void {
    this.config.shuffleEnabled = enabled;
    this.setState({ shuffleEnabled: enabled });

    if (enabled) {
      this.shuffleQueue();
    } else {
      this.restoreOriginalOrder();
    }

    this.emit('queueChange', this.state.queue);
    this.saveConfig();
  }

  public setRepeatMode(mode: RepeatMode): void {
    this.config.repeatMode = mode;
    this.setState({ repeatMode: mode });
    this.saveConfig();
  }

  // State getters
  public getState(): PlayerState {
    return { ...this.state };
  }

  public getConfig(): PlayerConfig {
    return { ...this.config };
  }

  public getCurrentTrack(): QueueItem | null {
    return this.state.currentTrack;
  }

  public getQueue(): QueueItem[] {
    return [...this.state.queue];
  }

  // Private methods
  private setupAudioElement(): void {
    this.audio.preload = 'metadata';
    this.audio.volume = this.config.volume;
    this.audio.playbackRate = this.config.playbackRate;

    // Event listeners
    this.audio.addEventListener('loadstart', () => {
      this.setState({ loading: true });
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.setState({ 
        duration: this.audio.duration,
        loading: false 
      });
      this.emit('loaded', { duration: this.audio.duration });
    });

    this.audio.addEventListener('timeupdate', () => {
      this.setState({ currentTime: this.audio.currentTime });
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', (event) => {
      const error = this.audio.error;
      console.error('Audio error:', error);
      this.setState({ 
        playbackState: 'error',
        error: error?.message || 'Audio playback error'
      });
      this.emit('error', error);
    });

    this.audio.addEventListener('play', () => {
      this.setState({ playbackState: 'playing' });
    });

    this.audio.addEventListener('pause', () => {
      if (this.state.playbackState !== 'ended') {
        this.setState({ playbackState: 'paused' });
      }
    });
  }

  private setupAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create audio nodes
      const source = this.audioContext.createMediaElementSource(this.audio);
      this.gainNode = this.audioContext.createGain();
      
      // Connect nodes
      source.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private async loadCurrentTrack(): Promise<void> {
    if (!this.state.currentTrack) return;

    try {
      // Get audio stream URL
      const result = await audioExtractor.extractAudioStream(
        this.state.currentTrack.videoId,
        { quality: 'best', format: 'm4a' }
      );

      if (result.success && result.stream) {
        this.audio.src = result.stream.url;
        this.state.currentTrack.url = result.stream.url;
        this.state.currentTrack.quality = result.stream.quality;
        this.state.currentTrack.format = result.stream.format;
      } else {
        throw new Error(result.error || 'Failed to extract audio stream');
      }
    } catch (error) {
      console.error('Failed to load track:', error);
      throw error;
    }
  }

  private async preloadNextTrack(): Promise<void> {
    const nextIndex = this.getNextTrackIndex();
    if (nextIndex === -1) return;

    const nextTrack = this.state.queue[nextIndex];
    if (!nextTrack) return;

    try {
      // Preload audio stream
      await audioExtractor.extractAudioStream(
        nextTrack.videoId,
        { quality: 'best', format: 'm4a' }
      );
    } catch (error) {
      console.warn('Failed to preload next track:', error);
    }
  }

  private handleTrackEnded(): void {
    if (this.config.repeatMode === 'one') {
      this.seek(0);
      this.play();
      return;
    }

    // Handle gapless playback
    if (this.config.gaplessPlayback) {
      this.next();
    } else {
      this.setState({ playbackState: 'ended' });
      this.emit('ended');
    }
  }

  private getNextTrackIndex(): number {
    if (this.state.queue.length === 0) return -1;

    if (this.state.shuffleEnabled) {
      const currentShuffledIndex = this.shuffledIndices.indexOf(this.state.currentIndex);
      const nextShuffledIndex = currentShuffledIndex + 1;
      
      if (nextShuffledIndex < this.shuffledIndices.length) {
        return this.shuffledIndices[nextShuffledIndex];
      } else if (this.config.repeatMode === 'all') {
        return this.shuffledIndices[0];
      }
      return -1;
    } else {
      const nextIndex = this.state.currentIndex + 1;
      if (nextIndex < this.state.queue.length) {
        return nextIndex;
      } else if (this.config.repeatMode === 'all') {
        return 0;
      }
      return -1;
    }
  }

  private getPreviousTrackIndex(): number {
    if (this.state.queue.length === 0) return -1;

    if (this.state.shuffleEnabled) {
      const currentShuffledIndex = this.shuffledIndices.indexOf(this.state.currentIndex);
      const prevShuffledIndex = currentShuffledIndex - 1;
      
      if (prevShuffledIndex >= 0) {
        return this.shuffledIndices[prevShuffledIndex];
      } else if (this.config.repeatMode === 'all') {
        return this.shuffledIndices[this.shuffledIndices.length - 1];
      }
      return -1;
    } else {
      const prevIndex = this.state.currentIndex - 1;
      if (prevIndex >= 0) {
        return prevIndex;
      } else if (this.config.repeatMode === 'all') {
        return this.state.queue.length - 1;
      }
      return -1;
    }
  }

  private shuffleQueue(): void {
    // Create shuffled indices
    this.shuffledIndices = Array.from({ length: this.state.queue.length }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = 
        [this.shuffledIndices[j], this.shuffledIndices[i]];
    }

    // Ensure current track stays at current position if playing
    if (this.state.currentIndex !== -1) {
      const currentShuffledIndex = this.shuffledIndices.indexOf(this.state.currentIndex);
      if (currentShuffledIndex !== 0) {
        [this.shuffledIndices[0], this.shuffledIndices[currentShuffledIndex]] = 
          [this.shuffledIndices[currentShuffledIndex], this.shuffledIndices[0]];
      }
    }

    // Reorder queue based on shuffled indices
    const shuffledQueue = this.shuffledIndices.map(index => this.originalQueue[index]);
    this.state.queue = shuffledQueue;
    
    // Update current index
    if (this.state.currentIndex !== -1) {
      this.state.currentIndex = 0;
    }
  }

  private updateShuffledIndices(): void {
    if (!this.state.shuffleEnabled) return;
    
    // Regenerate shuffled indices for new queue length
    this.shuffleQueue();
  }

  private restoreOriginalOrder(): void {
    this.state.queue = [...this.originalQueue];
    
    // Find current track in original queue
    if (this.state.currentTrack) {
      const originalIndex = this.originalQueue.findIndex(
        item => item.queueId === this.state.currentTrack!.queueId
      );
      this.state.currentIndex = originalIndex;
    }
    
    this.shuffledIndices = [];
  }

  private startTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      if (this.state.playbackState === 'playing') {
        this.emit('timeUpdate', {
          currentTime: this.audio.currentTime,
          duration: this.audio.duration
        });
      }
    }, 1000);
  }

  private setState(updates: Partial<PlayerState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', this.state);
  }

  private async loadConfig(): Promise<void> {
    try {
      const settings = await database.all('SELECT key, value FROM settings WHERE key LIKE "player_%"');
      
      settings.forEach((setting: any) => {
        const key = setting.key.replace('player_', '');
        const value = JSON.parse(setting.value);
        
        if (key in this.config) {
          (this.config as any)[key] = value;
        }
      });

      // Apply loaded config
      this.setVolume(this.config.volume);
      this.setPlaybackRate(this.config.playbackRate);
      this.setState({
        volume: this.config.volume,
        playbackRate: this.config.playbackRate,
        repeatMode: this.config.repeatMode,
        shuffleEnabled: this.config.shuffleEnabled,
        crossfadeEnabled: this.config.crossfadeDuration > 0,
        gaplessEnabled: this.config.gaplessPlayback,
      });
      
    } catch (error) {
      console.warn('Failed to load player config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const configEntries = Object.entries(this.config);
      
      for (const [key, value] of configEntries) {
        await database.run(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [`player_${key}`, JSON.stringify(value)]
        );
      }
    } catch (error) {
      console.warn('Failed to save player config:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      const stateData = {
        queue: this.state.queue,
        currentIndex: this.state.currentIndex,
        currentTime: this.audio.currentTime,
        shuffledIndices: this.shuffledIndices,
        originalQueue: this.originalQueue,
      };

      await database.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['player_state', JSON.stringify(stateData)]
      );
    } catch (error) {
      console.warn('Failed to save player state:', error);
    }
  }

  public async loadState(): Promise<void> {
    try {
      const result = await database.get('SELECT value FROM settings WHERE key = "player_state"');
      
      if (result) {
        const stateData = JSON.parse(result.value);
        
        this.state.queue = stateData.queue || [];
        this.originalQueue = stateData.originalQueue || [];
        this.state.currentIndex = stateData.currentIndex || -1;
        this.shuffledIndices = stateData.shuffledIndices || [];
        
        if (this.state.currentIndex >= 0 && this.state.currentIndex < this.state.queue.length) {
          this.state.currentTrack = this.state.queue[this.state.currentIndex];
          
          // Restore playback position
          if (stateData.currentTime && stateData.currentTime > 0) {
            await this.loadCurrentTrack();
            this.audio.currentTime = stateData.currentTime;
            this.setState({ currentTime: stateData.currentTime });
          }
        }
        
        this.emit('queueChange', this.state.queue);
        this.emit('stateChange', this.state);
      }
    } catch (error) {
      console.warn('Failed to load player state:', error);
    }
  }

  // Cleanup
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
    }
    
    this.audio.pause();
    this.audio.src = '';
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const musicPlayer = MusicPlayerService.getInstance();
export { MusicPlayerService };