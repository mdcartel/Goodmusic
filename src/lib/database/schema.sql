-- GoodMusic NewPipe Edition Database Schema
-- SQLite database for local storage following NewPipe patterns

-- Songs table - stores all song metadata
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  youtube_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
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
  last_played DATETIME
);

-- Playlists table - user-created playlists
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Playlist songs junction table - many-to-many relationship
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id TEXT,
  song_id TEXT,
  position INTEGER,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

-- Downloads table - enhanced download manager with multiple format support
CREATE TABLE IF NOT EXISTS downloads (
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
);

-- Audio extractions table - tracks audio extraction attempts and success rates
CREATE TABLE IF NOT EXISTS audio_extractions (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  quality TEXT,
  format TEXT,
  bitrate INTEGER,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Metadata table - stores extracted track metadata
CREATE TABLE IF NOT EXISTS metadata (
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
  tags TEXT, -- JSON array of tags
  thumbnail TEXT, -- Original thumbnail URL
  thumbnail_path TEXT, -- Local thumbnail file path
  extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Thumbnails table - stores downloaded thumbnail information
CREATE TABLE IF NOT EXISTS thumbnails (
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
);

-- Channels table - YouTube channels for subscriptions
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  youtube_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  subscriber_count INTEGER,
  video_count INTEGER,
  is_subscribed BOOLEAN DEFAULT FALSE,
  subscribed_at DATETIME
);

-- Search history table - for search suggestions and history
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table - app configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_youtube_id ON songs(youtube_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_is_downloaded ON songs(is_downloaded);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(position);
CREATE INDEX IF NOT EXISTS idx_downloads_video_id ON downloads(video_id);
CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_priority ON downloads(priority);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);
CREATE INDEX IF NOT EXISTS idx_downloads_completed_at ON downloads(completed_at);
CREATE INDEX IF NOT EXISTS idx_audio_extractions_video_id ON audio_extractions(video_id);
CREATE INDEX IF NOT EXISTS idx_audio_extractions_success ON audio_extractions(success);
CREATE INDEX IF NOT EXISTS idx_audio_extractions_created_at ON audio_extractions(created_at);
CREATE INDEX IF NOT EXISTS idx_metadata_video_id ON metadata(video_id);
CREATE INDEX IF NOT EXISTS idx_metadata_artist ON metadata(artist);
CREATE INDEX IF NOT EXISTS idx_metadata_title ON metadata(title);
CREATE INDEX IF NOT EXISTS idx_metadata_album ON metadata(album);
CREATE INDEX IF NOT EXISTS idx_metadata_genre ON metadata(genre);
CREATE INDEX IF NOT EXISTS idx_metadata_year ON metadata(year);
CREATE INDEX IF NOT EXISTS idx_metadata_extracted_at ON metadata(extracted_at);
CREATE INDEX IF NOT EXISTS idx_thumbnails_video_id ON thumbnails(video_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_quality ON thumbnails(quality);
CREATE INDEX IF NOT EXISTS idx_channels_is_subscribed ON channels(is_subscribed);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('theme', 'dark'),
  ('download_quality', '192'),
  ('download_format', 'm4a'),
  ('download_path', './downloads'),
  ('include_metadata', 'true'),
  ('include_thumbnail', 'true'),
  ('max_concurrent_downloads', '3'),
  ('playback_volume', '0.8'),
  ('repeat_mode', 'none'),
  ('shuffle_enabled', 'false'),
  ('audio_extraction_quality', 'best'),
  ('audio_extraction_format', 'm4a'),
  ('audio_extraction_timeout', '30000'),
  ('download_maxConcurrentDownloads', '3'),
  ('download_maxDownloadSpeed', '0'),
  ('download_defaultFormat', 'm4a'),
  ('download_defaultQuality', '192'),
  ('download_outputDirectory', './downloads'),
  ('download_createArtistFolders', 'true'),
  ('download_createAlbumFolders', 'false'),
  ('download_fileNameTemplate', '{artist} - {title}'),
  ('download_resumeIncompleteDownloads', 'true'),
  ('download_retryFailedDownloads', 'true'),
  ('download_maxRetries', '3'),
  ('download_retryDelay', '5000'),
  ('download_cleanupFailedDownloads', 'false');