// Mock data for development and testing

import { Song, Mood } from '@/types';
import { MOODS } from './constants';

export const mockSongs: Song[] = [
  {
    id: '1',
    title: 'Lofi Hip Hop Study Mix',
    artist: 'ChillBeats',
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg',
    duration: '3:45',
    mood: ['chill', 'focus'],
    youtubeUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  },
  {
    id: '2',
    title: 'Someone Like You',
    artist: 'Adele',
    thumbnail: 'https://img.youtube.com/vi/hLQl3WQQoQ0/maxresdefault.jpg',
    duration: '4:47',
    mood: ['heartbreak', 'nostalgic'],
    youtubeUrl: 'https://www.youtube.com/watch?v=hLQl3WQQoQ0'
  },
  {
    id: '3',
    title: 'Till I Collapse',
    artist: 'Eminem',
    thumbnail: 'https://img.youtube.com/vi/_Yhyp-_hX2s/maxresdefault.jpg',
    duration: '4:57',
    mood: ['hype', 'focus'],
    youtubeUrl: 'https://www.youtube.com/watch?v=_Yhyp-_hX2s'
  },
  {
    id: '4',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg',
    duration: '5:55',
    mood: ['nostalgic', 'party'],
    youtubeUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ'
  },
  {
    id: '5',
    title: 'Uptown Funk',
    artist: 'Mark Ronson ft. Bruno Mars',
    thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/maxresdefault.jpg',
    duration: '4:30',
    mood: ['party', 'hype'],
    youtubeUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0'
  },
  {
    id: '6',
    title: 'Weightless',
    artist: 'Marconi Union',
    thumbnail: 'https://img.youtube.com/vi/UfcAVejslrU/maxresdefault.jpg',
    duration: '8:10',
    mood: ['chill', 'focus'],
    youtubeUrl: 'https://www.youtube.com/watch?v=UfcAVejslrU'
  },
  {
    id: '7',
    title: 'Hurt',
    artist: 'Johnny Cash',
    thumbnail: 'https://img.youtube.com/vi/8AHCfZTRGiI/maxresdefault.jpg',
    duration: '3:38',
    mood: ['heartbreak', 'nostalgic'],
    youtubeUrl: 'https://www.youtube.com/watch?v=8AHCfZTRGiI'
  },
  {
    id: '8',
    title: 'Thunderstruck',
    artist: 'AC/DC',
    thumbnail: 'https://img.youtube.com/vi/v2AC41dglnM/maxresdefault.jpg',
    duration: '4:52',
    mood: ['hype', 'party'],
    youtubeUrl: 'https://www.youtube.com/watch?v=v2AC41dglnM'
  }
];

export const mockMoods: Mood[] = MOODS.map(mood => ({
  ...mood,
  keywords: [...mood.keywords]
}));

export const mockChatResponses = {
  greetings: [
    "Hey there! 👋 How are you feeling today? I'm here to help you find the perfect vibe.",
    "Welcome to VibePipe! 🎵 What's your mood like right now?",
    "Hi! Ready to discover some music that matches your soul? Tell me how you're feeling."
  ],
  chill: [
    "I hear you need some chill vibes 😌 Let me find some peaceful tracks to help you relax.",
    "Time to unwind! Here are some chill beats that'll soothe your mind 🌊",
    "Perfect choice for some me-time. These tracks will help you find your zen 🧘‍♀️"
  ],
  heartbreak: [
    "I'm sorry you're going through a tough time 💔 Music can be healing - here are some tracks that understand.",
    "Sometimes we need songs that match our pain. These tracks will be there for you 🤗",
    "Heartbreak is hard, but you're not alone. Let these songs comfort you through this moment 💙"
  ],
  hype: [
    "Let's get you PUMPED! 🔥 These tracks will get your energy flowing!",
    "Time to turn up the energy! These bangers will get you moving 💪",
    "Ready to conquer the world? These high-energy tracks have got your back! 🚀"
  ],
  nostalgic: [
    "Ah, the feels! 🌅 These throwback tracks will take you on a journey through time.",
    "Sometimes we need to revisit the good old days. These classics will hit different 📻",
    "Memory lane calling! These nostalgic gems will transport you back ✨"
  ],
  focus: [
    "Time to lock in! 🎯 These tracks will help you get in the zone and stay productive.",
    "Focus mode activated! These beats will keep you concentrated and motivated 📚",
    "Let's get that work done! These tracks are perfect for deep focus sessions 💻"
  ],
  party: [
    "Let's celebrate! 🎉 These party anthems will get everyone moving!",
    "Time to dance like nobody's watching! These tracks are pure fun 💃",
    "Party vibes incoming! These bangers will make any moment feel like a celebration 🕺"
  ],
  default: [
    "I'm still learning, but I'm here to help! 🤖 Try telling me about your mood or what you're doing.",
    "That's interesting! While I'm still a simple bot, I'd love to help you find some great music 🎵",
    "I'm just a placeholder AI for now, but I care about your vibes! What kind of music are you in the mood for? 💫"
  ]
};