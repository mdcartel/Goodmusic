'use client';

import { useState, useEffect, useRef } from 'react';
import { Song, ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Bot, 
  User, 
  Music, 
  Heart, 
  Sparkles,
  MessageCircle,
  Play,
  Download,
  Loader2
} from 'lucide-react';
import { Button, SongCard } from '@/components';

interface ChatBotProps {
  onSongSuggestion?: (songs: Song[], mood?: string) => void;
  onPlay?: (song: Song) => void;
  onDownload?: (song: Song, format: 'mp3' | 'mp4') => void;
  className?: string;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  currentMood?: string;
  suggestedSongs: Song[];
  followUpQuestions: string[];
  responseType?: 'supportive' | 'informational' | 'interactive' | 'musical';
}

export default function ChatBot({
  onSongSuggestion,
  onPlay,
  onDownload,
  className
}: ChatBotProps) {
  const [session, setSession] = useState<ChatSession>({
    id: `session-${Date.now()}`,
    messages: [],
    suggestedSongs: [],
    followUpQuestions: []
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Send welcome message on component mount
    if (session.messages.length === 0) {
      sendWelcomeMessage();
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollToBottom();
  }, [session.messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: "Hi there! 👋 I'm your music companion. I'm here to help you find the perfect songs for your mood. How are you feeling today?",
      sender: 'bot',
      timestamp: new Date()
    };

    setSession(prev => ({
      ...prev,
      messages: [welcomeMessage]
    }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to session
    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Send message to enhanced chatbot API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          sessionId: session.id,
          context: session.currentMood
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
          suggestedSongs: data.suggestedSongs
        };

        setSession(prev => ({
          ...prev,
          messages: [...prev.messages, botMessage],
          currentMood: data.mood || prev.currentMood,
          suggestedSongs: data.suggestedSongs || prev.suggestedSongs,
          followUpQuestions: data.followUpQuestions || [],
          responseType: data.responseType
        }));

        // Notify parent component about song suggestions
        if (data.suggestedSongs && onSongSuggestion) {
          onSongSuggestion(data.suggestedSongs, data.mood);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        text: "I'm sorry, I'm having trouble connecting right now. But I'm still here to help! Try telling me about your mood or what kind of music you're looking for. 🎵",
        sender: 'bot',
        timestamp: new Date()
      };

      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePlay = (song: Song) => {
    if (onPlay) {
      onPlay(song);
    }
  };

  const handleDownload = (song: Song, format: 'mp3' | 'mp4') => {
    if (onDownload) {
      onDownload(song, format);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn("bg-gray-800 rounded-lg border border-gray-700 flex flex-col", className)}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm sm:text-base">Music Companion</h3>
            <p className="text-xs sm:text-sm text-gray-400 truncate">
              {isTyping ? 'Typing...' : 'Here to help with your music mood'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400 hidden sm:inline">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto scrollbar-thin">
        {session.messages.map((message) => (
          <div key={message.id} className="space-y-3">
            {/* Message Bubble */}
            <div className={cn(
              "flex items-start space-x-2 sm:space-x-3",
              message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            )}>
              {/* Avatar */}
              <div className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.sender === 'user' 
                  ? 'bg-blue-500' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              )}>
                {message.sender === 'user' ? (
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                ) : (
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={cn(
                "max-w-[250px] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg",
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              )}>
                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.text}</p>
                <p className="text-xs mt-1 opacity-70">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>

            {/* Suggested Songs */}
            {message.suggestedSongs && message.suggestedSongs.length > 0 && (
              <div className="ml-8 sm:ml-11 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
                    <Music className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Here are some songs that might match your vibe:</span>
                  </div>
                  
                  {message.suggestedSongs && message.suggestedSongs.length > 0 && onSongSuggestion && (
                    <button
                      onClick={() => onSongSuggestion!(message.suggestedSongs!, session.currentMood)}
                      className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors self-start sm:self-auto touch-manipulation"
                    >
                      View in Main App
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:gap-3">
                  {message.suggestedSongs.slice(0, 3).map((song) => (
                    <div key={song.id} className="bg-gray-900 rounded-lg p-2 sm:p-3 border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            {song.thumbnail ? (
                              <img
                                src={song.thumbnail}
                                alt={song.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Music className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-xs sm:text-sm truncate">
                              {song.title}
                            </h4>
                            {song.artist && (
                              <p className="text-xs text-gray-400 truncate">
                                {song.artist}
                              </p>
                            )}
                            <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                              {song.mood.slice(0, 2).map((mood) => (
                                <span
                                  key={mood}
                                  className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-600 text-white rounded-full"
                                >
                                  {mood}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Button
                            onClick={() => handlePlay(song)}
                            variant="ghost"
                            size="sm"
                            className="p-1.5 sm:p-2 text-green-400 hover:text-green-300 touch-manipulation"
                          >
                            <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDownload(song, 'mp3')}
                            variant="ghost"
                            size="sm"
                            className="p-1.5 sm:p-2 text-blue-400 hover:text-blue-300 touch-manipulation"
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="bg-gray-700 px-3 sm:px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-gray-700">
        <div className="flex items-end space-x-2 sm:space-x-3">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me how you're feeling or what music you're looking for..."
              className="w-full px-3 sm:px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            variant="primary"
            size="sm"
            className="px-3 sm:px-4 py-2 touch-manipulation"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Follow-up Questions */}
        {session.followUpQuestions.length > 0 && !isLoading && (
          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-2">💭 You might want to explore:</div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {session.followUpQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="text-xs px-2 sm:px-3 py-1 bg-purple-700 text-purple-100 rounded-full hover:bg-purple-600 transition-colors touch-manipulation"
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
          {[
            "I'm feeling sad 😢",
            "I need energy! ⚡",
            "Help me focus 🎯",
            "Something chill 😌",
            "Party vibes! 🎉"
          ].map((quickMessage) => (
            <button
              key={quickMessage}
              onClick={() => setInputMessage(quickMessage)}
              className="text-xs px-2 sm:px-3 py-1 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors touch-manipulation"
              disabled={isLoading}
            >
              {quickMessage}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 sm:px-4 py-2 border-t border-gray-700 bg-gray-900 rounded-b-lg">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 text-center">
          <Sparkles className="w-3 h-3 flex-shrink-0" />
          <span className="hidden sm:inline">AI-powered music companion (MVP version with placeholder responses)</span>
          <span className="sm:hidden">AI music companion (MVP)</span>
        </div>
      </div>
    </div>
  );
}