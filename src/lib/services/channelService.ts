import { Database } from 'sqlite3';
import { 
  Channel, 
  ChannelVideo, 
  ChannelPlaylist, 
  Subscription,
  ChannelStats,
  ChannelFilter,
  ChannelSortOptions,
  ChannelSearchResult,
  SubscriptionFeed,
  ChannelAnalytics,
  ChannelNotification
} from '../../types/channel';

export class ChannelService {
  private static instance: ChannelService;
  private db: Database;

  private constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.initializeChannelTables();
  }

  public static getInstance(databasePath?: string): ChannelService {
    if (!ChannelService.instance) {
      if (!databasePath) {
        throw new Error('Database path is required for first initialization');
      }
      ChannelService.instance = new ChannelService(databasePath);
    }
    return ChannelService.instance;
  }

  /**
   * Initialize channel-related database tables
   */
  private async initializeChannelTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const queries = [
        // Channels table
        `CREATE TABLE IF NOT EXISTS channels (
          id TEXT PRIMARY KEY,
          youtube_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          handle TEXT,
          description TEXT,
          thumbnail TEXT,
          banner TEXT,
          subscriber_count INTEGER,
          video_count INTEGER,
          view_count INTEGER,
          verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
          custom_name TEXT,
          tags TEXT,
          category TEXT,
          country TEXT,
          language TEXT,
          upload_frequency TEXT,
          average_duration INTEGER,
          genres TEXT
        )`,
        
        // Channel videos table
        `CREATE TABLE IF NOT EXISTS channel_videos (
          id TEXT PRIMARY KEY,
          youtube_id TEXT UNIQUE NOT NULL,
          channel_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          thumbnail TEXT,
          duration INTEGER DEFAULT 0,
          view_count INTEGER,
          like_count INTEGER,
          published_at DATETIME,
          discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_downloaded BOOLEAN DEFAULT 0,
          is_favorite BOOLEAN DEFAULT 0,
          play_count INTEGER DEFAULT 0,
          last_played DATETIME,
          quality_available TEXT,
          tags TEXT,
          category TEXT,
          language TEXT,
          FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE
        )`,
        
        // Channel playlists table
        `CREATE TABLE IF NOT EXISTS channel_playlists (
          id TEXT PRIMARY KEY,
          youtube_id TEXT UNIQUE NOT NULL,
          channel_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          thumbnail TEXT,
          video_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_public BOOLEAN DEFAULT 1,
          FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE
        )`,
        
        // Subscriptions table
        `CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          user_id TEXT,
          subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          notification_enabled BOOLEAN DEFAULT 1,
          custom_name TEXT,
          tags TEXT,
          priority TEXT DEFAULT 'normal',
          auto_download BOOLEAN DEFAULT 0,
          download_quality TEXT,
          download_format TEXT,
          last_notification DATETIME,
          unread_count INTEGER DEFAULT 0,
          FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
          UNIQUE(channel_id, user_id)
        )`,
        
        // Channel analytics table
        `CREATE TABLE IF NOT EXISTS channel_analytics (
          channel_id TEXT PRIMARY KEY,
          total_videos_watched INTEGER DEFAULT 0,
          total_watch_time INTEGER DEFAULT 0,
          favorite_videos INTEGER DEFAULT 0,
          downloaded_videos INTEGER DEFAULT 0,
          average_video_rating REAL DEFAULT 0,
          most_watched_video_id TEXT,
          watch_frequency TEXT,
          engagement_score REAL DEFAULT 0,
          discovery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME,
          video_completion_rate REAL DEFAULT 0,
          preferred_video_length INTEGER DEFAULT 0,
          peak_activity_hours TEXT,
          FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE
        )`,
        
        // Channel notifications table
        `CREATE TABLE IF NOT EXISTS channel_notifications (
          id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          thumbnail TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME,
          action_url TEXT,
          metadata TEXT,
          FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE
        )`,
        
        // Indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_channels_youtube_id ON channels(youtube_id)`,
        `CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name)`,
        `CREATE INDEX IF NOT EXISTS idx_channels_updated_at ON channels(updated_at)`,
        `CREATE INDEX IF NOT EXISTS idx_channel_videos_channel_id ON channel_videos(channel_id)`,
        `CREATE INDEX IF NOT EXISTS idx_channel_videos_youtube_id ON channel_videos(youtube_id)`,
        `CREATE INDEX IF NOT EXISTS idx_channel_videos_published_at ON channel_videos(published_at)`,
        `CREATE INDEX IF NOT EXISTS idx_channel_playlists_channel_id ON channel_playlists(channel_id)`,
        `CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_id ON subscriptions(channel_id)`,
        `CREATE INDEX IF NOT EXISTS idx_subscriptions_subscribed_at ON subscriptions(subscribed_at)`,
        `CREATE INDEX IF NOT EXISTS idx_channel_notifications_channel_id ON channel_notifications(channel_id)`,
        `CREATE INDEX IF NOT EXISTS idx_channel_notifications_created_at ON channel_notifications(created_at)`
      ];

      let completed = 0;
      const total = queries.length;

      queries.forEach(query => {
        this.db.run(query, (err) => {
          if (err) {
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
   * Get channel by ID or YouTube ID
   */
  async getChannel(id: string, byYouTubeId: boolean = false): Promise<Channel | null> {
    return new Promise((resolve, reject) => {
      const field = byYouTubeId ? 'youtube_id' : 'id';
      const query = `
        SELECT c.*, 
               CASE WHEN s.channel_id IS NOT NULL THEN 1 ELSE 0 END as is_subscribed,
               s.subscribed_at as subscription_date,
               s.notification_enabled
        FROM channels c
        LEFT JOIN subscriptions s ON c.id = s.channel_id
        WHERE c.${field} = ?
      `;

      this.db.get(query, [id], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.parseChannelRow(row));
        }
      });
    });
  }

  /**
   * Get all channels with optional filtering
   */
  async getChannels(
    filter?: ChannelFilter,
    sort?: ChannelSortOptions,
    limit?: number,
    offset?: number
  ): Promise<Channel[]> {
    return new Promise((resolve, reject) => {
      const { whereClause, params } = this.buildWhereClause(filter);
      const orderClause = this.buildOrderClause(sort || { field: 'name', order: 'asc' });
      
      const query = `
        SELECT c.*, 
               CASE WHEN s.channel_id IS NOT NULL THEN 1 ELSE 0 END as is_subscribed,
               s.subscribed_at as subscription_date,
               s.notification_enabled
        FROM channels c
        LEFT JOIN subscriptions s ON c.id = s.channel_id
        ${whereClause}
        ${orderClause}
        ${limit ? `LIMIT ${limit}` : ''}
        ${offset ? `OFFSET ${offset}` : ''}
      `;

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const channels = rows.map(row => this.parseChannelRow(row));
          resolve(channels);
        }
      });
    });
  }

  /**
   * Create or update channel
   */
  async upsertChannel(channelData: Partial<Channel>): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!channelData.youtube_id) {
        reject(new Error('YouTube ID is required'));
        return;
      }

      // Check if channel exists
      this.db.get(
        `SELECT id FROM channels WHERE youtube_id = ?`,
        [channelData.youtube_id],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // Update existing channel
            this.updateChannel(row.id, channelData).then(resolve).catch(reject);
          } else {
            // Create new channel
            this.createChannel(channelData).then(resolve).catch(reject);
          }
        }
      );
    });
  }

  /**
   * Create new channel
   */
  private async createChannel(channelData: Partial<Channel>): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      this.db.run(
        `INSERT INTO channels (
          id, youtube_id, name, handle, description, thumbnail, banner,
          subscriber_count, video_count, view_count, verified, created_at, updated_at,
          custom_name, tags, category, country, language, upload_frequency,
          average_duration, genres
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          channelData.youtube_id,
          channelData.name || 'Unknown Channel',
          channelData.handle,
          channelData.description,
          channelData.thumbnail,
          channelData.banner,
          channelData.subscriber_count,
          channelData.video_count,
          channelData.view_count,
          channelData.verified ? 1 : 0,
          now,
          now,
          channelData.custom_name,
          channelData.tags ? JSON.stringify(channelData.tags) : null,
          channelData.category,
          channelData.country,
          channelData.language,
          channelData.upload_frequency,
          channelData.average_duration,
          channelData.genres ? JSON.stringify(channelData.genres) : null
        ],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(id);
          }
        }
      );
    });
  }

  /**
   * Update existing channel
   */
  private async updateChannel(id: string, channelData: Partial<Channel>): Promise<string> {
    return new Promise((resolve, reject) => {
      const updateFields: string[] = [];
      const params: any[] = [];

      // Build update query dynamically
      Object.entries(channelData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'created_at') {
          if (key === 'tags' || key === 'genres') {
            updateFields.push(`${key} = ?`);
            params.push(Array.isArray(value) ? JSON.stringify(value) : value);
          } else if (key === 'verified') {
            updateFields.push(`${key} = ?`);
            params.push(value ? 1 : 0);
          } else {
            updateFields.push(`${key} = ?`);
            params.push(value);
          }
        }
      });

      if (updateFields.length === 0) {
        resolve(id);
        return;
      }

      updateFields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const query = `UPDATE channels SET ${updateFields.join(', ')} WHERE id = ?`;

      this.db.run(query, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(id);
        }
      });
    });
  }

  /**
   * Subscribe to channel
   */
  async subscribeToChannel(
    channelId: string,
    userId?: string,
    options: {
      notificationEnabled?: boolean;
      customName?: string;
      tags?: string[];
      priority?: 'high' | 'normal' | 'low';
      autoDownload?: boolean;
      downloadQuality?: string;
      downloadFormat?: string;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.db.run(
        `INSERT OR REPLACE INTO subscriptions (
          id, channel_id, user_id, notification_enabled, custom_name, tags,
          priority, auto_download, download_quality, download_format
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subscriptionId,
          channelId,
          userId,
          options.notificationEnabled !== false ? 1 : 0,
          options.customName,
          options.tags ? JSON.stringify(options.tags) : null,
          options.priority || 'normal',
          options.autoDownload ? 1 : 0,
          options.downloadQuality,
          options.downloadFormat
        ],
        (err) => {
          if (err) {
            reject(err);
          } else {
            // Create notification
            this.createNotification(
              channelId,
              'channel_update',
              'New Subscription',
              `You are now subscribed to this channel`
            );
            resolve(subscriptionId);
          }
        }
      );
    });
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribeFromChannel(channelId: string, userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const whereClause = userId 
        ? 'channel_id = ? AND user_id = ?'
        : 'channel_id = ? AND user_id IS NULL';
      const params = userId ? [channelId, userId] : [channelId];

      this.db.run(
        `DELETE FROM subscriptions WHERE ${whereClause}`,
        params,
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
   * Get channel videos
   */
  async getChannelVideos(
    channelId: string,
    limit?: number,
    offset?: number,
    sortBy: 'published_at' | 'discovered_at' | 'title' | 'view_count' = 'published_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ChannelVideo[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM channel_videos
        WHERE channel_id = ?
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        ${limit ? `LIMIT ${limit}` : ''}
        ${offset ? `OFFSET ${offset}` : ''}
      `;

      this.db.all(query, [channelId], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const videos = rows.map(row => this.parseChannelVideoRow(row));
          resolve(videos);
        }
      });
    });
  }

  /**
   * Get channel playlists
   */
  async getChannelPlaylists(channelId: string): Promise<ChannelPlaylist[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM channel_playlists
        WHERE channel_id = ?
        ORDER BY updated_at DESC
      `;

      this.db.all(query, [channelId], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const playlists = rows.map(row => this.parseChannelPlaylistRow(row));
          resolve(playlists);
        }
      });
    });
  }

  /**
   * Get subscription feed
   */
  async getSubscriptionFeed(
    userId?: string,
    limit: number = 50,
    onlyUnread: boolean = false
  ): Promise<SubscriptionFeed> {
    return new Promise((resolve, reject) => {
      const userClause = userId ? 'AND s.user_id = ?' : 'AND s.user_id IS NULL';
      const unreadClause = onlyUnread ? 'AND s.unread_count > 0' : '';
      const params = userId ? [userId] : [];

      const query = `
        SELECT 
          c.*,
          s.subscribed_at,
          s.notification_enabled,
          s.unread_count,
          COUNT(cv.id) as new_video_count
        FROM channels c
        JOIN subscriptions s ON c.id = s.channel_id
        LEFT JOIN channel_videos cv ON c.id = cv.channel_id 
          AND cv.discovered_at > datetime('now', '-7 days')
        WHERE 1=1 ${userClause} ${unreadClause}
        GROUP BY c.id
        ORDER BY s.subscribed_at DESC
        LIMIT ${limit}
      `;

      this.db.all(query, params, async (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const updates = [];
          let totalNewVideos = 0;
          let unreadChannels = 0;

          for (const row of rows) {
            const channel = this.parseChannelRow(row);
            const newVideos = await this.getChannelVideos(
              channel.id, 
              10, 
              0, 
              'discovered_at', 
              'desc'
            );

            // Filter videos from last 7 days
            const recentVideos = newVideos.filter(video => 
              video.discovered_at.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
            );

            if (recentVideos.length > 0) {
              updates.push({
                channel,
                new_videos: recentVideos,
                update_time: new Date()
              });
              totalNewVideos += recentVideos.length;
            }

            if (row.unread_count > 0) {
              unreadChannels++;
            }
          }

          resolve({
            updates,
            total_new_videos: totalNewVideos,
            last_updated: new Date(),
            unread_channels
          });
        }
      });
    });
  }

  /**
   * Search channels
   */
  async searchChannels(
    query: string,
    filter?: ChannelFilter,
    limit: number = 20
  ): Promise<ChannelSearchResult> {
    const startTime = Date.now();

    try {
      const [channels, videos, playlists] = await Promise.all([
        this.searchChannelsByName(query, filter, limit),
        this.searchChannelVideos(query, filter, limit),
        this.searchChannelPlaylists(query, filter, Math.floor(limit / 2))
      ]);

      const totalResults = channels.length + videos.length + playlists.length;
      const searchTime = Date.now() - startTime;

      return {
        channels,
        videos,
        playlists,
        total_results: totalResults,
        search_time: searchTime,
        suggestions: [] // TODO: Implement search suggestions
      };
    } catch (error) {
      throw new Error(`Channel search failed: ${error}`);
    }
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(): Promise<ChannelStats> {
    return new Promise((resolve, reject) => {
      const queries = [
        `SELECT COUNT(*) as total_channels FROM channels`,
        `SELECT COUNT(*) as subscribed_channels FROM subscriptions`,
        `SELECT COUNT(*) as total_videos FROM channel_videos`,
        `SELECT COUNT(*) as downloaded_videos FROM channel_videos WHERE is_downloaded = 1`,
        `SELECT SUM(cv.duration * cv.play_count) as total_watch_time FROM channel_videos cv`,
        `SELECT AVG(video_count) as avg_videos_per_channel FROM channels WHERE video_count > 0`
      ];

      Promise.all(queries.map(query => 
        new Promise<any>((resolve, reject) => {
          this.db.get(query, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        })
      )).then(async results => {
        const [mostActiveChannel, recentlySubscribed, topGenres, uploadFreqDist] = await Promise.all([
          this.getMostActiveChannel(),
          this.getRecentlySubscribedChannels(5),
          this.getTopGenres(10),
          this.getUploadFrequencyDistribution()
        ]);

        resolve({
          total_channels: results[0].total_channels || 0,
          subscribed_channels: results[1].subscribed_channels || 0,
          total_videos: results[2].total_videos || 0,
          downloaded_videos: results[3].downloaded_videos || 0,
          total_watch_time: results[4].total_watch_time || 0,
          average_videos_per_channel: results[5].avg_videos_per_channel || 0,
          most_active_channel: mostActiveChannel,
          recently_subscribed: recentlySubscribed,
          top_genres: topGenres,
          upload_frequency_distribution: uploadFreqDist
        });
      }).catch(reject);
    });
  }

  /**
   * Create notification
   */
  private async createNotification(
    channelId: string,
    type: string,
    title: string,
    message: string,
    thumbnail?: string,
    actionUrl?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.db.run(
      `INSERT INTO channel_notifications (
        id, channel_id, type, title, message, thumbnail, action_url, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId,
        channelId,
        type,
        title,
        message,
        thumbnail,
        actionUrl,
        metadata ? JSON.stringify(metadata) : null
      ],
      (err) => {
        if (err) {
          console.error('Failed to create notification:', err);
        }
      }
    );
  }

  /**
   * Helper methods
   */
  private buildWhereClause(filter?: ChannelFilter): { whereClause: string; params: any[] } {
    if (!filter) {
      return { whereClause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.search) {
      conditions.push(`(c.name LIKE ? OR c.description LIKE ? OR c.handle LIKE ?)`);
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filter.is_subscribed !== undefined) {
      if (filter.is_subscribed) {
        conditions.push(`s.channel_id IS NOT NULL`);
      } else {
        conditions.push(`s.channel_id IS NULL`);
      }
    }

    if (filter.verified !== undefined) {
      conditions.push(`c.verified = ?`);
      params.push(filter.verified ? 1 : 0);
    }

    if (filter.category) {
      conditions.push(`c.category = ?`);
      params.push(filter.category);
    }

    if (filter.country) {
      conditions.push(`c.country = ?`);
      params.push(filter.country);
    }

    if (filter.language) {
      conditions.push(`c.language = ?`);
      params.push(filter.language);
    }

    // Add more filter conditions as needed...

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  private buildOrderClause(sort: ChannelSortOptions): string {
    const fieldMap: Record<string, string> = {
      'name': 'c.name',
      'subscriber_count': 'c.subscriber_count',
      'video_count': 'c.video_count',
      'view_count': 'c.view_count',
      'created_at': 'c.created_at',
      'updated_at': 'c.updated_at',
      'subscription_date': 's.subscribed_at',
      'last_upload': 'c.updated_at'
    };

    const field = fieldMap[sort.field] || 'c.name';
    return `ORDER BY ${field} ${sort.order.toUpperCase()}`;
  }

  private parseChannelRow(row: any): Channel {
    return {
      id: row.id,
      youtube_id: row.youtube_id,
      name: row.name,
      handle: row.handle,
      description: row.description,
      thumbnail: row.thumbnail,
      banner: row.banner,
      subscriber_count: row.subscriber_count,
      video_count: row.video_count,
      view_count: row.view_count,
      verified: Boolean(row.verified),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_checked: new Date(row.last_checked),
      is_subscribed: Boolean(row.is_subscribed),
      subscription_date: row.subscription_date ? new Date(row.subscription_date) : undefined,
      notification_enabled: Boolean(row.notification_enabled),
      custom_name: row.custom_name,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      category: row.category,
      country: row.country,
      language: row.language,
      upload_frequency: row.upload_frequency as any,
      average_duration: row.average_duration,
      genres: row.genres ? JSON.parse(row.genres) : undefined
    };
  }

  private parseChannelVideoRow(row: any): ChannelVideo {
    return {
      id: row.id,
      youtube_id: row.youtube_id,
      channel_id: row.channel_id,
      title: row.title,
      description: row.description,
      thumbnail: row.thumbnail,
      duration: row.duration,
      view_count: row.view_count,
      like_count: row.like_count,
      published_at: new Date(row.published_at),
      discovered_at: new Date(row.discovered_at),
      is_downloaded: Boolean(row.is_downloaded),
      is_favorite: Boolean(row.is_favorite),
      play_count: row.play_count,
      last_played: row.last_played ? new Date(row.last_played) : undefined,
      quality_available: row.quality_available ? JSON.parse(row.quality_available) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      category: row.category,
      language: row.language
    };
  }

  private parseChannelPlaylistRow(row: any): ChannelPlaylist {
    return {
      id: row.id,
      youtube_id: row.youtube_id,
      channel_id: row.channel_id,
      title: row.title,
      description: row.description,
      thumbnail: row.thumbnail,
      video_count: row.video_count,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_public: Boolean(row.is_public)
    };
  }

  // Additional helper methods would be implemented here...
  private async searchChannelsByName(query: string, filter?: ChannelFilter, limit?: number): Promise<Channel[]> {
    // Implementation for searching channels by name
    return [];
  }

  private async searchChannelVideos(query: string, filter?: ChannelFilter, limit?: number): Promise<ChannelVideo[]> {
    // Implementation for searching channel videos
    return [];
  }

  private async searchChannelPlaylists(query: string, filter?: ChannelFilter, limit?: number): Promise<ChannelPlaylist[]> {
    // Implementation for searching channel playlists
    return [];
  }

  private async getMostActiveChannel(): Promise<Channel | null> {
    // Implementation for getting most active channel
    return null;
  }

  private async getRecentlySubscribedChannels(limit: number): Promise<Channel[]> {
    // Implementation for getting recently subscribed channels
    return [];
  }

  private async getTopGenres(limit: number): Promise<Array<{ genre: string; count: number }>> {
    // Implementation for getting top genres
    return [];
  }

  private async getUploadFrequencyDistribution(): Promise<Array<{ frequency: string; count: number }>> {
    // Implementation for getting upload frequency distribution
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