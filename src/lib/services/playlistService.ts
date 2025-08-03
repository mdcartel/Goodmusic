import { Database } from 'sqlite3';
import { Song } from '../../types';
import { 
  Playlist, 
  PlaylistSong, 
  SmartPlaylistCriteria, 
  SmartPlaylistRule,
  PlaylistFilter,
  PlaylistStats,
  PlaylistImportResult,
  PlaylistExportFormat,
  PlaylistOperation,
  PlaylistActivity
} from '../../types/playlist';

export class PlaylistService {
  private static instance: PlaylistService;
  private db: Database;

  private constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.initializePlaylistTables();
  }

  public static getInstance(databasePath?: string): PlaylistService {
    if (!PlaylistService.instance) {
      if (!databasePath) {
        throw new Error('Database path is required for first initialization');
      }
      PlaylistService.instance = new PlaylistService(databasePath);
    }
    return PlaylistService.instance;
  }

  /**
   * Initialize playlist-related database tables
   */
  private async initializePlaylistTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const queries = [
        // Playlists table
        `CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          thumbnail TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          song_count INTEGER DEFAULT 0,
          total_duration INTEGER DEFAULT 0,
          is_smart BOOLEAN DEFAULT 0,
          smart_criteria TEXT,
          is_public BOOLEAN DEFAULT 0,
          is_collaborative BOOLEAN DEFAULT 0,
          created_by TEXT,
          tags TEXT,
          color TEXT
        )`,
        
        // Playlist songs junction table
        `CREATE TABLE IF NOT EXISTS playlist_songs (
          id TEXT PRIMARY KEY,
          playlist_id TEXT NOT NULL,
          song_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          added_by TEXT,
          FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
          FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
          UNIQUE(playlist_id, song_id, position)
        )`,
        
        // Playlist activity log
        `CREATE TABLE IF NOT EXISTS playlist_activity (
          id TEXT PRIMARY KEY,
          playlist_id TEXT NOT NULL,
          user_id TEXT,
          action TEXT NOT NULL,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT,
          FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
        )`,
        
        // Indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name)`,
        `CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_playlists_is_smart ON playlists(is_smart)`,
        `CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id)`,
        `CREATE INDEX IF NOT EXISTS idx_playlist_songs_song_id ON playlist_songs(song_id)`,
        `CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlist_id, position)`,
        `CREATE INDEX IF NOT EXISTS idx_playlist_activity_playlist_id ON playlist_activity(playlist_id)`,
        `CREATE INDEX IF NOT EXISTS idx_playlist_activity_timestamp ON playlist_activity(timestamp)`
      ];

      let completed = 0;
      const total = queries.length;

      queries.forEach(query => {
        this.db.run(query, (err) => {
          if (err) {
            reject(err);
            return;
          }
          completed++;
          if (completed === total) {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(
    name: string,
    description?: string,
    isSmart: boolean = false,
    smartCriteria?: SmartPlaylistCriteria,
    options: {
      isPublic?: boolean;
      isCollaborative?: boolean;
      createdBy?: string;
      tags?: string[];
      color?: string;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const playlist: Partial<Playlist> = {
        id,
        name,
        description,
        created_at: new Date(now),
        updated_at: new Date(now),
        song_count: 0,
        total_duration: 0,
        is_smart: isSmart,
        smart_criteria: smartCriteria,
        is_public: options.isPublic || false,
        is_collaborative: options.isCollaborative || false,
        created_by: options.createdBy,
        tags: options.tags,
        color: options.color
      };

      this.db.run(
        `INSERT INTO playlists (
          id, name, description, created_at, updated_at, song_count, total_duration,
          is_smart, smart_criteria, is_public, is_collaborative, created_by, tags, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, name, description, now, now, 0, 0,
          isSmart ? 1 : 0,
          smartCriteria ? JSON.stringify(smartCriteria) : null,
          options.isPublic ? 1 : 0,
          options.isCollaborative ? 1 : 0,
          options.createdBy || null,
          options.tags ? JSON.stringify(options.tags) : null,
          options.color || null
        ],
        (err) => {
          if (err) {
            reject(err);
          } else {
            // Log activity
            this.logActivity(id, 'created', `Playlist "${name}" created`, options.createdBy);
            resolve(id);
          }
        }
      );
    });
  }

  /**
   * Get playlist by ID
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM playlists WHERE id = ?`,
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            resolve(this.parsePlaylistRow(row));
          }
        }
      );
    });
  }

  /**
   * Get all playlists with optional filtering
   */
  async getPlaylists(filter: PlaylistFilter = {}): Promise<Playlist[]> {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM playlists`;
      const conditions: string[] = [];
      const params: any[] = [];

      // Apply filters
      if (filter.search) {
        conditions.push(`(name LIKE ? OR description LIKE ?)`);
        const searchTerm = `%${filter.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filter.is_smart !== undefined) {
        conditions.push(`is_smart = ?`);
        params.push(filter.is_smart ? 1 : 0);
      }

      if (filter.is_public !== undefined) {
        conditions.push(`is_public = ?`);
        params.push(filter.is_public ? 1 : 0);
      }

      if (filter.is_collaborative !== undefined) {
        conditions.push(`is_collaborative = ?`);
        params.push(filter.is_collaborative ? 1 : 0);
      }

      if (filter.created_by) {
        conditions.push(`created_by = ?`);
        params.push(filter.created_by);
      }

      if (filter.min_songs !== undefined) {
        conditions.push(`song_count >= ?`);
        params.push(filter.min_songs);
      }

      if (filter.max_songs !== undefined) {
        conditions.push(`song_count <= ?`);
        params.push(filter.max_songs);
      }

      if (filter.created_after) {
        conditions.push(`created_at >= ?`);
        params.push(filter.created_after.toISOString());
      }

      if (filter.created_before) {
        conditions.push(`created_at <= ?`);
        params.push(filter.created_before.toISOString());
      }

      if (filter.tags && filter.tags.length > 0) {
        const tagConditions = filter.tags.map(() => `tags LIKE ?`).join(' OR ');
        conditions.push(`(${tagConditions})`);
        filter.tags.forEach(tag => params.push(`%"${tag}"%`));
      }

      // Build WHERE clause
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add sorting
      const sortBy = filter.sort_by || 'updated_at';
      const sortOrder = filter.sort_order || 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const playlists = rows.map(row => this.parsePlaylistRow(row));
          resolve(playlists);
        }
      });
    });
  }

  /**
   * Update playlist metadata
   */
  async updatePlaylist(
    id: string,
    updates: Partial<Playlist>,
    userId?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const updateFields: string[] = [];
      const params: any[] = [];

      // Build update query dynamically
      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        params.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        params.push(updates.description);
      }

      if (updates.thumbnail !== undefined) {
        updateFields.push('thumbnail = ?');
        params.push(updates.thumbnail);
      }

      if (updates.is_public !== undefined) {
        updateFields.push('is_public = ?');
        params.push(updates.is_public ? 1 : 0);
      }

      if (updates.is_collaborative !== undefined) {
        updateFields.push('is_collaborative = ?');
        params.push(updates.is_collaborative ? 1 : 0);
      }

      if (updates.tags !== undefined) {
        updateFields.push('tags = ?');
        params.push(updates.tags ? JSON.stringify(updates.tags) : null);
      }

      if (updates.color !== undefined) {
        updateFields.push('color = ?');
        params.push(updates.color);
      }

      if (updates.smart_criteria !== undefined) {
        updateFields.push('smart_criteria = ?');
        params.push(updates.smart_criteria ? JSON.stringify(updates.smart_criteria) : null);
      }

      if (updateFields.length === 0) {
        resolve();
        return;
      }

      // Always update the updated_at timestamp
      updateFields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const query = `UPDATE playlists SET ${updateFields.join(', ')} WHERE id = ?`;

      this.db.run(query, params, (err) => {
        if (err) {
          reject(err);
        } else {
          // Log activity
          this.logActivity(id, 'updated', 'Playlist metadata updated', userId);
          resolve();
        }
      });
    });
  }

  /**
   * Delete playlist
   */
  async deletePlaylist(id: string, userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get playlist name for logging
      this.db.get(
        `SELECT name FROM playlists WHERE id = ?`,
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          const playlistName = row?.name || 'Unknown';

          // Delete playlist (cascade will handle playlist_songs and activity)
          this.db.run(
            `DELETE FROM playlists WHERE id = ?`,
            [id],
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        }
      );
    });
  }

  /**
   * Add song to playlist
   */
  async addSongToPlaylist(
    playlistId: string,
    songId: string,
    position?: number,
    userId?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get current song count and determine position
      this.db.get(
        `SELECT song_count FROM playlists WHERE id = ?`,
        [playlistId],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            reject(new Error('Playlist not found'));
            return;
          }

          const currentCount = row.song_count;
          const finalPosition = position !== undefined ? position : currentCount;

          // If inserting in middle, shift other songs
          if (finalPosition < currentCount) {
            this.db.run(
              `UPDATE playlist_songs SET position = position + 1 
               WHERE playlist_id = ? AND position >= ?`,
              [playlistId, finalPosition],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                this.insertPlaylistSong(playlistId, songId, finalPosition, userId, resolve, reject);
              }
            );
          } else {
            this.insertPlaylistSong(playlistId, songId, finalPosition, userId, resolve, reject);
          }
        }
      );
    });
  }

  /**
   * Helper method to insert playlist song
   */
  private insertPlaylistSong(
    playlistId: string,
    songId: string,
    position: number,
    userId: string | undefined,
    resolve: Function,
    reject: Function
  ): void {
    const playlistSongId = `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.db.run(
      `INSERT INTO playlist_songs (id, playlist_id, song_id, position, added_by)
       VALUES (?, ?, ?, ?, ?)`,
      [playlistSongId, playlistId, songId, position, userId || null],
      (err) => {
        if (err) {
          reject(err);
        } else {
          // Update playlist stats
          this.updatePlaylistStats(playlistId).then(() => {
            // Log activity
            this.logActivity(playlistId, 'song_added', `Song added at position ${position}`, userId);
            resolve();
          }).catch(reject);
        }
      }
    );
  }

  /**
   * Remove song from playlist
   */
  async removeSongFromPlaylist(
    playlistId: string,
    songId: string,
    userId?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get the position of the song to be removed
      this.db.get(
        `SELECT position FROM playlist_songs WHERE playlist_id = ? AND song_id = ?`,
        [playlistId, songId],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            reject(new Error('Song not found in playlist'));
            return;
          }

          const removedPosition = row.position;

          // Remove the song
          this.db.run(
            `DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?`,
            [playlistId, songId],
            (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Shift remaining songs down
              this.db.run(
                `UPDATE playlist_songs SET position = position - 1 
                 WHERE playlist_id = ? AND position > ?`,
                [playlistId, removedPosition],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    // Update playlist stats
                    this.updatePlaylistStats(playlistId).then(() => {
                      // Log activity
                      this.logActivity(playlistId, 'song_removed', `Song removed from position ${removedPosition}`, userId);
                      resolve();
                    }).catch(reject);
                  }
                }
              );
            }
          );
        }
      );
    });
  }

  /**
   * Reorder song in playlist
   */
  async reorderSong(
    playlistId: string,
    songId: string,
    newPosition: number,
    userId?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get current position
      this.db.get(
        `SELECT position FROM playlist_songs WHERE playlist_id = ? AND song_id = ?`,
        [playlistId, songId],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            reject(new Error('Song not found in playlist'));
            return;
          }

          const oldPosition = row.position;

          if (oldPosition === newPosition) {
            resolve();
            return;
          }

          // Update positions based on move direction
          if (oldPosition < newPosition) {
            // Moving down: shift songs up
            this.db.run(
              `UPDATE playlist_songs SET position = position - 1 
               WHERE playlist_id = ? AND position > ? AND position <= ?`,
              [playlistId, oldPosition, newPosition],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                this.updateSongPosition(playlistId, songId, newPosition, userId, resolve, reject);
              }
            );
          } else {
            // Moving up: shift songs down
            this.db.run(
              `UPDATE playlist_songs SET position = position + 1 
               WHERE playlist_id = ? AND position >= ? AND position < ?`,
              [playlistId, newPosition, oldPosition],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                this.updateSongPosition(playlistId, songId, newPosition, userId, resolve, reject);
              }
            );
          }
        }
      );
    });
  }

  /**
   * Helper method to update song position
   */
  private updateSongPosition(
    playlistId: string,
    songId: string,
    newPosition: number,
    userId: string | undefined,
    resolve: Function,
    reject: Function
  ): void {
    this.db.run(
      `UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?`,
      [newPosition, playlistId, songId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          // Log activity
          this.logActivity(playlistId, 'song_reordered', `Song moved to position ${newPosition}`, userId);
          resolve();
        }
      }
    );
  }

  /**
   * Get songs in playlist
   */
  async getPlaylistSongs(playlistId: string): Promise<(Song & { position: number; added_at: Date })[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, ps.position, ps.added_at
        FROM songs s
        JOIN playlist_songs ps ON s.id = ps.song_id
        WHERE ps.playlist_id = ?
        ORDER BY ps.position ASC
      `;

      this.db.all(query, [playlistId], (err, rows: any[]) => {
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
            is_favorite: Boolean(row.is_favorite),
            position: row.position,
            added_at: new Date(row.added_at)
          }));
          resolve(songs);
        }
      });
    });
  }

  /**
   * Update playlist statistics (song count and total duration)
   */
  private async updatePlaylistStats(playlistId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT COUNT(*) as song_count, COALESCE(SUM(s.duration), 0) as total_duration
        FROM playlist_songs ps
        LEFT JOIN songs s ON ps.song_id = s.id
        WHERE ps.playlist_id = ?
      `;

      this.db.get(query, [playlistId], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          this.db.run(
            `UPDATE playlists SET song_count = ?, total_duration = ?, updated_at = ? WHERE id = ?`,
            [row.song_count, row.total_duration, new Date().toISOString(), playlistId],
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        }
      });
    });
  }

  /**
   * Log playlist activity
   */
  private async logActivity(
    playlistId: string,
    action: string,
    details: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.db.run(
      `INSERT INTO playlist_activity (id, playlist_id, user_id, action, details, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        activityId,
        playlistId,
        userId || null,
        action,
        details,
        metadata ? JSON.stringify(metadata) : null
      ],
      (err) => {
        if (err) {
          console.error('Failed to log playlist activity:', err);
        }
      }
    );
  }

  /**
   * Get playlist statistics
   */
  async getPlaylistStats(): Promise<PlaylistStats> {
    return new Promise((resolve, reject) => {
      const queries = [
        `SELECT COUNT(*) as total_playlists FROM playlists`,
        `SELECT COALESCE(SUM(song_count), 0) as total_songs FROM playlists`,
        `SELECT COALESCE(SUM(total_duration), 0) as total_duration FROM playlists`,
        `SELECT * FROM playlists ORDER BY created_at DESC LIMIT 5`,
        `SELECT * FROM playlists ORDER BY updated_at DESC LIMIT 5`
      ];

      Promise.all([
        new Promise<number>((resolve, reject) => {
          this.db.get(queries[0], (err, row: any) => {
            if (err) reject(err);
            else resolve(row.total_playlists);
          });
        }),
        new Promise<number>((resolve, reject) => {
          this.db.get(queries[1], (err, row: any) => {
            if (err) reject(err);
            else resolve(row.total_songs);
          });
        }),
        new Promise<number>((resolve, reject) => {
          this.db.get(queries[2], (err, row: any) => {
            if (err) reject(err);
            else resolve(row.total_duration);
          });
        }),
        new Promise<Playlist[]>((resolve, reject) => {
          this.db.all(queries[3], (err, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows.map(row => this.parsePlaylistRow(row)));
          });
        }),
        new Promise<Playlist[]>((resolve, reject) => {
          this.db.all(queries[4], (err, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows.map(row => this.parsePlaylistRow(row)));
          });
        })
      ]).then(([totalPlaylists, totalSongs, totalDuration, recentlyCreated, recentlyUpdated]) => {
        resolve({
          total_playlists: totalPlaylists,
          total_songs: totalSongs,
          total_duration: totalDuration,
          most_played_playlist: '', // TODO: Implement based on play statistics
          recently_created: recentlyCreated,
          recently_updated: recentlyUpdated
        });
      }).catch(reject);
    });
  }

  /**
   * Parse database row to Playlist object
   */
  private parsePlaylistRow(row: any): Playlist {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      thumbnail: row.thumbnail,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      song_count: row.song_count,
      total_duration: row.total_duration,
      is_smart: Boolean(row.is_smart),
      smart_criteria: row.smart_criteria ? JSON.parse(row.smart_criteria) : undefined,
      is_public: Boolean(row.is_public),
      is_collaborative: Boolean(row.is_collaborative),
      created_by: row.created_by,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      color: row.color
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }
}