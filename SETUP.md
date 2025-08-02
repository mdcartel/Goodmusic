# VibePipe MVP Setup Guide

## Prerequisites

VibePipe MVP requires `yt-dlp` for YouTube content extraction and streaming. Follow the installation steps below:

### Installing yt-dlp

#### Option 1: Using pip (Recommended)
```bash
pip install yt-dlp
```

#### Option 2: Using pip3 (if you have Python 3)
```bash
pip3 install yt-dlp
```

#### Option 3: Using conda
```bash
conda install -c conda-forge yt-dlp
```

#### Option 4: Using homebrew (macOS)
```bash
brew install yt-dlp
```

#### Option 5: Using chocolatey (Windows)
```bash
choco install yt-dlp
```

### Verifying Installation

After installation, verify that yt-dlp is working:

```bash
yt-dlp --version
```

You should see a version number if the installation was successful.

## Development Mode

If you don't have yt-dlp installed, the app will run in development mode with:
- Mock streaming URLs for testing
- Simulated download functionality
- Sample audio files for playback testing

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Features Available

### With yt-dlp installed:
- ✅ Real YouTube streaming
- ✅ Actual music downloads
- ✅ Full extraction capabilities
- ✅ Multiple quality options

### Without yt-dlp (Development Mode):
- ✅ UI testing and development
- ✅ Mock streaming with sample audio
- ✅ Simulated download progress
- ✅ All UI components functional
- ⚠️ Limited to sample audio files

## Troubleshooting

### "yt-dlp not found" error
- Make sure yt-dlp is installed and available in your PATH
- Try running `yt-dlp --version` in your terminal
- Restart your development server after installing yt-dlp

### Permission errors
- On macOS/Linux, you might need to use `sudo pip install yt-dlp`
- Or use a virtual environment: `python -m venv venv && source venv/bin/activate && pip install yt-dlp`

### Network issues
- Some networks block YouTube access
- Try using a VPN if you're on a restricted network
- Check your firewall settings

## Production Deployment

For production deployment, ensure:
1. yt-dlp is installed on your server
2. Proper rate limiting is configured
3. CORS settings are appropriate for your domain
4. File storage permissions are set correctly

## Support

If you encounter issues:
1. Check that yt-dlp is properly installed
2. Verify your network connection
3. Check the browser console for error messages
4. Review the server logs for detailed error information

The app is designed to gracefully handle missing dependencies and provide helpful error messages to guide you through the setup process.