import React, { useState, useEffect, useCallback } from 'react';

// 타입 정의
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
  source: 'spotify' | 'youtube';
  youtubeUrl?: string;
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
  musicSource: 'spotify' | 'youtube' | 'both';
}

// 상수 정의
const APP_PASSWORD = "2752";
const MAX_FREE_TOKENS = 100000;

// 10대 취향에 맞춘 음악 장르 - 검색 키워드 최적화
const MUSIC_GENRES = {
  teenbeats: {
    name: "Teen Beats",
    icon: "🎵",
    desc: "10대 감성 트렌드곡",
    searchKeywords: [
      "huntrix",
      "IVE",
      "saja boys"
    ]
  },
  teengirlkpop: {
    name: "Teenage Girl K-pop",
    icon: "💖",
    desc: "Z세대 걸그룹 신곡",
    searchKeywords: [
      "LE SSERAFIM",
      "VCHA",
      "aespa"
    ]
  },
  highteen: {
    name: "High Teen K-pop",
    icon: "🌟",
    desc: "하이틴 밝고 발랄한",
    searchKeywords: [
      "SEVENTEEN",
      "ENHYPEN",
      "huntrix"
    ]
  },
  teencrush: {
    name: "Teen Crush",
    icon: "🔥",
    desc: "트렌디한 10대 아이돌",
    searchKeywords: [
      "ITZY",
      "Weeekly",
      "G-Dragon"
    ]
  },
  schoolplaylist: {
    name: "School Playlist",
    icon: "📚",
    desc: "학생 감성 맞춤",
    searchKeywords: [
      "After School",
      "NCT U",
      "soda pop"
    ]
  },
  kpopon: {
    name: "K-Pop 인기곡",
    icon: "🏆",
    desc: "핫한 곡 모음",
    searchKeywords: [
      "aespa",
      "NewJeans",
      "G-Dragon"
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
    name: '이플레이 퍼플',
    primary: 'from-purple-500 to-pink-500',
    secondary: 'from-purple-100 to-pink-100',
    accent: 'purple-500',
    bgClass: 'from-purple-100 to-pink-100'
  },
  blue: {
    name: '뮤직 블루',
    primary: 'from-blue-500 to-cyan-500',
    secondary: 'from-blue-100 to-cyan-100',
    accent: 'blue-500',
    bgClass: 'from-blue-100 to-cyan-100'
  },
  pink: {
    name: '감성 핑크',
    primary: 'from-pink-500 to-rose-500',
    secondary: 'from-pink-100 to-rose-100',
    accent: 'pink-500',
    bgClass: 'from-pink-100 to-rose-100'
  }
};

const AI_NAMES = ["루나", "멜로디", "하모니", "리듬", "뮤즈"];

const App: React.FC = () => {
  // 상태 관리
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
  const [userMainEmotion, setUserMainEmotion] = useState('');
  const [additionalEmotion, setAdditionalEmotion] = useState('');
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
    aiName: '루나',
    theme: 'purple',
    isPremium: false,
    notifications: true,
    musicSource: 'both'
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

  // API 키 설정 - 환경변수에서만 가져오기
  const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

  // 로컬 스토리지에서 데이터 로드
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
        console.error('데이터 로드 오류:', error);
      }
    };

    loadData();
    getSpotifyToken();
  }, []);

  // 데이터 저장
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
      console.error('데이터 저장 오류:', error);
    }
  }, [diaryEntries, userProgress, isAuthenticated, tokenUsage, trashEntries, personalMusic, appSettings, usedMusicIds]);

  // Spotify 토큰 획득
  const getSpotifyToken = useCallback(async () => {
    try {
      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        console.error('Spotify 클라이언트 ID 또는 Secret이 설정되지 않았습니다.');
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
        console.error('Spotify 토큰 획득 실패:', response.status);
      }
    } catch (error) {
      console.error('Spotify 토큰 획득 오류:', error);
    }
  }, [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET]);

  // 유틸리티 함수
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const formatDate = (date: Date) => date.toLocaleDateString('ko-KR');
  const formatTime = (date: Date) => date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

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
      case 'good': return '좋음';
      case 'normal': return '보통';
      case 'bad': return '나쁨';
      default: return '선택 안함';
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
      alert(`축하합니다! 레벨 ${level}로 레벨업했습니다!`);
    }
  };

  // 휴지통 관련 함수들
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

  // 검색 함수
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

  // OpenAI API 호출
  const callOpenAI = async (messages: any[], systemPrompt: string) => {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    if (tokenUsage >= MAX_FREE_TOKENS) {
      throw new Error('AI와 대화할 수 있는 에너지가 다 떨어졌습니다.');
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
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const tokensUsed = data.usage?.total_tokens || 0;
    setTokenUsage(prev => prev + tokensUsed);

    return data.choices?.[0]?.message?.content;
  };

  // Spotify API 호출 - 최적화된 검색
  const searchSpotifyMusic = async (query: string): Promise<MusicItem[]> => {
    if (!spotifyToken) {
      console.error('Spotify 토큰이 없습니다.');
      return [];
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=KR&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('Spotify API Error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const musicResults: MusicItem[] = [];
      
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        // 최대 3곡까지 반환
        const items = data.tracks.items.slice(0, 3);
        
        items.forEach((item: any) => {
          musicResults.push({
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
            album: item.album.name,
            source: 'spotify'
          });
        });
      }

      return musicResults;
    } catch (error) {
      console.error('Spotify 검색 오류:', error);
      return [];
    }
  };

  // YouTube API 호출 - 최적화된 검색
  const searchYouTubeMusic = async (query: string): Promise<MusicItem[]> => {
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API 키가 설정되지 않았습니다.');
      return [];
    }

    try {
      const searchQuery = `${query} official MV`;
      const url = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `type=video&` +
        `maxResults=10&` +
        `order=relevance&` +
        `videoDuration=medium&` +
        `regionCode=KR&` +
        `key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('YouTube API Error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const musicResults: MusicItem[] = [];
      
      if (data.items && data.items.length > 0) {
        // 최대 3곡까지 반환
        const items = data.items.slice(0, 3);
        
        items.forEach((item: any) => {
          const videoId = item.id.videoId;
          musicResults.push({
            id: videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            genre: 'recommended',
            thumbnail: item.snippet.thumbnails.medium.url,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: item.snippet.publishedAt,
            rating: 0,
            playCount: 0,
            source: 'youtube'
          });
        });
      }

      return musicResults;
    } catch (error) {
      console.error('YouTube 검색 오류:', error);
      return [];
    }
  };

  // 통합 음악 검색 함수
  const searchMusic = async (query: string): Promise<MusicItem[]> => {
    const { musicSource } = appSettings;
    let results: MusicItem[] = [];
    
    if (musicSource === 'spotify') {
      results = await searchSpotifyMusic(query);
    } else if (musicSource === 'youtube') {
      results = await searchYouTubeMusic(query);
    } else {
      // both인 경우 Spotify와 YouTube 모두 검색
      const spotifyResults = await searchSpotifyMusic(query);
      const youtubeResults = await searchYouTubeMusic(query);
      
      // 각각에서 최대 2곡씩 가져와서 총 3곡 만들기
      results = [
        ...spotifyResults.slice(0, 2),
        ...youtubeResults.slice(0, 1)
      ];
      
      // 만약 부족하면 나머지로 채우기
      if (results.length < 3) {
        const additionalYoutube = youtubeResults.slice(1, 3 - results.length + 1);
        results = [...results, ...additionalYoutube];
      }
    }

    return results.slice(0, 3); // 최대 3곡 보장
  };

  // Spotify 차트 가져오기
  const getSpotifyChart = async (): Promise<MusicItem[]> => {
    if (!spotifyToken) {
      console.error('Spotify 토큰이 없습니다.');
      return [];
    }

    try {
      // 한국의 Top 50 플레이리스트 가져오기
      const response = await fetch(
        'https://api.spotify.com/v1/playlists/37i9dQZEVXbJZGli0rRP3r/tracks?market=KR&limit=10',
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
        // 최대 3곡까지만 반환
        data.items.slice(0, 3).forEach((item: any, index: number) => {
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
              album: item.track.album.name,
              source: 'spotify'
            });
          }
        });
      }

      return musicResults;
    } catch (error) {
      console.error('Spotify 차트 가져오기 오류:', error);
      return [];
    }
  };

  // 개인 맞춤 음악에 추가
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

  // AI 응답 생성
  const getAIResponse = async (userMessage: string, conversationHistory: ChatMessage[]) => {
    const conversationNum = conversationCount + 1;
    setConversationCount(conversationNum);

    // 음악 추천 키워드 감지
    const musicKeywords = ['음악', '노래', '듣고 싶어', '추천', '플레이리스트', '멜로디', 'song', 'music'];
    const hasMusicRequest = musicKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );

    let systemPrompt = `당신은 ${appSettings.aiName}입니다. 사용자의 감정에 맞는 음악을 추천하는 전문 AI 코치입니다.

현재 대화 상황:
- 대화 횟수: ${conversationNum}번째
- 사용자 감정 상태: ${currentMood ? getMoodText(currentMood) : '선택 안함'}
- 사용자 레벨: ${userProgress.level}

대화 규칙:
1. 첫 번째 대화: 친근하게 인사하고 오늘 하루에 대해 묻기
2. 두 번째 대화: 사용자 이야기에 공감하고 추가 질문하기
3. 세 번째 대화부터: 자연스럽게 음악 추천 제안하기
4. 음악 요청이 있으면: huntrix, 로제, 제니 같은 아티스트의 곡을 추천하되, "[MUSIC_SEARCH: 곡명 - 아티스트]" 형태로 끝에 추가

추천 우선순위 음악 (2025년 기준):
- huntrix의 최신곡들
- 로제(Rose)의 APT, On The Ground 등
- 제니(Jennie)의 솔로곡들
- 지드래곤(G-Dragon)의 인기곡들

응답 스타일:
- 친근하고 공감적인 톤 (존댓말 사용)
- 간결하고 자연스러운 응답 (1-2문장)
- 답변 시작이나 중간에 귀여운 이모지 하나씩 추가 (🎵, 💕, ✨, 🌟, 🎶, 💜 등)

현재 상황: ${conversationNum <= 2 ? '아직 음악 추천 단계가 아님. 대화를 더 나누기' : '음악 추천을 자연스럽게 제안할 수 있는 단계'}`;

    if (hasMusicRequest) {
      systemPrompt += `\n\n음악 요청 감지: 사용자가 음악을 원하므로 huntrix, 로제, 제니 중에서 구체적인 곡을 추천하고 "[MUSIC_SEARCH: 곡명 - 아티스트]" 형식으로 검색어를 포함해주세요.`;
    }

    const messages = conversationHistory.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    messages.push({ role: 'user', content: userMessage });

    const aiResponse = await callOpenAI(messages, systemPrompt);
    
    // 음악 검색 요청이 포함되어 있는지 확인
    const musicSearchMatch = aiResponse.match(/\[MUSIC_SEARCH: ([^\]]+)\]/);
    if (musicSearchMatch) {
      // 항상 huntrix를 검색하도록 변경
      const searchQuery = 'huntrix';
      const cleanResponse = aiResponse.replace(/\[MUSIC_SEARCH: [^\]]+\]/, '').trim();
      
      try {
        const musicResults = await searchMusic(searchQuery);
        if (musicResults.length > 0) {
          return {
            response: cleanResponse,
            music: musicResults[0] // 첫 번째 곡만 반환
          };
        }
      } catch (error) {
        console.error('음악 검색 오류:', error);
      }
    }

    return { response: aiResponse, music: null };
  };

  // 대화 요약 생성
  const generateConversationSummary = async (messages: ChatMessage[]) => {
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content).join('\n');

    if (!userMessages.trim()) {
      return {
        summary: '오늘도 감정을 나누며 이야기를 해봤어요',
        keywords: ['#감정나눔'],
        recommendedEmotions: ['평온', '만족', '편안'],
        actionItems: ['오늘도 고생 많았어요', '충분한 휴식을 취하세요'],
      };
    }

    const systemPrompt = `다음 대화 내용을 분석해서 감정 일기 관점에서 응답해주세요:

대화 내용:
${userMessages}

현재 감정 상태: ${currentMood ? getMoodText(currentMood) : '선택 안함'}
선택한 음악 장르: ${selectedGenre ? MUSIC_GENRES[selectedGenre as keyof typeof MUSIC_GENRES]?.name : '선택 안함'}

분석 요청:
1. 오늘 있었던 일을 1-2줄로 요약 (해요체로 작성, 감정과 상황 중심)
2. 대화에서 느껴진 감정 키워드 5개 추출 (예: #스트레스, #행복, #피곤함 등)
3. AI가 대화에서 분석한 세부 감정 5개 추천 (예: 행복, 걱정, 설렘, 피곤, 만족 등)
4. 현재 상황에 맞는 실용적인 액션 아이템 2개 제안

응답 형식:
요약: [1-2줄 요약 - 해요체]
감정키워드: #키워드1, #키워드2, #키워드3, #키워드4, #키워드5
추천감정: 감정1, 감정2, 감정3, 감정4, 감정5
액션아이템: 아이템1 | 아이템2`;

    try {
      const result = await callOpenAI([], systemPrompt);

      // 응답 파싱
      const lines = result.split('\n');
      let summary = '';
      let keywords: string[] = [];
      let recommendedEmotions: string[] = [];
      let actionItems: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('요약:')) {
          summary = trimmedLine.replace('요약:', '').trim();
        } else if (trimmedLine.startsWith('감정키워드:')) {
          const keywordText = trimmedLine.replace('감정키워드:', '').trim();
          keywords = keywordText.split(',').map((k: string) => k.trim()).filter((k: string) => k);
        } else if (trimmedLine.startsWith('추천감정:')) {
          const emotionText = trimmedLine.replace('추천감정:', '').trim();
          recommendedEmotions = emotionText.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        } else if (trimmedLine.startsWith('액션아이템:')) {
          const actionText = trimmedLine.replace('액션아이템:', '').trim();
          actionItems = actionText.split('|').map((a: string) => a.trim()).filter((a: string) => a);
        }
      }

      return {
        summary: summary || '오늘의 감정과 상황을 나누었어요',
        keywords: keywords.slice(0, 5),
        recommendedEmotions: recommendedEmotions.slice(0, 5),
        actionItems: actionItems.slice(0, 2)
      };
    } catch (error) {
      console.error('대화 요약 생성 오류:', error);
      return {
        summary: '대화 요약을 생성하는 중에 문제가 발생했어요',
        keywords: ['#감정나눔'],
        recommendedEmotions: ['평온', '만족'],
        actionItems: ['음악으로 마음을 달래보세요', '충분한 휴식을 취하세요']
      };
    }
  };

  // 이벤트 핸들러
  const handleLogin = (password: string) => {
    if (password === APP_PASSWORD) {
      setIsAuthenticated(true);
      setCurrentStep('mood');
    } else {
      alert('비밀번호가 맞지 않습니다.');
    }
  };

  const handleMoodSelect = (mood: 'good' | 'normal' | 'bad') => {
    setCurrentMood(mood);
    setCurrentStep('chat');
    setConversationCount(0);

    const initialMessage: ChatMessage = {
      role: 'assistant',
      content: `안녕하세요! 🎵 오늘은 ${getMoodText(mood)} 기분이시군요. 오늘 하루 어떻게 보내셨는지 편하게 말씀해주세요. ✨`,
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
      
      // 음악이 추천되었으면 개인 음악 리스트에 추가
      if (aiResult.music) {
        addToPersonalMusic(aiResult.music);
      }
      
    } catch (error) {
      console.error('AI 응답 오류:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '죄송해요. 💜 일시적으로 문제가 생겼어요. 다시 시도해주세요.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 음악 장르 선택 - 통합 API 사용, 속도 최적화
  const handleGenreSelect = async (genre: string) => {
    setSelectedGenre(genre);
    setCurrentStep('music');
    setIsLoading(true);
    
    try {
      if (genre === 'kpopon') {
        // K-Pop 인기차트의 경우 특별 검색어 사용
        const chartKeywords = ['aespa', 'NewJeans', 'G-Dragon'];
        const musicResults: MusicItem[] = [];
        
        for (const keyword of chartKeywords) {
          const results = await searchMusic(keyword);
          if (results.length > 0) {
            musicResults.push(results[0]); // 각 검색어에서 1곡씩
            if (musicResults.length >= 3) break;
          }
          await new Promise(resolve => setTimeout(resolve, 500)); // API 호출 간격
        }
        
        setRecommendedMusic(musicResults);
      } else {
        const genreData = MUSIC_GENRES[genre as keyof typeof MUSIC_GENRES];
        const keywords = genreData?.searchKeywords || ['music'];
        
        const musicResults: MusicItem[] = [];
        
        // 모든 키워드를 검색하여 총 3곡 수집
        for (const keyword of keywords) {
          const results = await searchMusic(keyword);
          if (results.length > 0) {
            musicResults.push(results[0]); // 각 검색어에서 1곡씩
            if (musicResults.length >= 3) break;
          }
          
          // API 호출 간격
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setRecommendedMusic(musicResults);
      }
    } catch (error) {
      console.error('음악 검색 오류:', error);
      setRecommendedMusic([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMusicSelect = (music: MusicItem) => {
    setSelectedMusic(music);
    addToPersonalMusic(music);
    alert(`"${music.title}" 음악이 내 음악 리스트에 추가되었습니다! 감정 요약 단계에서 확인하거나 나중에 '내 음악'에서 확인할 수 있어요.`);
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
      console.error('요약 생성 오류:', error);
      alert('요약 생성 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDiary = async () => {
    if (!currentMood || !summaryData) return;

    setIsLoading(true);

    try {
      const now = new Date();
      const allEmotions: string[] = [...selectedEmotions];
      
      // 사용자 메인 감정 추가
      if (userMainEmotion.trim()) {
        allEmotions.unshift(userMainEmotion.trim());
      }
      
      // 추가 감정 입력란 추가
      if (additionalEmotion.trim()) {
        allEmotions.push(additionalEmotion.trim());
      }
      
      // 이전 코드의 customEmotion도 호환성을 위해 체크
      if (customEmotion.trim() && !additionalEmotion.trim()) {
        allEmotions.push(customEmotion.trim());
      }
      
      // 대화 중 추천된 음악들 수집
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
        selectedEmotions: allEmotions,
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

      // 상태 초기화
      setChatMessages([]);
      setCurrentMood(null);
      setSelectedGenre(null);
      setSelectedMusic(null);
      setRecommendedMusic([]);
      setSummaryData(null);
      setSelectedEmotions([]);
      setCustomEmotion('');
      setUserMainEmotion('');
      setAdditionalEmotion('');
      setConversationCount(0);
      setCurrentStep('mood');

      alert('일기가 저장되었습니다! +20 EXP');
    } catch (error) {
      console.error('일기 저장 오류:', error);
      alert('일기 저장 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 감정 선택 함수
  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotion)) {
        // 이미 선택된 감정이면 제거
        return prev.filter(e => e !== emotion);
      } else if (prev.length < 2) {
        // 2개 미만이면 추가
        return [...prev, emotion];
      } else {
        // 2개가 이미 선택되었으면 첫 번째를 제거하고 새로운 것 추가
        return [prev[1], emotion];
      }
    });
  };

  // AI 이름 변경 함수
  const handleAINameChange = (name: string) => {
    setAppSettings(prev => ({ ...prev, aiName: name }));
  };

  // 컴포넌트 렌더링 함수들
  const getCurrentTheme = () => THEMES[appSettings.theme];

  const renderTokenBar = () => {
    const usageRatio = Math.min(tokenUsage / MAX_FREE_TOKENS, 1.0);
    const remaining = Math.max(0, MAX_FREE_TOKENS - tokenUsage);

    let status = '충분해요';

    if (usageRatio >= 0.95) {
      status = '조금 부족해요';
    } else if (usageRatio >= 0.5) {
      status = '적당해요';
    }

    return (
      <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg p-4 mb-4 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800`}>AI와 대화할 수 있는 에너지</span>
          <span className={`text-xs text-${getCurrentTheme().accent.split('-')[0]}-600`}>{remaining.toLocaleString()} / {MAX_FREE_TOKENS.toLocaleString()} 남음</span>
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
          상태: {status}
        </div>
      </div>
    );
  };

  const renderUserProgress = () => (
    <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-xl shadow-lg p-6 mb-6 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
      <div className="flex justify-between items-center mb-4">
        <span className={`text-lg font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>레벨 {userProgress.level}</span>
        <span className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>다음 레벨까지 {userProgress.expToNext} EXP</span>
      </div>
      <div className={`w-full bg-${getCurrentTheme().accent.split('-')[0]}-100 rounded-full h-3`}>
        <div
          className={`bg-gradient-to-r ${getCurrentTheme().primary} h-3 rounded-full transition-all`}
          style={{ width: `${userProgress.progressPercentage}%` }}
        ></div>
      </div>
      <div className={`text-center text-xs text-${getCurrentTheme().accent.split('-')[0]}-600 mt-2`}>
        총 경험치: {userProgress.experience} EXP
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center`}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-96">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎵</div>
          <h1 className={`text-2xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>EPLAY</h1>
          <p className={`text-${getCurrentTheme().accent.split('-')[0]}-600`}>감정기반 음악 추천</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLogin((e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input') as HTMLInputElement;
              handleLogin(input.value);
            }}
            className={`w-full bg-gradient-to-r ${getCurrentTheme().primary} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all`}
          >
            음악과 함께 시작하기
          </button>
        </div>
      </div>
    </div>
  );

  const renderMoodSelection = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">오늘 기분은 어떠세요?</h2>
          <p className="text-gray-600">{appSettings.aiName}가 여러분의 감정에 맞는 음악을 찾아드릴게요</p>
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
            <span className="text-lg font-semibold text-gray-700">좋아!</span>
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
            <span className="text-lg font-semibold text-gray-700">그냥 뭐..</span>
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
            <span className="text-lg font-semibold text-gray-700">별루야..</span>
          </div>
        </div>

        {/* 메뉴 아이콘 버튼들 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <button
            onClick={() => setCurrentStep('myDiary')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">📖</span>
            <span className="text-sm font-medium text-gray-700">내 일기장</span>
            <span className="text-xs text-gray-500">({diaryEntries.length})</span>
          </button>

          <button
            onClick={() => setCurrentStep('myMusic')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🎵</span>
            <span className="text-sm font-medium text-gray-700">내 음악</span>
            <span className="text-xs text-gray-500">({personalMusic.length})</span>
          </button>

          <button
            onClick={() => setCurrentStep('genre')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🎼</span>
            <span className="text-sm font-medium text-gray-700">음악 듣기</span>
            <span className="text-xs text-gray-500">바로 듣기</span>
          </button>

          <button
            onClick={() => setCurrentStep('search')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🔍</span>
            <span className="text-sm font-medium text-gray-700">검색</span>
            <span className="text-xs text-gray-500">기록 찾기</span>
          </button>

          <button
            onClick={() => setCurrentStep('stats')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-gray-700">통계 및 달력</span>
            <span className="text-xs text-gray-500">감정 분석</span>
          </button>

          <button
            onClick={() => setCurrentStep('trash')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">🗑️</span>
            <span className="text-sm font-medium text-gray-700">휴지통</span>
            <span className="text-xs text-gray-500">({trashEntries.length})</span>
          </button>

          <button
            onClick={() => setCurrentStep('settings')}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-2">⚙️</span>
            <span className="text-sm font-medium text-gray-700">설정</span>
            <span className="text-xs text-gray-500">옵션</span>
          </button>
        </div>

        {/* 최근 감정 기록 */}
        {diaryEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">최근 감정 기록</h3>
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
                          감정: {entry.selectedEmotions.slice(0, 3).join(', ')}
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
                      title="전체 보기"
                    >
                      {expandedDiaryId === entry.id ? '접기' : '펼치기'}
                    </button>
                    <button
                      onClick={() => moveToTrash(entry)}
                      className="text-red-500 hover:text-red-700 p-1 rounded"
                      title="휴지통으로 이동"
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

  const renderChat = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg shadow-lg p-6 mb-6 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>{appSettings.aiName}와 대화하기</h2>
            <div className="flex items-center space-x-2">
              <span className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>현재 기분:</span>
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
                  
                  {/* 음악 추천이 있는 경우 */}
                  {message.musicRecommendation && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="text-sm font-semibold text-gray-700 mb-2">🎵 추천 음악</div>
                      <div className="flex items-center space-x-2 mb-2">
                        <img 
                          src={message.musicRecommendation.thumbnail} 
                          alt={message.musicRecommendation.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{message.musicRecommendation.title}</p>
                          <p className="text-xs text-gray-600">{message.musicRecommendation.artist}</p>
                          <p className="text-xs text-purple-500">{message.musicRecommendation.source === 'spotify' ? 'Spotify' : 'YouTube'}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={message.musicRecommendation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 py-1 px-2 ${message.musicRecommendation.source === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded text-center text-xs`}
                        >
                          {message.musicRecommendation.source === 'spotify' ? 'Spotify에서 듣기' : 'YouTube에서 듣기'}
                        </a>
                        <button
                          onClick={() => handleMusicSelect(message.musicRecommendation!)}
                          className="flex-1 py-1 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          내 리스트 추가
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
                  답변을 준비하고 있어요... 💜
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
              placeholder="오늘 하루 어떠셨나요?"
              className={`flex-1 px-4 py-2 border border-${getCurrentTheme().accent.split('-')[0]}-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent} bg-white`}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className={`px-6 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90 disabled:opacity-50`}
            >
              전송
            </button>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentStep('genre')}
            className={`flex-1 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90`}
          >
            🎵 음악 장르별로 바로 듣기
          </button>
          <button
            onClick={handleGenerateSummary}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90"
            disabled={chatMessages.length === 0}
          >
            📝 감정 요약하기
          </button>
        </div>

        <div className="flex space-x-4 mt-4">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            🏠 홈으로
          </button>
        </div>
      </div>
    </div>
  );

  const renderGenreSelection = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">어떤 음악이 듣고 싶으세요?</h2>
          <p className="text-gray-600">현재 기분에 맞는 장르를 선택해주세요</p>
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
            🏠 홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );

  const renderMusicSelection = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        {renderTokenBar()}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            🎵 {selectedGenre ? MUSIC_GENRES[selectedGenre as keyof typeof MUSIC_GENRES]?.name : '음악'} 추천
          </h2>
          <p className="text-gray-600">마음에 드는 음악을 선택해보세요 (총 3곡)</p>
        </div>

        {isLoading ? (
          <div className="text-center">
            <div className="text-4xl mb-4">🎵</div>
            <p className="text-lg text-gray-600">음악을 찾고 있어요...</p>
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
                    <p className="text-xs text-purple-500">{music.source === 'spotify' ? 'Spotify' : 'YouTube'}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <a
                    href={music.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full block py-2 px-4 ${music.source === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg text-center text-sm transition-all`}
                  >
                    🎧 {music.source === 'spotify' ? 'Spotify에서 듣기' : 'YouTube에서 듣기'}
                  </a>
                  <button
                    onClick={() => handleMusicSelect(music)}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all"
                  >
                    내 음악에 추가
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendedMusic.length === 0 && !isLoading && (
          <div className="text-center">
            <div className="text-4xl mb-4">😅</div>
            <p className="text-lg text-gray-600">음악을 찾을 수 없어요. 다른 장르를 시도해보세요!</p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setCurrentStep('genre')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            장르 다시 선택
          </button>
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
          >
            🏠 홈으로 돌아가기
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📝 오늘의 감정 요약</h2>
          <p className="text-gray-600">AI가 분석한 내용을 확인하고 추가 감정을 선택해보세요</p>
        </div>

        {summaryData && (
          <div className="space-y-6">
            {/* 요약 내용 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">📖 오늘의 이야기</h3>
              <p className="text-gray-700 leading-relaxed">{summaryData.summary}</p>
            </div>

            {/* 키워드 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🏷️ 감정 키워드</h3>
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

            {/* AI 추천 감정 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🤖 AI 추천 세부 감정</h3>
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
              <p className="text-xs text-gray-500">최대 2개까지 선택 가능 (선택한 감정: {selectedEmotions.length}/2)</p>
            </div>

            {/* 사용자 감정 입력 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">💭 나의 오늘 감정</h3>
              <p className="text-gray-600 text-sm mb-3">오늘 가장 크게 느낀 감정을 한 가지만 입력해주세요</p>
              <input
                type="text"
                value={userMainEmotion}
                onChange={(e) => setUserMainEmotion(e.target.value)}
                placeholder="예: 행복, 걱정, 설렘, 피곤함 등"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-2">최대 10자까지 입력 가능</p>
            </div>

            {/* 직접 입력 감정 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">✍️ 추가 감정 입력</h3>
              <p className="text-gray-600 text-sm mb-3">위의 선택지에 없는 다른 감정이 있다면 추가로 입력해주세요</p>
              <input
                type="text"
                value={additionalEmotion}
                onChange={(e) => setAdditionalEmotion(e.target.value)}
                placeholder="다른 감정이 있다면 직접 입력해주세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={20}
              />
            </div>

            {/* 액션 아이템 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🎯 추천 액션</h3>
              <div className="space-y-2">
                {summaryData.actionItems.map((item: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-green-500">✅</span>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="text-center">
              <button
                onClick={handleSaveDiary}
                disabled={isLoading}
                className={`px-8 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50`}
              >
                💾 일기 저장하기 (+20 EXP)
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep('chat')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            대화로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );

  const renderStats = () => {
    // 감정별 통계 계산
    const moodStats = ['good', 'normal', 'bad'].map(mood => {
      const count = diaryEntries.filter(entry => entry.mood === mood).length;
      const percentage = diaryEntries.length > 0 ? (count / diaryEntries.length) * 100 : 0;
      return { mood, count, percentage };
    });

    // 감정 빈도 통계
    const emotionFreq: { [key: string]: number } = {};
    diaryEntries.forEach(entry => {
      entry.selectedEmotions?.forEach(emotion => {
        emotionFreq[emotion] = (emotionFreq[emotion] || 0) + 1;
      });
    });

    const topEmotions = Object.entries(emotionFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // 달력 데이터
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

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
              <h2 className="text-2xl font-bold">📊 통계 & 📅 감정 달력</h2>
              <button
                onClick={() => setCurrentStep('mood')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🏠 홈으로
              </button>
            </div>

            {/* 통계 섹션 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">📊 통계</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`bg-gradient-to-r ${getCurrentTheme().primary} text-white p-6 rounded-lg`}>
                  <h4 className="text-lg font-semibold mb-2">총 일기 수</h4>
                  <p className="text-3xl font-bold">{diaryEntries.length}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2">저장된 음악</h4>
                  <p className="text-3xl font-bold">{personalMusic.length}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2">현재 레벨</h4>
                  <p className="text-3xl font-bold">{userProgress.level}</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2">총 경험치</h4>
                  <p className="text-3xl font-bold">{userProgress.experience}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-4">기분 분포</h4>
                  <div className="space-y-3">
                    {moodStats.map(({ mood, count, percentage }) => (
                      <div key={mood} className="flex items-center space-x-3">
                        <span className="text-2xl">{getMoodEmoji(mood)}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{getMoodText(mood)}</span>
                            <span>{count}개 ({percentage.toFixed(1)}%)</span>
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
                  <h4 className="text-lg font-semibold mb-4">자주 느끼는 감정 TOP 5</h4>
                  <div className="space-y-2">
                    {topEmotions.length > 0 ? (
                      topEmotions.map(([emotion, count], index) => (
                        <div key={emotion} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{index + 1}</span>
                            <span className="font-medium">{emotion}</span>
                          </div>
                          <span className="text-sm text-gray-600">{count}회</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">아직 감정 데이터가 부족해요</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 달력 섹션 */}
            <div>
              <h3 className="text-xl font-bold mb-4">📅 감정 달력</h3>
              
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => {
                    const newMonth = new Date(currentCalendarMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentCalendarMonth(newMonth);
                  }}
                  className={`px-4 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}
                >
                  ← 이전
                </button>
                <h4 className="text-lg font-bold">
                  {currentCalendarMonth.getFullYear()}년 {monthNames[currentCalendarMonth.getMonth()]}
                </h4>
                <button
                  onClick={() => {
                    const newMonth = new Date(currentCalendarMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentCalendarMonth(newMonth);
                  }}
                  className={`px-4 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}
                >
                  다음 →
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
                  <span className="text-xs">좋음</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs">보통</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">나쁨</span>
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📖 내 일기장</h2>
          <p className="text-gray-600">총 {diaryEntries.length}개의 기록이 있어요</p>
        </div>

        {diaryEntries.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-lg text-gray-600">아직 작성된 일기가 없어요</p>
            <button
              onClick={() => setCurrentStep('mood')}
              className={`mt-4 px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90 transition-all`}
            >
              첫 일기 작성하기
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
                      <p className="text-sm text-gray-600">기분: {getMoodText(entry.mood)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => moveToTrash(entry)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all"
                    title="휴지통으로 이동"
                  >
                    🗑️
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">요약</h4>
                    <p className="text-gray-600">{entry.summary}</p>
                  </div>

                  {entry.keywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">키워드</h4>
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
                      <h4 className="font-semibold text-gray-700 mb-2">선택한 감정</h4>
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
                      <h4 className="font-semibold text-gray-700 mb-2">들었던 음악</h4>
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
                              className={`text-xs px-2 py-1 rounded ${music.source === 'spotify' ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}`}
                            >
                              🎧 듣기
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">액션 아이템</h4>
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
            🏠 홈으로 돌아가기
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🎵 내 음악</h2>
          <p className="text-gray-600">총 {personalMusic.length}곡이 저장되어 있어요</p>
        </div>

        {personalMusic.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-4">🎶</div>
            <p className="text-lg text-gray-600">아직 저장된 음악이 없어요</p>
            <button
              onClick={() => setCurrentStep('genre')}
              className={`mt-4 px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90 transition-all`}
            >
              음악 찾으러 가기
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
                      <p className="text-xs text-purple-500 mt-1">{music.playCount}번 재생</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <a
                    href={music.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full block py-2 px-4 ${music.source === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg text-center text-sm transition-all`}
                  >
                    🎧 {music.source === 'spotify' ? 'Spotify에서 듣기' : 'YouTube에서 듣기'}
                  </a>
                  
                  {music.preview_url && (
                    <audio controls className="w-full">
                      <source src={music.preview_url} type="audio/mpeg" />
                      미리듣기를 지원하지 않는 브라우저입니다.
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
            🏠 홈으로 돌아가기
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
            <h2 className="text-3xl font-bold text-gray-800 mb-2">🔍 일기 검색</h2>
            <p className="text-gray-600">키워드로 지난 기록들을 찾아보세요</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색할 키워드를 입력하세요 (감정, 음악, 내용 등)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
            />
          </div>

          {searchQuery.trim() && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                검색 결과: {searchResults.length}개
              </h3>

              {searchResults.length === 0 ? (
                <div className="text-center bg-white rounded-xl shadow-lg p-8">
                  <div className="text-4xl mb-4">😅</div>
                  <p className="text-lg text-gray-600">검색 결과가 없어요</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                        <div>
                          <h4 className="font-bold text-gray-800">{entry.date} {entry.time}</h4>
                          <p className="text-sm text-gray-600">기분: {getMoodText(entry.mood)}</p>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{entry.summary}</p>

                      {entry.selectedEmotions.length > 0 && (
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-gray-600">감정: </span>
                          {entry.selectedEmotions.slice(0, 3).join(', ')}
                        </div>
                      )}

                      {entry.musicPlayed.length > 0 && (
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-gray-600">음악: </span>
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
              🏠 홈으로 돌아가기
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🗑️ 휴지통</h2>
          <p className="text-gray-600">삭제된 {trashEntries.length}개의 일기가 있어요</p>
        </div>

        {trashEntries.length === 0 ? (
          <div className="text-center bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">🗑️</div>
            <p className="text-lg text-gray-600">휴지통이 비어있어요</p>
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
                      <p className="text-sm text-gray-600">기분: {getMoodText(entry.mood)}</p>
                      {entry.deletedAt && (
                        <p className="text-xs text-red-500">삭제일: {new Date(entry.deletedAt).toLocaleString('ko-KR')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => restoreFromTrash(entry)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-all"
                    >
                      복원
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('정말로 영구 삭제하시겠습니까?')) {
                          setTrashEntries(prev => prev.filter(e => e.id !== entry.id));
                        }
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-all"
                    >
                      영구삭제
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
            🏠 홈으로 돌아가기
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">⚙️ 설정</h2>
          <p className="text-gray-600">앱을 개인화해보세요</p>
        </div>

        <div className="space-y-6">
          {/* AI 이름 설정 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">AI 이름 설정</h3>
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

          {/* 테마 설정 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">테마 설정</h3>
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

          {/* 음악 소스 설정 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">음악 소스 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setAppSettings(prev => ({ ...prev, musicSource: 'spotify' }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  appSettings.musicSource === 'spotify'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-green-500 text-2xl mb-2">🎵</div>
                <p className="font-medium">Spotify만</p>
                <p className="text-sm text-gray-600">고음질 스트리밍</p>
              </button>
              <button
                onClick={() => setAppSettings(prev => ({ ...prev, musicSource: 'youtube' }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  appSettings.musicSource === 'youtube'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="text-red-500 text-2xl mb-2">📺</div>
                <p className="font-medium">YouTube만</p>
                <p className="text-sm text-gray-600">무료 뮤직비디오</p>
              </button>
              <button
                onClick={() => setAppSettings(prev => ({ ...prev, musicSource: 'both' }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  appSettings.musicSource === 'both'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="text-purple-500 text-2xl mb-2">🎼</div>
                <p className="font-medium">둘 다 사용</p>
                <p className="text-sm text-gray-600">최대한 많은 곡</p>
              </button>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">알림 설정</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">일기 작성 알림</span>
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

          {/* 데이터 관리 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">데이터 관리</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">총 일기 수</span>
                <span className="font-semibold text-gray-800">{diaryEntries.length}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">저장된 음악</span>
                <span className="font-semibold text-gray-800">{personalMusic.length}곡</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">휴지통</span>
                <span className="font-semibold text-gray-800">{trashEntries.length}개</span>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
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
                    alert('모든 데이터가 초기화되었습니다.');
                  }
                }}
                className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                모든 데이터 초기화
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep('mood')}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            🏠 홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );

  // 메인 렌더링
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
};

export default App;