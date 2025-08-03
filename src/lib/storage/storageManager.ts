import fs from 'fs/promises';
import path from 'path';
import { FileOrganizer, FileOrganizationConfig, StorageStats, DuplicateFile } from './fileOrganizer';
import { Song } from '../../types';

export interface StorageConfig {
  baseDirectory: string;
  maxStorageSize: number; // in bytes
  warningThreshold: number; // percentage (0-100)
  autoCleanup: boolean;
  organizationConfig: FileOrganizationConfig;
}

export interface StorageUsage {
  used: number;
  available: number;
  total: number;
  percentage: number;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CleanupResult {
  spaceSaved: number;
  filesRemoved: number;
  directoriesRemoved: number;
  errors: string[];
}

export interface StorageHealth {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  issues: Array<{
    type: 'duplicates' | 'corruption' | 'organization' | 'space';
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
  stats: StorageStats;
  usage: StorageUsage;
}

export class StorageManager {
  private config: StorageConfig;
  private fileOrganizer: FileOrganizer;

  constructor(config: StorageConfig) {
    this.config = config;
    this.fileOrganizer = new FileOrganizer(config.organizationConfig);
  }

  /**
   * Initialize storage directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.config.baseDirectory, { recursive: true });
      
      // Create subdirectories based on organization structure
      if (this.config.organizationConfig.structure !== 'flat') {
        // Create some common directories to start with
        const commonDirs = ['Various Artists', 'Unknown Artist'];
        for (const dir of commonDirs) {
          await fs.mkdir(path.join(this.config.baseDirectory, dir), { recursive: true });
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error}`);
    }
  }

  /**
   * Get current storage usage
   */
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      const stats = await this.getDirectorySize(this.config.baseDirectory);
      const used = stats.size;
      const total = this.config.maxStorageSize;
      const available = Math.max(0, total - used);
      const percentage = (used / total) * 100;

      let warningLevel: StorageUsage['warningLevel'] = 'low';
      if (percentage >= 95) warningLevel = 'critical';
      else if (percentage >= 85) warningLevel = 'high';
      else if (percentage >= this.config.warningThreshold) warningLevel = 'medium';

      return {
        used,
        available,
        total,
        percentage,
        warningLevel
      };
    } catch (error) {
      throw new Error(`Failed to get storage usage: ${error}`);
    }
  }

  /**
   * Get comprehensive storage health report
   */
  async getStorageHealth(): Promise<StorageHealth> {
    const [stats, usage] = await Promise.all([
      this.fileOrganizer.getStorageStats(this.config.baseDirectory),
      this.getStorageUsage()
    ]);

    const issues: StorageHealth['issues'] = [];

    // Check for duplicates
    if (stats.duplicateFiles > 0) {
      const severity = stats.duplicateFiles > 50 ? 'high' : stats.duplicateFiles > 10 ? 'medium' : 'low';
      issues.push({
        type: 'duplicates',
        severity,
        description: `Found ${stats.duplicateFiles} duplicate files wasting ${this.formatBytes(stats.duplicateSize)}`,
        recommendation: 'Run duplicate cleanup to free up space'
      });
    }

    // Check for corruption
    if (stats.corruptFiles > 0) {
      issues.push({
        type: 'corruption',
        severity: 'high',
        description: `Found ${stats.corruptFiles} corrupted files`,
        recommendation: 'Remove or repair corrupted files'
      });
    }

    // Check organization
    if (stats.organizationScore < 70) {
      const severity = stats.organizationScore < 30 ? 'high' : stats.organizationScore < 50 ? 'medium' : 'low';
      issues.push({
        type: 'organization',
        severity,
        description: `File organization score is ${stats.organizationScore}%`,
        recommendation: 'Run file organization to improve structure'
      });
    }

    // Check space usage
    if (usage.warningLevel === 'critical') {
      issues.push({
        type: 'space',
        severity: 'high',
        description: `Storage is ${usage.percentage.toFixed(1)}% full`,
        recommendation: 'Free up space by removing unnecessary files'
      });
    } else if (usage.warningLevel === 'high') {
      issues.push({
        type: 'space',
        severity: 'medium',
        description: `Storage is ${usage.percentage.toFixed(1)}% full`,
        recommendation: 'Consider cleaning up old or duplicate files'
      });
    }

    // Determine overall health
    let overall: StorageHealth['overall'] = 'excellent';
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;

    if (highIssues > 0) overall = 'poor';
    else if (mediumIssues > 2) overall = 'fair';
    else if (mediumIssues > 0 || issues.length > 0) overall = 'good';

    return {
      overall,
      issues,
      stats,
      usage
    };
  }

  /**
   * Organize files in storage
   */
  async organizeFiles(songs: Song[]): Promise<{
    organized: number;
    skipped: number;
    errors: Array<{ song: Song; error: string }>;
  }> {
    let organized = 0;
    let skipped = 0;
    const errors: Array<{ song: Song; error: string }> = [];

    for (const song of songs) {
      if (!song.file_path || !song.is_downloaded) {
        skipped++;
        continue;
      }

      try {
        const result = await this.fileOrganizer.organizeFile(song.file_path, song);
        if (result.moved) {
          organized++;
          // Update song file path in database would happen here
        } else if (result.error) {
          errors.push({ song, error: result.error });
        } else {
          skipped++; // Already in correct location
        }
      } catch (error) {
        errors.push({
          song,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { organized, skipped, errors };
  }

  /**
   * Clean up storage (remove duplicates, empty directories, etc.)
   */
  async cleanup(options: {
    removeDuplicates?: boolean;
    removeEmptyDirs?: boolean;
    removeCorruptFiles?: boolean;
  } = {}): Promise<CleanupResult> {
    const result: CleanupResult = {
      spaceSaved: 0,
      filesRemoved: 0,
      directoriesRemoved: 0,
      errors: []
    };

    try {
      // Remove duplicates
      if (options.removeDuplicates !== false) {
        const duplicates = await this.fileOrganizer.findDuplicates(this.config.baseDirectory);
        const duplicateResult = await this.fileOrganizer.removeDuplicates(duplicates);
        
        result.spaceSaved += duplicateResult.spaceSaved;
        result.filesRemoved += duplicateResult.removed.length;
        result.errors.push(...duplicateResult.errors.map(e => e.error));
      }

      // Remove corrupt files
      if (options.removeCorruptFiles) {
        const corruptFiles = await this.fileOrganizer.findCorruptFiles(this.config.baseDirectory);
        for (const corrupt of corruptFiles) {
          try {
            await fs.unlink(corrupt.path);
            result.filesRemoved++;
            result.spaceSaved += corrupt.size;
          } catch (error) {
            result.errors.push(`Failed to remove corrupt file ${corrupt.path}: ${error}`);
          }
        }
      }

      // Remove empty directories
      if (options.removeEmptyDirs !== false) {
        const removedDirs = await this.fileOrganizer.cleanupEmptyDirectories(this.config.baseDirectory);
        result.directoriesRemoved = removedDirs.length;
      }

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error}`);
    }

    return result;
  }

  /**
   * Get directory size and file count
   */
  async getDirectorySize(directory: string): Promise<{
    size: number;
    files: number;
    directories: number;
  }> {
    let size = 0;
    let files = 0;
    let directories = 0;

    const scan = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir);
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            directories++;
            await scan(fullPath);
          } else if (stats.isFile()) {
            files++;
            size += stats.size;
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${dir}:`, error);
      }
    };

    await scan(directory);
    return { size, files, directories };
  }

  /**
   * Monitor storage usage and trigger cleanup if needed
   */
  async monitorAndCleanup(): Promise<void> {
    if (!this.config.autoCleanup) return;

    const usage = await this.getStorageUsage();
    
    if (usage.warningLevel === 'critical') {
      console.log('Storage critical - running emergency cleanup');
      await this.cleanup({
        removeDuplicates: true,
        removeEmptyDirs: true,
        removeCorruptFiles: true
      });
    } else if (usage.warningLevel === 'high') {
      console.log('Storage high - running maintenance cleanup');
      await this.cleanup({
        removeDuplicates: true,
        removeEmptyDirs: true
      });
    }
  }

  /**
   * Validate storage integrity
   */
  async validateIntegrity(): Promise<{
    valid: boolean;
    issues: Array<{
      path: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    const issues: Array<{ path: string; issue: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Check if base directory exists and is accessible
    try {
      await fs.access(this.config.baseDirectory, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      issues.push({
        path: this.config.baseDirectory,
        issue: 'Base directory is not accessible',
        severity: 'high'
      });
      return { valid: false, issues };
    }

    // Check for corrupt files
    const corruptFiles = await this.fileOrganizer.findCorruptFiles(this.config.baseDirectory);
    for (const corrupt of corruptFiles) {
      issues.push({
        path: corrupt.path,
        issue: `File is corrupted: ${corrupt.error}`,
        severity: 'high'
      });
    }

    // Check for permission issues
    await this.scanForPermissionIssues(this.config.baseDirectory, issues);

    return {
      valid: issues.filter(i => i.severity === 'high').length === 0,
      issues
    };
  }

  /**
   * Get storage recommendations
   */
  async getRecommendations(): Promise<Array<{
    type: 'cleanup' | 'organization' | 'optimization';
    priority: 'low' | 'medium' | 'high';
    description: string;
    action: string;
    estimatedBenefit?: string;
  }>> {
    const health = await this.getStorageHealth();
    const recommendations: Array<{
      type: 'cleanup' | 'organization' | 'optimization';
      priority: 'low' | 'medium' | 'high';
      description: string;
      action: string;
      estimatedBenefit?: string;
    }> = [];

    // Convert health issues to recommendations
    for (const issue of health.issues) {
      let type: 'cleanup' | 'organization' | 'optimization' = 'cleanup';
      if (issue.type === 'organization') type = 'organization';
      if (issue.type === 'space') type = 'optimization';

      recommendations.push({
        type,
        priority: issue.severity === 'high' ? 'high' : issue.severity === 'medium' ? 'medium' : 'low',
        description: issue.description,
        action: issue.recommendation,
        estimatedBenefit: issue.type === 'duplicates' 
          ? `Save ${this.formatBytes(health.stats.duplicateSize)}`
          : undefined
      });
    }

    // Add general recommendations
    if (health.stats.organizationScore < 90 && health.stats.organizationScore > 70) {
      recommendations.push({
        type: 'organization',
        priority: 'low',
        description: 'File organization could be improved',
        action: 'Run file organization to improve structure',
        estimatedBenefit: 'Better file management and faster access'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Private helper methods

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async scanForPermissionIssues(
    directory: string,
    issues: Array<{ path: string; issue: string; severity: 'low' | 'medium' | 'high' }>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(directory);
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry);
        
        try {
          const stats = await fs.stat(fullPath);
          
          // Check read/write permissions
          await fs.access(fullPath, fs.constants.R_OK | fs.constants.W_OK);
          
          if (stats.isDirectory()) {
            await this.scanForPermissionIssues(fullPath, issues);
          }
        } catch (error) {
          issues.push({
            path: fullPath,
            issue: 'Permission denied or file inaccessible',
            severity: 'medium'
          });
        }
      }
    } catch (error) {
      issues.push({
        path: directory,
        issue: `Cannot scan directory: ${error}`,
        severity: 'medium'
      });
    }
  }
}