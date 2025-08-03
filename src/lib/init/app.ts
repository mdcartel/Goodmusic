import { initializeDatabase, checkDatabaseHealth } from './database';

/**
 * Initialize the entire application
 * This should be called once when the app starts
 */
export async function initializeApp(): Promise<void> {
  console.log('Starting GoodMusic NewPipe Edition...');
  
  try {
    // Initialize database
    await initializeDatabase();
    
    // Verify database health
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    
    // Check if yt-dlp is available
    await checkYtDlpAvailability();
    
    console.log('App initialization completed successfully');
    
  } catch (error) {
    console.error('App initialization failed:', error);
    throw error;
  }
}

/**
 * Check if yt-dlp is available and working
 */
async function checkYtDlpAvailability(): Promise<void> {
  try {
    // Import dynamically to avoid issues during build
    const youtubedl = (await import('youtube-dl-exec')).default;
    
    // Test with a simple version check
    await youtubedl('--version');
    console.log('yt-dlp is available and working');
    
  } catch (error) {
    console.warn('yt-dlp availability check failed:', error);
    // Don't throw here as the app can still work with cached data
    // Just log the warning for debugging
  }
}

/**
 * Gracefully shutdown the app
 */
export async function shutdownApp(): Promise<void> {
  try {
    console.log('Shutting down GoodMusic...');
    
    // Close database connection
    const { database } = await import('../database');
    await database.close();
    
    console.log('App shutdown completed');
    
  } catch (error) {
    console.error('Error during app shutdown:', error);
  }
}