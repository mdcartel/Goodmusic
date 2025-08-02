// Enhanced chatbot service with context management and emotional intelligence
// Provides therapeutic responses and music recommendations

import { Song, ChatMessage } from '@/types';
import { LocalStorage } from './storage';

export interface ChatContext {
  sessionId: string;
  currentMood?: string;
  previousMoods: string[];
  conversationHistory: ChatMessage[];
  userPreferences: {
    preferredGenres: string[];
    avoidedTopics: string[];
    responseStyle: 'supportive' | 'casual' | 'professional';
  };
  emotionalState: {
    intensity: number; // 1-10 scale
    stability: number; // how consistent the mood has been
    progression: 'improving' | 'declining' | 'stable';
  };
  lastInteraction: Date;
  sessionStarted: Date;
}

export interface ResponseContext {
  detectedMood: string;
  moodConfidence: number;
  emotionalKeywords: string[];
  conversationLength: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isFirstMessage: boolean;
  hasRepeatedMood: boolean;
}

export interface ChatbotResponse {
  text: string;
  suggestedSongs: Song[];
  mood: string;
  followUpQuestions?: string[];
  contextUpdate?: Partial<ChatContext>;
  responseType: 'supportive' | 'informational' | 'interactive' | 'musical';
}

export class ChatbotService {
  private static instance: ChatbotService;
  private contexts: Map<string, ChatContext> = new Map();

  // Enhanced emotional responses with context awareness
  private readonly EMOTIONAL_RESPONSES = {
    sad: {
      initial: [
        "I can hear the sadness in your words, and I want you to know that what you're feeling is completely valid. 💙 Sometimes music can be a gentle companion through difficult emotions.",
        "It sounds like you're going through a tough time right now. I'm here with you, and I'd love to help you find some music that understands what you're feeling. 🤗",
        "Sadness can feel so heavy sometimes. Let me share some songs that might help you process these feelings or just sit with them in a gentle way. 🌙"
      ],
      followUp: [
        "I notice you're still feeling down. That's okay - healing isn't linear. Would you like some different music, or shall we explore what's behind these feelings?",
        "You've been carrying this sadness for a while. Sometimes the most beautiful music comes from our deepest emotions. How can I support you today?",
        "I see you're returning to these sad feelings. Music can be both a mirror and a bridge. What kind of musical journey feels right for you now?"
      ],
      supportive: [
        "Your feelings matter, and it's brave of you to acknowledge them. These songs understand that sadness is part of the human experience.",
        "Even in sadness, there's beauty. These tracks honor your emotions while gently holding space for hope.",
        "You're not alone in feeling this way. Let these songs be companions in your emotional journey."
      ]
    },
    happy: {
      initial: [
        "I love feeling your positive energy! ✨ Let's amplify that joy with some music that celebrates exactly how you're feeling right now.",
        "Your happiness is contagious! 🌟 I've got some perfect tracks that will keep that beautiful energy flowing.",
        "What a wonderful mood to be in! Let me find some songs that match your bright spirit and maybe even lift you higher. 😊"
      ],
      followUp: [
        "I love seeing you in such a good mood again! Your joy is inspiring. Ready for more uplifting music?",
        "You seem to have found your happy place! These songs will keep that positive momentum going.",
        "Your consistent happiness is beautiful to witness. Let's celebrate with some more feel-good music!"
      ],
      supportive: [
        "Your joy is a gift - to yourself and everyone around you. These songs celebrate that light within you.",
        "Happiness looks good on you! Let these tracks amplify all the good vibes you're radiating.",
        "Keep shining! These songs are here to dance along with your beautiful energy."
      ]
    },
    anxious: {
      initial: [
        "I can sense the anxiety you're carrying, and I want you to know that you're safe here. 🌊 Let me find some music that can help slow down those racing thoughts.",
        "Anxiety can make everything feel overwhelming. Take a deep breath with me, and let's find some calming sounds to ground you. 🕊️",
        "Those anxious feelings are so real and valid. Music can be an anchor when everything feels uncertain. Let me help you find some peace. 🌸"
      ],
      followUp: [
        "I notice the anxiety is still with you. That's completely normal. Would you like to try some different calming music, or shall we explore some breathing techniques together?",
        "Anxiety can be persistent, but so can healing. These new songs might offer a different kind of comfort for your nervous system.",
        "You're doing great by continuing to reach out when you feel anxious. Let's try some music that works with your body's natural rhythms."
      ],
      supportive: [
        "Your nervous system is just trying to protect you. These gentle sounds can help signal safety to your body.",
        "Anxiety is information, not a life sentence. Let these calming tracks help you find your center again.",
        "You're stronger than your anxiety, even when it doesn't feel that way. These songs believe in your resilience."
      ]
    },
    angry: {
      initial: [
        "I can feel the intensity of your anger, and that's completely valid. 🔥 Sometimes we need music that acknowledges our fire before we can transform it.",
        "Anger is energy, and it's telling you something important. Let me find some powerful music that honors that strength while helping you channel it. ⚡",
        "Your anger deserves to be heard and respected. These songs understand that fury and can help you express it safely. 💪"
      ],
      followUp: [
        "That anger is still burning strong. Sometimes we need to feel it fully before we can release it. Ready for some more powerful music?",
        "I see you're still processing that intense energy. Anger can be a teacher. What is it trying to tell you today?",
        "Your anger has staying power - that means it's connected to something important. Let's explore it through music."
      ],
      supportive: [
        "Your anger is information about your boundaries and values. These songs honor that fierce energy within you.",
        "Anger can be a catalyst for change. Let these powerful tracks help you transform that energy into something meaningful.",
        "You have every right to feel angry. These songs understand that fire and can help you wield it wisely."
      ]
    },
    lonely: {
      initial: [
        "Loneliness can feel so isolating, but you're not truly alone - I'm here with you, and so is the music. 🤝 Let me find some songs that understand that ache.",
        "I hear the loneliness in your words, and I want you to know that reaching out takes courage. These songs can be companions in the quiet moments. 💜",
        "Loneliness is one of the most human experiences, and yet it makes us feel so disconnected. Let music be a bridge back to connection. 🌙"
      ],
      followUp: [
        "Loneliness can be such a persistent companion. But you keep reaching out, and that shows incredible strength. How can music support you today?",
        "I notice you're still feeling alone. Sometimes the most beautiful connections happen through music that truly understands us.",
        "Your loneliness is valid, and so is your need for connection. These songs remind us that we're all more connected than we realize."
      ],
      supportive: [
        "Even in loneliness, you're part of the vast human experience. These songs connect you to others who've felt exactly this way.",
        "Loneliness is temporary, but the music that comforts us becomes part of our story forever.",
        "You're never as alone as you feel. These songs are proof that others have walked this path and found their way back to connection."
      ]
    }
  };

  // Mock song database organized by emotional categories
  private readonly SONG_DATABASE: Record<string, Song[]> = {
    sad: [
      {
        id: 'sad-1',
        title: 'Breathe Me',
        artist: 'Sia',
        thumbnail: '/api/placeholder/thumbnail/sad-1',
        duration: '4:31',
        mood: ['sad', 'introspective', 'healing'],
        youtubeUrl: 'https://www.youtube.com/watch?v=hSjIz8oQuko'
      },
      {
        id: 'sad-2',
        title: 'Mad World',
        artist: 'Gary Jules',
        thumbnail: '/api/placeholder/thumbnail/sad-2',
        duration: '3:07',
        mood: ['sad', 'melancholic', 'contemplative'],
        youtubeUrl: 'https://www.youtube.com/watch?v=4N3N1MlvVc4'
      },
      {
        id: 'sad-3',
        title: 'The Night We Met',
        artist: 'Lord Huron',
        thumbnail: '/api/placeholder/thumbnail/sad-3',
        duration: '3:28',
        mood: ['sad', 'nostalgic', 'heartbreak'],
        youtubeUrl: 'https://www.youtube.com/watch?v=KtlgYxa6BMU'
      },
      {
        id: 'sad-4',
        title: 'Hurt',
        artist: 'Johnny Cash',
        thumbnail: '/api/placeholder/thumbnail/sad-4',
        duration: '3:38',
        mood: ['sad', 'reflective', 'profound'],
        youtubeUrl: 'https://www.youtube.com/watch?v=8AHCfZTRGiI'
      }
    ],
    happy: [
      {
        id: 'happy-1',
        title: 'Good as Hell',
        artist: 'Lizzo',
        thumbnail: '/api/placeholder/thumbnail/happy-1',
        duration: '2:39',
        mood: ['happy', 'empowering', 'confident'],
        youtubeUrl: 'https://www.youtube.com/watch?v=SmbmeOgWsqE'
      },
      {
        id: 'happy-2',
        title: 'Walking on Sunshine',
        artist: 'Katrina and the Waves',
        thumbnail: '/api/placeholder/thumbnail/happy-2',
        duration: '3:58',
        mood: ['happy', 'uplifting', 'energetic'],
        youtubeUrl: 'https://www.youtube.com/watch?v=iPUmE-tne5U'
      },
      {
        id: 'happy-3',
        title: 'Can\'t Stop the Feeling!',
        artist: 'Justin Timberlake',
        thumbnail: '/api/placeholder/thumbnail/happy-3',
        duration: '3:56',
        mood: ['happy', 'party', 'feel-good'],
        youtubeUrl: 'https://www.youtube.com/watch?v=ru0K8uYEZWw'
      }
    ],
    anxious: [
      {
        id: 'calm-1',
        title: 'Weightless',
        artist: 'Marconi Union',
        thumbnail: '/api/placeholder/thumbnail/calm-1',
        duration: '8:08',
        mood: ['chill', 'relaxing', 'ambient'],
        youtubeUrl: 'https://www.youtube.com/watch?v=UfcAVejslrU'
      },
      {
        id: 'calm-2',
        title: 'Clair de Lune',
        artist: 'Claude Debussy',
        thumbnail: '/api/placeholder/thumbnail/calm-2',
        duration: '4:42',
        mood: ['peaceful', 'classical', 'serene'],
        youtubeUrl: 'https://www.youtube.com/watch?v=CvFH_6DNRCY'
      },
      {
        id: 'calm-3',
        title: 'River',
        artist: 'Leon Bridges',
        thumbnail: '/api/placeholder/thumbnail/calm-3',
        duration: '4:02',
        mood: ['chill', 'soulful', 'peaceful'],
        youtubeUrl: 'https://www.youtube.com/watch?v=0Hegd4xNfRo'
      }
    ],
    angry: [
      {
        id: 'power-1',
        title: 'Stronger',
        artist: 'Kelly Clarkson',
        thumbnail: '/api/placeholder/thumbnail/power-1',
        duration: '3:42',
        mood: ['energetic', 'empowering', 'motivational'],
        youtubeUrl: 'https://www.youtube.com/watch?v=Xn676-fLq7I'
      },
      {
        id: 'power-2',
        title: 'Thunder',
        artist: 'Imagine Dragons',
        thumbnail: '/api/placeholder/thumbnail/power-2',
        duration: '3:07',
        mood: ['energetic', 'hype', 'motivational'],
        youtubeUrl: 'https://www.youtube.com/watch?v=fKopy74weus'
      }
    ],
    lonely: [
      {
        id: 'connection-1',
        title: 'You\'re Not Alone',
        artist: 'Sade',
        thumbnail: '/api/placeholder/thumbnail/connection-1',
        duration: '5:21',
        mood: ['comforting', 'soulful', 'warm'],
        youtubeUrl: 'https://www.youtube.com/watch?v=S_E2EHVxNAE'
      },
      {
        id: 'connection-2',
        title: 'Lean on Me',
        artist: 'Bill Withers',
        thumbnail: '/api/placeholder/thumbnail/connection-2',
        duration: '4:17',
        mood: ['supportive', 'community', 'uplifting'],
        youtubeUrl: 'https://www.youtube.com/watch?v=fOZ-MySzAac'
      }
    ]
  };

  private constructor() {
    this.loadPersistedContexts();
  }

  static getInstance(): ChatbotService {
    if (!ChatbotService.instance) {
      ChatbotService.instance = new ChatbotService();
    }
    return ChatbotService.instance;
  }

  // Generate contextual response based on conversation history and emotional state
  async generateResponse(
    message: string,
    sessionId: string,
    existingContext?: string
  ): Promise<ChatbotResponse> {
    try {
      // Get or create context
      let context = this.getContext(sessionId);
      if (!context) {
        context = this.createNewContext(sessionId);
      }

      // Analyze the message
      const responseContext = this.analyzeMessage(message, context);
      
      // Update emotional state
      this.updateEmotionalState(context, responseContext);
      
      // Generate appropriate response
      const response = this.selectResponse(responseContext, context);
      
      // Get song suggestions
      const suggestedSongs = this.getSongSuggestions(responseContext, context);
      
      // Generate follow-up questions
      const followUpQuestions = this.generateFollowUpQuestions(responseContext, context);
      
      // Update context
      const updatedContext = this.updateContext(context, message, responseContext);
      this.contexts.set(sessionId, updatedContext);
      this.persistContexts();

      return {
        text: response,
        suggestedSongs,
        mood: responseContext.detectedMood,
        followUpQuestions,
        responseType: this.determineResponseType(responseContext, context)
      };

    } catch (error) {
      console.error('Error generating chatbot response:', error);
      return this.getFallbackResponse();
    }
  }

  private createNewContext(sessionId: string): ChatContext {
    return {
      sessionId,
      previousMoods: [],
      conversationHistory: [],
      userPreferences: {
        preferredGenres: [],
        avoidedTopics: [],
        responseStyle: 'supportive'
      },
      emotionalState: {
        intensity: 5,
        stability: 5,
        progression: 'stable'
      },
      lastInteraction: new Date(),
      sessionStarted: new Date()
    };
  }

  private analyzeMessage(message: string, context: ChatContext): ResponseContext {
    const lowerMessage = message.toLowerCase();
    
    // Detect mood with confidence scoring
    const moodAnalysis = this.detectMoodWithConfidence(lowerMessage);
    
    // Extract emotional keywords
    const emotionalKeywords = this.extractEmotionalKeywords(lowerMessage);
    
    // Determine time of day
    const timeOfDay = this.getTimeOfDay();
    
    // Check if this is a repeated mood
    const hasRepeatedMood = context.previousMoods.includes(moodAnalysis.mood);
    
    return {
      detectedMood: moodAnalysis.mood,
      moodConfidence: moodAnalysis.confidence,
      emotionalKeywords,
      conversationLength: context.conversationHistory.length,
      timeOfDay,
      isFirstMessage: context.conversationHistory.length === 0,
      hasRepeatedMood
    };
  }

  private detectMoodWithConfidence(message: string): { mood: string; confidence: number } {
    const moodPatterns = {
      sad: {
        keywords: ['sad', 'depressed', 'down', 'blue', 'crying', 'tears', 'heartbreak', 'lonely', 'empty', 'hurt', 'pain', 'grief', 'loss', 'miss', 'broken'],
        weight: 1.0
      },
      happy: {
        keywords: ['happy', 'joy', 'excited', 'great', 'amazing', 'wonderful', 'fantastic', 'good', 'positive', 'cheerful', 'upbeat', 'celebration', 'love', 'blessed'],
        weight: 1.0
      },
      angry: {
        keywords: ['angry', 'mad', 'furious', 'pissed', 'frustrated', 'annoyed', 'rage', 'hate', 'upset', 'irritated', 'livid', 'outraged'],
        weight: 1.0
      },
      anxious: {
        keywords: ['anxious', 'worried', 'nervous', 'stress', 'panic', 'overwhelmed', 'scared', 'afraid', 'tense', 'restless', 'uneasy'],
        weight: 1.0
      },
      lonely: {
        keywords: ['lonely', 'alone', 'isolated', 'solitude', 'abandoned', 'disconnected', 'empty', 'nobody', 'friendless'],
        weight: 1.0
      }
    };

    let bestMatch = { mood: 'default', confidence: 0 };

    for (const [mood, pattern] of Object.entries(moodPatterns)) {
      let score = 0;
      let matches = 0;

      for (const keyword of pattern.keywords) {
        if (message.includes(keyword)) {
          score += pattern.weight;
          matches++;
        }
      }

      // Calculate confidence based on matches and message length
      const confidence = Math.min((score / Math.max(message.split(' ').length * 0.1, 1)) * 100, 100);

      if (confidence > bestMatch.confidence) {
        bestMatch = { mood, confidence };
      }
    }

    return bestMatch.confidence > 20 ? bestMatch : { mood: 'default', confidence: 0 };
  }

  private extractEmotionalKeywords(message: string): string[] {
    const emotionalWords = [
      'feel', 'feeling', 'emotion', 'heart', 'soul', 'mind', 'thoughts', 'mood',
      'energy', 'vibe', 'spirit', 'overwhelmed', 'peaceful', 'chaotic', 'calm'
    ];

    return emotionalWords.filter(word => message.includes(word));
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private selectResponse(responseContext: ResponseContext, context: ChatContext): string {
    const { detectedMood, isFirstMessage, hasRepeatedMood } = responseContext;
    const responses = this.EMOTIONAL_RESPONSES[detectedMood as keyof typeof this.EMOTIONAL_RESPONSES];

    if (!responses) {
      return this.getDefaultResponse(responseContext, context);
    }

    // Select response type based on context
    let responseArray: string[];
    
    if (isFirstMessage) {
      responseArray = responses.initial;
    } else if (hasRepeatedMood && responses.followUp) {
      responseArray = responses.followUp;
    } else if (responses.supportive) {
      responseArray = responses.supportive;
    } else {
      responseArray = responses.initial;
    }

    // Add time-of-day context
    let selectedResponse = responseArray[Math.floor(Math.random() * responseArray.length)];
    
    if (responseContext.timeOfDay === 'morning') {
      selectedResponse = `Good morning! ${selectedResponse}`;
    } else if (responseContext.timeOfDay === 'evening') {
      selectedResponse = `Good evening. ${selectedResponse}`;
    } else if (responseContext.timeOfDay === 'night') {
      selectedResponse = `I'm here with you in these quiet night hours. ${selectedResponse}`;
    }

    return selectedResponse;
  }

  private getDefaultResponse(responseContext: ResponseContext, context: ChatContext): string {
    const defaultResponses = [
      "I'm here to listen and help you find music that resonates with your current state of mind. What's going on for you today?",
      "Thank you for sharing with me. Music has this incredible ability to meet us exactly where we are. How can I support you through sound today?",
      "I hear you, and I want to help you find the perfect musical companion for whatever you're experiencing right now.",
      "Every emotion deserves its soundtrack. Tell me more about what you're feeling, and let's find some music that understands."
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  private getSongSuggestions(responseContext: ResponseContext, context: ChatContext): Song[] {
    const { detectedMood } = responseContext;
    const songs = this.SONG_DATABASE[detectedMood] || this.SONG_DATABASE.sad;
    
    // Shuffle and return 2-3 songs
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  private generateFollowUpQuestions(responseContext: ResponseContext, context: ChatContext): string[] {
    const { detectedMood, conversationLength } = responseContext;

    const followUpQuestions: Record<string, string[]> = {
      sad: [
        "Would you like to talk about what's making you feel this way?",
        "Sometimes music helps us process difficult emotions. How does that sound?",
        "Are you looking for music to sit with these feelings, or something to help lift your spirits?"
      ],
      happy: [
        "What's bringing you joy today?",
        "Would you like some music to celebrate this good mood?",
        "Any particular reason for the happiness? I'd love to hear about it!"
      ],
      anxious: [
        "What's causing the anxiety right now?",
        "Would some calming music help, or would you prefer to talk through what's worrying you?",
        "Are there any breathing exercises or grounding techniques that usually help you?"
      ],
      angry: [
        "What's triggering this anger?",
        "Would you like some powerful music to help express these feelings?",
        "Sometimes anger is telling us something important. What might it be saying?"
      ],
      lonely: [
        "When did you start feeling this loneliness?",
        "Would you like some music that feels like companionship?",
        "What kind of connection are you missing most right now?"
      ]
    };

    const questions = followUpQuestions[detectedMood] || [
      "Tell me more about how you're feeling.",
      "What kind of music usually speaks to you?",
      "How can I best support you right now?"
    ];

    // Return 1-2 questions based on conversation length
    return questions.slice(0, conversationLength < 3 ? 2 : 1);
  }

  private updateEmotionalState(context: ChatContext, responseContext: ResponseContext): void {
    const { detectedMood, moodConfidence } = responseContext;
    
    // Update intensity based on confidence and keywords
    context.emotionalState.intensity = Math.max(1, Math.min(10, 
      context.emotionalState.intensity + (moodConfidence > 70 ? 1 : -0.5)
    ));

    // Update stability based on mood consistency
    if (context.currentMood === detectedMood) {
      context.emotionalState.stability = Math.min(10, context.emotionalState.stability + 0.5);
    } else {
      context.emotionalState.stability = Math.max(1, context.emotionalState.stability - 1);
    }

    // Update progression
    if (context.previousMoods.length > 0) {
      const recentMoods = context.previousMoods.slice(-3);
      const positiveMoods = ['happy', 'excited', 'grateful'];
      const negativeMoods = ['sad', 'angry', 'anxious', 'lonely'];

      const recentPositive = recentMoods.filter(mood => positiveMoods.includes(mood)).length;
      const recentNegative = recentMoods.filter(mood => negativeMoods.includes(mood)).length;

      if (recentPositive > recentNegative) {
        context.emotionalState.progression = 'improving';
      } else if (recentNegative > recentPositive) {
        context.emotionalState.progression = 'declining';
      } else {
        context.emotionalState.progression = 'stable';
      }
    }
  }

  private updateContext(
    context: ChatContext,
    message: string,
    responseContext: ResponseContext
  ): ChatContext {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    return {
      ...context,
      currentMood: responseContext.detectedMood,
      previousMoods: [...context.previousMoods, responseContext.detectedMood].slice(-10), // Keep last 10 moods
      conversationHistory: [...context.conversationHistory, userMessage].slice(-20), // Keep last 20 messages
      lastInteraction: new Date()
    };
  }

  private determineResponseType(
    responseContext: ResponseContext,
    context: ChatContext
  ): 'supportive' | 'informational' | 'interactive' | 'musical' {
    if (responseContext.moodConfidence > 70) {
      return 'supportive';
    } else if (responseContext.conversationLength < 2) {
      return 'interactive';
    } else if (responseContext.emotionalKeywords.length > 2) {
      return 'musical';
    } else {
      return 'informational';
    }
  }

  private getContext(sessionId: string): ChatContext | null {
    return this.contexts.get(sessionId) || null;
  }

  private getFallbackResponse(): ChatbotResponse {
    return {
      text: "I'm here to listen and help you find music that speaks to your soul. Sometimes the most beautiful conversations happen when we're just honest about how we're feeling. What's on your heart today?",
      suggestedSongs: this.SONG_DATABASE.sad.slice(0, 2),
      mood: 'default',
      responseType: 'supportive'
    };
  }

  private loadPersistedContexts(): void {
    try {
      const stored = LocalStorage.getItem('chatbot-contexts');
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [sessionId, context] of Object.entries(parsed)) {
          this.contexts.set(sessionId, context as ChatContext);
        }
      }
    } catch (error) {
      console.error('Failed to load chatbot contexts:', error);
    }
  }

  private persistContexts(): void {
    try {
      const contextsObj = Object.fromEntries(this.contexts);
      LocalStorage.setItem('chatbot-contexts', JSON.stringify(contextsObj));
    } catch (error) {
      console.error('Failed to persist chatbot contexts:', error);
    }
  }

  // Public methods for context management
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
    this.persistContexts();
  }

  getContextSummary(sessionId: string): any {
    const context = this.contexts.get(sessionId);
    if (!context) return null;

    return {
      sessionId: context.sessionId,
      currentMood: context.currentMood,
      emotionalState: context.emotionalState,
      conversationLength: context.conversationHistory.length,
      sessionDuration: Date.now() - context.sessionStarted.getTime(),
      lastInteraction: context.lastInteraction
    };
  }

  // Cleanup old contexts (older than 24 hours)
  cleanupOldContexts(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [sessionId, context] of this.contexts.entries()) {
      if (context.lastInteraction.getTime() < cutoff) {
        this.contexts.delete(sessionId);
      }
    }
    
    this.persistContexts();
  }
}