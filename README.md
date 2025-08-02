# GoodMusic 🎵

A privacy-focused, mood-based music discovery and streaming application that combines intelligent music discovery with seamless downloading capabilities.

## Features

- 🎵 **Mood-based Music Discovery** - Browse music by emotional vibes (Chill, Heartbreak, Hype, etc.)
- 🎧 **Stream Music** - Play tracks directly in the browser
- 📥 **Private Downloads** - Download MP3/MP4 files that don't appear in device music galleries
- 🤖 **AI Chatbot** - Get emotional music guidance (placeholder implementation)
- 🎨 **Beautiful UI** - Clean, minimalist design with Tailwind CSS
- 🔒 **Privacy-First** - No signup required, local storage only

## Tech Stack

- **Frontend**: React 18 + Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **YouTube Extraction**: yt-dlp
- **Language**: TypeScript

## Prerequisites

- Node.js 18+ 
- Python 3.7+
- yt-dlp (`pip install yt-dlp`)

## Getting Started

1. **Clone and install dependencies**:
   ```bash
   cd vibepipe-mvp
   npm install
   ```

2. **Install yt-dlp**:
   ```bash
   pip install yt-dlp
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000` (or the port shown in terminal)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── extract/       # YouTube extraction
│   │   ├── moods/         # Mood categories
│   │   └── songs/         # Song data
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Utilities and services
│   ├── constants.ts       # App constants
│   ├── mockData.ts        # Development data
│   ├── utils.ts           # Helper functions
│   └── youtube.ts         # YouTube extraction service
└── types/                 # TypeScript definitions
    └── index.ts           # Core data models
```

## API Endpoints

- `GET /api/moods` - Get available mood categories
- `GET /api/songs?mood={mood}` - Get songs filtered by mood
- `POST /api/extract` - Extract YouTube content info and stream URLs

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Philosophy

> No signup, no fluff, just raw vibes. YouTube meets therapy. Music for feels. A downloadable rebellion.

VibePipe MVP focuses on delivering a therapeutic music discovery experience without the bloat of traditional streaming services.