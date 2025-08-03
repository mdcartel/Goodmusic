import { Database } from 'sqlite3';
import { Song } from '../../types';
import { 
  LibraryView, 
  LibraryItem, 
  ArtistLibraryItem, 
  AlbumLibraryItem, 
  GenreLibraryItem,
  YearLibraryItem,
  LibraryFilter,
  LibrarySortOptions,
  LibraryStats,
  RecentlyPlayedEntry,
  FavoriteEntry,
  PlayHistory,
  LibraryDiscovery,
  LibrarySearchResult
} from '../../types/library';

export class LibraryService {
  private static instance: LibraryService;
  private db: Database;

  private constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.initializeLibraryTables();
  }

  public static getInstance(databasePath?: string): LibraryService {
    if (!LibraryService.instance) {
      if (!databasePath) {
        throw new Error('Database path is required for first initialization');
      }
      LibraryService.instance = new LibraryService(databasePath);
    }
    return LibraryService.instance;
  }

  /**
   * Initialize library-related database tables
   */
  private async initializeLibraryTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const queries = [
        // Recently played table
        `CREATE TABLE IF NOT EXISTS recently_played (
          id TEXT PRIMARY KEY,
          song_id TEXT NOT NULL,
          played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          play_duration INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT 0,
          source TEXT DEFAULT 'manual',
          context TEXT,
          FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
        )`,
        
        // Favorites table
        `CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          song_id TEXT NOT NULL UNIQUE,
          favorited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT,
          FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
        )`,
        
        // Play history aggregation table
        `CREATE TABLE IF NOT EXISTS play_history (
          song_id TEXT PRIMARY KEY,
          play_count INTEGER DEFAULT 0,
          total_play_time INTEGER DEFAULT 0,
          first_played DATETIME,
          last_played DATETIME,
          average_completion REAL DEFAULT 0,
          skip_count INTEGER DEFAULT 0,
          favorite_count INTEGER DEFAULT 0,
          FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
        )`,
        
        // Indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_recently_played_song_id ON recently_played(song_id)`,
        `CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON recently_played(played_at)`,
        `CREATE INDEX IF NOT EXISTS idx_favorites_song_id ON favorites(song_id)`,
        `CREATE INDEX IF NOT EXISTS idx_favorites_favorited_at ON favorites(favorited_at)`,
        `CREATE INDEX IF NOT EXISTS idx_play_history_play_count ON play_history(play_count)`,
        `CREATE INDEX IF NOT EXISTS idx_play_history_last_played ON play_history(last_played)`,
        
        // Update songs table to include is_favorite flag
        `ALTER TABLE songs ADD COLUMN is_favorite BOOLEAN DEFAULT 0`,
        
        // Create triggers to maintain play_history
        `CREATE TRIGGER IF NOT EXISTS update_play_history_on_play
         AFTER INSERT ON recently_played
         BEGIN
           INSERT OR REPLACE INTO play_history (
             song_id, play_count, total_play_time, first_played, last_played,
             average_completion, skip_count, favorite_count
           )
           VALUES (
             NEW.song_id,
             COALESCE((SELECT play_count FROM play_history WHERE song_id = NEW.song_id), 0) + 1,
             COALESCE((SELECT total_play_time FROM play_history WHERE song_id = NEW.song_id), 0) + NEW.play_duration,
             COALESCE((SELECT first_played FROM play_history WHERE song_id = NEW.song_id), NEW.played_at),
             NEW.played_at,
             CASE 
               WHEN NEW.completed THEN 
                 (COALESCE((SELECT average_completion FROM play_history WHERE song_id = NEW.song_id), 0) * 
                  COALESCE((SELECT play_count FROM play_history WHERE song_id = NEW.song_id), 0) + 100) / 
                 (COALESCE((SELECT play_count FROM play_history WHERE song_id = NEW.song_id), 0) + 1)
               ELSE
                 (COALESCE((SELECT average_completion FROM play_history WHERE song_id = NEW.song_id), 0) * 
                  COALESCE((SELECT play_count FROM play_history WHERE song_id = NEW.song_id), 0) + 
                  (NEW.play_duration * 100.0 / (SELECT duration FROM songs WHERE id = NEW.song_id))) / 
                 (COALESCE((SELECT play_count FROM play_history WHERE song_id = NEW.song_id), 0) + 1)
             END,
             COALESCE((SELECT skip_count FROM play_history WHERE song_id = NEW.song_id), 0) + 
             CASE WHEN NEW.completed = 0 THEN 1 ELSE 0 END,
             COALESCE((SELECT favorite_count FROM play_history WHERE song_id = NEW.song_id), 0)
           );
           
           UPDATE songs SET play_count = (
             SELECT play_count FROM play_history WHERE song_id = NEW.song_id
           ), last_played = NEW.played_at WHERE id = NEW.song_id;
         END`,
        
        // Trigger to update favorite status
        `CREATE TRIGGER IF NOT EXISTS update_favorite_status_on_add
         AFTER INSERT ON favorites
         BEGIN
           UPDATE songs SET is_favorite = 1 WHERE id = NEW.song_id;
           UPDATE play_history SET favorite_count = favorite_count + 1 WHERE song_id = NEW.song_id;
         END`,
        
        `CREATE TRIGGER IF NOT EXISTS update_favorite_status_on_remove
         AFTER DELETE ON favorites
         BEGIN
           UPDATE songs SET is_favorite = 0 WHERE id = OLD.song_id;
           UPDATE play_history SET favorite_count = CASE WHEN favorite_count > 0 THEN favorite_count - 1 ELSE 0 END 
           WHERE song_id = OLD.song_id;
         END`
      ];

      let completed = 0;
      const total = queries.length;

      queries.forEach(query => {
        this.db.run(query, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.warn('Database query warning:', err.message);
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
   * Get library view by type
   */
  async getLibraryView(
    type: 'artist' | 'album' | 'genre' | 'year' | 'recently_added' | 'recently_played' | 'favorites',
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit?: number,
    offset?: number
  ): Promise<LibraryView> {
    switch (type) {
      case 'artist':
        return this.getArtistView(filter, sort, limit, offset);
      case 'album':
        return this.getAlbumView(filter, sort, limit, offset);
      case 'genre':
        return this.getGenreView(filter, sort, limit, offset);
      case 'year':
        return this.getYearView(filter, sort, limit, offset);
      case 'recently_added':
        return this.getRecentlyAddedView(filter, sort, limit, offset);
      case 'recently_played':
        return this.getRecentlyPlayedView(filter, sort, limit, offset);
      case 'favorites':
        return this.getFavoritesView(filter, sort, limit, offset);
      default:
        throw new Error(`Unsupported library view type: ${type}`);
    }
  }

  /**
   * Get artist library view
   */
  private async getArtistView(
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit?: number,
    offset?: number
  ): Promise<LibraryView> {
    return new Promise((resolve, reject) => {
      const { whereClause, params } = this.buildWhereClause(filter);
      
      const query = `
        SELECT 
          artist as name,
          COUNT(*) as song_count,
          SUM(duration) as total_duration,
          MIN(added_at) as first_added,
          MAX(last_played) as last_played,
          SUM(play_count) as play_count,
          GROUP_CONCAT(DISTINCT genre) as genres,
          GROUP_CONCAT(DISTINCT year) as years,
          (SELECT thumbnail FROM songs s2 WHERE s2.artist = s1.artist AND s2.thumbnail IS NOT NULL LIMIT 1) as thumbnail
        FROM songs s1
        ${whereClause}
        GROUP BY artist
        ${this.buildOrderClause(sort || { field: 'name', order: 'asc' })}
        ${limit ? `LIMIT ${limit}` : ''}
        ${offset ? `OFFSET ${offset}` : ''}
      `;

      this.db.all(query, params, async (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const items: ArtistLibraryItem[] = [];
          
          for (const row of rows) {
            const albums = await this.getArtistAlbums(row.name);
            const topSongs = await this.getArtistTopSongs(row.name, 10);
            
            items.push({
              id: `artist_${row.name}`,
              name: row.name,
              type: 'artist',
              song_count: row.song_count,
              total_duration: row.total_duration || 0,
              thumbnail: row.thumbnail,
              first_added: new Date(row.first_added),
              last_played: row.last_played ? new Date(row.last_played) : undefined,
              play_count: row.play_count || 0,
              albums,
              top_songs: topSongs,
              genres: row.genres ? row.genres.split(',').filter(Boolean) : [],
              years: row.years ? row.years.split(',').map(Number).filter(Boolean) : []
            });
          }

          resolve({
            type: 'artist',
            title: 'Artists',
            count: items.length,
            items
          });
        }
      });
    });
  }

  /**
   * Get album library view
   */
  private async getAlbumView(
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit?: number,
    offset?: number
  ): Promise<LibraryView> {
    return new Promise((resolve, reject) => {
      const { whereClause, params } = this.buildWhereClause(filter);
      
      const query = `
        SELECT 
          album as name,
          artist,
          album_artist,
          year,
          genre,
          COUNT(*) as track_count,
          SUM(duration) as total_duration,
          MIN(added_at) as first_added,
          MAX(last_played) as last_played,
          SUM(play_count) as play_count,
          (SELECT thumbnail FROM songs s2 WHERE s2.album = s1.album AND s2.artist = s1.artist AND s2.thumbnail IS NOT NULL LIMIT 1) as thumbnail
        FROM songs s1
        ${whereClause}
        AND album IS NOT NULL AND album != ''
        GROUP BY album, artist
        ${this.buildOrderClause(sort || { field: 'name', order: 'asc' })}
        ${limit ? `LIMIT ${limit}` : ''}
        ${offset ? `OFFSET ${offset}` : ''}
      `;

      this.db.all(query, params, async (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const items: AlbumLibraryItem[] = [];
          
          for (const row of rows) {
            const tracks = await this.getAlbumTracks(row.name, row.artist);
            
            items.push({
              id: `album_${row.artist}_${row.name}`,
              name: row.name,
              type: 'album',
              artist: row.artist,
              album_artist: row.album_artist,
              year: row.year,
              genre: row.genre,
              song_count: row.track_count,
              track_count: row.track_count,
              total_duration: row.total_duration || 0,
              thumbnail: row.thumbnail,
              first_added: new Date(row.first_added),
              last_played: row.last_played ? new Date(row.last_played) : undefined,
              play_count: row.play_count || 0,
              tracks
            });
          }

          resolve({
            type: 'album',
            title: 'Albums',
            count: items.length,
            items
          });
        }
      });
    });
  }

  /**
   * Get genre library view
   */
  private async getGenreView(
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit?: number,
    offset?: number
  ): Promise<LibraryView> {
    return new Promise((resolve, reject) => {
      const { whereClause, params } = this.buildWhereClause(filter);
      
      const query = `
        SELECT 
          genre as name,
          COUNT(*) as song_count,
          SUM(duration) as total_duration,
          MIN(added_at) as first_added,
          MAX(last_played) as last_played,
          SUM(play_count) as play_count,
          GROUP_CONCAT(DISTINCT artist) as artists,
          GROUP_CONCAT(DISTINCT album) as albums,
          MIN(year) as earliest_year,
          MAX(year) as latest_year,
          (SELECT thumbnail FROM songs s2 WHERE s2.genre = s1.genre AND s2.thumbnail IS NOT NULL LIMIT 1) as thumbnail
        FROM songs s1
        ${whereClause}
        AND genre IS NOT NULL AND genre != ''
        GROUP BY genre
        ${this.buildOrderClause(sort || { field: 'name', order: 'asc' })}
        ${limit ? `LIMIT ${limit}` : ''}
        ${offset ? `OFFSET ${offset}` : ''}
      `;

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const items: GenreLibraryItem[] = rows.map(row => ({
            id: `genre_${row.name}`,
            name: row.name,
            type: 'genre',
            song_count: row.song_count,
            total_duration: row.total_duration || 0,
            thumbnail: row.thumbnail,
            first_added: new Date(row.first_added),
            last_played: row.last_played ? new Date(row.last_played) : undefined,
            play_count: row.play_count || 0,
            artists: row.artists ? row.artists.split(',').filter(Boolean) : [],
            top_albums: row.albums ? row.albums.split(',').filter(Boolean).slice(0, 10) : [],
            year_range: {
              earliest: row.earliest_year || 0,
              latest: row.latest_year || 0
            }
          }));

          resolve({
            type: 'genre',
            title: 'Genres',
            count: items.length,
            items
          });
        }
      });
    });
  }

  /**
   * Get year library view
   */
  private async getYearView(
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit?: number,
    offset?: number
  ): Promise<LibraryView> {
    return new Promise((resolve, reject) => {
      const { whereClause, params } = this.buildWhereClause(filter);
      
      const query = `
        SELECT 
          year,
          COUNT(*) as song_count,
          SUM(duration) as total_duration,
          MIN(added_at) as first_added,
          MAX(last_played) as last_played,
          SUM(play_count) as play_count,
          GROUP_CONCAT(DISTINCT artist) as artists,
          GROUP_CONCAT(DISTINCT album) as albums,
          GROUP_CONCAT(DISTINCT genre) as genres,
          (SELECT thumbnail FROM songs s2 WHERE s2.year = s1.year AND s2.thumbnail IS NOT NULL LIMIT 1) as thumbnail
        FROM songs s1
        ${whereClause}
        AND year IS NOT NULL AND year > 0
        GROUP BY year
        ${this.buildOrderClause(sort || { field: 'name', order: 'desc' })}
        ${limit ? `LIMIT ${limit}` : ''}
        ${offset ? `OFFSET ${offset}` : ''}
      `;

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const items: YearLibraryItem[] = rows.map(row => ({
            id: `year_${row.year}`,
            name: row.year.toString(),
            type: 'year',
            year: row.year,
            song_count: row.song_count,
            total_duration: row.total_duration || 0,
            thumbnail: row.thumbnail,
            first_added: new Date(row.first_added),
            last_played: row.last_played ? new Date(row.last_played) : undefined,
            play_count: row.play_count || 0,
            artists: row.artists ? row.artists.split(',').filter(Boolean) : [],
            albums: row.albums ? row.albums.split(',').filter(Boolean) : [],
            genres: row.genres ? row.genres.split(',').filter(Boolean) : []
          }));

          resolve({
            type: 'year',
            title: 'Years',
            count: items.length,
            items
          });
        }
      });
    });
  }

  /**
   * Get recently added view
   */
  private async getRecentlyAddedView(
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit: number = 50,
    offset: number = 0
  ): Promise<LibraryView> {
    return new Promise((resolve, reject) => {
      const { whereClause, params } = this.buildWhereClause(filter);
      
      const query = `
        SELECT * FROM songs
        ${whereClause}
        ORDER BY added_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const songs = rows.map(row => this.parseSongRow(row));
          
          resolve({
            type: 'recently_added',
            title: 'Recently Added',
            count: songs.length,
            items: songs.map(song => ({
              id: song.id,
              name: song.title,
              type: 'artist' as const,
              song_count: 1,
              total_duration: song.duration,
              thumbnail: song.thumbnail,
              first_added: song.added_at,
              last_played: song.last_played,
              play_count: song.play_count,
              songs: [song]
            }))
          });
        }
      });
    });
  }

  /**
   * Get recently played view
   */
  private async getRecentlyPlayedView(
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit: number = 50,
    offset: number = 0
  ): Promise<LibraryView> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, rp.played_at, rp.play_duration, rp.completed
        FROM songs s
        JOIN recently_played rp ON s.id = rp.song_id
        ORDER BY rp.played_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const songs = rows.map(row => ({
            ...this.parseSongRow(row),
            recently_played_at: new Date(row.played_at),
            play_duration: row.play_duration,
            completed: Boolean(row.completed)
          }));
          
          resolve({
            type: 'recently_played',
            title: 'Recently Played',
            count: songs.length,
            items: songs.map(song => ({
              id: song.id,
              name: song.title,
              type: 'artist' as const,
              song_count: 1,
              total_duration: song.duration,
              thumbnail: song.thumbnail,
              first_added: song.added_at,
              last_played: song.last_played,
              play_count: song.play_count,
              songs: [song]
            }))
          });
        }
      });
    });
  }

  /**
   * Get favorites view
   */
  private async getFavoritesView(
    filter?: LibraryFilter,
    sort?: LibrarySortOptions,
    limit: number = 50,
    offset: number = 0
  ): Promise<LibraryView> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, f.favorited_at
        FROM songs s
        JOIN favorites f ON s.id = f.song_id
        ORDER BY f.favorited_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const songs = rows.map(row => ({
            ...this.parseSongRow(row),
            favorited_at: new Date(row.favorited_at)
          }));
          
          resolve({
            type: 'favorites',
            title: 'Favorites',
            count: songs.length,
            items: songs.map(song => ({
              id: song.id,
              name: song.title,
              type: 'artist' as const,
              song_count: 1,
              total_duration: song.duration,
              thumbnail: song.thumbnail,
              first_added: song.added_at,
              last_played: song.last_played,
              play_count: song.play_count,
              songs: [song]
            }))
          });
        }
      });
    });
  }

  /**
   * Add song to recently played
   */
  async addToRecentlyPlayed(
    songId: string,
    playDuration: number,
    completed: boolean,
    source: string = 'manual',
    context?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.db.run(
        `INSERT INTO recently_played (id, song_id, play_duration, completed, source, context)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, songId, playDuration, completed ? 1 : 0, source, context],
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
   * Add song to favorites
   */
  async addToFavorites(songId: string, userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.db.run(
        `INSERT OR IGNORE INTO favorites (id, song_id, user_id) VALUES (?, ?, ?)`,
        [id, songId, userId],
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
   * Remove song from favorites
   */
  async removeFromFavorites(songId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM favorites WHERE song_id = ?`,
        [songId],
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
   * Get library statistics
   */
  async getLibraryStats(): Promise<LibraryStats> {
    return new Promise((resolve, reject) => {
      const queries = [
        `SELECT COUNT(*) as total_songs FROM songs`,
        `SELECT COUNT(DISTINCT artist) as total_artists FROM songs WHERE artist IS NOT NULL`,
        `SELECT COUNT(DISTINCT album) as total_albums FROM songs WHERE album IS NOT NULL`,
        `SELECT COUNT(DISTINCT genre) as total_genres FROM songs WHERE genre IS NOT NULL`,
        `SELECT SUM(duration) as total_duration FROM songs`,
        `SELECT SUM(file_size) as total_size FROM songs WHERE file_size IS NOT NULL`,
        `SELECT AVG(rating) as average_rating FROM songs WHERE rating IS NOT NULL`,
        `SELECT COUNT(*) as favorites_count FROM favorites`,
        `SELECT COUNT(*) as downloaded_count FROM songs WHERE is_downloaded = 1`
      ];

      Promise.all(queries.map(query => 
        new Promise<any>((resolve, reject) => {
          this.db.get(query, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        })
      )).then(async results => {
        // Get additional stats
        const [mostPlayedSong, mostPlayedArtist, mostPlayedAlbum, mostPlayedGenre] = await Promise.all([
          this.getMostPlayedSong(),
          this.getMostPlayedArtist(),
          this.getMostPlayedAlbum(),
          this.getMostPlayedGenre()
        ]);

        const [recentlyAdded, recentlyPlayed, topRated] = await Promise.all([
          this.getRecentlyAddedSongs(10),
          this.getRecentlyPlayedSongs(10),
          this.getTopRatedSongs(10)
        ]);

        const [yearDistribution, genreDistribution, qualityDistribution] = await Promise.all([
          this.getYearDistribution(),
          this.getGenreDistribution(),
          this.getQualityDistribution()
        ]);

        resolve({
          total_songs: results[0].total_songs || 0,
          total_artists: results[1].total_artists || 0,
          total_albums: results[2].total_albums || 0,
          total_genres: results[3].total_genres || 0,
          total_duration: results[4].total_duration || 0,
          total_size: results[5].total_size || 0,
          average_rating: results[6].average_rating || 0,
          favorites_count: results[7].favorites_count || 0,
          downloaded_count: results[8].downloaded_count || 0,
          most_played_song: mostPlayedSong,
          most_played_artist: mostPlayedArtist,
          most_played_album: mostPlayedAlbum,
          most_played_genre: mostPlayedGenre,
          recently_added: recentlyAdded,
          recently_played: recentlyPlayed,
          top_rated: topRated,
          year_distribution: yearDistribution,
          genre_distribution: genreDistribution,
          quality_distribution: qualityDistribution
        });
      }).catch(reject);
    });
  }

  /**
   * Search library
   */
  async searchLibrary(
    query: string,
    filter?: LibraryFilter,
    limit: number = 50
  ): Promise<LibrarySearchResult> {
    const startTime = Date.now();
    
    try {
      const [songs, artists, albums, genres] = await Promise.all([
        this.searchSongs(query, filter, limit),
        this.searchArtists(query, filter, Math.floor(limit / 4)),
        this.searchAlbums(query, filter, Math.floor(limit / 4)),
        this.searchGenres(query, filter, Math.floor(limit / 8))
      ]);

      const totalResults = songs.length + artists.length + albums.length + genres.length;
      const searchTime = Date.now() - startTime;

      return {
        songs,
        artists,
        albums,
        genres,
        total_results: totalResults,
        search_time: searchTime,
        suggestions: [] // TODO: Implement search suggestions
      };
    } catch (error) {
      throw new Error(`Library search failed: ${error}`);
    }
  }

  /**
   * Helper methods
   */
  private buildWhereClause(filter?: LibraryFilter): { whereClause: string; params: any[] } {
    if (!filter) {
      return { whereClause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.search) {
      conditions.push(`(title LIKE ? OR artist LIKE ? OR album LIKE ?)`);
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filter.artist) {
      conditions.push(`artist LIKE ?`);
      params.push(`%${filter.artist}%`);
    }

    if (filter.album) {
      conditions.push(`album LIKE ?`);
      params.push(`%${filter.album}%`);
    }

    if (filter.genre) {
      conditions.push(`genre LIKE ?`);
      params.push(`%${filter.genre}%`);
    }

    if (filter.year) {
      conditions.push(`year = ?`);
      params.push(filter.year);
    }

    if (filter.year_range) {
      conditions.push(`year BETWEEN ? AND ?`);
      params.push(filter.year_range.from, filter.year_range.to);
    }

    if (filter.is_favorite !== undefined) {
      conditions.push(`is_favorite = ?`);
      params.push(filter.is_favorite ? 1 : 0);
    }

    if (filter.is_downloaded !== undefined) {
      conditions.push(`is_downloaded = ?`);
      params.push(filter.is_downloaded ? 1 : 0);
    }

    // Add more filter conditions as needed...

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  private buildOrderClause(sort: LibrarySortOptions): string {
    const fieldMap: Record<string, string> = {
      'name': 'name',
      'artist': 'artist',
      'album': 'album',
      'genre': 'genre',
      'year': 'year',
      'duration': 'total_duration',
      'play_count': 'play_count',
      'date_added': 'first_added',
      'last_played': 'last_played'
    };

    const primaryField = fieldMap[sort.field] || 'name';
    const primaryOrder = sort.order.toUpperCase();
    
    let orderClause = `ORDER BY ${primaryField} ${primaryOrder}`;
    
    if (sort.secondary_field) {
      const secondaryField = fieldMap[sort.secondary_field] || 'name';
      const secondaryOrder = (sort.secondary_order || 'asc').toUpperCase();
      orderClause += `, ${secondaryField} ${secondaryOrder}`;
    }

    return orderClause;
  }

  private parseSongRow(row: any): Song {
    return {
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
      play_count: row.play_count || 0,
      last_played: row.last_played ? new Date(row.last_played) : undefined,
      rating: row.rating,
      is_favorite: Boolean(row.is_favorite)
    };
  }

  // Additional helper methods would be implemented here...
  private async getArtistAlbums(artist: string): Promise<AlbumLibraryItem[]> {
    // Implementation for getting artist albums
    return [];
  }

  private async getArtistTopSongs(artist: string, limit: number): Promise<Song[]> {
    // Implementation for getting artist top songs
    return [];
  }

  private async getAlbumTracks(album: string, artist: string): Promise<Song[]> {
    // Implementation for getting album tracks
    return [];
  }

  private async getMostPlayedSong(): Promise<Song | null> {
    // Implementation for getting most played song
    return null;
  }

  private async getMostPlayedArtist(): Promise<string | null> {
    // Implementation for getting most played artist
    return null;
  }

  private async getMostPlayedAlbum(): Promise<string | null> {
    // Implementation for getting most played album
    return null;
  }

  private async getMostPlayedGenre(): Promise<string | null> {
    // Implementation for getting most played genre
    return null;
  }

  private async getRecentlyAddedSongs(limit: number): Promise<Song[]> {
    // Implementation for getting recently added songs
    return [];
  }

  private async getRecentlyPlayedSongs(limit: number): Promise<Song[]> {
    // Implementation for getting recently played songs
    return [];
  }

  private async getTopRatedSongs(limit: number): Promise<Song[]> {
    // Implementation for getting top rated songs
    return [];
  }

  private async getYearDistribution(): Promise<Array<{ year: number; count: number }>> {
    // Implementation for getting year distribution
    return [];
  }

  private async getGenreDistribution(): Promise<Array<{ genre: string; count: number }>> {
    // Implementation for getting genre distribution
    return [];
  }

  private async getQualityDistribution(): Promise<Array<{ quality: string; count: number }>> {
    // Implementation for getting quality distribution
    return [];
  }

  private async searchSongs(query: string, filter?: LibraryFilter, limit?: number): Promise<Song[]> {
    // Implementation for searching songs
    return [];
  }

  private async searchArtists(query: string, filter?: LibraryFilter, limit?: number): Promise<ArtistLibraryItem[]> {
    // Implementation for searching artists
    return [];
  }

  private async searchAlbums(query: string, filter?: LibraryFilter, limit?: number): Promise<AlbumLibraryItem[]> {
    // Implementation for searching albums
    return [];
  }

  private async searchGenres(query: string, filter?: LibraryFilter, limit?: number): Promise<GenreLibraryItem[]> {
    // Implementation for searching genres
    return [];
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