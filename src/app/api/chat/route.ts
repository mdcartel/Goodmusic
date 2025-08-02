// Enhanced Chat API for VibePipe MVP
// Provides contextual AI responses and personalized music suggestions

import { NextRequest, NextResponse } from 'next/server';
import { Song } from '@/types';
import { ChatbotService } from '@/lib/chatbotService';
import { apiErrorMiddleware, ValidationError, ExternalServiceError } from '@/lib/errorHandler';
import { log } from '@/lib/logger';

// Placeholder emotional support responses
const EMOTIONAL_RESPONSES = {
  sad: [
    "I hear you're feeling down. Music can be such a healing companion. Let me find some gentle, comforting songs that might help you process these feelings. 💙",
    "It's okay to feel sad sometimes. These songs understand what you're going through and might help you feel less alone. 🤗",
    "I'm here with you. Sometimes the most beautiful music comes from sadness. Let me share some tracks that embrace these emotions with you. 🌙"
  ],
  happy: [
    "I love that you're feeling good! Let's keep that positive energy flowing with some uplifting tracks that match your vibe! ✨",
    "Your happiness is contagious! Here are some songs that celebrate joy and good vibes. 🌟",
    "That's wonderful to hear! Let me find some music that amplifies your positive mood. 😊"
  ],
  angry: [
    "I can feel your frustration. Sometimes we need music that acknowledges our anger and helps us channel it. These songs might help. 🔥",
    "It's valid to feel angry. Let me find some powerful tracks that can help you express and release these intense emotions. ⚡",
    "Anger is a natural emotion. These songs understand that fire inside you and might help you work through it. 💪"
  ],
  anxious: [
    "I understand you're feeling anxious. Let me find some calming, grounding music that might help ease your mind. 🌊",
    "Anxiety can be overwhelming. These gentle tracks are designed to help slow down racing thoughts and bring some peace. 🕊️",
    "You're not alone in feeling anxious. Music can be a safe space. Let me share some soothing songs with you. 🌸"
  ],
  energetic: [
    "I love your energy! Let's channel that into some high-energy tracks that match your vibe! 🚀",
    "You're buzzing with energy! Here are some songs that will keep that momentum going strong. ⚡",
    "That energy is amazing! Let me find some tracks that celebrate and amplify your powerful mood. 🔥"
  ],
  nostalgic: [
    "Nostalgia is such a beautiful, bittersweet feeling. Let me find some songs that honor those precious memories. 🌅",
    "There's something magical about looking back. These tracks capture that wistful, reflective mood perfectly. 📸",
    "Nostalgia connects us to our past selves. Here are some songs that embrace those tender, remembering moments. 💭"
  ],
  lonely: [
    "Feeling lonely is hard, but you're not truly alone. Music can be a companion. Let me share some songs that understand. 🤝",
    "Loneliness is a universal human experience. These tracks remind us that others have felt this way too. 🌙",
    "I'm here with you in this moment. Sometimes music is the best friend we can have. Let me find some comforting songs. 💜"
  ],
  default: [
    "I'm here to help you find the perfect music for your mood! Tell me more about how you're feeling, and I'll suggest some songs that match your vibe. 🎵",
    "Music has this amazing power to understand us. Whatever you're going through, there's probably a song that gets it. What's on your mind? 💭",
    "Every emotion deserves its soundtrack. I'm here to help you find yours. What kind of mood are you in today? 🎶"
  ]
};

// Mock song database for suggestions
const MOCK_SONGS: Song[] = [
  // Sad/Melancholic
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

  // Happy/Uplifting
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
  },

  // Energetic/Hype
  {
    id: 'energy-1',
    title: 'Thunder',
    artist: 'Imagine Dragons',
    thumbnail: '/api/placeholder/thumbnail/energy-1',
    duration: '3:07',
    mood: ['energetic', 'hype', 'motivational'],
    youtubeUrl: 'https://www.youtube.com/watch?v=fKopy74weus'
  },
  {
    id: 'energy-2',
    title: 'Pump It',
    artist: 'The Black Eyed Peas',
    thumbnail: '/api/placeholder/thumbnail/energy-2',
    duration: '3:33',
    mood: ['energetic', 'party', 'hype'],
    youtubeUrl: 'https://www.youtube.com/watch?v=ZaI2IlHwmgQ'
  },
  {
    id: 'energy-3',
    title: 'Stronger',
    artist: 'Kelly Clarkson',
    thumbnail: '/api/placeholder/thumbnail/energy-3',
    duration: '3:42',
    mood: ['energetic', 'empowering', 'motivational'],
    youtubeUrl: 'https://www.youtube.com/watch?v=Xn676-fLq7I'
  },

  // Chill/Relaxing
  {
    id: 'chill-1',
    title: 'Weightless',
    artist: 'Marconi Union',
    thumbnail: '/api/placeholder/thumbnail/chill-1',
    duration: '8:08',
    mood: ['chill', 'relaxing', 'ambient'],
    youtubeUrl: 'https://www.youtube.com/watch?v=UfcAVejslrU'
  },
  {
    id: 'chill-2',
    title: 'River',
    artist: 'Leon Bridges',
    thumbnail: '/api/placeholder/thumbnail/chill-2',
    duration: '4:02',
    mood: ['chill', 'soulful', 'peaceful'],
    youtubeUrl: 'https://www.youtube.com/watch?v=0Hegd4xNfRo'
  },
  {
    id: 'chill-3',
    title: 'Holocene',
    artist: 'Bon Iver',
    thumbnail: '/api/placeholder/thumbnail/chill-3',
    duration: '5:36',
    mood: ['chill', 'introspective', 'indie'],
    youtubeUrl: 'https://www.youtube.com/watch?v=TWcyIpul8OE'
  },

  // Focus/Concentration
  {
    id: 'focus-1',
    title: 'Ludovico Einaudi - Nuvole Bianche',
    artist: 'Ludovico Einaudi',
    thumbnail: '/api/placeholder/thumbnail/focus-1',
    duration: '5:57',
    mood: ['focus', 'classical', 'peaceful'],
    youtubeUrl: 'https://www.youtube.com/watch?v=kcihcYEOeic'
  },
  {
    id: 'focus-2',
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie',
    thumbnail: '/api/placeholder/thumbnail/focus-2',
    duration: '3:32',
    mood: ['focus', 'classical', 'minimalist'],
    youtubeUrl: 'https://www.youtube.com/watch?v=S-Xm7s9eGxU'
  },
  {
    id: 'focus-3',
    title: 'Porcelain',
    artist: 'Moby',
    thumbnail: '/api/placeholder/thumbnail/focus-3',
    duration: '4:01',
    mood: ['focus', 'electronic', 'ambient'],
    youtubeUrl: 'https://www.youtube.com/watch?v=QhZnEagfjTQ'
  }
];

// Detect mood from user message
function detectMood(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Sad keywords
  if (lowerMessage.match(/\b(sad|depressed|down|blue|crying|tears|heartbreak|lonely|empty|hurt|pain|grief|loss|miss|broken)\b/)) {
    return 'sad';
  }
  
  // Happy keywords
  if (lowerMessage.match(/\b(happy|joy|excited|great|amazing|wonderful|fantastic|good|positive|cheerful|upbeat|celebration)\b/)) {
    return 'happy';
  }
  
  // Angry keywords
  if (lowerMessage.match(/\b(angry|mad|furious|pissed|frustrated|annoyed|rage|hate|upset|irritated)\b/)) {
    return 'angry';
  }
  
  // Anxious keywords
  if (lowerMessage.match(/\b(anxious|worried|nervous|stress|panic|overwhelmed|scared|afraid|tense)\b/)) {
    return 'anxious';
  }
  
  // Energetic keywords
  if (lowerMessage.match(/\b(energy|energetic|pumped|hyped|motivated|powerful|strong|intense|workout|gym|party)\b/)) {
    return 'energetic';
  }
  
  // Nostalgic keywords
  if (lowerMessage.match(/\b(nostalgic|memories|remember|past|childhood|old|vintage|throwback|reminisce)\b/)) {
    return 'nostalgic';
  }
  
  // Lonely keywords
  if (lowerMessage.match(/\b(lonely|alone|isolated|solitude|abandoned|disconnected)\b/)) {
    return 'lonely';
  }
  
  // Chill keywords
  if (lowerMessage.match(/\b(chill|relax|calm|peaceful|zen|mellow|laid.back|easy|smooth|ambient)\b/)) {
    return 'chill';
  }
  
  // Focus keywords
  if (lowerMessage.match(/\b(focus|concentrate|study|work|productivity|meditation|mindful)\b/)) {
    return 'focus';
  }
  
  return 'default';
}

// Get songs for detected mood
function getSongsForMood(mood: string): Song[] {
  const moodMap: Record<string, string[]> = {
    sad: ['sad', 'melancholic', 'heartbreak', 'introspective'],
    happy: ['happy', 'uplifting', 'feel-good', 'party'],
    angry: ['energetic', 'hype', 'powerful'],
    anxious: ['chill', 'peaceful', 'ambient', 'relaxing'],
    energetic: ['energetic', 'hype', 'motivational', 'party'],
    nostalgic: ['nostalgic', 'indie', 'contemplative'],
    lonely: ['sad', 'introspective', 'soulful'],
    chill: ['chill', 'relaxing', 'peaceful', 'ambient'],
    focus: ['focus', 'classical', 'ambient', 'minimalist'],
    default: ['chill', 'happy', 'energetic']
  };

  const targetMoods = moodMap[mood] || moodMap.default;
  
  return MOCK_SONGS.filter(song => 
    song.mood.some(songMood => targetMoods.includes(songMood))
  ).slice(0, 3);
}

// Get random response for mood
function getResponseForMood(mood: string): string {
  const responses = EMOTIONAL_RESPONSES[mood as keyof typeof EMOTIONAL_RESPONSES] || EMOTIONAL_RESPONSES.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

// POST /api/chat - Process chat message and return contextual response
async function postChatHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { message, sessionId, context } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      throw new ValidationError('Message is required and must be a string');
    }

    if (message.length > 1000) {
      throw new ValidationError('Message is too long (max 1000 characters)');
    }

    // Generate session ID if not provided
    const chatSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    log.debug('Processing chat message', 'Chat', { 
      sessionId: chatSessionId, 
      messageLength: message.length 
    });

    // Get chatbot service instance
    const chatbotService = ChatbotService.getInstance();

    // Generate contextual response
    const chatbotResponse = await chatbotService.generateResponse(
      message,
      chatSessionId,
      context
    );

    // Add natural response delay
    const responseDelay = 800 + Math.random() * 1200;
    await new Promise(resolve => setTimeout(resolve, responseDelay));

    const duration = Date.now() - startTime;
    
    log.chatbot(chatSessionId, message, chatbotResponse.text, duration);

    return NextResponse.json({
      success: true,
      response: chatbotResponse.text,
      mood: chatbotResponse.mood,
      suggestedSongs: chatbotResponse.suggestedSongs,
      followUpQuestions: chatbotResponse.followUpQuestions,
      responseType: chatbotResponse.responseType,
      sessionId: chatSessionId,
      context: {
        sessionId: chatSessionId,
        detectedMood: chatbotResponse.mood,
        messageLength: message.length,
        timestamp: new Date().toISOString(),
        conversationContext: chatbotService.getContextSummary(chatSessionId)
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Failed to process chat message', 'Chat', { duration }, error as Error);
    throw error; // Re-throw to be handled by middleware
  }
}

// GET /api/chat - Get chat capabilities and sample responses
async function getChatHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    log.debug('Fetching chat capabilities', 'Chat');
    
    const response = {
      success: true,
      data: {
        capabilities: [
          'Emotional support and understanding',
          'Music recommendations based on mood',
          'Conversation about feelings and emotions',
          'Song suggestions with play/download options'
        ],
        supportedMoods: Object.keys(EMOTIONAL_RESPONSES),
        sampleMessages: [
          "I'm feeling really sad today",
          "I need some energy for my workout",
          "Help me find music to focus while studying",
          "I'm in a nostalgic mood",
          "Something chill to relax to"
        ],
        note: 'This is an MVP version with placeholder AI responses. Future versions will include advanced AI capabilities.'
      }
    };

    const duration = Date.now() - startTime;
    log.info('Chat capabilities fetched successfully', 'Chat', { duration });

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Failed to fetch chat capabilities', 'Chat', { duration }, error as Error);
    throw error; // Re-throw to be handled by middleware
  }
}

export const POST = apiErrorMiddleware(postChatHandler);
export const GET = apiErrorMiddleware(getChatHandler);