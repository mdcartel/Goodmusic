import { Database } from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';

// Migration interface
export interface Migration {
  version: number;
  name: string;
  up: string[];
  down: string[];
}

// Database version info
export interface DatabaseVersion {
  version: number;
  appliedAt: Date;
  name: string;
}

// Migration result
export interface MigrationResult {
  success: boolean;
  appliedMigrations: number[];
  errors: Array<{ version: number; error: string }>;
}

// Database migrations
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: [
      // Songs table - core music library
      `CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        youtube_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        album_artist TEXT,
        genre TEXT,
        year INTEGER,
        track_number INTEGER,
        total_tracks INTEGER,
        duration INTEGER NOT NULL,
        thumbnail TEXT,
        youtube_url TEXT NOT NULL,
        audio_url TEXT,
        is_downloaded BOOLEAN DEFAULT FALSE,
        file_path TEXT,
        file_size INTEGER,
        quality TEXT,
        format TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        play_count INTEGER DEFAULT 0,
        last_played DATETIME,
        rating INTEGER CHECK (rating >= 0 AND rating <= 5),
        is_favorite BOOLEAN DEFAULT FALSE
      )`,

      // Playlists table - user-created playlists
      `CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        thumbnail TEXT,
        is_smart BOOLEAN DEFAULT FALSE,
        smart_criteria TEXT, -- JSON string for smart playlist rules
        song_count INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        is_public BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Playlist songs junction table
      `CREATE TABLE IF NOT EXISTS playlist_songs (
        playlist_id TEXT,
        song_id TEXT,
        position INTEGER,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        added_by TEXT,
        PRIMARY KEY (playlist_id, song_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      )`,

      // Albums table - album information
      `CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album_artist TEXT,
        year INTEGER,
        genre TEXT,
        total_tracks INTEGER,
        thumbnail TEXT,
        description TEXT,
        release_date DATE,
        record_label TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Artists table - artist information
      `CREATE TABLE IF NOT EXISTS artists (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        thumbnail TEXT,
        genre TEXT,
        country TEXT,
        formed_year INTEGER,
        website TEXT,
        song_count INTEGER DEFAULT 0,
        album_count INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Channels table - YouTube channels
      `CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        youtube_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        thumbnail TEXT,
        banner TEXT,
        subscriber_count INTEGER,
        video_count INTEGER,
        view_count INTEGER,
        country TEXT,
        language TEXT,
        is_subscribed BOOLEAN DEFAULT FALSE,
        subscribed_at DATETIME,
        last_checked DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Downloads table - enhanced download tracking
      `CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER NOT NULL,
        thumbnail TEXT,
        format TEXT NOT NULL,
        quality TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'downloading', 'paused', 'completed', 'failed', 'cancelled')),
        priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
        progress REAL NOT NULL DEFAULT 0,
        downloaded_bytes INTEGER NOT NULL DEFAULT 0,
        total_bytes INTEGER NOT NULL DEFAULT 0,
        file_path TEXT,
        file_name TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3
      )`,

      // Metadata table - extracted metadata
      `CREATE TABLE IF NOT EXISTS metadata (
        id TEXT PRIMARY KEY,
        video_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        album_artist TEXT,
        genre TEXT,
        year INTEGER,
        track_number INTEGER,
        total_tracks INTEGER,
        duration INTEGER NOT NULL,
        description TEXT,
        language TEXT,
        uploader TEXT,
        upload_date DATETIME,
        view_count INTEGER,
        like_count INTEGER,
        tags TEXT, -- JSON array
        thumbnail TEXT,
        thumbnail_path TEXT,
        extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Thumbnails table - thumbnail cache
      `CREATE TABLE IF NOT EXISTS thumbnails (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        url TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        quality TEXT NOT NULL CHECK (quality IN ('low', 'medium', 'high', 'maxres')),
        format TEXT NOT NULL CHECK (format IN ('jpg', 'webp', 'png')),
        file_path TEXT,
        file_size INTEGER,
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, quality)
      )`,

      // Audio extractions table - extraction tracking
      `CREATE TABLE IF NOT EXISTS audio_extractions (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        quality TEXT,
        format TEXT,
        bitrate INTEGER,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Search history table
      `CREATE TABLE IF NOT EXISTS search_history (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        result_count INTEGER DEFAULT 0,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Settings table - application settings
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // User activity log
      `CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details TEXT, -- JSON string
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Database version tracking
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ],
    down: [
      'DROP TABLE IF EXISTS activity_log',
      'DROP TABLE IF EXISTS search_history',
      'DROP TABLE IF EXISTS audio_extractions',
      'DROP TABLE IF EXISTS thumbnails',
      'DROP TABLE IF EXISTS metadata',
      'DROP TABLE IF EXISTS downloads',
      'DROP TABLE IF EXISTS channels',
      'DROP TABLE IF EXISTS artists',
      'DROP TABLE IF EXISTS albums',
      'DROP TABLE IF EXISTS playlist_songs',
      'DROP TABLE IF EXISTS playlists',
      'DROP TABLE IF EXISTS songs',
      'DROP TABLE IF EXISTS settings',
      'DROP TABLE IF EXISTS schema_migrations'
    ]
  },

  {
    version: 2,
    name: 'add_indexes',
    up: [
      // Songs indexes
      'CREATE INDEX IF NOT EXISTS idx_songs_youtube_id ON songs(youtube_id)',
      'CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist)',
      'CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title)',
      'CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album)',
      'CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre)',
      'CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year)',
      'CREATE INDEX IF NOT EXISTS idx_songs_is_downloaded ON songs(is_downloaded)',
      'CREATE INDEX IF NOT EXISTS idx_songs_is_favorite ON songs(is_favorite)',
      'CREATE INDEX IF NOT EXISTS idx_songs_added_at ON songs(added_at)',
      'CREATE INDEX IF NOT EXISTS idx_songs_play_count ON songs(play_count)',
      'CREATE INDEX IF NOT EXISTS idx_songs_last_played ON songs(last_played)',
      'CREATE INDEX IF NOT EXISTS idx_songs_rating ON songs(rating)',

      // Playlists indexes
      'CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name)',
      'CREATE INDEX IF NOT EXISTS idx_playlists_is_smart ON playlists(is_smart)',
      'CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_playlists_updated_at ON playlists(updated_at)',

      // Playlist songs indexes
      'CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id)',
      'CREATE INDEX IF NOT EXISTS idx_playlist_songs_song_id ON playlist_songs(song_id)',
      'CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(position)',
      'CREATE INDEX IF NOT EXISTS idx_playlist_songs_added_at ON playlist_songs(added_at)',

      // Albums indexes
      'CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title)',
      'CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist)',
      'CREATE INDEX IF NOT EXISTS idx_albums_year ON albums(year)',
      'CREATE INDEX IF NOT EXISTS idx_albums_genre ON albums(genre)',

      // Artists indexes
      'CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name)',
      'CREATE INDEX IF NOT EXISTS idx_artists_genre ON artists(genre)',
      'CREATE INDEX IF NOT EXISTS idx_artists_country ON artists(country)',

      // Channels indexes
      'CREATE INDEX IF NOT EXISTS idx_channels_youtube_id ON channels(youtube_id)',
      'CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name)',
      'CREATE INDEX IF NOT EXISTS idx_channels_is_subscribed ON channels(is_subscribed)',
      'CREATE INDEX IF NOT EXISTS idx_channels_subscribed_at ON channels(subscribed_at)',

      // Downloads indexes
      'CREATE INDEX IF NOT EXISTS idx_downloads_video_id ON downloads(video_id)',
      'CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)',
      'CREATE INDEX IF NOT EXISTS idx_downloads_priority ON downloads(priority)',
      'CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_downloads_completed_at ON downloads(completed_at)',

      // Metadata indexes
      'CREATE INDEX IF NOT EXISTS idx_metadata_video_id ON metadata(video_id)',
      'CREATE INDEX IF NOT EXISTS idx_metadata_artist ON metadata(artist)',
      'CREATE INDEX IF NOT EXISTS idx_metadata_title ON metadata(title)',
      'CREATE INDEX IF NOT EXISTS idx_metadata_album ON metadata(album)',
      'CREATE INDEX IF NOT EXISTS idx_metadata_genre ON metadata(genre)',
      'CREATE INDEX IF NOT EXISTS idx_metadata_year ON metadata(year)',
      'CREATE INDEX IF NOT EXISTS idx_metadata_extracted_at ON metadata(extracted_at)',

      // Thumbnails indexes
      'CREATE INDEX IF NOT EXISTS idx_thumbnails_video_id ON thumbnails(video_id)',
      'CREATE INDEX IF NOT EXISTS idx_thumbnails_quality ON thumbnails(quality)',

      // Audio extractions indexes
      'CREATE INDEX IF NOT EXISTS idx_audio_extractions_video_id ON audio_extractions(video_id)',
      'CREATE INDEX IF NOT EXISTS idx_audio_extractions_success ON audio_extractions(success)',
      'CREATE INDEX IF NOT EXISTS idx_audio_extractions_created_at ON audio_extractions(created_at)',

      // Search history indexes
      'CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)',
      'CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at)',

      // Activity log indexes
      'CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action)',
      'CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type)',
      'CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp)',

      // Settings indexes
      'CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)'
    ],
    down: [
      // Drop all indexes (SQLite will handle this automatically when tables are dropped)
      'DROP INDEX IF EXISTS idx_songs_youtube_id',
      'DROP INDEX IF EXISTS idx_songs_artist',
      'DROP INDEX IF EXISTS idx_songs_title',
      // ... (other indexes would be listed here)
    ]
  },

  {
    version: 3,
    name: 'add_triggers',
    up: [
      // Update playlist song count when songs are added/removed
      `CREATE TRIGGER IF NOT EXISTS update_playlist_song_count_insert
       AFTER INSERT ON playlist_songs
       BEGIN
         UPDATE playlists 
         SET song_count = (
           SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = NEW.playlist_id
         ),
         total_duration = (
           SELECT COALESCE(SUM(s.duration), 0) 
           FROM playlist_songs ps 
           JOIN songs s ON ps.song_id = s.id 
           WHERE ps.playlist_id = NEW.playlist_id
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = NEW.playlist_id;
       END`,

      `CREATE TRIGGER IF NOT EXISTS update_playlist_song_count_delete
       AFTER DELETE ON playlist_songs
       BEGIN
         UPDATE playlists 
         SET song_count = (
           SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = OLD.playlist_id
         ),
         total_duration = (
           SELECT COALESCE(SUM(s.duration), 0) 
           FROM playlist_songs ps 
           JOIN songs s ON ps.song_id = s.id 
           WHERE ps.playlist_id = OLD.playlist_id
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = OLD.playlist_id;
       END`,

      // Update artist song count when songs are added/removed
      `CREATE TRIGGER IF NOT EXISTS update_artist_song_count_insert
       AFTER INSERT ON songs
       BEGIN
         INSERT OR IGNORE INTO artists (id, name, song_count, created_at)
         VALUES (
           lower(replace(NEW.artist, ' ', '_')),
           NEW.artist,
           0,
           CURRENT_TIMESTAMP
         );
         
         UPDATE artists 
         SET song_count = song_count + 1,
             total_duration = total_duration + NEW.duration
         WHERE name = NEW.artist;
       END`,

      `CREATE TRIGGER IF NOT EXISTS update_artist_song_count_delete
       AFTER DELETE ON songs
       BEGIN
         UPDATE artists 
         SET song_count = song_count - 1,
             total_duration = total_duration - OLD.duration
         WHERE name = OLD.artist;
       END`,

      // Update settings timestamp
      `CREATE TRIGGER IF NOT EXISTS update_settings_timestamp
       AFTER UPDATE ON settings
       BEGIN
         UPDATE settings 
         SET updated_at = CURRENT_TIMESTAMP 
         WHERE key = NEW.key;
       END`,

      // Log activity for important actions
      `CREATE TRIGGER IF NOT EXISTS log_song_added
       AFTER INSERT ON songs
       BEGIN
         INSERT INTO activity_log (id, action, entity_type, entity_id, details)
         VALUES (
           hex(randomblob(16)),
           'song_added',
           'song',
           NEW.id,
           json_object('title', NEW.title, 'artist', NEW.artist)
         );
       END`,

      `CREATE TRIGGER IF NOT EXISTS log_playlist_created
       AFTER INSERT ON playlists
       BEGIN
         INSERT INTO activity_log (id, action, entity_type, entity_id, details)
         VALUES (
           hex(randomblob(16)),
           'playlist_created',
           'playlist',
           NEW.id,
           json_object('name', NEW.name)
         );
       END`
    ],
    down: [
      'DROP TRIGGER IF EXISTS update_playlist_song_count_insert',
      'DROP TRIGGER IF EXISTS update_playlist_song_count_delete',
      'DROP TRIGGER IF EXISTS update_artist_song_count_insert',
      'DROP TRIGGER IF EXISTS update_artist_song_count_delete',
      'DROP TRIGGER IF EXISTS update_settings_timestamp',
      'DROP TRIGGER IF EXISTS log_song_added',
      'DROP TRIGGER IF EXISTS log_playlist_created'
    ]
  },

  {
    version: 4,
    name: 'add_full_text_search',
    up: [
      // Create FTS virtual table for songs
      `CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
        title, artist, album, genre, content='songs', content_rowid='rowid'
      )`,

      // Populate FTS table
      `INSERT INTO songs_fts(rowid, title, artist, album, genre)
       SELECT rowid, title, artist, album, genre FROM songs`,

      // Triggers to keep FTS table in sync
      `CREATE TRIGGER IF NOT EXISTS songs_fts_insert
       AFTER INSERT ON songs
       BEGIN
         INSERT INTO songs_fts(rowid, title, artist, album, genre)
         VALUES (NEW.rowid, NEW.title, NEW.artist, NEW.album, NEW.genre);
       END`,

      `CREATE TRIGGER IF NOT EXISTS songs_fts_delete
       AFTER DELETE ON songs
       BEGIN
         INSERT INTO songs_fts(songs_fts, rowid, title, artist, album, genre)
         VALUES ('delete', OLD.rowid, OLD.title, OLD.artist, OLD.album, OLD.genre);
       END`,

      `CREATE TRIGGER IF NOT EXISTS songs_fts_update
       AFTER UPDATE ON songs
       BEGIN
         INSERT INTO songs_fts(songs_fts, rowid, title, artist, album, genre)
         VALUES ('delete', OLD.rowid, OLD.title, OLD.artist, OLD.album, OLD.genre);
         INSERT INTO songs_fts(rowid, title, artist, album, genre)
         VALUES (NEW.rowid, NEW.title, NEW.artist, NEW.album, NEW.genre);
       END`
    ],
    down: [
      'DROP TRIGGER IF EXISTS songs_fts_update',
      'DROP TRIGGER IF EXISTS songs_fts_delete',
      'DROP TRIGGER IF EXISTS songs_fts_insert',
      'DROP TABLE IF EXISTS songs_fts'
    ]
  }
];

// Migration manager class
export class MigrationManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Get current database version
  async getCurrentVersion(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT MAX(version) as version FROM schema_migrations',
        (err, row: any) => {
          if (err) {
            // If table doesn't exist, we're at version 0
            if (err.message.includes('no such table')) {
              resolve(0);
            } else {
              reject(err);
            }
          } else {
            resolve(row?.version || 0);
          }
        }
      );
    });
  }

  // Get applied migrations
  async getAppliedMigrations(): Promise<DatabaseVersion[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT version, name, applied_at FROM schema_migrations ORDER BY version',
        (err, rows: any[]) => {
          if (err) {
            if (err.message.includes('no such table')) {
              resolve([]);
            } else {
              reject(err);
            }
          } else {
            resolve(rows.map(row => ({
              version: row.version,
              name: row.name,
              appliedAt: new Date(row.applied_at)
            })));
          }
        }
      );
    });
  }

  // Run a single migration
  private async runMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
    const statements = direction === 'up' ? migration.up : migration.down;
    
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        let completed = 0;
        let hasError = false;

        const executeNext = () => {
          if (completed >= statements.length) {
            if (hasError) {
              this.db.run('ROLLBACK', (err) => {
                reject(new Error(`Migration ${migration.version} failed`));
              });
            } else {
              // Record migration
              if (direction === 'up') {
                this.db.run(
                  'INSERT OR REPLACE INTO schema_migrations (version, name) VALUES (?, ?)',
                  [migration.version, migration.name],
                  (err) => {
                    if (err) {
                      this.db.run('ROLLBACK');
                      reject(err);
                    } else {
                      this.db.run('COMMIT', (err) => {
                        if (err) reject(err);
                        else resolve();
                      });
                    }
                  }
                );
              } else {
                this.db.run(
                  'DELETE FROM schema_migrations WHERE version = ?',
                  [migration.version],
                  (err) => {
                    if (err) {
                      this.db.run('ROLLBACK');
                      reject(err);
                    } else {
                      this.db.run('COMMIT', (err) => {
                        if (err) reject(err);
                        else resolve();
                      });
                    }
                  }
                );
              }
            }
            return;
          }

          const statement = statements[completed];
          this.db.run(statement, (err) => {
            if (err) {
              console.error(`Error in migration ${migration.version}, statement ${completed}:`, err);
              hasError = true;
            }
            completed++;
            executeNext();
          });
        };

        executeNext();
      });
    });
  }

  // Run migrations up to a specific version
  async migrate(targetVersion?: number): Promise<MigrationResult> {
    const currentVersion = await this.getCurrentVersion();
    const maxVersion = targetVersion || Math.max(...migrations.map(m => m.version));
    
    const result: MigrationResult = {
      success: true,
      appliedMigrations: [],
      errors: []
    };

    console.log(`Current database version: ${currentVersion}`);
    console.log(`Target version: ${maxVersion}`);

    // Find migrations to apply
    const migrationsToApply = migrations
      .filter(m => m.version > currentVersion && m.version <= maxVersion)
      .sort((a, b) => a.version - b.version);

    if (migrationsToApply.length === 0) {
      console.log('Database is up to date');
      return result;
    }

    console.log(`Applying ${migrationsToApply.length} migrations...`);

    for (const migration of migrationsToApply) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        await this.runMigration(migration, 'up');
        result.appliedMigrations.push(migration.version);
        console.log(`✓ Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`✗ Migration ${migration.version} failed:`, error);
        result.success = false;
        result.errors.push({
          version: migration.version,
          error: error instanceof Error ? error.message : String(error)
        });
        break; // Stop on first error
      }
    }

    return result;
  }

  // Rollback to a specific version
  async rollback(targetVersion: number): Promise<MigrationResult> {
    const currentVersion = await this.getCurrentVersion();
    
    const result: MigrationResult = {
      success: true,
      appliedMigrations: [],
      errors: []
    };

    if (targetVersion >= currentVersion) {
      console.log('Target version is not lower than current version');
      return result;
    }

    // Find migrations to rollback
    const migrationsToRollback = migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Reverse order for rollback

    console.log(`Rolling back ${migrationsToRollback.length} migrations...`);

    for (const migration of migrationsToRollback) {
      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        await this.runMigration(migration, 'down');
        result.appliedMigrations.push(migration.version);
        console.log(`✓ Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        console.error(`✗ Migration ${migration.version} rollback failed:`, error);
        result.success = false;
        result.errors.push({
          version: migration.version,
          error: error instanceof Error ? error.message : String(error)
        });
        break; // Stop on first error
      }
    }

    return result;
  }

  // Reset database (rollback all migrations)
  async reset(): Promise<MigrationResult> {
    return this.rollback(0);
  }

  // Get migration status
  async getStatus(): Promise<{
    currentVersion: number;
    latestVersion: number;
    appliedMigrations: DatabaseVersion[];
    pendingMigrations: Migration[];
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = Math.max(...migrations.map(m => m.version));
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    return {
      currentVersion,
      latestVersion,
      appliedMigrations,
      pendingMigrations
    };
  }
}