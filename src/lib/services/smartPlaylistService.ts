import { Database } from 'sqlite3';
import { Song } from '../../types';
import { SmartPlaylistCriteria, SmartPlaylistRule } from '../../types/playlist';
import { PlaylistService } from './playlistService';

export class SmartPlaylistService {
  private db: Database;
  private playlistService: PlaylistService;

  constructor(databasePath: string, playlistService: PlaylistService) {
    this.db = new Database(databasePath);
    this.playlistService = playlistService;
  }

  /**
   * Create a smart playlist
   */
  async createSmartPlaylist(
    name: string,
    criteria: SmartPlaylistCriteria,
    description?: string,
    userId?: string
  ): Promise<string> {
    // Create the playlist as a smart playlist
    const playlistId = await this.playlistService.createPlaylist(
      name,
      description,
      true, // is_smart = true
      criteria,
      { createdBy: userId }
    );

    // Populate the playlist with matching songs
    await this.updateSmartPlaylist(playlistId);

    return playlistId;
  }

  /**
   * Update smart playlist contents based on criteria
   */
  async updateSmartPlaylist(playlistId: string): Promise<void> {
    const playlist = await this.playlistService.getPlaylist(playlistId);
    
    if (!playlist || !playlist.is_smart || !playlist.smart_criteria) {
      throw new Error('Invalid smart playlist');
    }

    // Get matching songs
    const matchingSongs = await this.findMatchingSongs(playlist.smart_criteria);

    // Clear current playlist contents
    await this.clearPlaylistSongs(playlistId);

    // Add matching songs
    for (let i = 0; i < matchingSongs.length; i++) {
      await this.playlistService.addSongToPlaylist(playlistId, matchingSongs[i].id, i);
    }
  }

  /**
   * Find songs matching smart playlist criteria
   */
  async findMatchingSongs(criteria: SmartPlaylistCriteria): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const { query, params } = this.buildSmartPlaylistQuery(criteria);

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const songs = rows.map(row => ({
            id: row.id,
            youtube_id: row.youtube_id,
            title: row.title,
            artist: row.artist,
            album: row.album,
            album_artist: row.album_artist,
            genre: row.genre,
            year: row.year,
            track_number: row.track_number,
            total_tracks: row.total_tracks,
            duration: row.duration,
            thumbnail: row.thumbnail,
            youtube_url: row.youtube_url,
            audio_url: row.audio_url,
            is_downloaded: Boolean(row.is_downloaded),
            file_path: row.file_path,
            file_size: row.file_size,
            quality: row.quality,
            format: row.format,
            added_at: new Date(row.added_at),
            play_count: row.play_count,
            last_played: row.last_played ? new Date(row.last_played) : undefined,
            rating: row.rating,
            is_favorite: Boolean(row.is_favorite)
          }));
          resolve(songs);
        }
      });
    });
  }

  /**
   * Build SQL query for smart playlist criteria
   */
  private buildSmartPlaylistQuery(criteria: SmartPlaylistCriteria): { query: string; params: any[] } {
    let query = 'SELECT * FROM songs';
    const conditions: string[] = [];
    const params: any[] = [];

    // Process rules
    if (criteria.rules.length > 0) {
      const ruleConditions = criteria.rules.map(rule => this.buildRuleCondition(rule, params));
      
      if (criteria.match_type === 'all') {
        conditions.push(`(${ruleConditions.join(' AND ')})`);
      } else {
        conditions.push(`(${ruleConditions.join(' OR ')})`);
      }
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting
    if (criteria.sort_by) {
      const sortOrder = criteria.sort_order || 'asc';
      query += ` ORDER BY ${this.mapSortField(criteria.sort_by)} ${sortOrder.toUpperCase()}`;
    }

    // Add limit
    if (criteria.limit) {
      query += ` LIMIT ?`;
      params.push(criteria.limit);
    }

    return { query, params };
  }

  /**
   * Build condition for a single rule
   */
  private buildRuleCondition(rule: SmartPlaylistRule, params: any[]): string {
    const field = this.mapRuleField(rule.field);
    
    switch (rule.operator) {
      case 'equals':
        params.push(rule.value);
        return `${field} = ?`;
        
      case 'not_equals':
        params.push(rule.value);
        return `${field} != ?`;
        
      case 'contains':
        params.push(`%${rule.value}%`);
        return `${field} LIKE ?`;
        
      case 'not_contains':
        params.push(`%${rule.value}%`);
        return `${field} NOT LIKE ?`;
        
      case 'starts_with':
        params.push(`${rule.value}%`);
        return `${field} LIKE ?`;
        
      case 'ends_with':
        params.push(`%${rule.value}`);
        return `${field} LIKE ?`;
        
      case 'greater_than':
        params.push(rule.value);
        return `${field} > ?`;
        
      case 'less_than':
        params.push(rule.value);
        return `${field} < ?`;
        
      case 'between':
        params.push(rule.value, rule.value2);
        return `${field} BETWEEN ? AND ?`;
        
      case 'in_last':
        // For date-based fields, "in last X days"
        if (rule.field === 'date_added') {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - Number(rule.value));
          params.push(daysAgo.toISOString());
          return `${field} >= ?`;
        } else {
          // For numeric fields, "in last X items" (top X by play count, etc.)
          params.push(rule.value);
          return `${field} >= (SELECT ${field} FROM songs ORDER BY ${field} DESC LIMIT 1 OFFSET ?)`;
        }
        
      case 'not_in_last':
        if (rule.field === 'date_added') {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - Number(rule.value));
          params.push(daysAgo.toISOString());
          return `${field} < ?`;
        } else {
          params.push(rule.value);
          return `${field} < (SELECT ${field} FROM songs ORDER BY ${field} DESC LIMIT 1 OFFSET ?)`;
        }
        
      default:
        throw new Error(`Unsupported operator: ${rule.operator}`);
    }
  }

  /**
   * Map rule field to database column
   */
  private mapRuleField(field: string): string {
    const fieldMap: Record<string, string> = {
      'title': 'title',
      'artist': 'artist',
      'album': 'album',
      'genre': 'genre',
      'year': 'year',
      'duration': 'duration',
      'play_count': 'play_count',
      'rating': 'rating',
      'date_added': 'added_at',
      'is_favorite': 'is_favorite'
    };

    return fieldMap[field] || field;
  }

  /**
   * Map sort field to database column
   */
  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'title': 'title',
      'artist': 'artist',
      'album': 'album',
      'date_added': 'added_at',
      'play_count': 'play_count',
      'rating': 'rating',
      'duration': 'duration'
    };

    return fieldMap[field] || field;
  }

  /**
   * Clear all songs from a playlist
   */
  private async clearPlaylistSongs(playlistId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM playlist_songs WHERE playlist_id = ?`,
        [playlistId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Update all smart playlists
   */
  async updateAllSmartPlaylists(): Promise<void> {
    const smartPlaylists = await this.playlistService.getPlaylists({ is_smart: true });
    
    for (const playlist of smartPlaylists) {
      if (playlist.smart_criteria?.auto_update) {
        try {
          await this.updateSmartPlaylist(playlist.id);
        } catch (error) {
          console.error(`Failed to update smart playlist ${playlist.name}:`, error);
        }
      }
    }
  }

  /**
   * Validate smart playlist criteria
   */
  validateCriteria(criteria: SmartPlaylistCriteria): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!criteria.rules || criteria.rules.length === 0) {
      errors.push('At least one rule is required');
    }

    for (let i = 0; i < criteria.rules.length; i++) {
      const rule = criteria.rules[i];
      
      if (!rule.field) {
        errors.push(`Rule ${i + 1}: Field is required`);
      }
      
      if (!rule.operator) {
        errors.push(`Rule ${i + 1}: Operator is required`);
      }
      
      if (rule.value === undefined || rule.value === null || rule.value === '') {
        errors.push(`Rule ${i + 1}: Value is required`);
      }
      
      if (rule.operator === 'between' && (rule.value2 === undefined || rule.value2 === null)) {
        errors.push(`Rule ${i + 1}: Second value is required for 'between' operator`);
      }
      
      // Validate field-specific constraints
      if (rule.field === 'year' && typeof rule.value === 'string') {
        const year = parseInt(rule.value);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 10) {
          errors.push(`Rule ${i + 1}: Invalid year value`);
        }
      }
      
      if (rule.field === 'duration' && typeof rule.value === 'string') {
        const duration = parseInt(rule.value);
        if (isNaN(duration) || duration < 0) {
          errors.push(`Rule ${i + 1}: Invalid duration value`);
        }
      }
      
      if (rule.field === 'play_count' && typeof rule.value === 'string') {
        const playCount = parseInt(rule.value);
        if (isNaN(playCount) || playCount < 0) {
          errors.push(`Rule ${i + 1}: Invalid play count value`);
        }
      }
      
      if (rule.field === 'rating' && typeof rule.value === 'string') {
        const rating = parseFloat(rule.value);
        if (isNaN(rating) || rating < 0 || rating > 5) {
          errors.push(`Rule ${i + 1}: Rating must be between 0 and 5`);
        }
      }
    }

    if (criteria.limit && (criteria.limit < 1 || criteria.limit > 10000)) {
      errors.push('Limit must be between 1 and 10000');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get suggested smart playlist templates
   */
  getSmartPlaylistTemplates(): Array<{ name: string; description: string; criteria: SmartPlaylistCriteria }> {
    return [
      {
        name: 'Recently Added',
        description: 'Songs added in the last 30 days',
        criteria: {
          rules: [{
            id: '1',
            field: 'date_added',
            operator: 'in_last',
            value: 30
          }],
          match_type: 'all',
          sort_by: 'date_added',
          sort_order: 'desc',
          limit: 100,
          auto_update: true
        }
      },
      {
        name: 'Most Played',
        description: 'Your most played songs',
        criteria: {
          rules: [{
            id: '1',
            field: 'play_count',
            operator: 'greater_than',
            value: 0
          }],
          match_type: 'all',
          sort_by: 'play_count',
          sort_order: 'desc',
          limit: 50,
          auto_update: true
        }
      },
      {
        name: 'Favorites',
        description: 'All your favorite songs',
        criteria: {
          rules: [{
            id: '1',
            field: 'is_favorite',
            operator: 'equals',
            value: true
          }],
          match_type: 'all',
          sort_by: 'date_added',
          sort_order: 'desc',
          auto_update: true
        }
      },
      {
        name: 'Highly Rated',
        description: 'Songs with 4+ star rating',
        criteria: {
          rules: [{
            id: '1',
            field: 'rating',
            operator: 'greater_than',
            value: 4
          }],
          match_type: 'all',
          sort_by: 'rating',
          sort_order: 'desc',
          limit: 100,
          auto_update: true
        }
      },
      {
        name: 'Long Songs',
        description: 'Songs longer than 5 minutes',
        criteria: {
          rules: [{
            id: '1',
            field: 'duration',
            operator: 'greater_than',
            value: 300
          }],
          match_type: 'all',
          sort_by: 'duration',
          sort_order: 'desc',
          limit: 100,
          auto_update: true
        }
      },
      {
        name: 'This Decade',
        description: 'Songs from 2020 onwards',
        criteria: {
          rules: [{
            id: '1',
            field: 'year',
            operator: 'greater_than',
            value: 2019
          }],
          match_type: 'all',
          sort_by: 'year',
          sort_order: 'desc',
          limit: 200,
          auto_update: true
        }
      },
      {
        name: 'Rock Classics',
        description: 'Rock songs from the past',
        criteria: {
          rules: [
            {
              id: '1',
              field: 'genre',
              operator: 'contains',
              value: 'rock'
            },
            {
              id: '2',
              field: 'year',
              operator: 'between',
              value: 1960,
              value2: 2000
            }
          ],
          match_type: 'all',
          sort_by: 'year',
          sort_order: 'asc',
          limit: 150,
          auto_update: true
        }
      },
      {
        name: 'Unplayed Songs',
        description: 'Songs you haven\'t played yet',
        criteria: {
          rules: [{
            id: '1',
            field: 'play_count',
            operator: 'equals',
            value: 0
          }],
          match_type: 'all',
          sort_by: 'date_added',
          sort_order: 'desc',
          limit: 100,
          auto_update: true
        }
      }
    ];
  }
}