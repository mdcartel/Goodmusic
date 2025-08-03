import { database } from '../database';

/**
 * Initialize the database on app startup
 * This should be called once when the app starts
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database...');
    await database.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Check if the database is properly initialized
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Try to query a simple table to check if database is working
    await database.get('SELECT name FROM sqlite_master WHERE type="table" AND name="songs"');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics for debugging
 */
export async function getDatabaseStats(): Promise<{
  songsCount: number;
  playlistsCount: number;
  downloadsCount: number;
  channelsCount: number;
}> {
  try {
    const [songsResult, playlistsResult, downloadsResult, channelsResult] = await Promise.all([
      database.get<{ count: number }>('SELECT COUNT(*) as count FROM songs'),
      database.get<{ count: number }>('SELECT COUNT(*) as count FROM playlists'),
      database.get<{ count: number }>('SELECT COUNT(*) as count FROM downloads'),
      database.get<{ count: number }>('SELECT COUNT(*) as count FROM channels'),
    ]);

    return {
      songsCount: songsResult?.count || 0,
      playlistsCount: playlistsResult?.count || 0,
      downloadsCount: downloadsResult?.count || 0,
      channelsCount: channelsResult?.count || 0,
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      songsCount: 0,
      playlistsCount: 0,
      downloadsCount: 0,
      channelsCount: 0,
    };
  }
}