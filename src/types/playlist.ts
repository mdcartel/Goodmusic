export interface Playlist {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  created_at: Date;
  updated_at: Date;
  song_count: number;
  total_duration: number;
  is_smart: boolean;
  smart_criteria?: SmartPlaylistCriteria;
  is_public: boolean;
  is_collaborative: boolean;
  created_by?: string;
  tags?: string[];
  color?: string;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: Date;
  added_by?: string;
}

export interface SmartPlaylistCriteria {
  rules: SmartPlaylistRule[];
  match_type: 'all' | 'any'; // AND or OR logic
  limit?: number;
  sort_by?: 'title' | 'artist' | 'album' | 'date_added' | 'play_count' | 'rating' | 'duration';
  sort_order?: 'asc' | 'desc';
  auto_update: boolean;
}

export interface SmartPlaylistRule {
  id: string;
  field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'duration' | 'play_count' | 'rating' | 'date_added' | 'is_favorite';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in_last' | 'not_in_last';
  value: string | number | Date;
  value2?: string | number | Date; // For 'between' operator
}

export interface PlaylistExportFormat {
  format: 'm3u' | 'm3u8' | 'json' | 'csv' | 'txt';
  include_metadata: boolean;
  include_file_paths: boolean;
  relative_paths: boolean;
}

export interface PlaylistImportResult {
  success: boolean;
  playlist_id?: string;
  imported_songs: number;
  skipped_songs: number;
  errors: string[];
  warnings: string[];
}

export interface PlaylistShareSettings {
  is_public: boolean;
  is_collaborative: boolean;
  allow_comments: boolean;
  allow_downloads: boolean;
  share_url?: string;
  access_code?: string;
  expires_at?: Date;
}

export interface PlaylistStats {
  total_playlists: number;
  total_songs: number;
  total_duration: number;
  most_played_playlist: string;
  recently_created: Playlist[];
  recently_updated: Playlist[];
}

export interface PlaylistFilter {
  search?: string;
  is_smart?: boolean;
  is_public?: boolean;
  is_collaborative?: boolean;
  created_by?: string;
  tags?: string[];
  min_songs?: number;
  max_songs?: number;
  created_after?: Date;
  created_before?: Date;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'song_count' | 'total_duration';
  sort_order?: 'asc' | 'desc';
}

export interface PlaylistOperation {
  type: 'add_song' | 'remove_song' | 'reorder_song' | 'update_metadata' | 'duplicate' | 'merge' | 'split';
  playlist_id: string;
  song_id?: string;
  position?: number;
  new_position?: number;
  metadata?: Partial<Playlist>;
  target_playlist_id?: string;
}

export interface PlaylistCollaboration {
  id: string;
  playlist_id: string;
  user_id: string;
  permission: 'view' | 'edit' | 'admin';
  invited_at: Date;
  accepted_at?: Date;
  invited_by: string;
}

export interface PlaylistActivity {
  id: string;
  playlist_id: string;
  user_id?: string;
  action: 'created' | 'updated' | 'song_added' | 'song_removed' | 'song_reordered' | 'shared' | 'exported' | 'imported';
  details: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}