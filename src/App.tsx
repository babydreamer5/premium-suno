import React, { useState, useEffect } from 'react';

// Type definitions
interface DiaryEntry {
  id: string;
  date: string;
  time: string;
  mood: 'good' | 'normal' | 'bad';
  summary: string;
  keywords: string[];
  selectedEmotions: string[];
  customEmotion?: string;
  musicPlayed: MusicItem[];
  chatMessages: ChatMessage[];
  experienceGained: number;
  actionItems: string[];
  aiGenreSuggestion?: string;
  aiRecommendedMusic?: string;
  deletedAt?: string;
}

interface MusicItem {
  id: string;
  title: string;
  artist: string;
  genre: string;
  thumbnail: string;
  url: string;
  publishedAt: string;
  rating?: number;
  playCount?: number;
  preview_url?: string;
  album?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  musicRecommendation?: MusicItem | null;
  hasMusic?: boolean;
}

interface UserProgress {
  level: number;
  experience: number;
  totalEntries: number;
  consecutiveDays: number;
  expToNext: number;
  progressPercentage: number;
  isPremium: boolean;
}

interface AppSettings {
  aiName: string;
  theme: 'purple' | 'blue' | 'pink';
  isPremium: boolean;
  notifications: boolean;
}

// Constants
const APP_PASSWORD = "2752";
const MAX_FREE_TOKENS = 100000;

// Teen K-pop music genres with English descriptions
const MUSIC_GENRES = {
  teenbeats: {
    name: "Teen Beats",
    icon: "🎵",
    desc: "Trending teen vibes",
    searchKeywords: [
      "NEWJEANS",
      "IVE"
    ]
  },
  teengirlkpop: {
    name: "Girl Power K-pop",
    icon: "💖",
    desc: "Gen Z girl groups",
    searchKeywords: [
      "LE SSERAFIM",
      "VCHA"
    ]
  },
  highteen: {
    name: "High Teen K-pop",
    icon: "🌟",
    desc: "Bright & cheerful",
    searchKeywords: [
      "SEVENTEEN",
      "ENHYPEN"
    ]
  },
  teencrush: {
    name: "Teen Crush",
    icon: "🔥",
    desc: "Cool trendy idols",
    searchKeywords: [
      "ITZY",
      "Weeekly"
    ]
  },
  schoolplaylist: {
    name: "School Playlist",
    icon: "📚",
    desc: "Student life vibes",
    searchKeywords: [
      "After School",
      "NCT U"
    ]
  },
  kpopon: {
    name: "K-Pop ON!",
    icon: "🏆",
    desc: "2025 hits",
    searchKeywords: [
      "NewJeans",
      "aespa"
    ]
  }
};

const LEVEL_SYSTEM = {
  experienceBase: {
    1: 0, 2: 100, 3: 250, 4: 450, 5: 700,
    6: 1000, 7: 1350, 8: 1750, 9: 2200, 10: 2700,
    11: 3250, 12: 3850, 13: 4500, 14: 5200, 15: 6000
  },
  experienceGain: {
    diaryWrite: 20,
    musicSession: 10,
    consecutiveDays: 25,
    musicRating: 5,
    friendShare: 15,
    achievementUnlock: 50
  }
};

const THEMES = {
  purple: {
    name: 'EPLI Purple',
    primary: 'from-purple-500 to-pink-500',
    secondary: 'from-purple-100 to-pink-100',
    accent: 'purple-500',
    bgClass: 'from-purple-100 to-pink-100'
  },
  blue: {
    name: 'Music Blue',
    primary: 'from-blue-500 to-cyan-500',
    secondary: 'from-blue-100 to-cyan-100',
    accent: 'blue-500',
    bgClass: 'from-blue-100 to-cyan-100'
  },
  pink: {
    name: 'Feeling Pink',
    primary: 'from-pink-500 to-rose-500',
    secondary: 'from-pink-100 to-rose-100',
    accent: 'pink-500',
    bgClass: 'from-pink-100 to-rose-100'
  }
};

const AI_NAMES = ["Luna", "Melody", "Harmony", "Rhythm", "Muse"];

const EMOTION_OPTIONS = [
  "happy", "joy", "excited", "grateful", "satisfied", "peaceful", "calm", "relaxed",
  "worried", "anxious", "stressed", "tired", "sad", "down", "angry", "annoyed",
  "lonely", "disappointed", "regretful", "embarrassed", "surprised", "confused", "unmotivated", "bored"
];

const App: React.FC = () => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentStep, setCurrentStep] = useState<'login' | 'mood' | 'chat' | 'genre' | 'music' | 'summary' | 'stats' | 'settings' | 'trash' | 'calendar' | 'search' | 'myDiary' | 'myMusic'>('login');
  const [currentMood, setCurrentMood] = useState<'good' | 'normal' | 'bad' | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [trashEntries, setTrashEntries] = useState<DiaryEntry[]>([]);
  const [personalMusic, setPersonalMusic] = useState<MusicItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [summaryData, setSummaryData] = useState<any>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [customEmotion, setCustomEmotion] = useState('');
  const [userProgress, setUserProgress] = useState<UserProgress>({
    level: 1,
    experience: 0,
    totalEntries: 0,
    consecutiveDays: 0,
    expToNext: 100,
    progressPercentage: 0,
    isPremium: false
  });
  const [appSettings, setAppSettings] = useState<AppSettings>({
    aiName: 'Luna',
    theme: 'purple',
    isPremium: false,
    notifications: true
  });
  const [currentInput, setCurrentInput] = useState("");
  const [selectedMusic, setSelectedMusic] = useState<MusicItem | null>(null);
  const [recommendedMusic, setRecommendedMusic] = useState<MusicItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [expandedDiaryId, setExpandedDiaryId] = useState<string | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [usedMusicIds, setUsedMusicIds] = useState<Set<string>>(new Set());
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  // API keys from environment variables only
  const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const savedEntries = localStorage.getItem('diaryEntries');
        const savedProgress = localStorage.getItem('userProgress');
        const savedAuth = localStorage.getItem('isAuthenticated');
        const savedTokenUsage = localStorage.getItem('tokenUsage');
        const savedTrashEntries = localStorage.getItem('trashEntries');
        const savedPersonalMusic = localStorage.getItem('personalMusic');
        const savedSettings = localStorage.getItem('appSettings');
        const savedUsedMusicIds = localStorage.getItem('usedMusicIds');

        if (savedEntries) setDiaryEntries(JSON.parse(savedEntries));
        if (savedProgress) setUserProgress(JSON.parse(savedProgress));
        if (savedAuth) setIsAuthenticated(JSON.parse(savedAuth));
        if (savedTokenUsage) setTokenUsage(JSON.parse(savedTokenUsage));
        if (savedTrashEntries) setTrashEntries(JSON.parse(savedTrashEntries));
        if (savedPersonalMusic) setPersonalMusic(JSON.parse(savedPersonalMusic));
        if (savedSettings) setAppSettings(JSON.parse(savedSettings));
        if (savedUsedMusicIds) {
          const parsedIds = JSON.parse(savedUsedMusicIds);
          setUsedMusicIds(new Set(Array.isArray(parsedIds) ? parsedIds : []));
        }
      } catch (error) {
        console.error('Data loading error:', error);
      }
    };

    loadData();
    getSpotifyToken();
  }, []);

  // Save data
  useEffect(() => {
    try {
      localStorage.setItem('diaryEntries', JSON.stringify(diaryEntries));
      localStorage.setItem('userProgress', JSON.stringify(userProgress));
      localStorage.setItem('isAuthenticated', JSON.stringify(isAuthenticated));
      localStorage.setItem('tokenUsage', JSON.stringify(tokenUsage));
      localStorage.setItem('trashEntries', JSON.stringify(trashEntries));
      localStorage.setItem('personalMusic', JSON.stringify(personalMusic));
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
      localStorage.setItem('usedMusicIds', JSON.stringify(Array.from(usedMusicIds)));
    } catch (error) {
      console.error('Data saving error:', error);
    }
  }, [diaryEntries, userProgress, isAuthenticated, tokenUsage, trashEntries, personalMusic, appSettings, usedMusicIds]);

  // Get Spotify token
  const getSpotifyToken = async () => {
    try {
      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        console.error('Spotify Client ID or Secret not set.');
        return;
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
        },
        body: 'grant_type=client_credentials'
      });

      if (response.ok) {
        const data = await response.json();
        setSpotifyToken(data.access_token);
      } else {
        console.error('Failed to get Spotify token:', response.status);
      }
    } catch (error) {
      console.error('Spotify token error:', error);
    }
  };

  // Utility functions
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US');
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'good': return '😊';
      case 'normal': return '😐';
      case 'bad': return '😔';
      default: return '❓';
    }
  };

  const getMoodText = (mood: string) => {
    switch (mood) {
      case 'good': return 'Good';
      case 'normal': return 'Okay';
      case 'bad': return 'Not great';
      default: return 'Not selected';
    }
  };

  const calculateLevel = (experience: number) => {
    for (let level = 15; level >= 1; level--) {
      if (experience >= LEVEL_SYSTEM.experienceBase[level as keyof typeof LEVEL_SYSTEM.experienceBase]) {
        return level;
      }
    }
    return 1;
  };

  const updateExperience = (expGained: number) => {
    const newExp = userProgress.experience + expGained;
    const level = calculateLevel(newExp);
    const currentLevelExp = LEVEL_SYSTEM.experienceBase[level as keyof typeof LEVEL_SYSTEM.experienceBase] || 0;
    const nextLevelExp = LEVEL_SYSTEM.experienceBase[(level + 1) as keyof typeof LEVEL_SYSTEM.experienceBase] || newExp;
    const expToNext = nextLevelExp - newExp;
    const expProgress = newExp - currentLevelExp;
    const expNeeded = nextLevelExp - currentLevelExp;
    const progressPercentage = expNeeded > 0 ? (expProgress / expNeeded) * 100 : 100;

    setUserProgress(prev => ({
      ...prev,
      level,
      experience: newExp,
      expToNext: Math.max(0, expToNext),
      progressPercentage: Math.min(100, progressPercentage),
      totalEntries: prev.totalEntries + (expGained === LEVEL_SYSTEM.experienceGain.diaryWrite ? 1 : 0)
    }));

    if (level > userProgress.level) {
      alert(`Congrats! You've leveled up to Level ${level}!`);
    }
  };

  // Trash functions
  const moveToTrash = (entry: DiaryEntry) => {
    const deletedEntry = { ...entry, deletedAt: new Date().toISOString() };
    setTrashEntries(prev => [...prev, deletedEntry]);
    setDiaryEntries(prev => prev.filter(e => e.id !== entry.id));
  };

  const restoreFromTrash = (entry: DiaryEntry) => {
    const restoredEntry = { ...entry };
    delete restoredEntry.deletedAt;
    setDiaryEntries(prev => [...prev, restoredEntry]);
    setTrashEntries(prev => prev.filter(e => e.id !== entry.id));
  };

  // Search function
  const searchDiaries = (query: string) => {
    if (!query.trim()) return [];
      
    const lowerQuery = query.toLowerCase();
    return diaryEntries.filter(entry => 
      entry.summary.toLowerCase().includes(lowerQuery) ||
      entry.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery)) ||
      entry.selectedEmotions.some(emotion => emotion.toLowerCase().includes(lowerQuery)) ||
      entry.musicPlayed.some(music => music.title.toLowerCase().includes(lowerQuery)) ||
      entry.actionItems.some(action => action.toLowerCase().includes(lowerQuery))
    );
  };

  // OpenAI API call
  const callOpenAI = async (messages: any[], systemPrompt: string) => {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not set.');
    }

    if (tokenUsage >= MAX_FREE_TOKENS) {
      throw new Error('AI chat energy has run out.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const tokensUsed = data.usage?.total_tokens || 0;
    setTokenUsage(prev => prev + tokensUsed);

    return data.choices?.[0]?.message?.content;
  };

  // Spotify API call - optimized search
  const searchSpotifyMusic = async (query: string): Promise<MusicItem | null> => {
    if (!spotifyToken) {
      console.error('No Spotify token available.');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=US&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('Spotify API Error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
        
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        // Find unused music - fixed TypeScript error
        for (const item of data.tracks.items) {
          if (!usedMusicIds.has(item.id)) {
            // Add new music to used list - using Array.from
            setUsedMusicIds(prev => new Set([...Array.from(prev), item.id]));
              
            return {
              id: item.id,
              title: item.name,
              artist: item.artists.map((artist: any) => artist.name).join(', '),
              genre: 'recommended',
              thumbnail: item.album.images[0]?.url || '',
              url: item.external_urls.spotify,
              publishedAt: '',
              rating: 0,
              playCount: 0,
              preview_url: item.preview_url,
              album: item.album.name
            };
          }
        }
          
        // If all results are duplicates, return first result
        const item = data.tracks.items[0];
        return {
          id: item.id,
          title: item.name,
          artist: item.artists.map((artist: any) => artist.name).join(', '),
          genre: 'recommended',
          thumbnail: item.album.images[0]?.url || '',
          url: item.external_urls.spotify,
          publishedAt: '',
          rating: 0,
          playCount: 0,
          preview_url: item.preview_url,
          album: item.album.name
        };
      }
    } catch (error) {
      console.error('Spotify search error:', error);
    }

    return null;
  };

  // Get Spotify chart
  const getSpotifyChart = async (): Promise<MusicItem[]> => {
    if (!spotifyToken) {
      console.error('No Spotify token available.');
      return [];
    }

    try {
      // Get US Top 50 playlist
      const response = await fetch(
        'https://api.spotify.com/v1/playlists/37i9dQZEVXbLRQDuF5jeBp/tracks?market=US&limit=10',
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('Spotify Chart API Error:', response.status);
        return [];
      }

      const data = await response.json();
      const musicResults: MusicItem[] = [];

      if (data.items && data.items.length > 0) {
        data.items.forEach((item: any, index: number) => {
          if (item.track) {
            musicResults.push({
              id: item.track.id,
              title: `${index + 1}. ${item.track.name}`,
              artist: item.track.artists.map((artist: any) => artist.name).join(', '),
              genre: 'chart',
              thumbnail: item.track.album.images[0]?.url || '',
              url: item.track.external_urls.spotify,
              publishedAt: '',
              rating: 0,
              playCount: 0,
              preview_url: item.track.preview_url,
              album: item.track.album.name
            });
          }
        });
      }

      return musicResults;
    } catch (error) {
      console.error('Spotify chart fetch error:', error);
      return [];
    }
  };

  // Add to personal music
  const addToPersonalMusic = (music: MusicItem) => {
    setPersonalMusic(prev => {
      const existingIndex = prev.findIndex(m => m.id === music.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          playCount: (updated[existingIndex].playCount || 0) + 1
        };
        return updated;
      } else {
        return [...prev, { ...music, playCount: 1 }];
      }
    });
  };

  // AI response generation
  const getAIResponse = async (userMessage: string, conversationHistory: ChatMessage[]) => {
    const conversationNum = conversationCount + 1;
    setConversationCount(conversationNum);

    // Detect music recommendation keywords
    const musicKeywords = ['music', 'song', 'want to listen', 'recommend', 'playlist', 'melody'];
    const hasMusicRequest = musicKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );

    let systemPrompt = `You are ${appSettings.aiName}. You are an AI coach specializing in recommending music that matches users' emotions.

Current conversation context:
- Conversation number: ${conversationNum}
- User's emotional state: ${currentMood ? getMoodText(currentMood) : 'Not selected'}
- User level: ${userProgress.level}

Conversation rules:
1. First conversation: Greet friendly and ask about their day
2. Second conversation: Empathize with user's story and ask follow-up questions
3. From third conversation: Naturally suggest music recommendations
4. When music is requested: Recommend specific songs and artists from 2025, adding "[MUSIC_SEARCH: song title - artist]" format at the end

Priority music recommendations (based on 2025):
- K-pop: NewJeans, aespa, IVE, etc.
- Latest Korean drama OSTs 2025
- Movie OSTs 2025

Response style:
- Friendly and empathetic tone (use polite language)
- Concise and natural responses (1-2 sentences)
- Add cute emojis at the beginning or middle of responses (🎵, 💕, ✨, 🌟, 🎶, 💜, etc.)

Current situation: ${conversationNum <= 2 ? 'Not yet at music recommendation stage. Continue conversation' : 'Can naturally suggest music recommendations'}`;

    if (hasMusicRequest) {
      systemPrompt += `\n\nMusic request detected: User wants music, so recommend specific songs from 2025 and include search term in "[MUSIC_SEARCH: song title - artist]" format.`;
    }

    const messages = conversationHistory.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    messages.push({ role: 'user', content: userMessage });

    const aiResponse = await callOpenAI(messages, systemPrompt);
      
    // Check if music search request is included
    const musicSearchMatch = aiResponse.match(/\[MUSIC_SEARCH: ([^\]]+)\]/);
    if (musicSearchMatch) {
      const searchQuery = musicSearchMatch[1];
      const cleanResponse = aiResponse.replace(/\[MUSIC_SEARCH: [^\]]+\]/, '').trim();
        
      try {
        const musicResult = await searchSpotifyMusic(searchQuery);
        if (musicResult) {
          return {
            response: cleanResponse,
            music: musicResult
          };
        }
      } catch (error) {
        console.error('Music search error:', error);
      }
    }

    return { response: aiResponse, music: null };
  };

  // Generate conversation summary
  const generateConversationSummary = async (messages: ChatMessage[]) => {
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content).join('\n');

    if (!userMessages.trim()) {
      return {
        summary: 'We talked and shared emotions today',
        keywords: ['#emotions'],
        recommendedEmotions: ['peaceful', 'satisfied', 'relaxed'],
        actionItems: ['Great job today', 'Get enough rest'],
      };
    }

    const systemPrompt = `Please analyze the following conversation content from an emotion diary perspective:

Conversation content:
${userMessages}

Current emotional state: ${currentMood ? getMoodText(currentMood) : 'Not selected'}
Selected music genre: ${selectedGenre ? MUSIC_GENRES[selectedGenre as keyof typeof MUSIC_GENRES]?.name : 'Not selected'}

Analysis request:
1. Summarize today's events in 1-2 lines (write in casual tone, focus on emotions and situations)
2. Extract 5 emotion keywords from the conversation (e.g. #stress, #happiness, #tiredness, etc.)
3. Recommend 5 detailed emotions analyzed by AI from the conversation (e.g. happy, worried, excited, tired, satisfied, etc.)
4. Suggest 2 practical action items for the current situation

Response format:
Summary: [1-2 line summary - casual tone]
Emotion keywords: #keyword1, #keyword2, #keyword3, #keyword4, #keyword5
Recommended emotions: emotion1, emotion2, emotion3, emotion4, emotion5
Action items: item1 | item2`;

    try {
      const result = await callOpenAI([], systemPrompt);

      // Parse response
      const lines = result.split('\n');
      let summary = '';
      let keywords: string[] = [];
      let recommendedEmotions: string[] = [];
      let actionItems: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('Summary:')) {
          summary = trimmedLine.replace('Summary:', '').trim();
        } else if (trimmedLine.startsWith('Emotion keywords:')) {
          const keywordText = trimmedLine.replace('Emotion keywords:', '').trim();
          keywords = keywordText.split(',').map((k: string) => k.trim()).filter((k: string) => k);
        } else if (trimmedLine.startsWith('Recommended emotions:')) {
          const emotionText = trimmedLine.replace('Recommended emotions:', '').trim();
          recommendedEmotions = emotionText.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        } else if (trimmedLine.startsWith('Action items:')) {
          const actionText = trimmedLine.replace('Action items:', '').trim();
          actionItems = actionText.split('|').map((a: string) => a.trim()).filter((a: string) => a);
        }
      }

      return {
        summary: summary || 'We shared emotions and situations today',
        keywords: keywords.slice(0, 5),
        recommendedEmotions: recommendedEmotions.slice(0, 5),
        actionItems: actionItems.slice(0, 2)
      };
    } catch (error) {
      console.error('Conversation summary generation error:', error);
      return {
        summary: 'There was a problem generating the conversation summary',
        keywords: ['#emotions'],
        recommendedEmotions: ['peaceful', 'satisfied'],
        actionItems: ['Listen to music to soothe your mind', 'Get enough rest']
      };
    }
  };

  // Event handlers
  const handleLogin = (password: string) => {
    if (password === APP_PASSWORD) {
      setIsAuthenticated(true);
      setCurrentStep('mood');
    } else {
      alert('Password is incorrect.');
    }
  };

  const handleMoodSelect = (mood: 'good' | 'normal' | 'bad') => {
    setCurrentMood(mood);
    setCurrentStep('chat');
    setConversationCount(0);

    const initialMessage: ChatMessage = {
      role: 'assistant',
      content: `Hi there! 🎵 I see you're feeling ${getMoodText(mood)} today. Please tell me how your day went. ✨`,
      timestamp: new Date()
    };
    setChatMessages([initialMessage]);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || !currentMood) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setIsLoading(true);
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentInput("");

    try {
      const aiResult = await getAIResponse(currentInput, chatMessages);
        
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: aiResult.response,
        timestamp: new Date(),
        musicRecommendation: aiResult.music,
        hasMusic: !!aiResult.music
      };
        
      setChatMessages(prev => [...prev, aiMessage]);
        
      // If music was recommended, add to personal music list
      if (aiResult.music) {
        addToPersonalMusic(aiResult.music);
      }
        
    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry! 💜 There was a temporary issue. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Music genre selection - using Spotify API, speed optimized
  const handleGenreSelect = async (genre: string) => {
    setSelectedGenre(genre);
    setCurrentStep('music');
    setIsLoading(true);
      
    try {
      if (genre === 'kpopon') {
        // Get real-time chart
        const chartMusic = await getSpotifyChart();
        setRecommendedMusic(chartMusic);
      } else {
        const genreData = MUSIC_GENRES[genre as keyof typeof MUSIC_GENRES];
        const keywords = genreData?.searchKeywords || ['music'];
          
        const musicResults: MusicItem[] = []; // TypeScript type specification
          
        // Search maximum 2 keywords for speed improvement
        for (let i = 0; i < Math.min(2, keywords.length); i++) {
          const keyword = keywords[i];
          const music = await searchSpotifyMusic(keyword);
            
          if (music && !musicResults.find(m => m.id === music.id)) {
            musicResults.push(music);
          }
            
          // Reduce API call interval
          if (i < keywords.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
          
        setRecommendedMusic(musicResults);
      }
    } catch (error) {
      console.error('Music search error:', error);
      setRecommendedMusic([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMusicSelect = (music: MusicItem) => {
    setSelectedMusic(music);
    addToPersonalMusic(music);
    alert(`"${music.title}" has been added to your music list! You can check it in the emotion summary step or later in 'My Music'.`);
  };

  const handleGenerateSummary = async () => {
    if (!currentMood || chatMessages.length === 0) return;

    setIsLoading(true);
    try {
      const summary = await generateConversationSummary(chatMessages);
      setSummaryData(summary);
      setSelectedEmotions([]);
      setCustomEmotion('');
      setCurrentStep('summary');
    } catch (error) {
      console.error('Summary generation error:', error);
      alert('There was a problem generating the summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDiary = async () => {
    if (!currentMood || !summaryData) return;

    setIsLoading(true);

    try {
      const now = new Date();
      const finalEmotions = customEmotion.trim() ? [...selectedEmotions, customEmotion.trim()] : selectedEmotions;
        
      // Collect recommended music from conversation
      const chatMusic = chatMessages
        .filter(msg => msg.musicRecommendation)
        .map(msg => msg.musicRecommendation!)
        .filter(music => music);
        
      const newEntry: DiaryEntry = {
        id: generateId(),
        date: formatDate(now),
        time: formatTime(now),
        mood: currentMood,
        summary: summaryData.summary,
        keywords: summaryData.keywords,
        selectedEmotions: finalEmotions,
        customEmotion: customEmotion.trim() || undefined,
        musicPlayed: selectedMusic ? [selectedMusic, ...chatMusic] : chatMusic,
        chatMessages: chatMessages,
        experienceGained: LEVEL_SYSTEM.experienceGain.diaryWrite,
        actionItems: summaryData.actionItems || [],
        aiGenreSuggestion: summaryData.aiGenreSuggestion,
        aiRecommendedMusic: summaryData.aiRecommendedMusic
      };

      setDiaryEntries(prev => [...prev, newEntry]);
      updateExperience(LEVEL_SYSTEM.experienceGain.diaryWrite);

      // Reset state
      setChatMessages([]);
      setCurrentMood(null);
      setSelectedGenre(null);
      setSelectedMusic(null);
      setRecommendedMusic([]);
      setSummaryData(null);
      setSelectedEmotions([]);
      setCustomEmotion('');
      setConversationCount(0);
      setCurrentStep('mood');

      alert('Diary saved! +20 EXP');
    } catch (error) {
      console.error('Diary save error:', error);
      alert('There was a problem saving the diary.');
    } finally {
      setIsLoading(false);
    }
  };

  // Emotion selection function
  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotion)) {
        // Remove if already selected
        return prev.filter(e => e !== emotion);
      } else if (prev.length < 2) {
        // Add if less than 2
        return [...prev, emotion];
      } else {
        // If 2 already selected, remove first and add new one
        return [prev[1], emotion];
      }
    });
  };

  // AI name change function
  const handleAINameChange = (name: string) => {
    setAppSettings(prev => ({ ...prev, aiName: name }));
  };

  // Component rendering functions
  const getCurrentTheme = () => THEMES[appSettings.theme];

  const renderTokenBar = () => {
    const usageRatio = Math.min(tokenUsage / MAX_FREE_TOKENS, 1.0);
    const remaining = Math.max(0, MAX_FREE_TOKENS - tokenUsage);

    let color = '#9c27b0';
    let status = 'Plenty';

    if (usageRatio >= 0.95) {
      color = '#f44336';
      status = 'Running low';
    } else if (usageRatio >= 0.5) {
      color = '#ff9800';
      status = 'Moderate';
    }

    return (
      <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg p-4 mb-4 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800`}>AI Chat Energy</span>
          <span className={`text-xs text-${getCurrentTheme().accent.split('-')[0]}-600`}>{remaining.toLocaleString()} / {MAX_FREE_TOKENS.toLocaleString()} left</span>
        </div>
        <div className={`w-full bg-${getCurrentTheme().accent.split('-')[0]}-100 rounded-full h-2`}>
          <div
            className={`h-2 rounded-full transition-all bg-gradient-to-r ${getCurrentTheme().primary}`}
            style={{
              width: `${usageRatio * 100}%`
            }}
          ></div>
        </div>
        <div className={`text-center text-xs mt-1 text-${getCurrentTheme().accent.split('-')[0]}-600`}>
          Status: {status}
        </div>
      </div>
    );
  };

  const renderUserProgress = () => (
    <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-xl shadow-lg p-6 mb-6 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
      <div className="flex justify-between items-center mb-4">
        <span className={`text-lg font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>Level {userProgress.level}</span>
        <span className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>{userProgress.expToNext} EXP to next level</span>
      </div>
      <div className={`w-full bg-${getCurrentTheme().accent.split('-')[0]}-100 rounded-full h-3`}>
        <div
          className={`bg-gradient-to-r ${getCurrentTheme().primary} h-3 rounded-full transition-all`}
          style={{ width: `${userProgress.progressPercentage}%` }}
        ></div>
      </div>
      <div className={`text-center text-xs text-${getCurrentTheme().accent.split('-')[0]}-600 mt-2`}>
        Total EXP: {userProgress.experience} EXP
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center`}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-96">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎵</div>
          <h1 className={`text-2xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>EPLI</h1>
          <p className={`text-${getCurrentTheme().accent.split('-')[0]}-600`}>Emotion-based Music Recommendations</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="Enter password"
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLogin((e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📝 Today's Emotion Summary</h2>
          <p className="text-gray-600">Check AI analysis and select additional emotions</p>
        </div>

        {summaryData && (
          <div className="space-y-6">
            {/* Summary content */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">📖 Today's Story</h3>
              <p className="text-gray-700 leading-relaxed">{summaryData.summary}</p>
            </div>

            {/* Keywords */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🏷️ Emotion Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {summaryData.keywords.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className={`px-3 py-1 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-full text-sm`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* AI recommended emotions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🤖 AI Recommended Emotions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {summaryData.recommendedEmotions.map((emotion: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleEmotionSelect(emotion)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      selectedEmotions.includes(emotion)
                        ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white border-purple-500 shadow-lg transform scale-105`
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {emotion}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Select up to 2 emotions (Selected: {selectedEmotions.length}/2)</p>
            </div>

            {/* Custom emotion input */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">✍️ Custom Emotion Input</h3>
              <input
                type="text"
                value={customEmotion}
                onChange={(e) => setCustomEmotion(e.target.value)}
                placeholder="If you have other emotions, please enter directly"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={20}
              />
            </div>

            {/* Action items */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🎯 Recommended Actions</h3>
              <div className="space-y-2">
                {summaryData.actionItems.map((item: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-green-500">✅</span>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div className="text-center">
              <button
                onClick={handleSaveDiary}
                disabled={isLoading}
                className={`px-8 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50`}
              >
                💾 Save Diary (+20 EXP)
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep('chat')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  );

  const renderStats = () => {
    // Calculate mood statistics
    const moodStats = ['good', 'normal', 'bad'].map(mood => {
      const count = diaryEntries.filter(entry => entry.mood === mood).length;
      const percentage = diaryEntries.length > 0 ? (count / diaryEntries.length) * 100 : 0;
      return { mood, count, percentage };
    });

    // Emotion frequency statistics
    const emotionFreq: { [key: string]: number } = {};
    diaryEntries.forEach(entry => {
      entry.selectedEmotions?.forEach(emotion => {
        emotionFreq[emotion] = (emotionFreq[emotion] || 0) + 1;
      });
    });

    const topEmotions = Object.entries(emotionFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Calendar data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getCalendarData = (month: Date) => {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      const calendarData = [];
      const currentDate = new Date(startDate);

      for (let week = 0; week < 6; week++) {
        const weekData = [];
        for (let day = 0; day < 7; day++) {
          const dayEntries = diaryEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.toDateString() === currentDate.toDateString();
          });

          weekData.push({
            date: new Date(currentDate),
            entries: dayEntries,
            isCurrentMonth: currentDate.getMonth() === month.getMonth(),
            isToday: currentDate.toDateString() === new Date().toDateString()
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
        calendarData.push(weekData);
      }

      return calendarData;
    };

    const calendarData = getCalendarData(currentCalendarMonth);

    return (
      <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          {renderUserProgress()}
            
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">📊 Stats & 📅 Emotion Calendar</h2>
              <button
                onClick={() => setCurrentStep('mood')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🏠 Home
              </button>
            </div>

            {/* Statistics section */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">📊 Statistics</h3>
                
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`bg-gradient-to-r ${getCurrentTheme().primary} text-white p-6 rounded-lg`}>
                  <h4 className="text-lg font-semibold mb-2">Total Diaries</h4>
                  <p className="text-3xl font-bold">{diaryEntries.length}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2">Saved Music</h4>
                  <p className="text-3xl font-bold">{personalMusic.length}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2">Current Level</h4>
                  <p className="text-3xl font-bold">{userProgress.level}</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2">Total EXP</h4>
                  <p className="text-3xl font-bold">{userProgress.experience}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-4">Mood Distribution</h4>
                  <div className="space-y-3">
                    {moodStats.map(({ mood, count, percentage }) => (
                      <div key={mood} className="flex items-center space-x-3">
                        <span className="text-2xl">{getMoodEmoji(mood)}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{getMoodText(mood)}</span>
                            <span>{count} entries ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className={`w-full bg-${getCurrentTheme().accent.split('-')[0]}-100 rounded-full h-2`}>
                            <div
                              className={`bg-gradient-to-r ${getCurrentTheme().primary} h-2 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-4">Top 5 Frequent Emotions</h4>
                  <div className="space-y-2">
                    {topEmotions.length > 0 ? (
                      topEmotions.map(([emotion, count], index) => (
                        <div key={emotion} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{index + 1}</span>
                            <span className="font-medium">{emotion}</span>
                          </div>
                          <span className="text-sm text-gray-600">{count} times</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Not enough emotion data yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar section */}
            <div>
              <h3 className="text-xl font-bold mb-4">📅 Emotion Calendar</h3>
                
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => {
                    const newMonth = new Date(currentCalendarMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentCalendarMonth(newMonth);
                  }}
                  className={`px-4 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}
                >
                  ← Previous
                </button>
                <h4 className="text-lg font-bold">
                  {monthNames[currentCalendarMonth.getMonth()]} {currentCalendarMonth.getFullYear()}
                </h4>
                <button
                  onClick={() => {
                    const newMonth = new Date(currentCalendarMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentCalendarMonth(newMonth);
                  }}
                  className={`px-4 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}
                >
                  Next →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-4">
                {calendarData.flat().map((day, index) => (
                  <div
                    key={index}
                    className={`p-2 h-16 border rounded ${
                      day.isCurrentMonth ? 'bg-white' : 'bg-gray-100'
                    } ${day.isToday ? `ring-2 ring-${getCurrentTheme().accent}` : ''}`}
                  >
                    <div className="text-xs font-medium">{day.date.getDate()}</div>
                    {day.entries.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {day.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="relative group"
                          >
                            <div
                              className="w-2 h-2 rounded-full cursor-pointer"
                              style={{
                                backgroundColor: entry.mood === 'good' ? '#10b981' : 
                                               entry.mood === 'normal' ? '#f59e0b' : '#ef4444'
                              }}
                            />
                            <div className="absolute bottom-full left-0 mb-2 w-40 p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <p className="font-bold">{getMoodText(entry.mood)}: {entry.summary.substring(0, 30)}...</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Good</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs">Okay</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Not great</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMyDiary = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📖 My Diary</h2>
          <p className="text-gray-600">Total {diaryEntries.length} entries</p>
        </div>

        {diaryEntries.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-lg text-gray-600">No diary entries yet</p>
            <button
              onClick={() => setCurrentStep('mood')}
              className={`mt-4 px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90 transition-all`}
            >
              Write First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {diaryEntries.slice().reverse().map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                    <div>
                      <h3 className="font-bold text-gray-800">{entry.date} {entry.time}</h3>
                      <p className="text-sm text-gray-600">Mood: {getMoodText(entry.mood)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => moveToTrash(entry)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all"
                    title="Move to trash"
                  >
                    🗑️
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Summary</h4>
                    <p className="text-gray-600">{entry.summary}</p>
                  </div>

                  {entry.keywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-full text-xs`}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.selectedEmotions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Selected Emotions</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.selectedEmotions.map((emotion, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                          >
                            {emotion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.musicPlayed.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Music Listened</h4>
                      <div className="space-y-2">
                        {entry.musicPlayed.slice(0, 3).map((music, index) => (
                          <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                            <img
                              src={music.thumbnail}
                              alt={music.title}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{music.title}</p>
                              <p className="text-xs text-gray-600">{music.artist}</p>
                            </div>
                            <a
                              href={music.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-500 hover:text-green-700 text-xs"
                            >
                              🎧 Listen
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Action Items</h4>
                      <div className="space-y-1">
                        {entry.actionItems.map((item, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-green-500">✅</span>
                            <span className="text-sm text-gray-600">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderMyMusic = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🎵 My Music</h2>
          <p className="text-gray-600">Total {personalMusic.length} songs saved</p>
        </div>

        {personalMusic.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-4">🎶</div>
            <p className="text-lg text-gray-600">No saved music yet</p>
            <button
              onClick={() => setCurrentStep('genre')}
              className={`mt-4 px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90 transition-all`}
            >
              Find Music
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personalMusic.slice().reverse().map((music) => (
              <div key={music.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={music.thumbnail}
                    alt={music.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{music.title}</h3>
                    <p className="text-gray-600 text-xs">{music.artist}</p>
                    {music.playCount && (
                      <p className="text-xs text-purple-500 mt-1">Played {music.playCount} times</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <a
                    href={music.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block py-2 px-4 bg-green-500 text-white rounded-lg text-center text-sm hover:bg-green-600 transition-all"
                  >
                    🎧 Listen on Spotify
                  </a>
                    
                  {music.preview_url && (
                    <audio controls className="w-full">
                      <source src={music.preview_url} type="audio/mpeg" />
                      Your browser does not support audio preview.
                    </audio>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderSearch = () => {
    const searchResults = searchDiaries(searchQuery);

    return (
      <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          {renderUserProgress()}
          {renderTokenBar()}

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">🔍 Search Diary</h2>
            <p className="text-gray-600">Find your past records with keywords</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter keywords to search (emotions, music, content, etc.)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
            />
          </div>

          {searchQuery.trim() && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                Search Results: {searchResults.length} entries
              </h3>

              {searchResults.length === 0 ? (
                <div className="text-center bg-white rounded-xl shadow-lg p-8">
                  <div className="text-4xl mb-4">😅</div>
                  <p className="text-lg text-gray-600">No search results found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                        <div>
                          <h4 className="font-bold text-gray-800">{entry.date} {entry.time}</h4>
                          <p className="text-sm text-gray-600">Mood: {getMoodText(entry.mood)}</p>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{entry.summary}</p>

                      {entry.selectedEmotions.length > 0 && (
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-gray-600">Emotions: </span>
                          {entry.selectedEmotions.slice(0, 3).join(', ')}
                        </div>
                      )}

                      {entry.musicPlayed.length > 0 && (
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-gray-600">Music: </span>
                          {entry.musicPlayed[0].title}
                        </div>
                      )}

                      {entry.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-full text-xs`}
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setCurrentStep('mood')}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTrash = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🗑️ Trash</h2>
          <p className="text-gray-600">{trashEntries.length} deleted entries</p>
        </div>

        {trashEntries.length === 0 ? (
          <div className="text-center bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">🗑️</div>
            <p className="text-lg text-gray-600">Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trashEntries.slice().reverse().map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                    <div>
                      <h4 className="font-bold text-gray-800">{entry.date} {entry.time}</h4>
                      <p className="text-sm text-gray-600">Mood: {getMoodText(entry.mood)}</p>
                      {entry.deletedAt && (
                        <p className="text-xs text-red-500">Deleted: {new Date(entry.deletedAt).toLocaleString('en-US')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => restoreFromTrash(entry)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-all"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Permanently delete this entry?')) {
                          setTrashEntries(prev => prev.filter(e => e.id !== entry.id));
                        }
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-all"
                    >
                      Delete Forever
                    </button>
                  </div>
                </div>

                <p className="text-gray-700">{entry.summary.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">⚙️ Settings</h2>
          <p className="text-gray-600">Personalize your app</p>
        </div>

        <div className="space-y-6">
          {/* AI name settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">AI Name Settings</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AI_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handleAINameChange(name)}
                  className={`p-3 rounded-lg font-medium transition-all border-2 ${
                    appSettings.aiName === name
                      ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white border-purple-600 shadow-lg transform scale-105`
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Theme settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Theme Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setAppSettings(prev => ({ ...prev, theme: key as any }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    appSettings.theme === key
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className={`w-full h-8 rounded mb-2 bg-gradient-to-r ${theme.primary}`}></div>
                  <p className="font-medium text-gray-800">{theme.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notification settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Notification Settings</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Diary writing reminders</span>
              <button
                onClick={() => setAppSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
                className={`w-12 h-6 rounded-full transition-all ${
                  appSettings.notifications ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  appSettings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
          </div>

          {/* Data management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Data Management</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total diary entries</span>
                <span className="font-semibold text-gray-800">{diaryEntries.length} entries</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Saved music</span>
                <span className="font-semibold text-gray-800">{personalMusic.length} songs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Trash</span>
                <span className="font-semibold text-gray-800">{trashEntries.length} entries</span>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Really reset all data? This action cannot be undone.')) {
                    setDiaryEntries([]);
                    setTrashEntries([]);
                    setPersonalMusic([]);
                    setUserProgress({
                      level: 1,
                      experience: 0,
                      totalEntries: 0,
                      consecutiveDays: 0,
                      expToNext: 100,
                      progressPercentage: 0,
                      isPremium: false
                    });
                    setTokenUsage(0);
                    alert('All data has been reset.');
                  }
                }}
                className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  // Main rendering
  if (!isAuthenticated) {
    return renderLogin();
  }

  switch (currentStep) {
    case 'mood':
      return renderMoodSelection();
    case 'chat':
      return renderChat();
    case 'genre':
      return renderGenreSelection();
    case 'music':
      return renderMusicSelection();
    case 'summary':
      return renderSummary();
    case 'stats':
      return renderStats();
    case 'myDiary':
      return renderMyDiary();
    case 'myMusic':
      return renderMyMusic();
    case 'search':
      return renderSearch();
    case 'trash':
      return renderTrash();
    case 'settings':
      return renderSettings();
    default:
      return renderMoodSelection();
  }

  function renderMoodSelection() {
    return (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">How are you feeling today?</h2>
          <p className="text-gray-600">{appSettings.aiName} will find music that matches your emotions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleMoodSelect('good')}
              className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg"
            >
              <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-md">
                <rect x="10" y="10" width="100" height="100" rx="25" ry="25" fill="#FF9500" />
                <circle cx="45" cy="55" r="4" fill="#000" />
                <circle cx="75" cy="55" r="4" fill="#000" />
                <path d="M 45 75 Q 60 90 75 75" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-lg font-semibold text-gray-700">Great!</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={() => handleMoodSelect('normal')}
              className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg"
            >
              <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-md">
                <circle cx="60" cy="60" r="50" fill="#81D4FA" />
                <circle cx="45" cy="50" r="4" fill="#000" />
                <circle cx="75" cy="50" r="4" fill="#000" />
                <line x1="45" y1="75" x2="75" y2="75" stroke="#000" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-lg font-semibold text-gray-700">Just okay..</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={() => handleMoodSelect('bad')}
              className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg"
            >
              <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-md">
                <ellipse cx="60" cy="60" rx="50" ry="45" fill="#B39DDB" />
                <circle cx="48" cy="52" r="4" fill="#000" />
                <circle cx="72" cy="52" r="4" fill="#000" />
                <path d="M 48 80 Q 60 65 72 80" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-lg font-semibold text-gray-700">Not great..</span>
          </div>
        </div>

        {/* Menu icon buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <button
            onClick={() => setCurrentStep('myDiary')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">📖</span>
            <span className="text-sm font-medium text-gray-700">My Diary</span>
            <span className="text-xs text-gray-500">({diaryEntries.length})</span>
          </button>

          <button
            onClick={() => setCurrentStep('myMusic')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🎵</span>
            <span className="text-sm font-medium text-gray-700">My Music</span>
            <span className="text-xs text-gray-500">({personalMusic.length})</span>
          </button>

          <button
            onClick={() => setCurrentStep('genre')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🎼</span>
            <span className="text-sm font-medium text-gray-700">Music</span>
            <span className="text-xs text-gray-500">Listen now</span>
          </button>

          <button
            onClick={() => setCurrentStep('search')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🔍</span>
            <span className="text-sm font-medium text-gray-700">Search</span>
            <span className="text-xs text-gray-500">Find records</span>
          </button>

          <button
            onClick={() => setCurrentStep('stats')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-gray-700">Stats & Calendar</span>
            <span className="text-xs text-gray-500">Analysis</span>
          </button>

          <button
            onClick={() => setCurrentStep('trash')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🗑️</span>
            <span className="text-sm font-medium text-gray-700">Trash</span>
            <span className="text-xs text-gray-500">({trashEntries.length})</span>
          </button>

          <button
            onClick={() => setCurrentStep('settings')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">⚙️</span>
            <span className="text-sm font-medium text-gray-700">Settings</span>
            <span className="text-xs text-gray-500">Options</span>
          </button>
        </div>

        {/* Recent emotion records */}
        {diaryEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Recent Emotion Records</h3>
            <div className="space-y-4">
              {diaryEntries.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className={`flex items-center justify-between p-3 bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg border border-${getCurrentTheme().accent.split('-')[0]}-100`}>
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                    <div className="flex-1">
                      <p className={`font-medium text-${getCurrentTheme().accent.split('-')[0]}-800`}>{entry.date} {entry.time}</p>
                      <p className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>
                        {expandedDiaryId === entry.id ? entry.summary : `${entry.summary.substring(0, 50)}...`}
                      </p>
                      {entry.selectedEmotions && entry.selectedEmotions.length > 0 && (
                        <p className={`text-xs text-${getCurrentTheme().accent.split('-')[0]}-500 mt-1`}>
                          Emotions: {entry.selectedEmotions.slice(0, 3).join(', ')}
                        </p>
                      )}
                      {entry.musicPlayed && entry.musicPlayed.length > 0 && (
                        <p className="text-xs text-pink-500 mt-1">
                          🎵 {entry.musicPlayed[0].title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setExpandedDiaryId(expandedDiaryId === entry.id ? null : entry.id)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded text-sm"
                      title="View full"
                    >
                      {expandedDiaryId === entry.id ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => moveToTrash(entry)}
                      className="text-red-500 hover:text-red-700 p-1 rounded"
                      title="Move to trash"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  }

  function renderChat() {
    return (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg shadow-lg p-6 mb-6 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>Chat with {appSettings.aiName}</h2>
            <div className="flex items-center space-x-2">
              <span className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>Current mood:</span>
              <span className={`px-3 py-1 bg-${getCurrentTheme().accent.split('-')[0]}-100 text-${getCurrentTheme().accent.split('-')[0]}-800 rounded-full text-sm`}>
                {getMoodEmoji(currentMood || 'normal')} {getMoodText(currentMood || 'normal')}
              </span>
            </div>
          </div>

          <div className={`h-96 overflow-y-auto mb-4 p-4 bg-gradient-to-br from-white to-${getCurrentTheme().accent.split('-')[0]}-50 rounded-lg border border-${getCurrentTheme().accent.split('-')[0]}-100`}>
            {chatMessages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg max-w-xs ${
                  message.role === 'user' 
                    ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white`
                    : `bg-white text-${getCurrentTheme().accent.split('-')[0]}-800 border border-${getCurrentTheme().accent.split('-')[0]}-200`
                }`}>
                  {message.role === 'assistant' && (
                    <div className={`font-semibold mb-1 text-${getCurrentTheme().accent.split('-')[0]}-600`}>{appSettings.aiName}:</div>
                  )}
                  {message.content}
                    
                  {/* Music recommendation */}
                  {message.musicRecommendation && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="text-sm font-semibold text-gray-700 mb-2">🎵 Recommended Music</div>
                      <div className="flex items-center space-x-2 mb-2">
                        <img 
                          src={message.musicRecommendation.thumbnail} 
                          alt={message.musicRecommendation.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{message.musicRecommendation.title}</p>
                          <p className="text-xs text-gray-600">{message.musicRecommendation.artist}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={message.musicRecommendation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1 px-2 bg-green-500 text-white rounded text-center text-xs hover:bg-green-600"
                        >
                          Listen on Spotify
                        </a>
                        <button
                          onClick={() => handleMusicSelect(message.musicRecommendation!)}
                          className="flex-1 py-1 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          Add to My List
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left">
                <div className={`inline-block p-3 rounded-lg bg-white text-${getCurrentTheme().accent.split('-')[0]}-800 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
                  <div className={`font-semibold mb-1 text-${getCurrentTheme().accent.split('-')[0]}-600`}>{appSettings.aiName}:</div>
                  Preparing an answer... 💜
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="How was your day?"
              className={`flex-1 px-4 py-2 border border-${getCurrentTheme().accent.split('-')[0]}-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent} bg-white`}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className={`px-6 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90 disabled:opacity-50`}
            >
              Send
            </button>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentStep('genre')}
            className={`flex-1 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90`}
          >
            🎵 Listen to Music by Genre
          </button>
          <button
            onClick={handleGenerateSummary}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90"
            disabled={chatMessages.length === 0}
          >
            📝 Summarize Emotions
          </button>
        </div>

        <div className="flex space-x-4 mt-4">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
  }

  function renderGenreSelection() {
    return (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">What music do you want to listen to?</h2>
          <p className="text-gray-600">Choose a genre that matches your current mood</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(MUSIC_GENRES).map(([key, genre]) => (
            <button
              key={key}
              onClick={() => handleGenreSelect(key)}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 border-2 border-transparent hover:border-purple-300"
            >
              <div className="text-center">
                <div className="text-4xl mb-3">{genre.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{genre.name}</h3>
                <p className="text-gray-600 text-sm">{genre.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );
  }

  function renderMusicSelection() {
    return (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            🎵 {selectedGenre ? MUSIC_GENRES[selectedGenre as keyof typeof MUSIC_GENRES]?.name : 'Music'} Recommendations
          </h2>
          <p className="text-gray-600">Choose music you like</p>
        </div>

        {isLoading ? (
          <div className="text-center">
            <div className="text-4xl mb-4">🎵</div>
            <p className="text-lg text-gray-600">Finding music...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {recommendedMusic.map((music) => (
              <div key={music.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={music.thumbnail}
                    alt={music.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{music.title}</h3>
                    <p className="text-gray-600 text-xs">{music.artist}</p>
                  </div>
                </div>
                  
                <div className="space-y-2">
                  <a
                    href={music.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block py-2 px-4 bg-green-500 text-white rounded-lg text-center text-sm hover:bg-green-600 transition-all"
                  >
                    🎧 Listen on Spotify
                  </a>
                  <button
                    onClick={() => handleMusicSelect(music)}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all"
                  >
                    Add to My Music
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendedMusic.length === 0 && !isLoading && (
          <div className="text-center">
            <div className="text-4xl mb-4">😅</div>
            <p className="text-lg text-gray-600">Couldn't find music. Try another genre!</p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setCurrentStep('genre')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            Choose Genre Again
          </button>
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );
  }
};

export default App;