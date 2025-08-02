#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests yt-dlp integration and API endpoints
 */

const { execSync } = require('child_process');
const fetch = require('node-fetch');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testYtDlpInstallation() {
  log('🧪 Testing yt-dlp installation...', 'blue');
  
  try {
    const version = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
    log(`✅ yt-dlp version: ${version}`, 'green');
    return true;
  } catch (error) {
    log('❌ yt-dlp not found or not working', 'red');
    return false;
  }
}

async function testHealthEndpoint() {
  log('🏥 Testing health endpoint...', 'blue');
  
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    
    if (data.status === 'healthy') {
      log('✅ Health endpoint working', 'green');
      log(`   - Status: ${data.status}`, 'green');
      log(`   - yt-dlp: ${data.ytdlp ? 'Available' : 'Not available'}`, data.ytdlp ? 'green' : 'yellow');
      return true;
    } else {
      log('❌ Health endpoint returned unhealthy status', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Could not reach health endpoint (is the server running?)', 'red');
    return false;
  }
}

async function testYtDlpAPI() {
  log('🎵 Testing yt-dlp API endpoints...', 'blue');
  
  try {
    // Test check endpoint
    const checkResponse = await fetch('http://localhost:3000/api/ytdlp/check');
    const checkData = await checkResponse.json();
    
    if (checkData.success) {
      log(`✅ yt-dlp check: ${checkData.available ? 'Available' : 'Mock mode'}`, 
          checkData.available ? 'green' : 'yellow');
      return checkData.available;
    } else {
      log('❌ yt-dlp check endpoint failed', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Could not test yt-dlp API endpoints', 'red');
    return false;
  }
}

async function main() {
  log('🎵 VibePipe MVP - Integration Test', 'blue');
  log('==================================\\n', 'blue');
  
  const tests = [
    { name: 'yt-dlp Installation', test: testYtDlpInstallation },
    { name: 'Health Endpoint', test: testHealthEndpoint },
    { name: 'yt-dlp API', test: testYtDlpAPI }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      }
    } catch (error) {
      log(`❌ ${name} test failed: ${error.message}`, 'red');
    }
    log(''); // Empty line for readability
  }
  
  // Summary
  log('📊 Test Summary', 'blue');
  log('===============', 'blue');
  log(`Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\\n🎉 All tests passed! Your VibePipe MVP is ready for hosting.', 'green');
    log('\\n🚀 Next steps:', 'blue');
    log('   1. Run: npm run build', 'blue');
    log('   2. Deploy to your hosting platform', 'blue');
    log('   3. Set environment variables', 'blue');
    log('   4. Test in production', 'blue');
  } else {
    log('\\n⚠️  Some tests failed. Please check the issues above.', 'yellow');
    log('\\n🔧 Troubleshooting:', 'blue');
    log('   1. Ensure yt-dlp is installed: pip install yt-dlp', 'blue');
    log('   2. Start the development server: npm run dev', 'blue');
    log('   3. Check the health endpoint: http://localhost:3000/api/health', 'blue');
  }
  
  process.exit(passed === total ? 0 : 1);
}

if (require.main === module) {
  main();
}