import { Database } from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { MigrationManager, MigrationResult } from './migrations';

// Database configuration
export interface DatabaseConfig {
  path: string;
  backupPath?: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  busyTimeout?: number;
  cacheSize?: number;
  journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
  synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
}

// Backup options
export interface BackupOptions {
  path?: string;
  compress?: boolean;
  includeMetadata?: boolean;
  excludeTables?: string[];
}

// Restore options
export interface RestoreOptions {
  overwrite?: boolean;
  validateSchema?: boolean;
  skipMigrations?: boolean;
}

// Database statistics
export interface DatabaseStats {
  size: number;
  pageCount: number;
  pageSize: number;
  freePages: number;
  tableCount: number;
  indexCount: number;
  tables: Array<{
    name: string;
    rowCount: number;
    size: number;
  }>;
}

// Query result with metadata
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  executionTime: number;
  changes?: number;
  lastID?: number;
}

// Transaction options
export interface TransactionOptions {
  mode?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
  timeout?: number;
}

export class EnhancedDatabase {
  private db: Database | null = null;
  private migrationManager: MigrationManager | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      enableWAL: true,
      enableForeignKeys: true,
      busyTimeout: 30000,
      cacheSize: -2000, // 2MB
      journalMode: 'WAL',
      synchronous: 'NORMAL',
      ...config
    };
  }

  // Initialize database
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.config.path);
      await fs.mkdir(dbDir, { recursive: true });

      // Create database connection
      this.db = new Database(this.config.path);
      
      // Configure database
      await this.configure();
      
      // Initialize migration manager
      this.migrationManager = new MigrationManager(this.db);
      
      // Run migrations
      const migrationResult = await this.migrationManager.migrate();
      if (!migrationResult.success) {
        throw new Error(`Migration failed: ${migrationResult.errors.map(e => e.error).join(', ')}`);
      }

      // Insert default settings
      await this.insertDefaultSettings();

      this.isInitialized = true;
      console.log('Database initialized successfully');

    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  // Configure database settings
  private async configure(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const settings = [
      `PRAGMA journal_mode = ${this.config.journalMode}`,
      `PRAGMA synchronous = ${this.config.synchronous}`,
      `PRAGMA cache_size = ${this.config.cacheSize}`,
      `PRAGMA busy_timeout = ${this.config.busyTimeout}`,
      `PRAGMA foreign_keys = ${this.config.enableForeignKeys ? 'ON' : 'OFF'}`,
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 268435456', // 256MB
    ];

    for (const setting of settings) {
      await this.run(setting);
    }
  }

  // Insert default settings
  private async insertDefaultSettings(): Promise<void> {
    const defaultSettings = [
      { key: 'app_version', value: '1.0.0', category: 'system' },
      { key: 'theme', value: 'dark', category: 'appearance' },
      { key: 'download_quality', value: '192', category: 'downloads' },
      { key: 'download_format', value: 'm4a', category: 'downloads' },
      { key: 'download_path', value: './downloads', category: 'downloads' },
      { key: 'max_concurrent_downloads', value: '3', category: 'downloads' },
      { key: 'playback_volume', value: '0.8', category: 'playback' },
      { key: 'repeat_mode', value: 'none', category: 'playback' },
      { key: 'shuffle_enabled', value: 'false', category: 'playback' },
      { key: 'crossfade_enabled', value: 'false', category: 'playback' },
      { key: 'gapless_enabled', value: 'true', category: 'playback' },
      { key: 'auto_extract_metadata', value: 'true', category: 'metadata' },
      { key: 'download_thumbnails', value: 'true', category: 'metadata' },
      { key: 'thumbnail_quality', value: 'high', category: 'metadata' },
    ];

    for (const setting of defaultSettings) {
      await this.run(
        'INSERT OR IGNORE INTO settings (key, value, category) VALUES (?, ?, ?)',
        [setting.key, setting.value, setting.category]
      );
    }
  }

  // Execute a query that returns rows
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  // Execute a query that returns a single row
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  // Execute a query that modifies data
  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastID: number }> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  // Execute a query with timing and metadata
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const rows = await this.all<T>(sql, params);
        return {
          rows,
          rowCount: rows.length,
          executionTime: Date.now() - startTime
        };
      } else {
        const result = await this.run(sql, params);
        return {
          rows: [],
          rowCount: 0,
          executionTime: Date.now() - startTime,
          changes: result.changes,
          lastID: result.lastID
        };
      }
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Execute multiple queries in a transaction
  async transaction<T>(
    queries: Array<{ sql: string; params?: any[] }>,
    options: TransactionOptions = {}
  ): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    const { mode = 'DEFERRED', timeout = 30000 } = options;
    const results: T[] = [];

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Transaction timeout'));
      }, timeout);

      this.db!.serialize(() => {
        this.db!.run(`BEGIN ${mode} TRANSACTION`, (err) => {
          if (err) {
            clearTimeout(timeoutId);
            reject(err);
            return;
          }

          let completed = 0;
          let hasError = false;

          const executeNext = () => {
            if (completed >= queries.length) {
              if (hasError) {
                this.db!.run('ROLLBACK', () => {
                  clearTimeout(timeoutId);
                  reject(new Error('Transaction rolled back due to error'));
                });
              } else {
                this.db!.run('COMMIT', (err) => {
                  clearTimeout(timeoutId);
                  if (err) reject(err);
                  else resolve(results);
                });
              }
              return;
            }

            const query = queries[completed];
            this.db!.run(query.sql, query.params || [], function(err) {
              if (err) {
                console.error(`Transaction query ${completed} failed:`, err);
                hasError = true;
              } else {
                results.push({ changes: this.changes, lastID: this.lastID } as T);
              }
              completed++;
              executeNext();
            });
          };

          executeNext();
        });
      });
    });
  }

  // Create database backup
  async backup(options: BackupOptions = {}): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const backupPath = options.path || 
      path.join(this.config.backupPath || path.dirname(this.config.path), 
                `backup_${Date.now()}.db`);

    try {
      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Create backup using SQLite backup API
      await this.createBackup(backupPath, options);

      // Add metadata if requested
      if (options.includeMetadata) {
        await this.addBackupMetadata(backupPath);
      }

      // Compress if requested
      if (options.compress) {
        // Compression would be implemented here
        console.log('Compression not yet implemented');
      }

      console.log(`Database backup created: ${backupPath}`);
      return backupPath;

    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  // Create backup using SQLite backup API
  private async createBackup(backupPath: string, options: BackupOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const backupDb = new Database(backupPath);
      
      // Simple backup by copying all data
      this.db!.serialize(() => {
        this.db!.each("SELECT name FROM sqlite_master WHERE type='table'", (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          const tableName = row.name;
          
          // Skip excluded tables
          if (options.excludeTables?.includes(tableName)) {
            return;
          }

          // Copy table structure
          this.db!.get(`SELECT sql FROM sqlite_master WHERE name='${tableName}'`, (err, schemaRow: any) => {
            if (err) {
              reject(err);
              return;
            }

            backupDb.run(schemaRow.sql, (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Copy table data
              this.db!.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                if (err) {
                  reject(err);
                  return;
                }

                if (rows.length === 0) {
                  return;
                }

                // Insert data into backup
                const columns = Object.keys(rows[0]);
                const placeholders = columns.map(() => '?').join(',');
                const insertSql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

                backupDb.serialize(() => {
                  const stmt = backupDb.prepare(insertSql);
                  rows.forEach(row => {
                    stmt.run(columns.map(col => (row as any)[col]));
                  });
                  stmt.finalize();
                });
              });
            });
          });
        }, (err) => {
          if (err) {
            reject(err);
          } else {
            backupDb.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          }
        });
      });
    });
  }

  // Add metadata to backup
  private async addBackupMetadata(backupPath: string): Promise<void> {
    const metadata = {
      created_at: new Date().toISOString(),
      source_db: this.config.path,
      app_version: '1.0.0',
      schema_version: await this.migrationManager?.getCurrentVersion() || 0,
    };

    const metadataPath = backupPath + '.meta';
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  // Restore database from backup
  async restore(backupPath: string, options: RestoreOptions = {}): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Validate backup file exists
      await fs.access(backupPath);

      // Validate schema if requested
      if (options.validateSchema) {
        await this.validateBackupSchema(backupPath);
      }

      // Close current database
      await this.close();

      // Replace database file
      if (options.overwrite) {
        await fs.copyFile(backupPath, this.config.path);
      } else {
        // Create backup of current database
        const currentBackup = `${this.config.path}.backup.${Date.now()}`;
        await fs.copyFile(this.config.path, currentBackup);
        
        try {
          await fs.copyFile(backupPath, this.config.path);
        } catch (error) {
          // Restore original if copy failed
          await fs.copyFile(currentBackup, this.config.path);
          throw error;
        }
      }

      // Reinitialize database
      await this.initialize();

      // Run migrations if not skipped
      if (!options.skipMigrations && this.migrationManager) {
        const migrationResult = await this.migrationManager.migrate();
        if (!migrationResult.success) {
          throw new Error(`Migration after restore failed: ${migrationResult.errors.map(e => e.error).join(', ')}`);
        }
      }

      console.log('Database restored successfully');

    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  // Validate backup schema
  private async validateBackupSchema(backupPath: string): Promise<void> {
    const backupDb = new Database(backupPath);
    
    return new Promise((resolve, reject) => {
      backupDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'", (err, row) => {
        if (err) {
          reject(new Error('Invalid backup: schema_migrations table not found'));
        } else if (!row) {
          reject(new Error('Invalid backup: not a valid database backup'));
        } else {
          backupDb.close();
          resolve();
        }
      });
    });
  }

  // Get database statistics
  async getStats(): Promise<DatabaseStats> {
    if (!this.db) throw new Error('Database not initialized');

    const [
      pragmaInfo,
      tableInfo,
      indexInfo
    ] = await Promise.all([
      this.all("PRAGMA database_list"),
      this.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"),
      this.all("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
    ]);

    // Get database size
    const stats = await fs.stat(this.config.path);
    const size = stats.size;

    // Get page info
    const pageCount = await this.get("PRAGMA page_count") as any;
    const pageSize = await this.get("PRAGMA page_size") as any;
    const freePages = await this.get("PRAGMA freelist_count") as any;

    // Get table statistics
    const tables = await Promise.all(
      tableInfo.map(async (table: any) => {
        const rowCount = await this.get(`SELECT COUNT(*) as count FROM ${table.name}`) as any;
        return {
          name: table.name,
          rowCount: rowCount.count,
          size: 0 // Would need more complex calculation
        };
      })
    );

    return {
      size,
      pageCount: pageCount.page_count,
      pageSize: pageSize.page_size,
      freePages: freePages.freelist_count,
      tableCount: tableInfo.length,
      indexCount: indexInfo.length,
      tables
    };
  }

  // Optimize database
  async optimize(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('Optimizing database...');

    // Analyze tables for better query planning
    await this.run('ANALYZE');

    // Rebuild indexes
    await this.run('REINDEX');

    // Vacuum database to reclaim space
    await this.run('VACUUM');

    console.log('Database optimization complete');
  }

  // Check database integrity
  async checkIntegrity(): Promise<{ isValid: boolean; errors: string[] }> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.all("PRAGMA integrity_check") as any[];
    const isValid = result.length === 1 && result[0].integrity_check === 'ok';
    const errors = isValid ? [] : result.map(r => r.integrity_check);

    return { isValid, errors };
  }

  // Get migration manager
  getMigrationManager(): MigrationManager | null {
    return this.migrationManager;
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else {
            this.db = null;
            this.migrationManager = null;
            this.isInitialized = false;
            resolve();
          }
        });
      });
    }
  }

  // Check if database is initialized
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  // Get database path
  getPath(): string {
    return this.config.path;
  }

  // Get configuration
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}

// Create default database instance
export const enhancedDatabase = new EnhancedDatabase({
  path: './data/goodmusic.db',
  backupPath: './data/backups',
  enableWAL: true,
  enableForeignKeys: true,
});

// Export for compatibility with existing code
export { enhancedDatabase as database };