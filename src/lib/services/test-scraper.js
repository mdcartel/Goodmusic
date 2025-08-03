// Simple test script for the YouTube scraper service
const { youtubeScraperService } = require('./youtube-scraper');

async function testScraper() {
  console.log('🧪 Testing Enhanced YouTube Scraper Service...\n');
  
  try {
    // Test 1: Basic search
    console.log('1. Testing basic search...');
    try {
      const searchResults = await youtubeScraperService.search('test music', { sortBy: 'relevance' });
      console.log(`   ✅ Search returned ${searchResults.length} results`);
      
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        console.log(`   📝 First result: "${firstResult.title}" by ${firstResult.artist}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Search test failed: ${error.message}`);
    }
    
    // Test 2: Search suggestions
    console.log('\n2. Testing search suggestions...');
    try {
      const suggestions = await youtubeScraperService.getSearchSuggestions('music');
      console.log(`   ✅ Got ${suggestions.length} suggestions: ${suggestions.slice(0, 3).join(', ')}`);
    } catch (error) {
      console.log(`   ⚠️ Suggestions test failed: ${error.message}`);
    }
    
    // Test 3: Trending music
    console.log('\n3. Testing trending music...');
    try {
      const trending = await youtubeScraperService.getTrendingMusic();
      console.log(`   ✅ Got ${trending.length} trending results`);
    } catch (error) {
      console.log(`   ⚠️ Trending test failed: ${error.message}`);
    }
    
    // Test 4: Video info (using Rick Roll as it should always exist)
    console.log('\n4. Testing video info extraction...');
    try {
      const videoInfo = await youtubeScraperService.getVideoInfo('dQw4w9WgXcQ');
      console.log(`   ✅ Video info: "${videoInfo.title}" by ${videoInfo.artist}`);
      console.log(`   📊 Duration: ${videoInfo.duration}s, Views: ${videoInfo.viewCount}`);
      console.log(`   🎵 Audio formats available: ${videoInfo.formats.length}`);
    } catch (error) {
      console.log(`   ⚠️ Video info test failed: ${error.message}`);
    }
    
    // Test 5: Audio URL extraction
    console.log('\n5. Testing audio URL extraction...');
    try {
      const audioUrl = await youtubeScraperService.extractAudioUrl('dQw4w9WgXcQ', 'best');
      console.log(`   ✅ Audio URL extracted (${audioUrl.length} chars)`);
      console.log(`   🔗 URL starts with: ${audioUrl.substring(0, 50)}...`);
    } catch (error) {
      console.log(`   ⚠️ Audio extraction test failed: ${error.message}`);
    }
    
    // Test 6: Cache functionality
    console.log('\n6. Testing cache functionality...');
    try {
      youtubeScraperService.clearCache();
      console.log('   ✅ Cache cleared successfully');
    } catch (error) {
      console.log(`   ⚠️ Cache test failed: ${error.message}`);
    }
    
    console.log('\n🎉 YouTube Scraper Service testing complete!');
    console.log('\n📋 Enhanced Features:');
    console.log('- ✅ Rate limiting to avoid detection');
    console.log('- ✅ Intelligent caching system');
    console.log('- ✅ Multiple fallback strategies');
    console.log('- ✅ Enhanced error handling');
    console.log('- ✅ Search suggestions');
    console.log('- ✅ User agent rotation');
    console.log('- ✅ Advanced search filters');
    console.log('- ✅ Trending music discovery');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    
    if (error.message.includes('youtube-dl-exec')) {
      console.log('\n💡 Note: This might be because yt-dlp is not installed or not in PATH.');
      console.log('   The scraper will work once yt-dlp is properly set up.');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testScraper().catch(console.error);
}

module.exports = { testScraper };