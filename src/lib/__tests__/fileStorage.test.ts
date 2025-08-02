import { FileStorageService } from '../fileStorage';
import { Song } from '@/types';

describe('FileStorageService', () => {
  let fileStorage: FileStorageService;
  
  beforeEach(() => {
    // Reset singleton for testing
    (FileStorageService as any).instance = undefined;
    fileStorage = FileStorageService.getInstance();
  });

  describe('initialization', () => {
    it('should create instance with default config', () => {
      expect(fileStorage).toBeDefined();
      const config = fileStorage.getConfig();
      expect(config.platform).toBe('web');
      expect(config.enablePrivacy).toBe(true);
      expect(config.maxFileSize).toBe(100 * 1024 * 1024);
    });

    it('should create secure directory structure', () => {
      const directories = fileStorage.getDirectories();
      expect(directories.music).toContain('/Android/data/com.vibepipe.app/files/Music');
      expect(directories.temp).toContain('/temp');
      expect(directories.cache).toContain('/cache');
      expect(directories.metadata).toContain('/metadata');
    });
  });

  describe('file path generation', () => {
    const mockSong: Song = {
      id: '1',
      title: 'Test Song',
      artist: 'Test Artist',
      thumbnail: 'test.jpg',
      duration: '3:30',
      mood: ['chill', 'relaxing'],
      youtubeUrl: 'https://youtube.com/watch?v=test'
    };

    it('should generate secure file path', () => {
      const filePath = fileStorage.generateSecureFilePath(mockSong, 'mp3');
      expect(filePath).toContain('/Music/');
      expect(filePath).toContain('Test_Song.mp3');
    });

    it('should organize by mood when requested', () => {
      const filePath = fileStorage.generateSecureFilePath(mockSong, 'mp3', {
        useMoodFolder: true
      });
      expect(filePath).toContain('/chill/');
    });

    it('should organize by artist when requested', () => {
      const filePath = fileStorage.generateSecureFilePath(mockSong, 'mp4', {
        useArtistFolder: true
      });
      expect(filePath).toContain('/Test_Artist/');
    });

    it('should sanitize dangerous characters', () => {
      const dangerousSong: Song = {
        ...mockSong,
        title: 'Song<>:"/\\|?*Name',
        artist: 'Artist../Name'
      };
      
      const filePath = fileStorage.generateSecureFilePath(dangerousSong, 'mp3');
      expect(filePath).not.toContain('<');
      expect(filePath).not.toContain('>');
      expect(filePath).not.toContain(':');
      expect(filePath).not.toContain('"');
      expect(filePath).not.toContain('\\');
      expect(filePath).not.toContain('|');
      expect(filePath).not.toContain('?');
      expect(filePath).not.toContain('*');
      expect(filePath).not.toContain('..');
    });
  });

  describe('file path validation', () => {
    it('should validate paths within allowed directories', () => {
      const directories = fileStorage.getDirectories();
      const validPath = `${directories.music}/test.mp3`;
      expect(fileStorage.validateFilePath(validPath)).toBe(true);
    });

    it('should reject paths outside allowed directories', () => {
      const invalidPath = '/etc/passwd';
      expect(fileStorage.validateFilePath(invalidPath)).toBe(false);
    });

    it('should reject invalid file extensions', () => {
      const directories = fileStorage.getDirectories();
      const invalidPath = `${directories.music}/test.exe`;
      expect(fileStorage.validateFilePath(invalidPath)).toBe(false);
    });

    it('should reject path traversal attempts', () => {
      const directories = fileStorage.getDirectories();
      const traversalPath = `${directories.music}/../../../etc/passwd`;
      expect(fileStorage.validateFilePath(traversalPath)).toBe(false);
    });
  });

  describe('privacy features', () => {
    it('should enable privacy by default', () => {
      expect(fileStorage.isPrivacyEnabled()).toBe(true);
    });

    it('should allow toggling privacy', () => {
      fileStorage.setPrivacyEnabled(false);
      expect(fileStorage.isPrivacyEnabled()).toBe(false);
      
      fileStorage.setPrivacyEnabled(true);
      expect(fileStorage.isPrivacyEnabled()).toBe(true);
    });
  });

  describe('file extension validation', () => {
    it('should allow valid extensions', () => {
      expect(fileStorage.isExtensionAllowed('.mp3')).toBe(true);
      expect(fileStorage.isExtensionAllowed('.mp4')).toBe(true);
      expect(fileStorage.isExtensionAllowed('.m4a')).toBe(true);
      expect(fileStorage.isExtensionAllowed('.webm')).toBe(true);
    });

    it('should reject invalid extensions', () => {
      expect(fileStorage.isExtensionAllowed('.exe')).toBe(false);
      expect(fileStorage.isExtensionAllowed('.bat')).toBe(false);
      expect(fileStorage.isExtensionAllowed('.sh')).toBe(false);
    });
  });

  describe('file size validation', () => {
    it('should allow files within size limit', () => {
      const smallFile = 1024 * 1024; // 1MB
      expect(fileStorage.isFileSizeAllowed(smallFile)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const largeFile = 200 * 1024 * 1024; // 200MB
      expect(fileStorage.isFileSizeAllowed(largeFile)).toBe(false);
    });
  });

  describe('storage statistics', () => {
    it('should return storage stats', async () => {
      const stats = await fileStorage.getStorageStats();
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('availableSpace');
      expect(stats).toHaveProperty('fileCount');
      expect(stats).toHaveProperty('directories');
    });
  });

  describe('storage integrity', () => {
    it('should verify storage integrity', async () => {
      const integrity = await fileStorage.verifyStorageIntegrity();
      expect(integrity).toHaveProperty('isValid');
      expect(integrity).toHaveProperty('issues');
      expect(integrity).toHaveProperty('recommendations');
      expect(Array.isArray(integrity.issues)).toBe(true);
      expect(Array.isArray(integrity.recommendations)).toBe(true);
    });
  });
});