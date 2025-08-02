import { DownloadedContentManager } from '../downloadedContentManager';
import { Song, Download } from '@/types';

// Mock dependencies
jest.mock('../fileStorage');
jest.mock('../storage');

describe('DownloadedContentManager', () => {
  let contentManager: DownloadedContentManager;
  
  const mockSong: Song = {
    id: '1',
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail: 'test.jpg',
    duration: '3:30',
    mood: ['chill', 'relaxing'],
    youtubeUrl: 'https://youtube.com/watch?v=test'
  };

  const mockDownload: Download = {
    id: 'download-1',
    songId: '1',
    format: 'mp3',
    status: 'completed',
    progress: 100,
    filePath: '/Android/data/com.vibepipe.app/files/Music/Test_Song.mp3',
    fileSize: 5000000,
    createdAt: new Date(),
    completedAt: new Date()
  };

  beforeEach(() => {
    // Reset singleton for testing
    (DownloadedContentManager as any).instance = undefined;
    contentManager = DownloadedContentManager.getInstance();
  });

  describe('initialization', () => {
    it('should create instance', () => {
      expect(contentManager).toBeDefined();
    });

    it('should initialize empty content index', () => {
      const indexInfo = contentManager.getIndexInfo();
      expect(indexInfo.songs).toEqual([]);
      expect(indexInfo.totalSize).toBe(0);
    });
  });

  describe('content management', () => {
    it('should add downloaded song to index', async () => {
      await contentManager.addDownloadedSong(mockDownload, mockSong);
      
      const songs = contentManager.getDownloadedSongs();
      expect(songs).toHaveLength(1);
      expect(songs[0].title).toBe(mockSong.title);
      expect(songs[0].downloadId).toBe(mockDownload.id);
      expect(songs[0].format).toBe(mockDownload.format);
    });

    it('should not add incomplete downloads', async () => {
      const incompleteDownload = { ...mockDownload, status: 'processing' as const };
      
      await contentManager.addDownloadedSong(incompleteDownload, mockSong);
      
      const songs = contentManager.getDownloadedSongs();
      expect(songs).toHaveLength(0);
    });

    it('should remove downloaded song from index', async () => {
      await contentManager.addDownloadedSong(mockDownload, mockSong);
      
      const removed = await contentManager.removeDownloadedSong(mockDownload.id);
      
      expect(removed).toBe(true);
      const songs = contentManager.getDownloadedSongs();
      expect(songs).toHaveLength(0);
    });

    it('should return false when removing non-existent song', async () => {
      const removed = await contentManager.removeDownloadedSong('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('content filtering', () => {
    beforeEach(async () => {
      await contentManager.addDownloadedSong(mockDownload, mockSong);
      
      const rockSong: Song = {
        id: '2',
        title: 'Rock Song',
        artist: 'Rock Artist',
        thumbnail: 'rock.jpg',
        duration: '4:00',
        mood: ['hype', 'energetic'],
        youtubeUrl: 'https://youtube.com/watch?v=rock'
      };
      
      const rockDownload: Download = {
        ...mockDownload,
        id: 'download-2',
        songId: '2',
        format: 'mp4',
        filePath: '/Android/data/com.vibepipe.app/files/Music/Rock_Song.mp4'
      };
      
      await contentManager.addDownloadedSong(rockDownload, rockSong);
    });

    it('should filter songs by mood', () => {
      const chillSongs = contentManager.getDownloadedSongsByMood('chill');
      expect(chillSongs).toHaveLength(1);
      expect(chillSongs[0].title).toBe('Test Song');
      
      const hypeSongs = contentManager.getDownloadedSongsByMood('hype');
      expect(hypeSongs).toHaveLength(1);
      expect(hypeSongs[0].title).toBe('Rock Song');
    });

    it('should filter songs by format', () => {
      const mp3Songs = contentManager.getDownloadedSongsByFormat('mp3');
      expect(mp3Songs).toHaveLength(1);
      expect(mp3Songs[0].format).toBe('mp3');
      
      const mp4Songs = contentManager.getDownloadedSongsByFormat('mp4');
      expect(mp4Songs).toHaveLength(1);
      expect(mp4Songs[0].format).toBe('mp4');
    });

    it('should search songs by title', () => {
      const results = contentManager.searchDownloadedSongs('Test');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Song');
    });

    it('should search songs by artist', () => {
      const results = contentManager.searchDownloadedSongs('Rock Artist');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Rock Song');
    });

    it('should search songs by mood', () => {
      const results = contentManager.searchDownloadedSongs('chill');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Song');
    });
  });

  describe('playback sources', () => {
    it('should return local source for available downloaded song', async () => {
      await contentManager.addDownloadedSong(mockDownload, mockSong);
      
      const source = await contentManager.getPlaybackSource(mockSong.id);
      
      expect(source).toBeDefined();
      expect(source?.type).toBe('local');
      expect(source?.format).toBe('mp3');
    });

    it('should return stream source for non-downloaded song', async () => {
      const source = await contentManager.getPlaybackSource('non-existent');
      
      expect(source).toBeDefined();
      expect(source?.type).toBe('stream');
      expect(source?.url).toContain('/api/stream/');
    });
  });

  describe('content statistics', () => {
    beforeEach(async () => {
      await contentManager.addDownloadedSong(mockDownload, mockSong);
    });

    it('should return accurate content stats', () => {
      const stats = contentManager.getContentStats();
      
      expect(stats.totalSongs).toBe(1);
      expect(stats.totalSize).toBe(mockDownload.fileSize);
      expect(stats.byFormat.mp3).toBe(1);
      expect(stats.byMood.chill).toBe(1);
      expect(stats.byMood.relaxing).toBe(1);
      expect(stats.availableSongs).toBe(1);
      expect(stats.unavailableSongs).toBe(0);
    });
  });

  describe('cleanup operations', () => {
    beforeEach(async () => {
      // Add an old download
      const oldDownload = {
        ...mockDownload,
        completedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
      };
      
      await contentManager.addDownloadedSong(oldDownload, mockSong);
    });

    it('should identify files for cleanup', async () => {
      const result = await contentManager.cleanupDownloads({
        olderThanDays: 30,
        dryRun: true
      });
      
      expect(result.filesRemoved).toBe(1);
      expect(result.spaceFreed).toBe(mockDownload.fileSize);
      expect(result.removedFiles).toContain(mockSong.title);
    });

    it('should respect favorites when cleaning up', async () => {
      // Mock favorite status
      const originalIsFavorite = (contentManager as any).isFavorite;
      (contentManager as any).isFavorite = jest.fn().mockReturnValue(true);
      
      const result = await contentManager.cleanupDownloads({
        olderThanDays: 30,
        keepFavorites: true,
        dryRun: true
      });
      
      expect(result.filesRemoved).toBe(0);
      
      // Restore original method
      (contentManager as any).isFavorite = originalIsFavorite;
    });
  });

  describe('index operations', () => {
    it('should export index data', () => {
      const exported = contentManager.exportIndex();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveProperty('songs');
      expect(parsed).toHaveProperty('totalSize');
      expect(parsed).toHaveProperty('version');
    });

    it('should import index data', async () => {
      const indexData = {
        songs: [],
        totalSize: 0,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const success = await contentManager.importIndex(JSON.stringify(indexData));
      expect(success).toBe(true);
    });

    it('should reject invalid index data', async () => {
      const success = await contentManager.importIndex('invalid json');
      expect(success).toBe(false);
    });
  });
});