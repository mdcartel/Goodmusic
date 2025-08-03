#!/usr/bin/env node

/**
 * Integration test script for audio extraction service
 * Tests the complete audio extraction pipeline
 */

const { audioExtractionService } = require('../src/lib/services/audio-extraction');
const { validateVideoId, extractVideoId } = require('../src/lib/utils/youtube');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

async function testVideoIdValidation() {
  log('\n📋 Testing Video ID Validation', colors.blue);
  log('================================', colors.blue);
  
  const testCases = [
    { input: 'dQw4w9WgXcQ', expected: true, description: 'Valid video ID' },
    { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: true, description: 'Standard YouTube URL' },
    { input: 'https://youtu.be/dQw4w9WgXcQ', expected: true, description: 'Short YouTube URL' },
    { input: 'invalid-id', expected: false, description: 'Invalid video ID' },
    { input: '', expected: false, description: 'Empty string' },
    { input: '123', expected: false, description: 'Too short' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      const videoId = extractVideoId(testCase.input);
      const isValid = validateVideoId(videoId);
      
      if (isValid === testCase.expected) {
        log(`✓ ${testCase.description}: ${testCase.input}`, colors.green);
        passed++;
      } else {
        log(`✗ ${testCase.description}: ${testCase.input} (expected ${testCase.expected}, got ${isValid})`, colors.red);
        failed++;
      }
    } catch (error) {
      log(`✗ ${testCase.description}: ${testCase.input} (error: ${error.message})`, colors.red);
      failed++;
    }
  }
  
  log(`\nValidation Tests: ${passed} passed, ${failed} failed`, failed > 0 ? colors.red : colors.green);
  return failed === 0;
}

async function testAudioExtraction() {
  log('\n🎵 Testing Audio Extraction', colors.blue);
  log('============================', colors.blue);
  
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
  
  try {
    log(`Testing with video ID: ${testVideoId}`, colors.cyan);
    
    const startTime = Date.now();
    const result = await audioExtractionService.extractAudio(testVideoId, {
      quality: 'best',
      format: 'm4a',
      includeMetadata: true,
      maxRetries: 3
    });
    const extractionTime = Date.now() - startTime;
    
    log(`✓ Extraction completed in ${extractionTime}ms`, colors.green);
    log(`  Title: ${result.title}`, colors.cyan);
    log(`  Artist: ${result.artist}`, colors.cyan);
    log(`  Duration: ${formatDuration(result.duration)}`, colors.cyan);
    log(`  Streams available: ${result.streams.length}`, colors.cyan);
    log(`  Best stream: ${result.bestStream.format.toUpperCase()} @ ${result.bestStream.bitrate} kbps`, colors.cyan);
    log(`  File size: ${formatFileSize(result.bestStream.fileSize)}`, colors.cyan);
    
    // Test caching
    log('\nTesting cache...', colors.yellow);
    const cachedStartTime = Date.now();
    const cachedResult = await audioExtractionService.extractAudio(testVideoId, {
      quality: 'best',
      format: 'm4a',
      includeMetadata: true,
      maxRetries: 3
    });
    const cachedTime = Date.now() - cachedStartTime;
    
    if (cachedTime < extractionTime / 2) {
      log(`✓ Cache working (${cachedTime}ms vs ${extractionTime}ms)`, colors.green);
    } else {
      log(`⚠ Cache may not be working properly`, colors.yellow);
    }
    
    return true;
  } catch (error) {
    log(`✗ Audio extraction failed: ${error.message}`, colors.red);
    return false;
  }
}

async function testStreamingUrl() {
  log('\n🔗 Testing Streaming URL', colors.blue);
  log('=========================', colors.blue);
  
  const testVideoId = 'dQw4w9WgXcQ';
  
  try {
    log(`Getting streaming URL for: ${testVideoId}`, colors.cyan);
    
    const startTime = Date.now();
    const streamUrl = await audioExtractionService.getStreamingUrl(testVideoId, 'best');
    const urlTime = Date.now() - startTime;
    
    log(`✓ Streaming URL obtained in ${urlTime}ms`, colors.green);
    log(`  URL: ${streamUrl.substring(0, 100)}...`, colors.cyan);
    
    // Test URL accessibility (HEAD request)
    try {
      const response = await fetch(streamUrl, { method: 'HEAD' });
      if (response.ok) {
        log(`✓ Streaming URL is accessible (${response.status})`, colors.green);
        
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          log(`  Content length: ${formatFileSize(parseInt(contentLength))}`, colors.cyan);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType) {
          log(`  Content type: ${contentType}`, colors.cyan);
        }
      } else {
        log(`⚠ Streaming URL returned ${response.status}`, colors.yellow);
      }
    } catch (fetchError) {
      log(`⚠ Could not test URL accessibility: ${fetchError.message}`, colors.yellow);
    }
    
    return true;
  } catch (error) {
    log(`✗ Streaming URL failed: ${error.message}`, colors.red);
    return false;
  }
}

async function testQualityOptions() {
  log('\n⚙️ Testing Quality Options', colors.blue);
  log('===========================', colors.blue);
  
  const testVideoId = 'dQw4w9WgXcQ';
  
  try {
    log(`Getting quality options for: ${testVideoId}`, colors.cyan);
    
    const startTime = Date.now();
    const qualities = await audioExtractionService.getQualityOptions(testVideoId);
    const qualityTime = Date.now() - startTime;
    
    log(`✓ Quality options obtained in ${qualityTime}ms`, colors.green);
    log(`  Available qualities: ${qualities.length}`, colors.cyan);
    
    // Show top 5 quality options
    const topQualities = qualities.slice(0, 5);
    for (let i = 0; i < topQualities.length; i++) {
      const quality = topQualities[i];
      log(`  ${i + 1}. ${quality.format.toUpperCase()} @ ${quality.bitrate} kbps (${quality.quality})`, colors.cyan);
    }
    
    return true;
  } catch (error) {
    log(`✗ Quality options failed: ${error.message}`, colors.red);
    return false;
  }
}

async function testCacheManagement() {
  log('\n💾 Testing Cache Management', colors.blue);
  log('============================', colors.blue);
  
  try {
    // Get initial cache stats
    let stats = audioExtractionService.getCacheStats();
    log(`Initial cache size: ${stats.size} entries`, colors.cyan);
    
    // Add something to cache if empty
    if (stats.size === 0) {
      log('Adding test entry to cache...', colors.yellow);
      await audioExtractionService.extractAudio('dQw4w9WgXcQ');
      stats = audioExtractionService.getCacheStats();
    }
    
    log(`Cache size after extraction: ${stats.size} entries`, colors.cyan);
    log(`Cached entries: ${stats.entries.slice(0, 3).join(', ')}${stats.entries.length > 3 ? '...' : ''}`, colors.cyan);
    
    // Test cache clearing
    log('Clearing cache...', colors.yellow);
    audioExtractionService.clearCache();
    
    stats = audioExtractionService.getCacheStats();
    if (stats.size === 0) {
      log('✓ Cache cleared successfully', colors.green);
    } else {
      log(`⚠ Cache not fully cleared (${stats.size} entries remaining)`, colors.yellow);
    }
    
    return true;
  } catch (error) {
    log(`✗ Cache management failed: ${error.message}`, colors.red);
    return false;
  }
}

async function testErrorHandling() {
  log('\n🚨 Testing Error Handling', colors.blue);
  log('==========================', colors.blue);
  
  const errorTests = [
    {
      name: 'Invalid video ID',
      test: () => audioExtractionService.extractAudio('invalid-id'),
      expectedError: 'Invalid YouTube video ID format'
    },
    {
      name: 'Non-existent video',
      test: () => audioExtractionService.extractAudio('aaaaaaaaaaa'),
      expectedError: null // Any error is acceptable
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const errorTest of errorTests) {
    try {
      await errorTest.test();
      log(`✗ ${errorTest.name}: Expected error but got success`, colors.red);
      failed++;
    } catch (error) {
      if (errorTest.expectedError && !error.message.includes(errorTest.expectedError)) {
        log(`✗ ${errorTest.name}: Expected "${errorTest.expectedError}" but got "${error.message}"`, colors.red);
        failed++;
      } else {
        log(`✓ ${errorTest.name}: Correctly threw error`, colors.green);
        passed++;
      }
    }
  }
  
  log(`\nError Tests: ${passed} passed, ${failed} failed`, failed > 0 ? colors.red : colors.green);
  return failed === 0;
}

async function main() {
  log('🎵 GoodMusic Audio Extraction Integration Test', colors.magenta);
  log('===============================================', colors.magenta);
  
  const tests = [
    { name: 'Video ID Validation', test: testVideoIdValidation },
    { name: 'Audio Extraction', test: testAudioExtraction },
    { name: 'Streaming URL', test: testStreamingUrl },
    { name: 'Quality Options', test: testQualityOptions },
    { name: 'Cache Management', test: testCacheManagement },
    { name: 'Error Handling', test: testErrorHandling },
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        totalPassed++;
      } else {
        totalFailed++;
      }
    } catch (error) {
      log(`\n✗ ${test.name} test crashed: ${error.message}`, colors.red);
      totalFailed++;
    }
  }
  
  log('\n📊 Test Summary', colors.magenta);
  log('===============', colors.magenta);
  log(`Total tests: ${tests.length}`, colors.cyan);
  log(`Passed: ${totalPassed}`, colors.green);
  log(`Failed: ${totalFailed}`, totalFailed > 0 ? colors.red : colors.cyan);
  
  if (totalFailed === 0) {
    log('\n🎉 All tests passed! Audio extraction service is working correctly.', colors.green);
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please check the audio extraction setup.', colors.red);
    process.exit(1);
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  log(`\nUnexpected error: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log(`\nUnhandled promise rejection: ${error}`, colors.red);
  process.exit(1);
});

// Run the tests
main().catch((error) => {
  log(`\nTest suite failed: ${error.message}`, colors.red);
  process.exit(1);
});