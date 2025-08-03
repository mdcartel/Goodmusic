import { Database } from 'sqlite3';
import { Song } from '../../types';
import { LibraryDiscovery, ArtistLibraryItem, AlbumLibraryItem, GenreLibraryItem } from '../../types/library';

export class MusicDiscoveryService {
  private db: Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);
  }

  /**
   * Get personalized music discovery recommendations
   */
  async getDiscoveryRecommendations(userId?: string): Promise<LibraryDiscovery> {
    try {
      const [
        recommendedArtists,
        recommendedAlbums,
        recommendedGenres,
        similarSongs,
        trendingSongs,
        rediscoverSongs,
        historyBasedRecommendations
      ] = await Promise.all([
        this.getRecommendedArtists(userId),
        this.getRecommendedAlbums(userId),
        this.getRecommendedGenres(userId),
        this.getSimilarSongs(userId),
        this.getTrendingSongs(),
        this.getRediscoverSongs(userId),
        this.getHistoryBasedRecommendations(userId)
      ]);

      return {
        recommended_artists: recommendedArtists,
        recommended_albums: recommendedAlbums,
        recommended_genres: recommendedGenres,
        similar_songs: similarSongs,
        trending_songs: trendingSongs,
        rediscover_songs: rediscoverSongs,
        based_on_history: historyBasedRecommendations
      };
    } catch (error) {
      throw new Error(`Failed to get discovery recommendations: ${error}`);
    }
  }

  /**
   * Get recommended artists based on listening history
   */
  private async getRecommendedArtists(userId?: string): Promise<ArtistLibraryItem[]> {
    return new Promise((resolve, reject) => {
      // Get artists similar to frequently played ones
      const query = `
        WITH user_top_artists AS (
          SELECT s.artist, SUM(ph.play_count) as total_plays
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE ph.play_count > 0
          GROUP BY s.artist
          ORDER BY total_plays DESC
          LIMIT 5
        ),
        user_genres AS (
          SELECT s.genre, COUNT(*) as genre_count
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE ph.play_count > 0 AND s.genre IS NOT NULL
          GROUP BY s.genre
          ORDER BY genre_count DESC
          LIMIT 3
        ),
        recommended_artists AS (
          SELECT 
            s.artist,
            COUNT(*) as song_count,
            SUM(s.duration) as total_duration,
            MIN(s.added_at) as first_added,
            MAX(ph.last_played) as last_played,
            SUM(ph.play_count) as play_count,
            GROUP_CONCAT(DISTINCT s.genre) as genres,
            GROUP_CONCAT(DISTINCT s.year) as years,
            (SELECT thumbnail FROM songs s2 WHERE s2.artist = s.artist AND s2.thumbnail IS NOT NULL LIMIT 1) as thumbnail,
            CASE 
              WHEN s.genre IN (SELECT genre FROM user_genres) THEN 3
              WHEN s.artist NOT IN (SELECT artist FROM user_top_artists) THEN 2
              ELSE 1
            END as recommendation_score
          FROM songs s
          LEFT JOIN play_history ph ON s.id = ph.song_id
          WHERE s.artist NOT IN (SELECT artist FROM user_top_artists)
          AND (s.genre IN (SELECT genre FROM user_genres) OR ph.play_count > 0)
          GROUP BY s.artist
          ORDER BY recommendation_score DESC, play_count DESC
          LIMIT 10
        )
        SELECT * FROM recommended_artists
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const artists: ArtistLibraryItem[] = rows.map(row => ({
            id: `artist_${row.artist}`,
            name: row.artist,
            type: 'artist',
            song_count: row.song_count,
            total_duration: row.total_duration || 0,
            thumbnail: row.thumbnail,
            first_added: new Date(row.first_added),
            last_played: row.last_played ? new Date(row.last_played) : undefined,
            play_count: row.play_count || 0,
            albums: [], // Would be populated in a full implementation
            top_songs: [], // Would be populated in a full implementation
            genres: row.genres ? row.genres.split(',').filter(Boolean) : [],
            years: row.years ? row.years.split(',').map(Number).filter(Boolean) : []
          }));
          resolve(artists);
        }
      });
    });
  }

  /**
   * Get recommended albums based on listening patterns
   */
  private async getRecommendedAlbums(userId?: string): Promise<AlbumLibraryItem[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH user_preferences AS (
          SELECT 
            s.genre,
            s.year,
            COUNT(*) as preference_score
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE ph.play_count > 2
          GROUP BY s.genre, s.year
          ORDER BY preference_score DESC
          LIMIT 10
        ),
        recommended_albums AS (
          SELECT 
            s.album,
            s.artist,
            s.album_artist,
            s.year,
            s.genre,
            COUNT(*) as track_count,
            SUM(s.duration) as total_duration,
            MIN(s.added_at) as first_added,
            MAX(ph.last_played) as last_played,
            SUM(COALESCE(ph.play_count, 0)) as play_count,
            (SELECT thumbnail FROM songs s2 WHERE s2.album = s.album AND s2.artist = s.artist AND s2.thumbnail IS NOT NULL LIMIT 1) as thumbnail,
            CASE 
              WHEN (s.genre, s.year) IN (SELECT genre, year FROM user_preferences) THEN 3
              WHEN s.genre IN (SELECT genre FROM user_preferences) THEN 2
              ELSE 1
            END as recommendation_score
          FROM songs s
          LEFT JOIN play_history ph ON s.id = ph.song_id
          WHERE s.album IS NOT NULL AND s.album != ''
          AND COALESCE(ph.play_count, 0) < 3  -- Albums not heavily played yet
          GROUP BY s.album, s.artist
          HAVING track_count >= 3  -- Only albums with multiple tracks
          ORDER BY recommendation_score DESC, track_count DESC
          LIMIT 8
        )
        SELECT * FROM recommended_albums
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const albums: AlbumLibraryItem[] = rows.map(row => ({
            id: `album_${row.artist}_${row.album}`,
            name: row.album,
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
            tracks: [] // Would be populated in a full implementation
          }));
          resolve(albums);
        }
      });
    });
  }

  /**
   * Get recommended genres based on listening diversity
   */
  private async getRecommendedGenres(userId?: string): Promise<GenreLibraryItem[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH user_genres AS (
          SELECT s.genre, SUM(ph.play_count) as plays
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE s.genre IS NOT NULL AND ph.play_count > 0
          GROUP BY s.genre
          ORDER BY plays DESC
        ),
        unexplored_genres AS (
          SELECT 
            s.genre,
            COUNT(*) as song_count,
            SUM(s.duration) as total_duration,
            MIN(s.added_at) as first_added,
            MAX(ph.last_played) as last_played,
            SUM(COALESCE(ph.play_count, 0)) as play_count,
            GROUP_CONCAT(DISTINCT s.artist) as artists,
            GROUP_CONCAT(DISTINCT s.album) as albums,
            MIN(s.year) as earliest_year,
            MAX(s.year) as latest_year,
            (SELECT thumbnail FROM songs s2 WHERE s2.genre = s.genre AND s2.thumbnail IS NOT NULL LIMIT 1) as thumbnail
          FROM songs s
          LEFT JOIN play_history ph ON s.id = ph.song_id
          WHERE s.genre IS NOT NULL 
          AND s.genre NOT IN (SELECT genre FROM user_genres WHERE plays > 5)
          GROUP BY s.genre
          HAVING song_count >= 3
          ORDER BY song_count DESC
          LIMIT 6
        )
        SELECT * FROM unexplored_genres
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const genres: GenreLibraryItem[] = rows.map(row => ({
            id: `genre_${row.genre}`,
            name: row.genre,
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
          resolve(genres);
        }
      });
    });
  }

  /**
   * Get songs similar to user's favorites
   */
  private async getSimilarSongs(userId?: string): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH favorite_characteristics AS (
          SELECT 
            s.genre,
            s.artist,
            s.year,
            AVG(s.duration) as avg_duration,
            COUNT(*) as count
          FROM songs s
          JOIN favorites f ON s.id = f.song_id
          GROUP BY s.genre, s.artist, s.year
          HAVING count >= 1
        ),
        similar_songs AS (
          SELECT s.*, 
            CASE 
              WHEN (s.genre, s.artist, s.year) IN (SELECT genre, artist, year FROM favorite_characteristics) THEN 4
              WHEN (s.genre, s.artist) IN (SELECT genre, artist FROM favorite_characteristics) THEN 3
              WHEN s.genre IN (SELECT genre FROM favorite_characteristics) THEN 2
              WHEN s.artist IN (SELECT artist FROM favorite_characteristics) THEN 2
              ELSE 1
            END as similarity_score
          FROM songs s
          LEFT JOIN favorites f ON s.id = f.song_id
          LEFT JOIN play_history ph ON s.id = ph.song_id
          WHERE f.song_id IS NULL  -- Not already favorited
          AND COALESCE(ph.play_count, 0) < 3  -- Not heavily played
          ORDER BY similarity_score DESC, RANDOM()
          LIMIT 15
        )
        SELECT * FROM similar_songs
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const songs = rows.map(row => this.parseSongRow(row));
          resolve(songs);
        }
      });
    });
  }

  /**
   * Get trending songs based on recent play activity
   */
  private async getTrendingSongs(): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH recent_activity AS (
          SELECT 
            rp.song_id,
            COUNT(*) as recent_plays,
            COUNT(DISTINCT DATE(rp.played_at)) as play_days
          FROM recently_played rp
          WHERE rp.played_at >= datetime('now', '-7 days')
          GROUP BY rp.song_id
          HAVING recent_plays >= 2
        ),
        trending_songs AS (
          SELECT 
            s.*,
            ra.recent_plays,
            ra.play_days,
            (ra.recent_plays * ra.play_days) as trending_score
          FROM songs s
          JOIN recent_activity ra ON s.id = ra.song_id
          ORDER BY trending_score DESC, ra.recent_plays DESC
          LIMIT 12
        )
        SELECT * FROM trending_songs
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const songs = rows.map(row => this.parseSongRow(row));
          resolve(songs);
        }
      });
    });
  }

  /**
   * Get songs to rediscover (not played recently but were favorites)
   */
  private async getRediscoverSongs(userId?: string): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*
        FROM songs s
        LEFT JOIN play_history ph ON s.id = ph.song_id
        WHERE (
          ph.play_count > 3  -- Previously enjoyed
          AND (ph.last_played IS NULL OR ph.last_played < datetime('now', '-30 days'))  -- Not played recently
        ) OR (
          s.is_favorite = 1  -- Is favorite
          AND (ph.last_played IS NULL OR ph.last_played < datetime('now', '-14 days'))  -- Not played recently
        )
        ORDER BY 
          CASE WHEN s.is_favorite = 1 THEN 1 ELSE 2 END,  -- Favorites first
          ph.play_count DESC,
          RANDOM()
        LIMIT 10
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const songs = rows.map(row => this.parseSongRow(row));
          resolve(songs);
        }
      });
    });
  }

  /**
   * Get recommendations based on listening history patterns
   */
  private async getHistoryBasedRecommendations(userId?: string): Promise<Array<{ reason: string; songs: Song[] }>> {
    try {
      const recommendations = [];

      // Songs from artists you play a lot
      const artistBasedSongs = await this.getArtistBasedRecommendations();
      if (artistBasedSongs.length > 0) {
        recommendations.push({
          reason: "Because you listen to a lot of these artists",
          songs: artistBasedSongs
        });
      }

      // Songs from your favorite decade
      const decadeBasedSongs = await this.getDecadeBasedRecommendations();
      if (decadeBasedSongs.length > 0) {
        recommendations.push({
          reason: "More from your favorite decade",
          songs: decadeBasedSongs
        });
      }

      // Songs with similar duration to your preferences
      const durationBasedSongs = await this.getDurationBasedRecommendations();
      if (durationBasedSongs.length > 0) {
        recommendations.push({
          reason: "Songs with your preferred length",
          songs: durationBasedSongs
        });
      }

      // Songs from genres you're exploring
      const genreExplorationSongs = await this.getGenreExplorationRecommendations();
      if (genreExplorationSongs.length > 0) {
        recommendations.push({
          reason: "Exploring new genres",
          songs: genreExplorationSongs
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting history-based recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on frequently played artists
   */
  private async getArtistBasedRecommendations(): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH top_artists AS (
          SELECT s.artist, SUM(ph.play_count) as total_plays
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE ph.play_count > 0
          GROUP BY s.artist
          ORDER BY total_plays DESC
          LIMIT 3
        )
        SELECT s.*
        FROM songs s
        LEFT JOIN play_history ph ON s.id = ph.song_id
        WHERE s.artist IN (SELECT artist FROM top_artists)
        AND COALESCE(ph.play_count, 0) < 2  -- Not heavily played yet
        ORDER BY RANDOM()
        LIMIT 6
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.parseSongRow(row)));
        }
      });
    });
  }

  /**
   * Get recommendations based on favorite decade
   */
  private async getDecadeBasedRecommendations(): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH favorite_decade AS (
          SELECT 
            (s.year / 10) * 10 as decade,
            SUM(ph.play_count) as decade_plays
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE s.year IS NOT NULL AND ph.play_count > 0
          GROUP BY decade
          ORDER BY decade_plays DESC
          LIMIT 1
        )
        SELECT s.*
        FROM songs s
        LEFT JOIN play_history ph ON s.id = ph.song_id
        WHERE (s.year / 10) * 10 = (SELECT decade FROM favorite_decade)
        AND COALESCE(ph.play_count, 0) < 2
        ORDER BY RANDOM()
        LIMIT 6
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.parseSongRow(row)));
        }
      });
    });
  }

  /**
   * Get recommendations based on preferred song duration
   */
  private async getDurationBasedRecommendations(): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH duration_preference AS (
          SELECT AVG(s.duration) as avg_duration
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE ph.play_count > 2
        )
        SELECT s.*
        FROM songs s
        LEFT JOIN play_history ph ON s.id = ph.song_id
        WHERE ABS(s.duration - (SELECT avg_duration FROM duration_preference)) < 60  -- Within 1 minute
        AND COALESCE(ph.play_count, 0) < 2
        ORDER BY RANDOM()
        LIMIT 6
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.parseSongRow(row)));
        }
      });
    });
  }

  /**
   * Get recommendations for genre exploration
   */
  private async getGenreExplorationRecommendations(): Promise<Song[]> {
    return new Promise((resolve, reject) => {
      const query = `
        WITH emerging_genres AS (
          SELECT s.genre
          FROM songs s
          JOIN play_history ph ON s.id = ph.song_id
          WHERE s.genre IS NOT NULL AND ph.play_count > 0
          GROUP BY s.genre
          HAVING SUM(ph.play_count) BETWEEN 2 AND 8  -- Genres being explored
          ORDER BY SUM(ph.play_count) ASC
          LIMIT 2
        )
        SELECT s.*
        FROM songs s
        LEFT JOIN play_history ph ON s.id = ph.song_id
        WHERE s.genre IN (SELECT genre FROM emerging_genres)
        AND COALESCE(ph.play_count, 0) = 0  -- Unplayed songs
        ORDER BY RANDOM()
        LIMIT 6
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.parseSongRow(row)));
        }
      });
    });
  }

  /**
   * Parse database row to Song object
   */
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