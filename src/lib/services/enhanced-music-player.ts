import { musicPlayer, MusicPlayerService } from './music-player';
import { audioExtractor } from './audio-extractor';

// Enhanced player with crossfade and gapless playback
export class EnhancedMusicPlayer extends MusicPlayerService {
  private crossfadeAudio: HTMLAudioElement | null = null;
  private crossfadeGainNode: GainNode | null = null;
  private crossfadeSourceNode: MediaElementAudioSourceNode | null = null;
  private isCrossfading = false;
  private crossfadeStartTime = 0;
  private preloadedTracks = new Map<string, string>(); // videoId -> audio URL

  constructor() {
    super();
    this.setupCrossfadeAudio();
  }

  private setupCrossfadeAudio(): void {
    this.crossfadeAudio = new Audio();
    this.crossfadeAudio.preload = 'metadata';
    
    // Setup crossfade audio context nodes
    if (this.audioContext) {
      this.crossfadeSourceNode = this.audioContext.createMediaElementSource(this.crossfadeAudio);
      this.crossfadeGainNode = this.audioContext.createGain();
      
      // Connect crossfade audio to output
      this.crossfadeSourceNode.connect(this.crossfadeGainNode);
      this.crossfadeGainNode.connect(this.audioContext.destination);
      
      // Start with zero volume
      this.crossfadeGainNode.gain.value = 0;
    }

    // Setup crossfade audio event listeners
    this.crossfadeAudio.addEventListener('ended', () => {
      this.handleCrossfadeEnded();
    });

    this.crossfadeAudio.addEventListener('error', (error) => {
      console.error('Crossfade audio error:', error);
      this.isCrossfading = false;
    });
  }

  // Enhanced play method with crossfade support
  public async play(): Promise<void> {
    const state = this.getState();
    
    if (!state.currentTrack) {
      if (state.queue.length > 0) {
        await this.playTrackAtIndex(0);
      }
      return;
    }

    // Check if we should start crossfade
    if (state.crossfadeEnabled && this.shouldStartCrossfade()) {
      await this.startCrossfade();
    } else {
      await super.play();
    }
  }

  // Enhanced next method with gapless/crossfade support
  public async next(): Promise<void> {
    const state = this.getState();
    const nextIndex = this.getNextTrackIndex();
    
    if (nextIndex === -1) {
      if (this.config.repeatMode === 'all' && state.queue.length > 0) {
        await this.playTrackAtIndex(0);
      } else {
        this.setState({ playbackState: 'ended' });
        this.emit('ended');
      }
      return;
    }

    // Use crossfade or gapless transition
    if (state.crossfadeEnabled) {
      await this.crossfadeToTrack(nextIndex);
    } else if (state.gaplessEnabled) {
      await this.gaplessTransition(nextIndex);
    } else {
      await this.playTrackAtIndex(nextIndex);
    }
  }

  // Crossfade to next track
  private async crossfadeToTrack(nextIndex: number): Promise<void> {
    if (this.isCrossfading || nextIndex < 0 || nextIndex >= this.state.queue.length) {
      return;
    }

    const nextTrack = this.state.queue[nextIndex];
    if (!nextTrack) return;

    try {
      this.isCrossfading = true;
      this.crossfadeStartTime = Date.now();

      // Load next track in crossfade audio element
      const audioUrl = await this.getAudioUrl(nextTrack.videoId);
      if (this.crossfadeAudio) {
        this.crossfadeAudio.src = audioUrl;
        this.crossfadeAudio.currentTime = 0;
      }

      // Start crossfade
      await this.performCrossfade(nextIndex);

    } catch (error) {
      console.error('Crossfade failed:', error);
      this.isCrossfading = false;
      // Fallback to regular transition
      await this.playTrackAtIndex(nextIndex);
    }
  }

  // Perform the actual crossfade
  private async performCrossfade(nextIndex: number): Promise<void> {
    if (!this.crossfadeAudio || !this.gainNode || !this.crossfadeGainNode || !this.audioContext) {
      return;
    }

    const crossfadeDuration = this.config.crossfadeDuration / 1000; // Convert to seconds
    const currentTime = this.audioContext.currentTime;

    // Start playing the next track
    await this.crossfadeAudio.play();

    // Fade out current track
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, currentTime + crossfadeDuration);

    // Fade in next track
    this.crossfadeGainNode.gain.setValueAtTime(0, currentTime);
    this.crossfadeGainNode.gain.linearRampToValueAtTime(this.config.volume, currentTime + crossfadeDuration);

    // Switch tracks after crossfade completes
    setTimeout(() => {
      this.completeCrossfade(nextIndex);
    }, this.config.crossfadeDuration);
  }

  // Complete the crossfade transition
  private completeCrossfade(nextIndex: number): void {
    if (!this.crossfadeAudio || !this.gainNode || !this.crossfadeGainNode) {
      return;
    }

    // Stop current track
    this.audio.pause();
    this.audio.currentTime = 0;

    // Switch audio elements
    const tempAudio = this.audio;
    const tempGainNode = this.gainNode;
    
    this.audio = this.crossfadeAudio;
    this.gainNode = this.crossfadeGainNode;
    
    this.crossfadeAudio = tempAudio;
    this.crossfadeGainNode = tempGainNode;

    // Reset crossfade audio
    this.crossfadeAudio.src = '';
    if (this.crossfadeGainNode) {
      this.crossfadeGainNode.gain.value = 0;
    }

    // Update player state
    const nextTrack = this.state.queue[nextIndex];
    this.state.currentIndex = nextIndex;
    this.state.currentTrack = nextTrack;

    // Update play count
    if (nextTrack) {
      nextTrack.playCount++;
      nextTrack.lastPlayed = new Date();
    }

    this.setState({
      currentTrack: nextTrack,
      currentIndex: nextIndex,
      playbackState: 'playing'
    });

    this.emit('trackChange', nextTrack);
    this.saveState();
    
    this.isCrossfading = false;

    // Preload next track
    if (this.config.preloadNext) {
      this.preloadNextTrack();
    }
  }

  // Gapless transition to next track
  private async gaplessTransition(nextIndex: number): Promise<void> {
    const nextTrack = this.state.queue[nextIndex];
    if (!nextTrack) return;

    try {
      // Get preloaded URL or load it
      let audioUrl = this.preloadedTracks.get(nextTrack.videoId);
      if (!audioUrl) {
        audioUrl = await this.getAudioUrl(nextTrack.videoId);
      }

      // Quick switch without pause
      this.audio.src = audioUrl;
      this.audio.currentTime = 0;

      // Update state immediately
      this.state.currentIndex = nextIndex;
      this.state.currentTrack = nextTrack;

      // Update play count
      nextTrack.playCount++;
      nextTrack.lastPlayed = new Date();

      this.setState({
        currentTrack: nextTrack,
        currentIndex: nextIndex,
        playbackState: 'loading'
      });

      // Start playing
      await this.audio.play();

      this.setState({ playbackState: 'playing' });
      this.emit('trackChange', nextTrack);
      this.saveState();

      // Preload next track
      if (this.config.preloadNext) {
        this.preloadNextTrack();
      }

    } catch (error) {
      console.error('Gapless transition failed:', error);
      // Fallback to regular transition
      await this.playTrackAtIndex(nextIndex);
    }
  }

  // Enhanced preload with caching
  protected async preloadNextTrack(): Promise<void> {
    const nextIndex = this.getNextTrackIndex();
    if (nextIndex === -1) return;

    const nextTrack = this.state.queue[nextIndex];
    if (!nextTrack || this.preloadedTracks.has(nextTrack.videoId)) return;

    try {
      const audioUrl = await this.getAudioUrl(nextTrack.videoId);
      this.preloadedTracks.set(nextTrack.videoId, audioUrl);

      // Limit cache size
      if (this.preloadedTracks.size > 5) {
        const firstKey = this.preloadedTracks.keys().next().value;
        this.preloadedTracks.delete(firstKey);
      }

      console.log(`Preloaded: ${nextTrack.title}`);
    } catch (error) {
      console.warn('Failed to preload next track:', error);
    }
  }

  // Get audio URL with caching
  private async getAudioUrl(videoId: string): Promise<string> {
    // Check cache first
    const cachedUrl = this.preloadedTracks.get(videoId);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Extract new URL
    const result = await audioExtractor.extractAudioStream(videoId, {
      quality: 'best',
      format: 'm4a'
    });

    if (result.success && result.stream) {
      const audioUrl = result.stream.url;
      this.preloadedTracks.set(videoId, audioUrl);
      return audioUrl;
    } else {
      throw new Error(result.error || 'Failed to extract audio stream');
    }
  }

  // Check if we should start crossfade based on current position
  private shouldStartCrossfade(): boolean {
    if (!this.state.crossfadeEnabled || this.isCrossfading) {
      return false;
    }

    const remainingTime = this.audio.duration - this.audio.currentTime;
    const crossfadeTime = this.config.crossfadeDuration / 1000;

    return remainingTime <= crossfadeTime && remainingTime > 0;
  }

  // Start crossfade when approaching end of track
  private async startCrossfade(): Promise<void> {
    const nextIndex = this.getNextTrackIndex();
    if (nextIndex !== -1) {
      await this.crossfadeToTrack(nextIndex);
    }
  }

  // Handle crossfade audio ended
  private handleCrossfadeEnded(): void {
    if (this.isCrossfading) {
      // This shouldn't happen during normal crossfade
      console.warn('Crossfade audio ended unexpectedly');
      this.isCrossfading = false;
    }
  }

  // Enhanced track ended handler
  protected handleTrackEnded(): void {
    if (this.config.repeatMode === 'one') {
      this.seek(0);
      this.play();
      return;
    }

    // Don't auto-advance if we're in the middle of a crossfade
    if (this.isCrossfading) {
      return;
    }

    // Use enhanced next method
    this.next();
  }

  // Set crossfade configuration
  public setCrossfade(enabled: boolean, duration?: number): void {
    super.setCrossfade(enabled, duration);
    
    // Clear preloaded tracks when crossfade settings change
    if (!enabled) {
      this.preloadedTracks.clear();
    }
  }

  // Enhanced destroy method
  public destroy(): void {
    super.destroy();
    
    if (this.crossfadeAudio) {
      this.crossfadeAudio.pause();
      this.crossfadeAudio.src = '';
    }
    
    this.preloadedTracks.clear();
    this.isCrossfading = false;
  }

  // Get crossfade status
  public getCrossfadeStatus(): {
    isCrossfading: boolean;
    progress: number;
    remainingTime: number;
  } {
    const remainingTime = this.audio.duration - this.audio.currentTime;
    const crossfadeTime = this.config.crossfadeDuration / 1000;
    const progress = this.isCrossfading ? 
      (Date.now() - this.crossfadeStartTime) / this.config.crossfadeDuration : 0;

    return {
      isCrossfading: this.isCrossfading,
      progress: Math.min(1, Math.max(0, progress)),
      remainingTime: Math.max(0, remainingTime - crossfadeTime),
    };
  }

  // Get preload status
  public getPreloadStatus(): {
    preloadedCount: number;
    nextTrackPreloaded: boolean;
    cacheSize: number;
  } {
    const nextIndex = this.getNextTrackIndex();
    const nextTrack = nextIndex !== -1 ? this.state.queue[nextIndex] : null;
    
    return {
      preloadedCount: this.preloadedTracks.size,
      nextTrackPreloaded: nextTrack ? this.preloadedTracks.has(nextTrack.videoId) : false,
      cacheSize: this.preloadedTracks.size,
    };
  }
}

// Create enhanced instance
export const enhancedMusicPlayer = new EnhancedMusicPlayer();

// Export for compatibility
export { enhancedMusicPlayer as musicPlayer };