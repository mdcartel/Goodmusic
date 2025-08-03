import { Song } from './index';

export interface LibraryView {
  type: 'artist' | 'album' | 'genre' | 'year' | 'recently_added' | 'recently_played' | 'favorites';
  title: string;
  count: number;
  items: LibraryItem[];
}

export interface LibraryItem {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'genre' | 'year';
  song_count: number;
  total_duration: number;
  thumbnail?: string;
  first_added: Date;
  last_played?: Date;
  play_count: number;
  songs?: Song[];
  metadata?: Record<string, any>;
}

export interface ArtistLibraryItem extends LibraryItem {
  type: 'artist';
  albums: AlbumLibraryItem[];
  top_songs: Song[];
  genres: string[];
  years: number[];
}

export interface AlbumLibraryItem extends LibraryItem {
  type: 'album';
  artist: string;
  album_artist?: string;
  year?: number;
  genre?: string;
  track_count: number;
  tracks: Song[];
}

export interface GenreLibraryItem extends LibraryItem {
  type: 'genre';
  artists: string[];
  top_albums: string[];
  year_range: {
    earliest: number;
    latest: number;
  };
}

export interface YearLibraryItem extends LibraryItem {
  type: 'year';
  year: number;
  artists: string[];
  albums: string[];
  genres: string[];
}

export interface LibraryFilter {
  search?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  year_range?: {
    from: number;
    to: number;
  };
  duration_range?: {
    min: number;
    max: number;
  };
  play_count_range?: {
    min: number;
    max: number;
  };
  rating_range?: {
    min: number;
    max: number;
  };
  is_favorite?: boolean;
  is_downloaded?: boolean;
  added_after?: Date;
  added_before?: Date;
  played_after?: Date;
  played_before?: Date;
  has_lyrics?: boolean;
  quality?: string[];
  format?: string[];
}

export interface LibrarySortOptions {
  field: 'name' | 'artist' | 'album' | 'genre' | 'year' | 'duration' | 'play_count' | 'rating' | 'date_added' | 'last_played';
  order: 'asc' | 'desc';
  secondary_field?: 'name' | 'artist' | 'album' | 'genre' | 'year' | 'duration' | 'play_count' | 'rating' | 'date_added' | 'last_played';
  secondary_order?: 'asc' | 'desc';
}

export interface LibraryStats {
  total_songs: number;
  total_artists: number;
  total_albums: number;
  total_genres: number;
  total_duration: number;
  total_size: number;
  average_rating: number;
  most_played_song: Song | null;
  most_played_artist: string | null;
  most_played_album: string | null;
  most_played_genre: string | null;
  recently_added: Song[];
  recently_played: Song[];
  top_rated: Song[];
  favorites_count: number;
  downloaded_count: number;
  year_distribution: Array<{
    year: number;
    count: number;
  }>;
  genre_distribution: Array<{
    genre: string;
    count: number;
  }>;
  quality_distribution: Array<{
    quality: string;
    count: number;
  }>;
}

export interface RecentlyPlayedEntry {
  id: string;
  song_id: string;
  played_at: Date;
  play_duration: number;
  completed: boolean;
  source: 'manual' | 'playlist' | 'shuffle' | 'radio';
  context?: string; // playlist_id, radio_station, etc.
}

export interface FavoriteEntry {
  id: string;
  song_id: string;
  favorited_at: Date;
  user_id?: string;
}

export interface PlayHistory {
  song_id: string;
  play_count: number;
  total_play_time: number;
  first_played: Date;
  last_played: Date;
  average_completion: number;
  skip_count: number;
  favorite_count: number;
}

export interface LibraryDiscovery {
  recommended_artists: ArtistLibraryItem[];
  recommended_albums: AlbumLibraryItem[];
  recommended_genres: GenreLibraryItem[];
  similar_songs: Song[];
  trending_songs: Song[];
  rediscover_songs: Song[]; // Songs not played in a while
  based_on_history: {
    reason: string;
    songs: Song[];
  }[];
}

export interface LibraryViewOptions {
  view_type: 'grid' | 'list' | 'compact';
  group_by?: 'none' | 'artist' | 'album' | 'genre' | 'year' | 'first_letter';
  show_thumbnails: boolean;
  show_metadata: boolean;
  items_per_page: number;
  auto_play_on_select: boolean;
}

export interface LibrarySearchResult {
  songs: Song[];
  artists: ArtistLibraryItem[];
  albums: AlbumLibraryItem[];
  genres: GenreLibraryItem[];
  total_results: number;
  search_time: number;
  suggestions: string[];
}

export interface LibraryImportResult {
  imported_songs: number;
  updated_songs: number;
  skipped_songs: number;
  new_artists: number;
  new_albums: number;
  new_genres: number;
  errors: string[];
  warnings: string[];
  processing_time: number;
}

export interface LibraryExportOptions {
  include_metadata: boolean;
  include_playlists: boolean;
  include_play_history: boolean;
  include_favorites: boolean;
  format: 'json' | 'csv' | 'xml';
  file_references: 'absolute' | 'relative' | 'none';
}

export interface LibraryBackup {
  version: string;
  created_at: Date;
  songs: Song[];
  playlists: any[];
  play_history: PlayHistory[];
  favorites: FavoriteEntry[];
  recently_played: RecentlyPlayedEntry[];
  library_stats: LibraryStats;
  settings: Record<string, any>;
}