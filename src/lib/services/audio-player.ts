import { audioExtractor } from './audio-extractor';
import { database } from '../database';
import { generateId } from '../utils';

// Player state types
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export type RepeatMode = 'none' | 'one' | 'all';
export type CrossfadeMode = 'none' | 'short' | 'medium' | 'long';

// Audio track interface
export interface AudioTrack {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail?: string;
  url?: string;
  quality?: string;
  format?: string;
  addedAt: Date;
}

// Player state interface
export interface PlayerState {
  currentTrack: AudioTrack | null;
  queue: AudioTrack[];
  currentIndex: number;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
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
  | 'loadstart'
  | 'canplay'
  | 'seeking'
  | 'seeked';

export type PlayerEventListener = (data?: any) => void;

// Audio effects interface
export interface AudioEffects {
  equalizer: {
    enabled: boolean;
    presets: Record<string, number[]>;
    currentPreset: string;
    customBands: number[];
  };
  bassBoost: {
    enabled: boolean;
    gain: number;
  };
  reverb: {
    enabled: boolean;
    roomSize: number;
    damping: number;
    wetLevel: number;
  };
  compressor: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
}

class AudioPlayerService {
  private static instance: AudioPlayerService;
  private audio: HTMLAudioElement;
  private nextAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private equalizerNodes: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode | null = null;
  
  private state: PlayerState = {
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    muted: false,
    playbackRate: 1.0,
    repeatMode: 'none',
    shuffleEnabled: false,
    crossfadeEnabled: false,
    crossfadeDuration: 3000, // 3 seconds
    gaplessEnabled: true,
    loading: false,
    error: null,
  };

  private effects: AudioEffects = {
    equalizer: {
      enabled: false,
      presets: {
        'flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        'rock': [3, 2, -1, -2, 1, 2, 3, 3, 2, 1],
        'pop': [1, 2, 3, 2, 0, -1, -1, 1, 2, 3],
        'jazz': [2, 1, 0, 1, 2, 2, 1, 1, 2, 3],
        'classical': [3, 2, 1, 0, 0, 0, 1, 2, 3, 4],
        'bass': [4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
        'treble': [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
      },
      currentPreset: 'flat',
      customBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    bassBoost: {
      enabled: false,
      gain: 0,
    },
    reverb: {
      enabled: false,
      roomSize: 0.5,
      damping: 0.5,
      wetLevel: 0.3,
    },
    compressor: {
      enabled: false,
      threshold: -24,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
    },
  };

  private eventListeners: Map<PlayerEvent, Set<PlayerEventListener>> = new Map();
  private crossfadeTimeout: NodeJS.Timeout | null = null;
  private preloadTimeout: NodeJS.Timeout | null = null;
  private shuffledQueue: number[] = [];
  private originalQueue: AudioTrack[] = [];

  private constructor() {
    this.audio = new Audio();
    this.setupAudioElement();
    this.initializeAudioContext();
    this.loadPersistedState();
  }

  public static getInstance(): AudioPlayerService {
    if (!AudioPlayerService.instance) {
      AudioPlayerService.instance = new AudioPlayerService();
    }
    return AudioPlayerService.instance;
  }

  // Public API methods

  /**
   * Load a track or queue of tracks
   */
  async loadTrack(track: AudioTrack, autoPlay: boolean = false): Promise<void> {
    try {
      this.setState({ loading: true, error: null });
      this.emit('loadstart');

      // Extract audio URL if not provided
      if (!track.url) {
        const extraction = await audioExtractor.extractAudioStream(track.videoId, {
          quality: 'best',
          format: 'm4a',
        });

   