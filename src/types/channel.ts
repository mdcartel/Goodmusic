import { Song } from './index';

export interface Channel {
  id: string;
  youtube_id: string;
  name: string;
  handle?: string;
  description?: string;
  thumbnail?: string;
  banner?: string;
  subscriber_count?: number;
  video_count?: number;
  view_count?: number;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_checked: Date;
  is_subscribed: boolean;
  subscription_date?: Date;
  notification_enabled: boolean;
  custom_name?: string;
  tags?: string[];
  category?: string;
  country?: string;
  language?: string;
  upload_frequency?: 'daily' | 'weekly' | 'monthly' | 'irregular';
  average_duration?: number;
  genres?: string[];
}

export interface ChannelVideo {
  id: string;
  youtube_id: string;
  channel_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration: number;
  view_count?: number;
  like_count?: number;
  published_at: Date;
  discovered_at: Date;
  is_downloaded: boolean;
  is_favorite: boolean;
  play_count: number;
  last_played?: Date;
  quality_available?: string[];
  tags?: string[];
  category?: string;
  language?: string;
}

export interface ChannelPlaylist {
  id: string;
  youtube_id: string;
  channel_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  video_count: number;
  created_at: Date;
  updated_at: Date;
  is_public: boolean;
  videos?: ChannelVideo[];
}

export interface Subscription {
  id: string;
  channel_id: string;
  user_id?: string;
  subscribed_at: Date;
  notification_enabled: boolean;
  custom_name?: string;
  tags?: string[];
  priority: 'high' | 'normal' | 'low';
  auto_download: boolean;
  download_quality?: string;
  download_format?: string;
  last_notification?: Date;
  unread_count: number;
}

export interface ChannelStats {
  total_channels: number;
  subscribed_channels: number;
  total_videos: number;
  downloaded_videos: number;
  total_watch_time: number;
  average_videos_per_channel: number;
  most_active_channel: Channel | null;
  recently_subscribed: Channel[];
  top_genres: Array<{
    genre: string;
    count: number;
  }>;
  upload_frequency_distribution: Array<{
    frequency: string;
    count: number;
  }>;
}

export interface ChannelFilter {
  search?: string;
  is_subscribed?: boolean;
  verified?: boolean;
  category?: string;
  country?: string;
  language?: string;
  upload_frequency?: string;
  subscriber_count_min?: number;
  subscriber_count_max?: number;
  video_count_min?: number;
  video_count_max?: number;
  subscribed_after?: Date;
  subscribed_before?: Date;
  has_new_videos?: boolean;
  tags?: string[];
  genres?: string[];
}

export interface ChannelSortOptions {
  field: 'name' | 'subscriber_count' | 'video_count' | 'view_count' | 'created_at' | 'updated_at' | 'subscription_date' | 'last_upload';
  order: 'asc' | 'desc';
}

export interface ChannelSearchResult {
  channels: Channel[];
  videos: ChannelVideo[];
  playlists: ChannelPlaylist[];
  total_results: number;
  search_time: number;
  suggestions: string[];
}

export interface ChannelUpdate {
  channel_id: string;
  new_videos: ChannelVideo[];
  new_playlists: ChannelPlaylist[];
  updated_info: Partial<Channel>;
  check_time: Date;
}

export interface SubscriptionFeed {
  updates: Array<{
    channel: Channel;
    new_videos: ChannelVideo[];
    update_time: Date;
  }>;
  total_new_videos: number;
  last_updated: Date;
  unread_channels: number;
}

export interface ChannelRecommendation {
  channel: Channel;
  reason: string;
  confidence: number;
  based_on: 'similar_channels' | 'video_history' | 'genre_preference' | 'trending';
  related_channels?: Channel[];
}

export interface ChannelAnalytics {
  channel_id: string;
  total_videos_watched: number;
  total_watch_time: number;
  favorite_videos: number;
  downloaded_videos: number;
  average_video_rating: number;
  most_watched_video: ChannelVideo | null;
  watch_frequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  engagement_score: number;
  discovery_date: Date;
  last_activity: Date;
  video_completion_rate: number;
  preferred_video_length: number;
  peak_activity_hours: number[];
}

export interface ChannelNotification {
  id: string;
  channel_id: string;
  type: 'new_video' | 'new_playlist' | 'channel_update' | 'milestone';
  title: string;
  message: string;
  thumbnail?: string;
  created_at: Date;
  read_at?: Date;
  action_url?: string;
  metadata?: Record<string, any>;
}

export interface ChannelImportResult {
  imported_channels: number;
  updated_channels: number;
  skipped_channels: number;
  new_subscriptions: number;
  imported_videos: number;
  errors: string[];
  warnings: string[];
  processing_time: number;
}

export interface ChannelExportOptions {
  include_videos: boolean;
  include_playlists: boolean;
  include_subscription_data: boolean;
  include_analytics: boolean;
  format: 'json' | 'opml' | 'csv';
  date_range?: {
    from: Date;
    to: Date;
  };
}

export interface ChannelBackup {
  version: string;
  created_at: Date;
  channels: Channel[];
  subscriptions: Subscription[];
  videos: ChannelVideo[];
  playlists: ChannelPlaylist[];
  analytics: ChannelAnalytics[];
  notifications: ChannelNotification[];
}