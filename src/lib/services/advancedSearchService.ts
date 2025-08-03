import { Database } from 'sqlite3';
import { Song } from '../../types';
import { fuzzySearch, FuzzySearchResult } from '../utils/fuzzySearch';

export interface SearchFilters {
  duration?: {
    min?: number; // in seconds
    max?: number; // in seconds
  };
  quality?: string[]; // ['high', 'medium', 'low']
  format?: string[]; // ['mp3', 'm4a', 'opus']
  dateAdded?: {
    from?: Date;
    to?: Date;
  };
  artist?: string;
  album?: string;
  genre?: string;
  year?: {
    from?: number;
    to?: number;
  };
  isDownloaded?: boolean;
  isFavorite?: boolean;
  playCount?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
    max?: number;
  };
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'title' | 'artist' | 'album' | 'dateAdded' | 'playCount' | 'rating' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  fuzzySearch?: boolean;
}

export interface SearchResult {
  songs: Song[];
  totalCount: number;
  searchTime: number;
  suggestions?: string[];
}

export interface SearchHistory {
  id: string;
  query: string;
  filters?: SearchFilters;
  timestamp: Date;
  resultCount: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: SearchFilters;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'artist' | 'album' | 'genre';
  frequency: number;
  lastUsed: Date;
}

export class AdvancedSearchService {
  private db: Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.initializeSearchTables();
  }

  /**
   * Initialize search-related database tables
   */
  private async initializeSearchTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const queries = [
        // Search history table
        `CREATE TABLE IF NOT EXISTS search_history (
          id TEXT PRIMARY KEY,
          query TEXT NOT NULL,
          filters TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          result_count INTEGER DEFAULT 0
        )`,
        // Saved searches table
        `CREATE TABLE IF NOT EXISTS saved_searches (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          query TEXT NOT NULL,
          filters TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_used DATETIME,
          use_count INTEGER DEFAULT 0
        )`,
        // Search suggestions table
        `CREATE TABLE IF NOT EXISTS search_suggestions (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL,
          frequency INTEGER DEFAULT 1,
          last_used DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp)`,
        `CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)`,
        `CREATE INDEX IF NOT EXISTS idx_saved_searches_name ON saved_searches(name)`,
        `CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON search_suggestions(text)`,
        `CREATE INDEX IF NOT EXISTS idx_search_suggestions_frequency ON search_suggestions(frequency DESC)`
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
   * Perform advanced search with filters and options
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      // Build the search query
      const { query, conditions, params } = this.buildSearchQuery(options);
      
      // Execute search
      let songs = await this.executeSearch(query, params);
      
      // Apply fuzzy search if enabled
      if (options.fuzzySearch && options.query.trim()) {
        const fuzzyResults = fuzzySearch(songs, options.query, {
          keys: ['title', 'artist', 'album', 'album_artist', 'genre'],
          threshold: 0.3,
          caseSensitive: false
        });
        
        songs = fuzzyResults.map(result => result.item);
      }
      
      // Get total count
      const totalCount = await this.getSearchCount(conditions, params);
      
      // Record search in history
      await this.recordSearchHistory(options, totalCount);
      
      // Update search suggestions
      await this.updateSearchSuggestions(options.query);
      
      const searchTime = Date.now() - startTime;
      
      // Generate suggestions for similar searches
      const suggestions = await this.generateSearchSuggestions(options.query);
      
      return {
        songs,
        totalCount,
        searchTime,
        suggestions
      };
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Build SQL query based on search options
   */
  private buildSearchQuery(options: SearchOptions): {
    query: string;
    conditions: string;
    params: any[];
  } {
    const { query, filters, sortBy = 'relevance', sortOrder = 'desc', limit = 50, offset = 0 } = options;
    
    let conditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Text search conditions
    if (query.trim()) {
      if (options.fuzzySearch) {
        // For fuzzy search, we'll get more results and filter them later
        conditions.push(`(
          title LIKE ? OR 
          artist LIKE ? OR 
          album LIKE ? OR 
          album_artist LIKE ? OR
          genre LIKE ?
        )`);
        const fuzzyQuery = `%${query.trim()}%`;
        for (let i = 0; i < 5; i++) {
          params.push(fuzzyQuery);
        }
      } else {
        // Exact match search
        conditions.push(`(
          title LIKE ? OR 
          artist LIKE ? OR 
          album LIKE ? OR 
          album_artist LIKE ?
        )`);
        const searchTerm = `%${query.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
    }

    // Apply filters
    if (filters) {
      // Duration filter
      if (filters.duration) {
        if (filters.duration.min !== undefined) {
          conditions.push(`duration >= ?`);
          params.push(filters.duration.min);
        }
        if (filters.duration.max !== undefined) {
          conditions.push(`duration <= ?`);
          params.push(filters.duration.max);
        }
      }

      // Quality filter
      if (filters.quality && filters.quality.length > 0) {
        const qualityPlaceholders = filters.quality.map(() => '?').join(',');
        conditions.push(`quality IN (${qualityPlaceholders})`);
        params.push(...filters.quality);
      }

      // Format filter
      if (filters.format && filters.format.length > 0) {
        const formatPlaceholders = filters.format.map(() => '?').join(',');
        conditions.push(`format IN (${formatPlaceholders})`);
        params.push(...filters.format);
      }

      // Date added filter
      if (filters.dateAdded) {
        if (filters.dateAdded.from) {
          conditions.push(`added_at >= ?`);
          params.push(filters.dateAdded.from.toISOString());
        }
        if (filters.dateAdded.to) {
          conditions.push(`added_at <= ?`);
          params.push(filters.dateAdded.to.toISOString());
        }
      }

      // Artist filter
      if (filters.artist) {
        conditions.push(`artist LIKE ?`);
        params.push(`%${filters.artist}%`);
      }

      // Album filter
      if (filters.album) {
        conditions.push(`album LIKE ?`);
        params.push(`%${filters.album}%`);
      }

      // Genre filter
      if (filters.genre) {
        conditions.push(`genre LIKE ?`);
        params.push(`%${filters.genre}%`);
      }

      // Year filter
      if (filters.year) {
        if (filters.year.from !== undefined) {
          conditions.push(`year >= ?`);
          params.push(filters.year.from);
        }
        if (filters.year.to !== undefined) {
          conditions.push(`year <= ?`);
          params.push(filters.year.to);
        }
      }

      // Downloaded filter
      if (filters.isDownloaded !== undefined) {
        conditions.push(`is_downloaded = ?`);
        params.push(filters.isDownloaded ? 1 : 0);
      }

      // Favorite filter
      if (filters.isFavorite !== undefined) {
        conditions.push(`is_favorite = ?`);
        params.push(filters.isFavorite ? 1 : 0);
      }

      // Play count filter
      if (filters.playCount) {
        if (filters.playCount.min !== undefined) {
          conditions.push(`play_count >= ?`);
          params.push(filters.playCount.min);
        }
        if (filters.playCount.max !== undefined) {
          conditions.push(`play_count <= ?`);
          params.push(filters.playCount.max);
        }
      }

      // Rating filter
      if (filters.rating) {
        if (filters.rating.min !== undefined) {
          conditions.push(`rating >= ?`);
          params.push(filters.rating.min);
        }
        if (filters.rating.max !== undefined) {
          conditions.push(`rating <= ?`);
          params.push(filters.rating.max);
        }
      }
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderBy = '';
    switch (sortBy) {
      case 'title':
        orderBy = `ORDER BY title ${sortOrder.toUpperCase()}`;
        break;
      case 'artist':
        orderBy = `ORDER BY artist ${sortOrder.toUpperCase()}, album ${sortOrder.toUpperCase()}`;
        break;
      case 'album':
        orderBy = `ORDER BY album ${sortOrder.toUpperCase()}, track_number ASC`;
        break;
      case 'dateAdded':
        orderBy = `ORDER BY added_at ${sortOrder.toUpperCase()}`;
        break;
      case 'playCount':
        orderBy = `ORDER BY play_count ${sortOrder.toUpperCase()}`;
        break;
      case 'rating':
        orderBy = `ORDER BY rating ${sortOrder.toUpperCase()}`;
        break;
      case 'duration':
        orderBy = `ORDER BY duration ${sortOrder.toUpperCase()}`;
        break;
      case 'relevance':
      default:
        // For relevance, we'll order by a combination of factors
        orderBy = `ORDER BY 
          (CASE WHEN title LIKE ? THEN 3 ELSE 0 END) +
          (CASE WHEN artist LIKE ? THEN 2 ELSE 0 END) +
          (CASE WHEN album LIKE ? THEN 1 ELSE 0 END) +
          play_count * 0.1 +
          (CASE WHEN is_favorite = 1 THEN 0.5 ELSE 0 END)
          DESC, added_at DESC`;
        // Add relevance parameters
        const relevanceQuery = query.trim() ? `%${query.trim()}%` : '%';
        params.push(relevanceQuery, relevanceQuery, relevanceQuery);
        break;
    }

    // Add LIMIT and OFFSET
    params.push(limit, offset);

    const fullQuery = `
      SELECT * FROM songs 
      ${whereClause} 
      ${orderBy} 
      LIMIT ? OFFSET ?
    `;

    return {
      query: fullQuery,
      conditions: whereClause,
      params
    };
  }

  /**
   * Execute the search query
   */
  private async executeSearch(query: string, params: any[]): Promise<Song[]> {
    return new Promise((resolve, reject) => {
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
   * Get total count of search results
   */
  private async getSearchCount(conditions: string, params: any[]): Promise<number> {
    return new Promise((resolve, reject) => {
      // Remove the last 2 parameters (limit and offset) and relevance parameters if present
      const countParams = params.slice(0, -2);
      if (conditions.includes('play_count * 0.1')) {
        // Remove the 3 relevance parameters
        countParams.splice(-3, 3);
      }

      const countQuery = `SELECT COUNT(*) as count FROM songs ${conditions}`;
      
      this.db.get(countQuery, countParams, (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  /**
   * Record search in history
   */
  private async recordSearchHistory(options: SearchOptions, resultCount: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const filtersJson = options.filters ? JSON.stringify(options.filters) : null;
      
      this.db.run(
        `INSERT INTO search_history (id, query, filters, result_count) VALUES (?, ?, ?, ?)`,
        [id, options.query, filtersJson, resultCount],
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
   * Update search suggestions based on query
   */
  private async updateSearchSuggestions(query: string): Promise<void> {
    if (!query.trim()) return;

    const terms = query.trim().toLowerCase().split(' ').filter(term => term.length > 2);
    
    for (const term of terms) {
      await this.upsertSuggestion(term, 'query');
    }
  }

  /**
   * Upsert a search suggestion
   */
  private async upsertSuggestion(text: string, type: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // First try to update existing suggestion
      this.db.run(
        `UPDATE search_suggestions SET frequency = frequency + 1, last_used = CURRENT_TIMESTAMP WHERE text = ? AND type = ?`,
        [text, type],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // If no rows were updated, insert new suggestion
          if (this.changes === 0) {
            const id = `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.db.run(
              `INSERT INTO search_suggestions (id, text, type) VALUES (?, ?, ?)`,
              [id, text, type],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Generate search suggestions based on query
   */
  async generateSearchSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];

    return new Promise((resolve, reject) => {
      const searchTerm = `%${query.trim().toLowerCase()}%`;
      
      this.db.all(
        `SELECT text FROM search_suggestions 
         WHERE text LIKE ? 
         ORDER BY frequency DESC, last_used DESC 
         LIMIT 10`,
        [searchTerm],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => row.text));
          }
        }
      );
    });
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit: number = 20): Promise<SearchHistory[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM search_history ORDER BY timestamp DESC LIMIT ?`,
        [limit],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const history = rows.map(row => ({
              id: row.id,
              query: row.query,
              filters: row.filters ? JSON.parse(row.filters) : undefined,
              timestamp: new Date(row.timestamp),
              resultCount: row.result_count
            }));
            resolve(history);
          }
        }
      );
    });
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM search_history`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Save a search for later use
   */
  async saveSearch(name: string, query: string, filters?: SearchFilters): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const filtersJson = filters ? JSON.stringify(filters) : null;
      
      this.db.run(
        `INSERT INTO saved_searches (id, name, query, filters) VALUES (?, ?, ?, ?)`,
        [id, name, query, filtersJson],
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
   * Get saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM saved_searches ORDER BY last_used DESC, created_at DESC`,
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const searches = rows.map(row => ({
              id: row.id,
              name: row.name,
              query: row.query,
              filters: row.filters ? JSON.parse(row.filters) : undefined,
              createdAt: new Date(row.created_at),
              lastUsed: row.last_used ? new Date(row.last_used) : undefined,
              useCount: row.use_count
            }));
            resolve(searches);
          }
        }
      );
    });
  }

  /**
   * Use a saved search (updates usage statistics)
   */
  async useSavedSearch(id: string): Promise<SavedSearch | null> {
    return new Promise((resolve, reject) => {
      // Update usage statistics
      this.db.run(
        `UPDATE saved_searches SET last_used = CURRENT_TIMESTAMP, use_count = use_count + 1 WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Get the updated search
          this.db.get(
            `SELECT * FROM saved_searches WHERE id = ?`,
            [id],
            (err, row: any) => {
              if (err) {
                reject(err);
              } else if (!row) {
                resolve(null);
              } else {
                resolve({
                  id: row.id,
                  name: row.name,
                  query: row.query,
                  filters: row.filters ? JSON.parse(row.filters) : undefined,
                  createdAt: new Date(row.created_at),
                  lastUsed: row.last_used ? new Date(row.last_used) : undefined,
                  useCount: row.use_count
                });
              }
            }
          );
        }
      );
    });
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM saved_searches WHERE id = ?`, [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 10): Promise<SearchSuggestion[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM search_suggestions ORDER BY frequency DESC LIMIT ?`,
        [limit],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const suggestions = rows.map(row => ({
              text: row.text,
              type: row.type,
              frequency: row.frequency,
              lastUsed: new Date(row.last_used)
            }));
            resolve(suggestions);
          }
        }
      );
    });
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