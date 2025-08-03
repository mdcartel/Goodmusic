import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Song, Download } from '../../types';

export interface FileOrganizationConfig {
  baseDirectory: string;
  structure: 'artist-album' | 'artist-year-album' | 'genre-artist-album' | 'flat';
  sanitizeNames: boolean;
  maxPathLength: number;
  duplicateHandling: 'skip' | 'rename' | 'replace';
}

export interface OrganizedFile {
  originalPath: string;
  newPath: string;
  directory: string;
  filename: string;
  moved: boolean;
  error?: string;
}

export interface DuplicateFile {
  path: string;
  size: number;
  hash: string;
  duplicates: string[];
  totalSize: number;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  duplicateFiles: number;
  duplicateSize: number;
  corruptFiles: number;
  organizationScore: number; // 0-100, how well organized the files are
}

export class FileOrganizer {
  private config: FileOrganizationConfig;

  constructor(config: FileOrganizationConfig) {
    this.config = config;
  }

  /**
   * Generate organized file path based on song metadata
   */
  generateOrganizedPath(song: Song): string {
    const sanitize = (str: string): string => {
      if (!this.config.sanitizeNames) return str;
      
      // Remove invalid characters for file systems
      return str
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100); // Limit length
    };

    const artist = sanitize(song.artist || 'Unknown Artist');
    const album = sanitize(song.album || 'Unknown Album');
    const title = sanitize(song.title);
    const year = song.year ? song.year.toString() : '';
    const genre = sanitize(song.genre || 'Unknown Genre');
    
    // Add track number if available
    const trackNumber = song.track_number 
      ? String(song.track_number).padStart(2, '0') 
      : '';
    
    const filename = trackNumber 
      ? `${trackNumber} - ${title}.${song.format || 'mp3'}`
      : `${title}.${song.format || 'mp3'}`;

    let directory: string;
    
    switch (this.config.structure) {
      case 'artist-year-album':
        directory = year 
          ? path.join(artist, `${year} - ${album}`)
          : path.join(artist, album);
        break;
      
      case 'genre-artist-album':
        directory = path.join(genre, artist, album);
        break;
      
      case 'flat':
        directory = '';
        break;
      
      case 'artist-album':
      default:
        directory = path.join(artist, album);
        break;
    }

    const fullPath = path.join(this.config.baseDirectory, directory, filename);
    
    // Check path length
    if (fullPath.length > this.config.maxPathLength) {
      // Truncate components to fit
      const truncatedTitle = title.substring(0, 50);
      const truncatedFilename = trackNumber 
        ? `${trackNumber} - ${truncatedTitle}.${song.format || 'mp3'}`
        : `${truncatedTitle}.${song.format || 'mp3'}`;
      
      return path.join(this.config.baseDirectory, directory, truncatedFilename);
    }

    return fullPath;
  }

  /**
   * Organize a single file
   */
  async organizeFile(filePath: string, song: Song): Promise<OrganizedFile> {
    const result: OrganizedFile = {
      originalPath: filePath,
      newPath: '',
      directory: '',
      filename: '',
      moved: false
    };

    try {
      const targetPath = this.generateOrganizedPath(song);
      const targetDir = path.dirname(targetPath);
      
      result.newPath = targetPath;
      result.directory = targetDir;
      result.filename = path.basename(targetPath);

      // Check if file already exists at target location
      if (filePath === targetPath) {
        result.moved = true; // Already in correct location
        return result;
      }

      // Create target directory
      await fs.mkdir(targetDir, { recursive: true });

      // Handle duplicates
      if (await this.fileExists(targetPath)) {
        switch (this.config.duplicateHandling) {
          case 'skip':
            result.error = 'File already exists, skipped';
            return result;
          
          case 'rename':
            result.newPath = await this.generateUniqueFilename(targetPath);
            break;
          
          case 'replace':
            await fs.unlink(targetPath);
            break;
        }
      }

      // Move the file
      await fs.rename(filePath, result.newPath);
      result.moved = true;

      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Organize multiple files
   */
  async organizeFiles(files: Array<{ path: string; song: Song }>): Promise<OrganizedFile[]> {
    const results: OrganizedFile[] = [];
    
    for (const file of files) {
      const result = await this.organizeFile(file.path, file.song);
      results.push(result);
    }

    return results;
  }

  /**
   * Find duplicate files by content hash
   */
  async findDuplicates(directory: string): Promise<DuplicateFile[]> {
    const fileHashes = new Map<string, string[]>();
    const fileSizes = new Map<string, number>();

    await this.scanDirectory(directory, async (filePath) => {
      try {
        const stats = await fs.stat(filePath);
        const hash = await this.calculateFileHash(filePath);
        
        fileSizes.set(filePath, stats.size);
        
        if (!fileHashes.has(hash)) {
          fileHashes.set(hash, []);
        }
        fileHashes.get(hash)!.push(filePath);
      } catch (error) {
        console.warn(`Error processing file ${filePath}:`, error);
      }
    });

    const duplicates: DuplicateFile[] = [];
    
    for (const [hash, paths] of fileHashes) {
      if (paths.length > 1) {
        const firstPath = paths[0];
        const size = fileSizes.get(firstPath) || 0;
        
        duplicates.push({
          path: firstPath,
          size,
          hash,
          duplicates: paths.slice(1),
          totalSize: size * paths.length
        });
      }
    }

    return duplicates.sort((a, b) => b.totalSize - a.totalSize);
  }

  /**
   * Remove duplicate files, keeping the first occurrence
   */
  async removeDuplicates(duplicates: DuplicateFile[]): Promise<{
    removed: string[];
    errors: Array<{ path: string; error: string }>;
    spaceSaved: number;
  }> {
    const removed: string[] = [];
    const errors: Array<{ path: string; error: string }> = [];
    let spaceSaved = 0;

    for (const duplicate of duplicates) {
      for (const duplicatePath of duplicate.duplicates) {
        try {
          await fs.unlink(duplicatePath);
          removed.push(duplicatePath);
          spaceSaved += duplicate.size;
        } catch (error) {
          errors.push({
            path: duplicatePath,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return { removed, errors, spaceSaved };
  }

  /**
   * Check file integrity
   */
  async checkFileIntegrity(filePath: string): Promise<{
    valid: boolean;
    size: number;
    hash: string;
    error?: string;
  }> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check if file is readable
      await fs.access(filePath, fs.constants.R_OK);
      
      // Calculate hash to verify integrity
      const hash = await this.calculateFileHash(filePath);
      
      // Basic checks
      const valid = stats.size > 0 && hash.length > 0;
      
      return {
        valid,
        size: stats.size,
        hash,
        error: valid ? undefined : 'File appears to be corrupted'
      };
    } catch (error) {
      return {
        valid: false,
        size: 0,
        hash: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Scan directory for corrupt files
   */
  async findCorruptFiles(directory: string): Promise<Array<{
    path: string;
    error: string;
    size: number;
  }>> {
    const corruptFiles: Array<{ path: string; error: string; size: number }> = [];

    await this.scanDirectory(directory, async (filePath) => {
      const integrity = await this.checkFileIntegrity(filePath);
      if (!integrity.valid) {
        corruptFiles.push({
          path: filePath,
          error: integrity.error || 'Unknown error',
          size: integrity.size
        });
      }
    });

    return corruptFiles;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(directory: string): Promise<StorageStats> {
    let totalFiles = 0;
    let totalSize = 0;
    const filePaths: string[] = [];

    // Scan all files
    await this.scanDirectory(directory, async (filePath) => {
      try {
        const stats = await fs.stat(filePath);
        totalFiles++;
        totalSize += stats.size;
        filePaths.push(filePath);
      } catch (error) {
        // Skip files that can't be accessed
      }
    });

    // Find duplicates
    const duplicates = await this.findDuplicates(directory);
    const duplicateFiles = duplicates.reduce((sum, dup) => sum + dup.duplicates.length, 0);
    const duplicateSize = duplicates.reduce((sum, dup) => sum + (dup.size * dup.duplicates.length), 0);

    // Find corrupt files
    const corruptFiles = await this.findCorruptFiles(directory);

    // Calculate organization score
    const organizationScore = await this.calculateOrganizationScore(filePaths);

    return {
      totalFiles,
      totalSize,
      duplicateFiles,
      duplicateSize,
      corruptFiles: corruptFiles.length,
      organizationScore
    };
  }

  /**
   * Clean up empty directories
   */
  async cleanupEmptyDirectories(directory: string): Promise<string[]> {
    const removedDirs: string[] = [];

    const removeEmptyDir = async (dir: string): Promise<boolean> => {
      try {
        const entries = await fs.readdir(dir);
        
        // Recursively check subdirectories
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            const wasRemoved = await removeEmptyDir(fullPath);
            if (wasRemoved) {
              removedDirs.push(fullPath);
            }
          }
        }

        // Check if directory is now empty
        const updatedEntries = await fs.readdir(dir);
        if (updatedEntries.length === 0 && dir !== directory) {
          await fs.rmdir(dir);
          return true;
        }
      } catch (error) {
        console.warn(`Error checking directory ${dir}:`, error);
      }
      
      return false;
    };

    await removeEmptyDir(directory);
    return removedDirs;
  }

  // Private helper methods

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async generateUniqueFilename(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    
    let counter = 1;
    let newPath = filePath;
    
    while (await this.fileExists(newPath)) {
      newPath = path.join(dir, `${name} (${counter})${ext}`);
      counter++;
    }
    
    return newPath;
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const hash = crypto.createHash('md5');
    const stream = await fs.readFile(filePath);
    hash.update(stream);
    return hash.digest('hex');
  }

  private async scanDirectory(
    directory: string, 
    callback: (filePath: string) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(directory);
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.scanDirectory(fullPath, callback);
        } else if (stats.isFile()) {
          await callback(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Error scanning directory ${directory}:`, error);
    }
  }

  private async calculateOrganizationScore(filePaths: string[]): Promise<number> {
    if (filePaths.length === 0) return 100;

    let organizedFiles = 0;
    
    for (const filePath of filePaths) {
      const relativePath = path.relative(this.config.baseDirectory, filePath);
      const pathParts = relativePath.split(path.sep);
      
      // Check if file follows expected organization structure
      const isOrganized = this.isPathOrganized(pathParts);
      if (isOrganized) {
        organizedFiles++;
      }
    }

    return Math.round((organizedFiles / filePaths.length) * 100);
  }

  private isPathOrganized(pathParts: string[]): boolean {
    switch (this.config.structure) {
      case 'flat':
        return pathParts.length === 1;
      
      case 'artist-album':
        return pathParts.length === 3; // artist/album/song
      
      case 'artist-year-album':
      case 'genre-artist-album':
        return pathParts.length === 3; // Same structure depth
      
      default:
        return false;
    }
  }
}