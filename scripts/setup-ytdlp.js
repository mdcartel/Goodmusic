#!/usr/bin/env node

/**
 * Automatic yt-dlp Setup Script
 * Automatically installs and configures yt-dlp for VibePipe MVP
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function installYtDlp() {
  log('🚀 Setting up yt-dlp for VibePipe MVP...', 'blue');
  
  // Check if yt-dlp is already installed
  if (checkCommand('yt-dlp')) {
    log('✅ yt-dlp is already installed!', 'green');
    return true;
  }
  
  log('📦 Installing yt-dlp...', 'yellow');
  
  // Try different installation methods based on platform
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Windows installation
      if (checkCommand('pip')) {
        log('Installing via pip...', 'yellow');
        execSync('pip install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('winget')) {
        log('Installing via winget...', 'yellow');
        execSync('winget install yt-dlp', { stdio: 'inherit' });
      } else {
        throw new Error('No suitable package manager found');
      }
    } else if (platform === 'darwin') {
      // macOS installation
      if (checkCommand('brew')) {
        log('Installing via Homebrew...', 'yellow');
        execSync('brew install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('pip3')) {
        log('Installing via pip3...', 'yellow');
        execSync('pip3 install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('pip')) {
        log('Installing via pip...', 'yellow');
        execSync('pip install yt-dlp', { stdio: 'inherit' });
      } else {
        throw new Error('No suitable package manager found');
      }
    } else {
      // Linux installation
      if (checkCommand('pip3')) {
        log('Installing via pip3...', 'yellow');
        execSync('pip3 install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('pip')) {
        log('Installing via pip...', 'yellow');
        execSync('pip install yt-dlp', { stdio: 'inherit' });
      } else if (checkCommand('apt-get')) {
        log('Installing via apt...', 'yellow');
        execSync('sudo apt-get update && sudo apt-get install -y python3-pip', { stdio: 'inherit' });
        execSync('pip3 install yt-dlp', { stdio: 'inherit' });
      } else {
        throw new Error('No suitable package manager found');
      }
    }
    
    // Verify installation
    if (checkCommand('yt-dlp')) {
      log('✅ yt-dlp installed successfully!', 'green');
      return true;
    } else {
      throw new Error('Installation verification failed');
    }
    
  } catch (error) {
    log('❌ Failed to install yt-dlp: ' + error.message, 'red');
    log('📋 Manual installation options:', 'yellow');
    log('  • pip install yt-dlp', 'yellow');
    log('  • brew install yt-dlp (macOS)', 'yellow');
    log('  • winget install yt-dlp (Windows)', 'yellow');
    log('  • Download from: https://github.com/yt-dlp/yt-dlp/releases', 'yellow');
    return false;
  }
}

function updatePackageJson() {
  log('📝 Updating package.json...', 'blue');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add setup script if not exists
  if (!packageJson.scripts['setup']) {
    packageJson.scripts['setup'] = 'node scripts/setup-ytdlp.js';
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log('✅ package.json updated!', 'green');
}

function createHealthCheck() {
  log('🏥 Creating health check endpoint...', 'blue');
  
  const healthCheckPath = path.join(__dirname, '..', 'src', 'app', 'api', 'health', 'route.ts');
  const healthCheckDir = path.dirname(healthCheckPath);
  
  // Ensure directory exists
  if (!fs.existsSync(healthCheckDir)) {
    fs.mkdirSync(healthCheckDir, { recursive: true });
  }
  
  const healthCheckContent = `import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    ytdlp: false
  };

  // Check yt-dlp availability
  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
    health.ytdlp = true;
  } catch (error) {
    health.ytdlp = false;
  }

  return NextResponse.json(health);
}`;
  
  fs.writeFileSync(healthCheckPath, healthCheckContent);
  log('✅ Health check endpoint created!', 'green');
}

function main() {
  log('🎵 GoodMusic - Automatic yt-dlp Setup', 'blue');
  log('=========================================\\n', 'blue');
  
  const success = installYtDlp();
  
  if (success) {
    updatePackageJson();
    createHealthCheck();
    
    log('\\n🎉 Setup completed successfully!', 'green');
    log('✅ yt-dlp is installed and configured', 'green');
    log('✅ Package.json updated with setup script', 'green');
    log('✅ Health check endpoint created', 'green');
    log('\\n🚀 Your app is now ready for hosting with full YouTube functionality!', 'green');
    
    // Test the installation
    log('\\n🧪 Testing yt-dlp installation...', 'blue');
    try {
      const version = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
      log('✅ yt-dlp version: ' + version, 'green');
    } catch (error) {
      log('⚠️  Could not verify yt-dlp version', 'yellow');
    }
    
  } else {
    log('\\n❌ Setup failed. Please install yt-dlp manually:', 'red');
    log('   pip install yt-dlp', 'yellow');
    log('   Then run: npm run setup', 'yellow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  installYtDlp,
  updatePackageJson,
  createHealthCheck
};