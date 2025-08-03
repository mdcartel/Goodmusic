import { PlaylistService } from './playlistService';
import { Song } from '../../types';
import { Playlist, PlaylistExportFormat, PlaylistImportResult } from '../../types/playlist';
import { extractVideoId, validateVideoId } from '../utils/youtube';
import path from 'path';
import fs from 'fs/promises';

export class PlaylistImportExportService {
  private playlistService: PlaylistService;

  constructor(playlistService: PlaylistService) {
    this.playlistService = playlistService;
  }

  /**
   * Export playlist to various formats
   */
  async exportPlaylist(
    playlistId: string,
    format: PlaylistExportFormat,
    outputPath: string
  ): Promise<string> {
    const playlist = await this.playlistService.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const songs = await this.playlistService.getPlaylistSongs(playlistId);

    switch (format.format) {
      case 'm3u':
      case 'm3u8':
        return this.exportToM3U(playlist, songs, format, outputPath);
      case 'json':
        return this.exportToJSON(playlist, songs, format, outputPath);
      case 'csv':
        return this.exportToCSV(playlist, songs, format, outputPath);
      case 'txt':
        return this.exportToTXT(playlist, songs, format, outputPath);
      default:
        throw new Error(`Unsupported export format: ${format.format}`);
    }
  }

  /**
   * Import playlist from various formats
   */
  async importPlaylist(
    filePath: string,
    playlistName?: string,
    userId?: string
  ): Promise<PlaylistImportResult> {
    const fileExtension = path.extname(filePath).toLowerCase();
    const fileContent = await fs.readFile(filePath, 'utf-8');

    switch (fileExtension) {
      case '.m3u':
      case '.m3u8':
        return this.importFromM3U(fileContent, playlistName, userId);
      case '.json':
        return this.importFromJSON(fileContent, playlistName, userId);
      case '.csv':
        return this.importFromCSV(fileContent, playlistName, userId);
      case '.txt':
        return this.importFromTXT(fileContent, playlistName, userId);
      default:
        throw new Error(`Unsupported import format: ${fileExtension}`);
    }
  }

  /**
   * Export to M3U format
   */
  private async exportToM3U(
    playlist: Playlist,
    songs: (Song & { position: number; added_at: Date })[],
    format: PlaylistExportFormat,
    outputPath: string
  ): Promise<string> {
    let content = '#EXTM3U\n';
    
    if (format.include_metadata) {
      content += `#PLAYLIST:${playlist.name}\n`;
      if (playlist.description) {
        content += `#DESCRIPTION:${playlist.description}\n`;
      }
    }

    for (const song of songs) {
      if (format.include_metadata) {
        const duration = Math.round(song.duration);
        const artist = song.artist || 'Unknown Artist';
        const title = song.title || 'Unknown Title';
        content += `#EXTINF:${duration},${artist} - ${title}\n`;
        
        if (song.album) {
          content += `#EXTALB:${song.album}\n`;
        }
        if (song.genre) {
          content += `#EXTGENRE:${song.genre}\n`;
        }
        if (song.year) {
          content += `#EXTDATE:${song.year}\n`;
        }
      }

      // Add file path or URL
      if (format.include_file_paths && song.file_path) {
        const filePath = format.relative_paths 
          ? path.relative(path.dirname(outputPath), song.file_path)
          : song.file_path;
        content += `${filePath}\n`;
      } else if (song.youtube_url) {
        content += `${song.youtube_url}\n`;
      } else if (song.youtube_id) {
        content += `https://www.youtube.com/watch?v=${song.youtube_id}\n`;
      }
    }

    await fs.writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    playlist: Playlist,
    songs: (Song & { position: number; added_at: Date })[],
    format: PlaylistExportFormat,
    outputPath: string
  ): Promise<string> {
    const exportData = {
      playlist: {
        name: playlist.name,
        description: playlist.description,
        created_at: playlist.created_at,
        song_count: playlist.song_count,
        total_duration: playlist.total_duration,
        ...(format.include_metadata && {
          id: playlist.id,
          is_smart: playlist.is_smart,
          smart_criteria: playlist.smart_criteria,
          tags: playlist.tags,
          color: playlist.color
        })
      },
      songs: songs.map(song => ({
        position: song.position,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        youtube_id: song.youtube_id,
        youtube_url: song.youtube_url,
        added_at: song.added_at,
        ...(format.include_metadata && {
          id: song.id,
          album_artist: song.album_artist,
          genre: song.genre,
          year: song.year,
          track_number: song.track_number,
          thumbnail: song.thumbnail,
          play_count: song.play_count,
          rating: song.rating,
          is_favorite: song.is_favorite
        }),
        ...(format.include_file_paths && song.file_path && {
          file_path: format.relative_paths 
            ? path.relative(path.dirname(outputPath), song.file_path)
            : song.file_path,
          file_size: song.file_size,
          quality: song.quality,
          format: song.format
        })
      })),
      export_info: {
        exported_at: new Date(),
        format: 'json',
        version: '1.0',
        source: 'GoodMusic'
      }
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    await fs.writeFile(outputPath, jsonContent, 'utf-8');
    return outputPath;
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    playlist: Playlist,
    songs: (Song & { position: number; added_at: Date })[],
    format: PlaylistExportFormat,
    outputPath: string
  ): Promise<string> {
    const headers = ['Position', 'Title', 'Artist', 'Album', 'Duration', 'YouTube ID', 'YouTube URL'];
    
    if (format.include_metadata) {
      headers.push('Genre', 'Year', 'Track Number', 'Play Count', 'Rating', 'Is Favorite');
    }
    
    if (format.include_file_paths) {
      headers.push('File Path', 'File Size', 'Quality', 'Format');
    }

    let content = headers.join(',') + '\n';

    for (const song of songs) {
      const row = [
        song.position,
        this.escapeCsvValue(song.title || ''),
        this.escapeCsvValue(song.artist || ''),
        this.escapeCsvValue(song.album || ''),
        song.duration || 0,
        song.youtube_id || '',
        song.youtube_url || ''
      ];

      if (format.include_metadata) {
        row.push(
          this.escapeCsvValue(song.genre || ''),
          song.year || '',
          song.track_number || '',
          song.play_count || 0,
          song.rating || '',
          song.is_favorite ? 'true' : 'false'
        );
      }

      if (format.include_file_paths) {
        const filePath = song.file_path 
          ? (format.relative_paths 
              ? path.relative(path.dirname(outputPath), song.file_path)
              : song.file_path)
          : '';
        
        row.push(
          this.escapeCsvValue(filePath),
          song.file_size || '',
          song.quality || '',
          song.format || ''
        );
      }

      content += row.join(',') + '\n';
    }

    await fs.writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }

  /**
   * Export to TXT format
   */
  private async exportToTXT(
    playlist: Playlist,
    songs: (Song & { position: number; added_at: Date })[],
    format: PlaylistExportFormat,
    outputPath: string
  ): Promise<string> {
    let content = `Playlist: ${playlist.name}\n`;
    
    if (playlist.description) {
      content += `Description: ${playlist.description}\n`;
    }
    
    content += `Songs: ${playlist.song_count}\n`;
    content += `Total Duration: ${this.formatDuration(playlist.total_duration)}\n`;
    content += `Created: ${playlist.created_at.toLocaleDateString()}\n\n`;

    for (const song of songs) {
      content += `${song.position}. ${song.artist || 'Unknown Artist'} - ${song.title || 'Unknown Title'}\n`;
      
      if (format.include_metadata) {
        if (song.album) content += `   Album: ${song.album}\n`;
        if (song.duration) content += `   Duration: ${this.formatDuration(song.duration)}\n`;
        if (song.year) content += `   Year: ${song.year}\n`;
        if (song.genre) content += `   Genre: ${song.genre}\n`;
      }
      
      if (song.youtube_url) {
        content += `   URL: ${song.youtube_url}\n`;
      }
      
      if (format.include_file_paths && song.file_path) {
        const filePath = format.relative_paths 
          ? path.relative(path.dirname(outputPath), song.file_path)
          : song.file_path;
        content += `   File: ${filePath}\n`;
      }
      
      content += '\n';
    }

    await fs.writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }

  /**
   * Import from M3U format
   */
  private async importFromM3U(
    content: string,
    playlistName?: string,
    userId?: string
  ): Promise<PlaylistImportResult> {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const songs: { url: string; title?: string; artist?: string; duration?: number }[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    let currentSong: any = {};
    let extractedPlaylistName = playlistName;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#EXTM3U')) {
        continue;
      } else if (line.startsWith('#PLAYLIST:')) {
        if (!playlistName) {
          extractedPlaylistName = line.substring(10);
        }
      } else if (line.startsWith('#EXTINF:')) {
        // Parse #EXTINF:duration,artist - title
        const match = line.match(/#EXTINF:(-?\d+),(.+)/);
        if (match) {
          currentSong.duration = parseInt(match[1]);
          const titlePart = match[2];
          
          // Try to split artist and title
          const dashIndex = titlePart.indexOf(' - ');
          if (dashIndex > 0) {
            currentSong.artist = titlePart.substring(0, dashIndex).trim();
            currentSong.title = titlePart.substring(dashIndex + 3).trim();
          } else {
            currentSong.title = titlePart.trim();
          }
        }
      } else if (line.startsWith('#')) {
        // Skip other metadata lines
        continue;
      } else if (line.startsWith('http') || line.includes('youtube.com') || line.includes('youtu.be')) {
        // This is a URL
        currentSong.url = line;
        songs.push({ ...currentSong });
        currentSong = {};
      } else if (line.length > 0) {
        // This might be a file path
        currentSong.url = line;
        songs.push({ ...currentSong });
        currentSong = {};
      }
    }

    // Create playlist
    const finalPlaylistName = extractedPlaylistName || 'Imported Playlist';
    const playlistId = await this.playlistService.createPlaylist(
      finalPlaylistName,
      `Imported from M3U file`,
      false,
      undefined,
      { createdBy: userId }
    );

    let importedCount = 0;
    let skippedCount = 0;

    // Import songs
    for (const songData of songs) {
      try {
        const videoId = extractVideoId(songData.url);
        
        if (!videoId || !validateVideoId(videoId)) {
          warnings.push(`Skipped invalid URL: ${songData.url}`);
          skippedCount++;
          continue;
        }

        // TODO: Check if song exists in database or create it
        // For now, we'll assume the song exists
        // In a real implementation, you'd need to:
        // 1. Check if song with this youtube_id exists
        // 2. If not, extract metadata and create it
        // 3. Add to playlist

        // await this.playlistService.addSongToPlaylist(playlistId, songId, undefined, userId);
        importedCount++;
      } catch (error) {
        errors.push(`Failed to import song: ${songData.title || songData.url} - ${error}`);
        skippedCount++;
      }
    }

    return {
      success: errors.length === 0,
      playlist_id: playlistId,
      imported_songs: importedCount,
      skipped_songs: skippedCount,
      errors,
      warnings
    };
  }

  /**
   * Import from JSON format
   */
  private async importFromJSON(
    content: string,
    playlistName?: string,
    userId?: string
  ): Promise<PlaylistImportResult> {
    try {
      const data = JSON.parse(content);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!data.playlist || !data.songs) {
        throw new Error('Invalid JSON format: missing playlist or songs');
      }

      // Create playlist
      const finalPlaylistName = playlistName || data.playlist.name || 'Imported Playlist';
      const playlistId = await this.playlistService.createPlaylist(
        finalPlaylistName,
        data.playlist.description || 'Imported from JSON file',
        false,
        undefined,
        { 
          createdBy: userId,
          tags: data.playlist.tags,
          color: data.playlist.color
        }
      );

      let importedCount = 0;
      let skippedCount = 0;

      // Import songs
      for (const songData of data.songs) {
        try {
          if (!songData.youtube_id && !songData.youtube_url) {
            warnings.push(`Skipped song without YouTube ID or URL: ${songData.title}`);
            skippedCount++;
            continue;
          }

          const videoId = songData.youtube_id || extractVideoId(songData.youtube_url);
          
          if (!videoId || !validateVideoId(videoId)) {
            warnings.push(`Skipped invalid video ID: ${videoId}`);
            skippedCount++;
            continue;
          }

          // TODO: Same as M3U import - check if song exists or create it
          // await this.playlistService.addSongToPlaylist(playlistId, songId, songData.position, userId);
          importedCount++;
        } catch (error) {
          errors.push(`Failed to import song: ${songData.title} - ${error}`);
          skippedCount++;
        }
      }

      return {
        success: errors.length === 0,
        playlist_id: playlistId,
        imported_songs: importedCount,
        skipped_songs: skippedCount,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        imported_songs: 0,
        skipped_songs: 0,
        errors: [`Failed to parse JSON: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * Import from CSV format
   */
  private async importFromCSV(
    content: string,
    playlistName?: string,
    userId?: string
  ): Promise<PlaylistImportResult> {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }

    // Parse header
    const headers = this.parseCsvLine(lines[0]);
    const titleIndex = headers.findIndex(h => h.toLowerCase().includes('title'));
    const artistIndex = headers.findIndex(h => h.toLowerCase().includes('artist'));
    const youtubeIdIndex = headers.findIndex(h => h.toLowerCase().includes('youtube') && h.toLowerCase().includes('id'));
    const youtubeUrlIndex = headers.findIndex(h => h.toLowerCase().includes('youtube') && h.toLowerCase().includes('url'));

    if (titleIndex === -1 && youtubeIdIndex === -1 && youtubeUrlIndex === -1) {
      throw new Error('CSV must contain at least title, YouTube ID, or YouTube URL column');
    }

    // Create playlist
    const finalPlaylistName = playlistName || 'Imported Playlist';
    const playlistId = await this.playlistService.createPlaylist(
      finalPlaylistName,
      'Imported from CSV file',
      false,
      undefined,
      { createdBy: userId }
    );

    let importedCount = 0;
    let skippedCount = 0;

    // Import songs
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCsvLine(lines[i]);
        
        if (values.length < headers.length) {
          warnings.push(`Skipped row ${i + 1}: insufficient columns`);
          skippedCount++;
          continue;
        }

        let videoId = '';
        
        if (youtubeIdIndex >= 0 && values[youtubeIdIndex]) {
          videoId = values[youtubeIdIndex];
        } else if (youtubeUrlIndex >= 0 && values[youtubeUrlIndex]) {
          videoId = extractVideoId(values[youtubeUrlIndex]) || '';
        }

        if (!videoId || !validateVideoId(videoId)) {
          warnings.push(`Skipped row ${i + 1}: invalid or missing YouTube ID/URL`);
          skippedCount++;
          continue;
        }

        // TODO: Same as other imports - check if song exists or create it
        // await this.playlistService.addSongToPlaylist(playlistId, songId, undefined, userId);
        importedCount++;
      } catch (error) {
        errors.push(`Failed to import row ${i + 1}: ${error}`);
        skippedCount++;
      }
    }

    return {
      success: errors.length === 0,
      playlist_id: playlistId,
      imported_songs: importedCount,
      skipped_songs: skippedCount,
      errors,
      warnings
    };
  }

  /**
   * Import from TXT format
   */
  private async importFromTXT(
    content: string,
    playlistName?: string,
    userId?: string
  ): Promise<PlaylistImportResult> {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const errors: string[] = [];
    const warnings: string[] = [];

    let extractedPlaylistName = playlistName;
    const songs: { title?: string; artist?: string; url?: string }[] = [];

    for (const line of lines) {
      if (line.startsWith('Playlist:')) {
        if (!playlistName) {
          extractedPlaylistName = line.substring(9).trim();
        }
      } else if (line.match(/^\d+\./)) {
        // This looks like a numbered song entry
        const match = line.match(/^\d+\.\s*(.+?)(?:\s*-\s*(.+))?$/);
        if (match) {
          const [, artistOrTitle, title] = match;
          if (title) {
            songs.push({ artist: artistOrTitle.trim(), title: title.trim() });
          } else {
            songs.push({ title: artistOrTitle.trim() });
          }
        }
      } else if (line.startsWith('http') || line.includes('youtube.com') || line.includes('youtu.be')) {
        // URL line - associate with last song
        if (songs.length > 0) {
          songs[songs.length - 1].url = line;
        }
      }
    }

    // Create playlist
    const finalPlaylistName = extractedPlaylistName || 'Imported Playlist';
    const playlistId = await this.playlistService.createPlaylist(
      finalPlaylistName,
      'Imported from TXT file',
      false,
      undefined,
      { createdBy: userId }
    );

    let importedCount = 0;
    let skippedCount = 0;

    // Import songs
    for (const songData of songs) {
      try {
        if (!songData.url) {
          warnings.push(`Skipped song without URL: ${songData.title}`);
          skippedCount++;
          continue;
        }

        const videoId = extractVideoId(songData.url);
        
        if (!videoId || !validateVideoId(videoId)) {
          warnings.push(`Skipped invalid URL: ${songData.url}`);
          skippedCount++;
          continue;
        }

        // TODO: Same as other imports
        // await this.playlistService.addSongToPlaylist(playlistId, songId, undefined, userId);
        importedCount++;
      } catch (error) {
        errors.push(`Failed to import song: ${songData.title} - ${error}`);
        skippedCount++;
      }
    }

    return {
      success: errors.length === 0,
      playlist_id: playlistId,
      imported_songs: importedCount,
      skipped_songs: skippedCount,
      errors,
      warnings
    };
  }

  /**
   * Helper methods
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}