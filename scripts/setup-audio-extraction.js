#!/usr/bin/env node

/**
 * Setup script for audio extraction service
 * Ensures yt-dlp is installed and properly configured
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function installYtDlp() {
  log('Installing yt-dlp...', colors.blue);
  
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Windows installation
      if (checkCommand('pip')) {
        execSync('pip install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('pip3')) {
        execSync('pip3 install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('winget')) {
        execSync('winget install yt-dlp', { stdio: 'inherit' });
      } else {
        log('Please install Python and pip, then run: pip install yt-dlp', colors.red);
        return false;
      }
    } else if (platform === 'darwin') {
      // macOS installation
      if (checkCommand('brew')) {
        execSync('brew install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('pip3')) {
        execSync('pip3 install yt-dlp', { stdio: 'inherit' });
      } else {
        log('Please install Homebrew or Python, then run: brew install yt-dlp or pip3 install yt-dlp', colors.red);
        return false;
      }
    } else {
      // Linux installation
      if (checkCommand('pip3')) {
        execSync('pip3 install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('apt')) {
        execSync('sudo apt update && sudo apt install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('yum')) {
        execSync('sudo yum install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('pacman')) {
        execSync('sudo pacman -S yt-dlp', { stdio: 'inherit' });
      } else {
        log('Please install yt-dlp using your package manager or pip3 install yt-dlp', colors.red);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(`Failed to install yt-dlp: ${error.message}`, colors.red);
    return false;
  }
}

function updateYtDlp() {
  log('Updating yt-dlp...', colors.blue);
  
  try {
    execSync('yt-dlp --update', { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Failed to update yt-dlp: ${error.message}`, colors.yellow);
    return false;
  }
}

function testYtDlp() {
  log('Testing yt-dlp installation...', colors.blue);
  
  try {
    // Test with a known working video
    const testCommand = 'yt-dlp --dump-single-json --no-warnings "https://www.youtube.com/watch?v=dQw4w9WgXcQ"';
    const result = execSync(testCommand, { encoding: 'utf8', timeout: 30000 });
    
    const data = JSON.parse(result);
    if (data.id && data.title) {
      log('✓ yt-dlp is working correctly', colors.green);
      log(`  Test video: ${data.title}`, colors.cyan);
      log(`  Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`, colors.cyan);
      return true;
    } else {
      log('✗ yt-dlp test failed: Invalid response', colors.red);
      return false;
    }
  } catch (error) {
    log(`✗ yt-dlp test failed: ${error.message}`, colors.red);
    return false;
  }
}

function createConfigFile() {
  log('Creating yt-dlp configuration...', colors.blue);
  
  const configDir = path.join(os.homedir(), '.config', 'yt-dlp');
  const configFile = path.join(configDir, 'config');
  
  const config = `# yt-dlp configuration for GoodMusic
# Audio extraction optimizations
--extract-flat
--no-warnings
--ignore-errors
--no-playlist
--format "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio"
--audio-quality 0
--embed-metadata
--add-metadata
--write-thumbnail
--write-info-json
--output "%(uploader)s - %(title)s.%(ext)s"
--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
--referer "https://www.youtube.com/"
`;

  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configFile, config);
    log(`✓ Configuration saved to ${configFile}`, colors.green);
    return true;
  } catch (error) {
    log(`Failed to create config file: ${error.message}`, colors.yellow);
    return false;
  }
}

function checkDependencies() {
  log('Checking system dependencies...', colors.blue);
  
  const dependencies = [
    { name: 'Python', command: 'python --version', alternative: 'python3 --version' },
    { name: 'FFmpeg', command: 'ffmpeg -version' },
  ];
  
  let allGood = true;
  
  for (const dep of dependencies) {
    const hasMain = checkCommand(dep.command.split(' ')[0]);
    const hasAlt = dep.alternative ? checkCommand(dep.alternative.split(' ')[0]) : false;
    
    if (hasMain || hasAlt) {
      log(`✓ ${dep.name} is installed`, colors.green);
    } else {
      log(`✗ ${dep.name} is not installed`, colors.red);
      allGood = false;
      
      if (dep.name === 'FFmpeg') {
        log('  Install FFmpeg from https://ffmpeg.org/download.html', colors.yellow);
      } else if (dep.name === 'Python') {
        log('  Install Python from https://python.org/downloads/', colors.yellow);
      }
    }
  }
  
  return allGood;
}

async function main() {
  log('🎵 GoodMusic Audio Extraction Setup', colors.magenta);
  log('=====================================', colors.magenta);
  
  // Check system dependencies
  const depsOk = checkDependencies();
  if (!depsOk) {
    log('\nPlease install missing dependencies and run this script again.', colors.red);
    process.exit(1);
  }
  
  // Check if yt-dlp is installed
  if (checkCommand('yt-dlp')) {
    log('✓ yt-dlp is already installed', colors.green);
    
    // Update yt-dlp
    updateYtDlp();
  } else {
    log('yt-dlp is not installed', colors.yellow);
    
    // Install yt-dlp
    const installed = installYtDlp();
    if (!installed) {
      log('\nFailed to install yt-dlp. Please install it manually.', colors.red);
      process.exit(1);
    }
  }
  
  // Test yt-dlp
  const testPassed = testYtDlp();
  if (!testPassed) {
    log('\nyt-dlp test failed. Please check your installation.', colors.red);
    process.exit(1);
  }
  
  // Create configuration
  createConfigFile();
  
  log('\n🎉 Audio extraction setup completed successfully!', colors.green);
  log('\nYou can now use the audio extraction service in your application.', colors.cyan);
  log('\nTo test the service, run: npm run test:audio-extraction', colors.cyan);
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

// Run the setup
main().catch((error) => {
  log(`\nSetup failed: ${error.message}`, colors.red);
  process.exit(1);
});