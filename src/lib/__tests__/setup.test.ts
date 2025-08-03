import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { database } from '../database';
import { useAppStore } from '../store';
import { youtubeScraperService } from '../services';

describe('NewPipe Architecture Setup', () => {
  beforeAll(async () => {
    // Initialize database for testing
    await database.initialize();
  });

  afterAll(async () => {
    // Clean up
    await database.close();
  });

  describe('Database Connection', () => {
    it('should connect to SQLite database', async () => {
      const db = await database.connect();
      expect(db).toBeDefined();
    });

    it('should have all required tables', async () => {
      const tables = await database.all(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      
      const tableNames = tables.map((table: any) => table.name);
      
      expect(tableNames).toContain('songs');
      expect(tableNames).toContain('playlists');
      expect(tableNames).toContain('playlist_songs');
      expect(tableNames).toContain('downloads');
      expect(tableNames).toContain('channels');
      expect(tableNames).toContain('search_history');
      expect(tableNames).toContain('settings');
    });

    it('should have default settings', async () => {
      const settings = await database.all('SELECT * FROM settings');
      expect(settings.length).toBeGreaterThan(0);
      
      const themeSettings = settings.find((s: any) => s.key === 'theme');
      expect(themeSettings).toBeDefined();
      expect(themeSettings.value).toBe('dark');
    });
  });

  describe('Zustand Store', () => {
    it('should initialize with default state', () => {
      const store = useAppStore.getState();
      
      expect(store.songs).toEqual([]);
      expect(store.playlists).toEqual([]);
      expect(store.downloads).toEqual([]);
      expect(store.player.currentSong).toBeNull();
      expect(store.player.isPlaying).toBe(false);
      expect(store.settings.theme).toBe('dark');
    });

    it('should handle basic actions', () => {
      const { playSong, pauseSong, setVolume } = useAppStore.getState();
      
      // Test volume setting
      setVolume(0.5);
      expect(useAppStore.getState().player.volume).toBe(0.5);
      
      // Test pause (should work even without a song)
      pauseSong();
      expect(useAppStore.getState().player.isPlaying).toBe(false);
    });
  });

  describe('YouTube Scraper Service', () => {
    it('should be a singleton instance', () => {
      const instance1 = youtubeScraperService;
      const instance2 = youtubeScraperService;
      
      expect(instance1).toBe(instance2);
    });

    it('should have all required methods', () => {
      expect(typeof youtubeScraperService.search).toBe('function');
      expect(typeof youtubeScraperService.getVideoInfo).toBe('function');
      expect(typeof youtubeScraperService.getChannelInfo).toBe('function');
      expect(typeof youtubeScraperService.getPlaylistInfo).toBe('function');
      expect(typeof youtubeScraperService.getTrendingMusic).toBe('function');
      expect(typeof youtubeScraperService.extractAudioUrl).toBe('function');
    });
  });

  describe('Integration', () => {
    it('should be able to add a song to the store and database', async () => {
      const testSong = {
        id: 'test-song-1',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        thumbnail: 'https://example.com/thumb.jpg',
        youtubeUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        isDownloaded: false,
        addedAt: new Date(),
        playCount: 0,
      };

      // Add to store
      useAppStore.getState().addSong(testSong);
      expect(useAppStore.getState().songs).toContain(testSong);

      // Add to database
      await database.run(
        `INSERT INTO songs (id, youtube_id, title, artist, duration, thumbnail, youtube_url, is_downloaded, added_at, play_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testSong.id,
          testSong.youtubeId,
          testSong.title,
          testSong.artist,
          testSong.duration,
          testSong.thumbnail,
          testSong.youtubeUrl,
          testSong.isDownloaded ? 1 : 0,
          testSong.addedAt.toISOString(),
          testSong.playCount,
        ]
      );

      // Verify in database
      const dbSong = await database.get('SELECT * FROM songs WHERE id = ?', [testSong.id]);
      expect(dbSong).toBeDefined();
      expect(dbSong.title).toBe(testSong.title);

      // Clean up
      await database.run('DELETE FROM songs WHERE id = ?', [testSong.id]);
      useAppStore.getState().removeSong(testSong.id);
    });
  });
});