// Simple integration test for database and core functionality
const { database } = require('./database/connection');

async function testIntegration() {
  console.log('🧪 Testing NewPipe architecture integration...\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await database.initialize();
    console.log('   ✅ Database initialized successfully');
    
    // Test basic database operations
    console.log('2. Testing database operations...');
    
    // Insert a test song
    const testSong = {
      id: 'test-integration-song',
      youtube_id: 'dQw4w9WgXcQ',
      title: 'Test Integration Song',
      artist: 'Test Artist',
      duration: 180,
      thumbnail: 'https://example.com/thumb.jpg',
      youtube_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      is_downloaded: 0,
      added_at: new Date().toISOString(),
      play_count: 0
    };
    
    await database.run(
      `INSERT OR REPLACE INTO songs (id, youtube_id, title, artist, duration, thumbnail, youtube_url, is_downloaded, added_at, play_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testSong.id,
        testSong.youtube_id,
        testSong.title,
        testSong.artist,
        testSong.duration,
        testSong.thumbnail,
        testSong.youtube_url,
        testSong.is_downloaded,
        testSong.added_at,
        testSong.play_count
      ]
    );
    console.log('   ✅ Song inserted successfully');
    
    // Query the song back
    const retrievedSong = await database.get('SELECT * FROM songs WHERE id = ?', [testSong.id]);
    if (retrievedSong && retrievedSong.title === testSong.title) {
      console.log('   ✅ Song retrieved successfully');
    } else {
      throw new Error('Song retrieval failed');
    }
    
    // Test settings
    console.log('3. Testing settings...');
    const settings = await database.all('SELECT * FROM settings');
    if (settings.length > 0) {
      console.log(`   ✅ Found ${settings.length} default settings`);
    } else {
      throw new Error('No default settings found');
    }
    
    // Clean up test data
    await database.run('DELETE FROM songs WHERE id = ?', [testSong.id]);
    console.log('   ✅ Test data cleaned up');
    
    // Test YouTube scraper service (just check if it loads)
    console.log('4. Testing YouTube scraper service...');
    const { youtubeScraperService } = require('./services/youtube-scraper');
    if (youtubeScraperService && typeof youtubeScraperService.search === 'function') {
      console.log('   ✅ YouTube scraper service loaded successfully');
    } else {
      throw new Error('YouTube scraper service failed to load');
    }
    
    // Test Zustand store (just check if it loads)
    console.log('5. Testing Zustand store...');
    // Note: We can't fully test the store in Node.js environment, but we can check if it loads
    const fs = require('fs');
    const path = require('path');
    const storeFile = path.join(__dirname, 'store/index.ts');
    if (fs.existsSync(storeFile)) {
      console.log('   ✅ Zustand store file exists');
    } else {
      throw new Error('Zustand store file not found');
    }
    
    console.log('\n🎉 All integration tests passed!');
    console.log('\n📊 Test Results:');
    console.log('- ✅ Database connection and operations');
    console.log('- ✅ Schema initialization');
    console.log('- ✅ Default settings');
    console.log('- ✅ YouTube scraper service');
    console.log('- ✅ Store architecture');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await database.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
testIntegration().catch(console.error);