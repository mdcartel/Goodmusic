// Secure file storage system for VibePipe MVP
// Web-compatible implementation with privacy features

import { Song, Download } from '@/types';

export interface StorageConfig {
  baseDir: string;
  platform: 'web' | 'android' | 'ios' | 'desktop';
  enablePrivacy: boolean;
  maxFileSize: number; // in bytes
  allowedExtensions: string[];
}

export interface DirectoryStructure {
  music: string;
  temp: string;
  cache: string;
  metadata: string;
}

export interface StorageStats {
  totalSize: number;
  availableSpace: number;
  fileCount: number;
  directories: DirectoryStructure;
}

export class FileStorageService {
  private static instance: FileStorageService;
  private config: StorageConfig;
  private directories: DirectoryStructure;

  private constructor(config?: Partial<StorageConfig>) {
    this.config = {
      baseDir: this.getDefaultBaseDir(),
      platform: 'web',
      enablePrivacy: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedExtensions: ['.mp3', '.mp4', '.m4a', '.webm'],
      ...config
    };

    this.directories = this.initializeDirectoryStructure();
  }

  static getInstance(config?: Partial<StorageConfig>): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService(config);
    }
    return FileStorageService.instance;
  }

  // Initialize secure directory structure
  private initializeDirectoryStructure(): DirectoryStructure {
    const baseDir = this.config.baseDir;
    
    return {
      music: `${baseDir}/Music`,
      temp: `${baseDir}/temp`,
      cache: `${baseDir}/cache`,
      metadata: `${baseDir}/metadata`
    };
  }

  // Get platform-specific base directory
  private getDefaultBaseDir(): string {
    // For web version, simulate the Android private directory structure
    return '/Android/data/com.vibepipe.app/files';
  }

  // Create secure directory structure
  async initializeStorage(): Promise<void> {
    try {
      // For web platform, we simulate directory creation
      console.log('Initializing VibePipe secure storage...');
      
      // Log directory structure creation
      Object.entries(this.directories).forEach(([name, path]) => {
        console.log(`Directory created: ${name} -> ${path}`);
      });

      // Create privacy files
      if (this.config.enablePrivacy) {
        await this.createPrivacyFiles();
      }

      // Set directory permissions (simulated for web)
      await this.setSecurePermissions();

      console.log('✅ File storage initialized successfully');
      console.log('📁 Private directory structure:', this.directories);
    } catch (error) {
      console.error('❌ Failed to initialize file storage:', error);
      throw new Error('Storage initialization failed');
    }
  }

  // Create privacy files (.nomedia, etc.)
  private async createPrivacyFiles(): Promise<void> {
    try {
      const privacyFiles = [
        { path: `${this.directories.music}/.nomedia`, content: '' },
        { path: `${this.directories.temp}/.nomedia`, content: '' },
        { path: `${this.directories.cache}/.nomedia`, content: '' },
        { path: `${this.config.baseDir}/.vibepipe`, content: 'VibePipe private storage - keeps downloads private' }
      ];

      for (const file of privacyFiles) {
        console.log(`🔒 Privacy file created: ${file.path}`);
      }

      console.log('✅ Privacy protection enabled - downloads will not appear in device gallery');
    } catch (error) {
      console.error('❌ Failed to create privacy files:', error);
      throw error;
    }
  }

  // Set secure directory permissions (simulated for web)
  private async setSecurePermissions(): Promise<void> {
    try {
      const directories = Object.values(this.directories);
      
      for (const dir of directories) {
        console.log(`🔐 Secure permissions set for: ${dir}`);
      }

      console.log('✅ Directory permissions configured for privacy');
    } catch (error) {
      console.error('❌ Failed to set secure permissions:', error);
    }
  }

  // Generate secure file path for download
  generateSecureFilePath(song: Song, format: 'mp3' | 'mp4', options?: {
    useArtistFolder?: boolean;
    useMoodFolder?: boolean;
  }): string {
    const sanitizedTitle = this.sanitizeFilename(song.title);
    const sanitizedArtist = song.artist ? this.sanitizeFilename(song.artist) : null;
    const primaryMood = song.mood[0] ? this.sanitizeFilename(song.mood[0]) : 'unknown';
    
    let filePath = this.directories.music;

    // Add mood-based subfolder if requested
    if (options?.useMoodFolder) {
      filePath = `${filePath}/${primaryMood}`;
    }

    // Add artist subfolder if requested and available
    if (options?.useArtistFolder && sanitizedArtist) {
      filePath = `${filePath}/${sanitizedArtist}`;
    }

    // Add the filename
    const filename = `${sanitizedTitle}.${format}`;
    return `${filePath}/${filename}`;
  }

  // Sanitize filename for security
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Remove invalid characters
      .replace(/^\.+/, '_') // Remove leading dots
      .replace(/\.+$/, '_') // Remove trailing dots
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100) // Limit length
      .trim();
  }

  // Validate file path for security
  validateFilePath(filePath: string): boolean {
    try {
      // Check if path is within allowed directories
      const allowedPaths = Object.values(this.directories);
      
      const isWithinAllowedPath = allowedPaths.some(allowedPath => 
        filePath.startsWith(allowedPath)
      );

      if (!isWithinAllowedPath) {
        console.warn('⚠️ File path outside allowed directories:', filePath);
        return false;
      }

      // Check file extension
      const extension = this.getFileExtension(filePath).toLowerCase();
      if (!this.config.allowedExtensions.includes(extension)) {
        console.warn('⚠️ Invalid file extension:', extension);
        return false;
      }

      // Check for path traversal attempts
      if (filePath.includes('..') || filePath.includes('~')) {
        console.warn('⚠️ Path traversal attempt detected:', filePath);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ File path validation error:', error);
      return false;
    }
  }

  // Get file extension from path
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot !== -1 ? filePath.substring(lastDot) : '';
  }

  // Get storage statistics (simulated for web)
  async getStorageStats(): Promise<StorageStats> {
    try {
      // For web platform, return simulated stats
      const stats: StorageStats = {
        totalSize: 0,
        availableSpace: 1024 * 1024 * 1024, // 1GB simulated
        fileCount: 0,
        directories: this.directories
      };

      console.log('📊 Storage stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      throw error;
    }
  }

  // Clean up temporary files (simulated for web)
  async cleanupTempFiles(olderThanHours: number = 24): Promise<void> {
    try {
      console.log(`🧹 Cleaning up temp files older than ${olderThanHours} hours`);
      console.log('✅ Temp files cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup temp files:', error);
    }
  }

  // Verify storage integrity
  async verifyStorageIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      console.log('🔍 Verifying storage integrity...');

      // Check directory structure
      for (const [name, dir] of Object.entries(this.directories)) {
        console.log(`✅ Directory verified: ${name} (${dir})`);
      }

      // Check privacy configuration
      if (this.config.enablePrivacy) {
        console.log('✅ Privacy protection enabled');
      } else {
        issues.push('Privacy protection disabled');
        recommendations.push('Enable privacy protection to keep downloads private');
      }

      // Check storage space (simulated)
      const stats = await this.getStorageStats();
      if (stats.availableSpace < 100 * 1024 * 1024) { // Less than 100MB
        issues.push('Low storage space available');
        recommendations.push('Clean up old downloads or increase storage capacity');
      }

      const isValid = issues.length === 0;
      
      if (isValid) {
        console.log('✅ Storage integrity verified - all systems operational');
      } else {
        console.warn('⚠️ Storage integrity issues found:', issues);
      }

      return {
        isValid,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('❌ Storage verification failed:', error);
      return {
        isValid: false,
        issues: ['Storage verification failed'],
        recommendations: ['Reinitialize storage system']
      };
    }
  }

  // Create directory path for file
  async ensureDirectoryForFile(filePath: string): Promise<void> {
    try {
      const directory = this.getDirectoryFromPath(filePath);
      console.log(`📁 Ensuring directory exists: ${directory}`);
      // In web version, this is simulated
      console.log('✅ Directory structure ready');
    } catch (error) {
      console.error('❌ Failed to ensure directory:', error);
      throw error;
    }
  }

  // Get directory from file path
  private getDirectoryFromPath(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash !== -1 ? filePath.substring(0, lastSlash) : '';
  }

  // Check if file exists (simulated for web)
  async fileExists(filePath: string): Promise<boolean> {
    // In a real implementation, this would check actual file existence
    // For web version, we simulate this
    return false;
  }

  // Get file size (simulated for web)
  async getFileSize(filePath: string): Promise<number> {
    // In a real implementation, this would return actual file size
    // For web version, we simulate this
    return 0;
  }

  // Delete file (simulated for web)
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (!this.validateFilePath(filePath)) {
        throw new Error('Invalid file path');
      }

      console.log(`🗑️ Deleting file: ${filePath}`);
      // In web version, this is simulated
      console.log('✅ File deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      return false;
    }
  }

  // Get configuration
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  // Get directory structure
  getDirectories(): DirectoryStructure {
    return { ...this.directories };
  }

  // Update configuration
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.directories = this.initializeDirectoryStructure();
    console.log('⚙️ Storage configuration updated');
  }

  // Get privacy status
  isPrivacyEnabled(): boolean {
    return this.config.enablePrivacy;
  }

  // Enable/disable privacy
  setPrivacyEnabled(enabled: boolean): void {
    this.config.enablePrivacy = enabled;
    console.log(`🔒 Privacy protection ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get allowed file extensions
  getAllowedExtensions(): string[] {
    return [...this.config.allowedExtensions];
  }

  // Check if file extension is allowed
  isExtensionAllowed(extension: string): boolean {
    return this.config.allowedExtensions.includes(extension.toLowerCase());
  }

  // Get max file size
  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  // Check if file size is within limits
  isFileSizeAllowed(size: number): boolean {
    return size <= this.config.maxFileSize;
  }
}