import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { musicPlayer, MusicPlayerService, Track } from '../music-player';
import { database } from '../../database';

// Mock audio element
const mockAudio = {
  src: '',
  volume: 0.8,
  playbackRate: 1.0,
  currentTime: 0,
  duration: 180,
  paused: true,
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  error: null,
  preload: 'metadata',
};

// Mock HTML Audio constructor
global.Audio = jest.fn().mockImplementation(() => mockAudio);

// Mock audio extractor
jest.mock('../audio-extractor', () => ({
  audioExtractor: {
    extractAudioStream: jest.fn().mockResolvedValue({
      success: true,
      stream: {
        id: 'test-stream-id',
        url: 'https://example.com/audio.m4a',
        quality: 'best',
        format: 'm4a',
        bitrate: 256,
        sampleRate: 44100,
        channels: 2,
        duration: 180,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        videoId: 'test-video-id',
      },
    }),
  },
}));

describe('MusicPlayerService', () => {
  const testTracks: Track[] = [
    {
      id: 'track1',
      videoId: 'video1',
      title: 'Test Song 1',
      artist: 'Test Artist 1',
      duration: 180,
      thumbnail: 'https://example.com/thumb1.jpg',
    },
    {
      id: 'track2',
      videoId: 'video2',
      title: 'Test Song 2',
      artist: 'Test Artist 2',
      duration: 240,
      thumbnail: 'https://example.com/thumb2.jpg',
    },
    {
      id: 'track3',
      videoId: 'video3',
      title: 'Test Song 3',
      artist: 'Test Artist 3',
      duration: 200,
    },
  ];

  beforeAll(async () => {
    // Initialize database for testing
    await database.initialize();
  });

  afterAll(async () => {
    // Clean up
    musicPlayer.destroy();
    await database.close();
  });

  beforeEach(() => {
    // Reset player state
    musicPlayer.clearQueue();
    jest.clearAllMocks();
  });

  describe('Service initialization', () => {
    it('should be a singleton instance', () => {
      const instance1 = musicPlayer;
      const instance2 = MusicPlayerService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should have initial state', () => {
      const state = musicPlayer.getState();
      
      expect(state.currentTrack).toBeNull();
      expect(state.queue).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.playbackState).toBe('idle');
      expect(state.volume).toBe(0.8);
      expect(state.repeatMode).toBe('none');
      expect(state.shuffleEnabled).toBe(false);
    });

    it('should have default configuration', () => {
      const config = musicPlayer.getConfig();
      
      expect(config.volume).toBe(0.8);
      expect(config.playbackRate).toBe(1.0);
      expect(config.gaplessPlayback).toBe(true);
      expect(config.repeatMode).toBe('none');
      expect(config.shuffleEnabled).toBe(false);
    });
  });

  describe('Queue management', () => {
    it('should set queue correctly', () => {
      musicPlayer.setQueue(testTracks);
      
      const queue = musicPlayer.getQueue();
      expect(queue).toHaveLength(3);
      expect(queue[0].title).toBe('Test Song 1');
      expect(queue[0].queueId).toBeTruthy();
      expect(queue[0].addedAt).toBeInstanceOf(Date);
      expect(queue[0].playCount).toBe(0);
    });

    it('should add track to queue', () => {
      musicPlayer.setQueue([testTracks[0]]);
      musicPlayer.addToQueue(testTracks[1]);
      
      const queue = musicPlayer.getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[1].title).toBe('Test Song 2');
    });

    it('should add track at specific position', () => {
      musicPlayer.setQueue([testTracks[0], testTracks[2]]);
      musicPlayer.addToQueue(testTracks[1], 1);
      
      const queue = musicPlayer.getQueue();
      expect(queue).toHaveLength(3);
      expect(queue[1].title).toBe('Test Song 2');
    });

    it('should remove track from queue', () => {
      musicPlayer.setQueue(testTracks);
      const queue = musicPlayer.getQueue();
      const queueId = queue[1].queueId;
      
      musicPlayer.removeFromQueue(queueId);
      
      const updatedQueue = musicPlayer.getQueue();
      expect(updatedQueue).toHaveLength(2);
      expect(updatedQueue.find(track => track.queueId === queueId)).toBeUndefined();
    });

    it('should clear queue', () => {
      musicPlayer.setQueue(testTracks);
      musicPlayer.clearQueue();
      
      const queue = musicPlayer.getQueue();
      expect(queue).toHaveLength(0);
      
      const state = musicPlayer.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.currentIndex).toBe(-1);
    });
  });

  describe('Playback controls', () => {
    beforeEach(() => {
      musicPlayer.setQueue(testTracks);
    });

    it('should play first track when queue is set', async () => {
      await musicPlayer.play();
      
      const state = musicPlayer.getState();
      expect(state.currentTrack).toBeTruthy();
      expect(state.currentIndex).toBe(0);
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should pause playback', () => {
      musicPlayer.pause();
      
      expect(mockAudio.pause).toHaveBeenCalled();
      
      const state = musicPlayer.getState();
      expect(state.playbackState).toBe('paused');
    });

    it('should stop playback', () => {
      musicPlayer.stop();
      
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      
      const state = musicPlayer.getState();
      expect(state.playbackState).toBe('idle');
      expect(state.currentTime).toBe(0);
    });

    it('should seek to specific time', async () => {
      await musicPlayer.seek(60);
      
      expect(mockAudio.currentTime).toBe(60);
      
      const state = musicPlayer.getState();
      expect(state.currentTime).toBe(60);
    });

    it('should not seek beyond duration', async () => {
      await musicPlayer.seek(300); // Beyond 180s duration
      
      // Should not change current time if beyond duration
      expect(mockAudio.currentTime).toBe(0);
    });
  });

  describe('Volume and playback rate', () => {
    it('should set volume correctly', () => {
      musicPlayer.setVolume(0.5);
      
      expect(mockAudio.volume).toBe(0.5);
      
      const state = musicPlayer.getState();
      expect(state.volume).toBe(0.5);
    });

    it('should clamp volume between 0 and 1', () => {
      musicPlayer.setVolume(1.5);
      expect(mockAudio.volume).toBe(1);
      
      musicPlayer.setVolume(-0.5);
      expect(mockAudio.volume).toBe(0);
    });

    it('should set playback rate correctly', () => {
      musicPlayer.setPlaybackRate(1.5);
      
      expect(mockAudio.playbackRate).toBe(1.5);
      
      const state = musicPlayer.getState();
      expect(state.playbackRate).toBe(1.5);
    });

    it('should clamp playback rate between 0.25 and 4.0', () => {
      musicPlayer.setPlaybackRate(5.0);
      expect(mockAudio.playbackRate).toBe(4.0);
      
      musicPlayer.setPlaybackRate(0.1);
      expect(mockAudio.playbackRate).toBe(0.25);
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      musicPlayer.setQueue(testTracks);
    });

    it('should play track at specific index', async () => {
      await musicPlayer.playTrackAtIndex(1);
      
      const state = musicPlayer.getState();
      expect(state.currentIndex).toBe(1);
      expect(state.currentTrack?.title).toBe('Test Song 2');
    });

    it('should go to next track', async () => {
      await musicPlayer.playTrackAtIndex(0);
      await musicPlayer.next();
      
      const state = musicPlayer.getState();
      expect(state.currentIndex).toBe(1);
      expect(state.currentTrack?.title).toBe('Test Song 2');
    });

    it('should go to previous track', async () => {
      await musicPlayer.playTrackAtIndex(1);
      
      // Mock current time to be less than 3 seconds
      mockAudio.currentTime = 1;
      
      await musicPlayer.previous();
      
      const state = musicPlayer.getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentTrack?.title).toBe('Test Song 1');
    });

    it('should restart current track if more than 3 seconds played', async () => {
      await musicPlayer.playTrackAtIndex(1);
      
      // Mock current time to be more than 3 seconds
      mockAudio.currentTime = 5;
      
      await musicPlayer.previous();
      
      // Should seek to 0 instead of going to previous track
      expect(mockAudio.currentTime).toBe(0);
      
      const state = musicPlayer.getState();
      expect(state.currentIndex).toBe(1); // Still on same track
    });
  });

  describe('Shuffle and repeat modes', () => {
    beforeEach(() => {
      musicPlayer.setQueue(testTracks);
    });

    it('should enable shuffle', () => {
      musicPlayer.setShuffle(true);
      
      const state = musicPlayer.getState();
      expect(state.shuffleEnabled).toBe(true);
      
      // Queue should still have same tracks but potentially different order
      const queue = musicPlayer.getQueue();
      expect(queue).toHaveLength(3);
    });

    it('should disable shuffle and restore original order', () => {
      musicPlayer.setShuffle(true);
      musicPlayer.setShuffle(false);
      
      const state = musicPlayer.getState();
      expect(state.shuffleEnabled).toBe(false);
      
      const queue = musicPlayer.getQueue();
      expect(queue[0].title).toBe('Test Song 1');
      expect(queue[1].title).toBe('Test Song 2');
      expect(queue[2].title).toBe('Test Song 3');
    });

    it('should set repeat mode', () => {
      musicPlayer.setRepeatMode('one');
      
      const state = musicPlayer.getState();
      expect(state.repeatMode).toBe('one');
      
      musicPlayer.setRepeatMode('all');
      expect(musicPlayer.getState().repeatMode).toBe('all');
      
      musicPlayer.setRepeatMode('none');
      expect(musicPlayer.getState().repeatMode).toBe('none');
    });
  });

  describe('Event system', () => {
    it('should register and trigger event listeners', () => {
      const mockCallback = jest.fn();
      
      musicPlayer.on('stateChange', mockCallback);
      
      // Trigger a state change
      musicPlayer.setVolume(0.5);
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const mockCallback = jest.fn();
      
      musicPlayer.on('stateChange', mockCallback);
      musicPlayer.off('stateChange', mockCallback);
      
      // Trigger a state change
      musicPlayer.setVolume(0.3);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should emit track change events', async () => {
      const mockCallback = jest.fn();
      
      musicPlayer.on('trackChange', mockCallback);
      musicPlayer.setQueue(testTracks);
      
      await musicPlayer.playTrackAtIndex(0);
      
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Song 1',
      }));
    });

    it('should emit queue change events', () => {
      const mockCallback = jest.fn();
      
      musicPlayer.on('queueChange', mockCallback);
      
      musicPlayer.setQueue(testTracks);
      
      expect(mockCallback).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ title: 'Test Song 1' }),
      ]));
    });
  });

  describe('Error handling', () => {
    it('should handle audio extraction errors', async () => {
      const { audioExtractor } = require('../audio-extractor');
      audioExtractor.extractAudioStream.mockResolvedValueOnce({
        success: false,
        error: 'Failed to extract audio',
      });

      musicPlayer.setQueue([testTracks[0]]);
      
      await musicPlayer.playTrackAtIndex(0);
      
      const state = musicPlayer.getState();
      expect(state.playbackState).toBe('error');
      expect(state.error).toBeTruthy();
    });

    it('should emit error events', () => {
      const mockCallback = jest.fn();
      
      musicPlayer.on('error', mockCallback);
      
      // Simulate audio error
      const errorEvent = new Event('error');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1](errorEvent);
      
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('State persistence', () => {
    it('should save player state to database', async () => {
      musicPlayer.setQueue(testTracks);
      await musicPlayer.playTrackAtIndex(1);
      
      // State should be saved automatically
      const result = await database.get('SELECT value FROM settings WHERE key = "player_state"');
      expect(result).toBeTruthy();
      
      const stateData = JSON.parse(result.value);
      expect(stateData.currentIndex).toBe(1);
      expect(stateData.queue).toHaveLength(3);
    });

    it('should load player state from database', async () => {
      // Save some state first
      musicPlayer.setQueue(testTracks);
      await musicPlayer.playTrackAtIndex(2);
      
      // Create new instance and load state
      const newPlayer = MusicPlayerService.getInstance();
      await newPlayer.loadState();
      
      const state = newPlayer.getState();
      expect(state.currentIndex).toBe(2);
      expect(state.queue).toHaveLength(3);
      expect(state.currentTrack?.title).toBe('Test Song 3');
    });
  });

  describe('Configuration persistence', () => {
    it('should save configuration to database', async () => {
      musicPlayer.setVolume(0.6);
      musicPlayer.setPlaybackRate(1.25);
      musicPlayer.setRepeatMode('all');
      
      // Check if settings were saved
      const volumeSetting = await database.get('SELECT value FROM settings WHERE key = "player_volume"');
      expect(JSON.parse(volumeSetting.value)).toBe(0.6);
      
      const rateSetting = await database.get('SELECT value FROM settings WHERE key = "player_playbackRate"');
      expect(JSON.parse(rateSetting.value)).toBe(1.25);
      
      const repeatSetting = await database.get('SELECT value FROM settings WHERE key = "player_repeatMode"');
      expect(JSON.parse(repeatSetting.value)).toBe('all');
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      musicPlayer.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.src).toBe('');
    });
  });
});