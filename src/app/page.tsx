'use client';

import { useState } from 'react';
import { Song } from '@/types';
import { MoodSelector, SongGrid, SongCard, AudioPlayer, QueuePanel, DownloadsPanel, ChatBot, SetupNotification, DiscoveryInsights, StyleGuide, Navigation, SettingsPanel } from '@/components';
import { AudioProvider, useAudio } from '@/contexts/AudioContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MusicDiscoveryIntegration } from '@/lib/musicDiscoveryIntegration';

function HomeContent() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatSuggestedSongs, setChatSuggestedSongs] = useState<Song[]>([]);
  const [showChatSuggestions, setShowChatSuggestions] = useState(false);
  const [chatMood, setChatMood] = useState<string | null>(null);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<string | null>(null);
  const { state, actions, playFromMood, addSongsToQueue, isCurrentSong } = useAudio();
  
  const discoveryIntegration = MusicDiscoveryIntegration.getInstance();

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood || null);
  };

  const handlePlay = async (song: Song) => {
    try {
      if (isCurrentSong(song.id)) {
        // Toggle play/pause for the same song
        actions.toggle();
      } else {
        // Play new song
        actions.play(song);
      }
    } catch (error) {
      console.error('Failed to play song:', error);
    }
  };

  const handlePlayAll = (songs: Song[]) => {
    if (songs.length > 0) {
      playFromMood(songs);
    }
  };

  const handleAddAllToQueue = (songs: Song[]) => {
    addSongsToQueue(songs);
  };

  const handleDownload = async (song: Song, format: 'mp3' | 'mp4') => {
    try {
      console.log(`Download started: ${song.title} as ${format}`);
      // The actual download is now handled by the DownloadManager in SongCard
      // This is just for any additional UI feedback if needed
    } catch (error) {
      console.error('Failed to download song:', error);
    }
  };

  const handleChatSongSuggestion = (songs: Song[], mood?: string) => {
    // Add to discovery integration system
    const suggestionId = discoveryIntegration.addChatbotSuggestion(
      songs, 
      mood, 
      `session-${Date.now()}`, 
      'Chat conversation'
    );
    
    setChatSuggestedSongs(songs);
    setChatMood(mood || null);
    setCurrentSuggestionId(suggestionId);
    setShowChatSuggestions(true);
    
    // Auto-close chat and show suggestions
    setShowChat(false);
    
    // Optionally set the mood selector to match
    if (mood) {
      setSelectedMood(mood);
    }
  };

  const handlePlayChatSuggestion = (song: Song) => {
    // Mark suggestion as played in discovery system
    if (currentSuggestionId) {
      discoveryIntegration.markSuggestionPlayed(currentSuggestionId, song.id);
    }
    
    // Play the suggested song and add others to queue
    handlePlay(song);
    
    // Add remaining suggestions to queue
    const otherSongs = chatSuggestedSongs.filter(s => s.id !== song.id);
    if (otherSongs.length > 0) {
      addSongsToQueue(otherSongs);
    }
  };

  const handlePlayAllChatSuggestions = () => {
    if (chatSuggestedSongs.length > 0) {
      // Mark first song as played
      if (currentSuggestionId && chatSuggestedSongs[0]) {
        discoveryIntegration.markSuggestionPlayed(currentSuggestionId, chatSuggestedSongs[0].id);
      }
      
      playFromMood(chatSuggestedSongs);
    }
  };

  const handleAddChatSuggestionsToQueue = () => {
    if (chatSuggestedSongs.length > 0) {
      // Mark suggestion as queued
      if (currentSuggestionId) {
        discoveryIntegration.markSuggestionQueued(currentSuggestionId);
      }
      
      addSongsToQueue(chatSuggestedSongs);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Setup Notification */}
      <SetupNotification />
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                GoodMusic
              </h1>
            </div>

            {/* Navigation */}
            <Navigation
              onChatOpen={() => setShowChat(true)}
              onDownloadsOpen={() => setShowDownloads(true)}
              onSettingsOpen={() => setShowSettings(true)}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 md:pb-24">
        {/* Hero Section */}
        <div className="text-center py-8 sm:py-12 lg:py-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Music for Your Mood
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto px-4">
            No signup, no fluff, just good music. Discover, stream, and download music that matches your emotional state.
          </p>
        </div>

        {/* Discovery Insights */}
        <div className="mb-6 sm:mb-8">
          <DiscoveryInsights />
        </div>

        {/* Mood Selector */}
        <div className="mb-8 sm:mb-12">
          <MoodSelector
            selectedMood={selectedMood}
            onMoodSelect={handleMoodSelect}
          />
        </div>

        {/* Chat Suggestions */}
        {showChatSuggestions && chatSuggestedSongs.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Recommended for You</h2>
                  <p className="text-sm sm:text-base text-gray-400">
                    Based on our conversation {chatMood && `• ${chatMood} vibes`}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handlePlayAllChatSuggestions}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                  <span>Play All</span>
                </button>
                
                <button
                  onClick={handleAddChatSuggestionsToQueue}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add to Queue</span>
                </button>
                
                <button
                  onClick={() => setShowChatSuggestions(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors self-center sm:self-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
              {chatSuggestedSongs.map((song) => (
                <div key={song.id} className="relative">
                  <SongCard
                    song={song}
                    onPlay={handlePlayChatSuggestion}
                    onDownload={handleDownload}
                    isPlaying={isCurrentSong(song.id)}
                    className="border-2 border-purple-500/30 shadow-lg shadow-purple-500/10"
                  />
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
                    💬 Suggested
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Song Grid */}
        <div className="mb-8 sm:mb-12">
          <SongGrid
            selectedMood={selectedMood}
            onPlay={handlePlay}
            onDownload={handleDownload}
            currentlyPlaying={state.currentSong?.id || null}
            onPlayAll={handlePlayAll}
            onAddAllToQueue={handleAddAllToQueue}
          />
        </div>
      </main>

      {/* Audio Player */}
      <AudioPlayer
        currentSong={state.currentSong}
        isPlaying={state.isPlaying}
        onPlayPause={actions.toggle}
        onSeek={actions.seek}
        onNext={actions.next}
        onPrevious={actions.previous}
        onVolumeChange={actions.setVolume}
        onShowQueue={() => setShowQueue(true)}
        queueLength={state.queue.length}
      />

      {/* Queue Panel */}
      <QueuePanel
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        queue={state.queue}
        currentIndex={state.currentIndex}
        isPlaying={state.isPlaying}
        onPlay={actions.jumpToIndex}
        onRemove={actions.removeFromQueue}
        onClear={actions.clearQueue}
      />

      {/* Downloads Panel */}
      {showDownloads && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs sm:max-w-2xl lg:max-w-4xl max-h-[90vh] sm:max-h-[80vh] relative">
            <button
              onClick={() => setShowDownloads(false)}
              className="absolute -top-8 sm:-top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <DownloadsPanel />
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs sm:max-w-lg lg:max-w-2xl max-h-[90vh] sm:max-h-[80vh] relative">
            <button
              onClick={() => setShowChat(false)}
              className="absolute -top-8 sm:-top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ChatBot
              onSongSuggestion={handleChatSongSuggestion}
              onPlay={handlePlay}
              onDownload={handleDownload}
            />
          </div>
        </div>
      )}



      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Footer */}
      <footer className="mt-12 sm:mt-16 p-4 sm:p-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p className="text-sm sm:text-base">&copy; 2025 GoodMusic - Discover music that matches your mood</p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <HomeContent />
        <StyleGuide />
      </AudioProvider>
    </ThemeProvider>
  );
}