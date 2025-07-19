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

// huntrix 곡 목록
const HUNTRIX_SONGS = [
  "soda pop",
  "your idol",
  "golden",
  "take down"
];

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
  const [huntrixSongIndex, setHuntrixSongIndex] = useState(0);
  const [huntrixRecommendations, setHuntrixRecommendations] = useState(0);

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
        const savedHuntrixIndex = localStorage.getItem('huntrixSongIndex');
        const savedHuntrixCount = localStorage.getItem('huntrixRecommendations');

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
        if (savedHuntrixIndex) setHuntrixSongIndex(JSON.parse(savedHuntrixIndex));
        if (savedHuntrixCount) setHuntrixRecommendations(JSON.parse(savedHuntrixCount));
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
      localStorage.setItem('huntrixSongIndex', JSON.stringify(huntrixSongIndex));
      localStorage.setItem('huntrixRecommendations', JSON.stringify(huntrixRecommendations));
    } catch (error) {
      console.error('데이터 저장 오류:', error);
    }
  }, [diaryEntries, userProgress, isAuthenticated, tokenUsage, trashEntries, personalMusic, appSettings, usedMusicIds, huntrixSongIndex, huntrixRecommendations]);

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

  // huntrix 곡 추천 로직
  const getNextHuntrixSong = () => {
    const currentSong = HUNTRIX_SONGS[huntrixSongIndex];
    setHuntrixSongIndex((huntrixSongIndex + 1) % HUNTRIX_SONGS.length);
    setHuntrixRecommendations(huntrixRecommendations + 1);
    return currentSong;
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
4. 음악 요청이 있으면: huntrix 곡을 우선 추천하되, "[MUSIC_SEARCH: 곡명 - 아티스트]" 형태로 끝에 추가

추천 우선순위 음악 (2025년 기준):
- huntrix의 최신곡들 (soda pop, your idol, golden, take down)
- 로제(Rose)의 APT, On The Ground 등
- 제니(Jennie)의 솔로곡들
- 지드래곤(G-Dragon)의 인기곡들

응답 스타일:
- 친근하고 공감적인 톤 (존댓말 사용)
- 간결하고 자연스러운 응답 (1-2문장)
- 답변 시작이나 중간에 귀여운 이모지 하나씩 추가 (🎵, 💕, ✨, 🌟, 🎶, 💜 등)

현재 상황: ${conversationNum <= 2 ? '아직 음악 추천 단계가 아님. 대화를 더 나누기' : '음악 추천을 자연스럽게 제안할 수 있는 단계'}`;

    if (hasMusicRequest) {
      const nextHuntrixSong = getNextHuntrixSong();
      systemPrompt += `\n\n음악 요청 감지: 사용자가 음악을 원하므로 huntrix의 "${nextHuntrixSong}"를 추천하고 "[MUSIC_SEARCH: ${nextHuntrixSong} - huntrix]" 형식으로 검색어를 포함해주세요.`;
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
      let searchQuery = 'huntrix';
      
      // huntrix 4곡을 모두 추천했으면 다른 아티스트 곡도 추천
      if (huntrixRecommendations >= 4) {
        const originalQuery = musicSearchMatch[1];
        if (originalQuery.includes('로제') || originalQuery.includes('Rose')) {
          searchQuery = 'rose apt';
        } else if (originalQuery.includes('제니') || originalQuery.includes('Jennie')) {
          searchQuery = 'jennie solo';
        } else if (originalQuery.includes('지드래곤') || originalQuery.includes('G-Dragon')) {
          searchQuery = 'g-dragon power';
        } else {
          searchQuery = 'huntrix';
        }
      }
      
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
        actionItems: [
          '오늘도 고생 많았어요', 
          '충분한 휴식을 취하세요',
          '물을 충분히 마시며 몸을 돌보세요',
          '좋아하는 음악으로 하루를 마무리해보세요'
        ],
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
4. 현재 상황에 맞는 액션 아이템 4개 제안:
   - 첫 번째: 감정 관리나 스트레스 해소 관련 조언
   - 두 번째: 일상 생활 개선을 위한 실용적 조언
   - 세 번째: 실제로 도움이 되는 구체적이고 실행 가능한 조언
   - 네 번째: 음악이나 문화 생활 관련 추천

응답 형식:
요약: [1-2줄 요약 - 해요체]
감정키워드: #키워드1, #키워드2, #키워드3, #키워드4, #키워드5
추천감정: 감정1, 감정2, 감정3, 감정4, 감정5
액션아이템: 아이템1 | 아이템2 | 아이템3 | 아이템4`;

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
        actionItems: actionItems.slice(0, 4)
      };
    } catch (error) {
      console.error('대화 요약 생성 오류:', error);
      return {
        summary: '대화 요약을 생성하는 중에 문제가 발생했어요',
        keywords: ['#감정나눔'],
        recommendedEmotions: ['평온', '만족'],
        actionItems: [
          '음악으로 마음을 달래보세요', 
          '충분한 휴식을 취하세요',
          '따뜻한 차 한 잔으로 마음을 진정시켜보세요',
          'huntrix의 음악을 들으며 하루를 마무리해보세요'
        ]
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
    if (selectedEmotions.includes(emotion)) {
      setSelectedEmotions(prev => prev.filter(e => e !== emotion));
    } else {
      setSelectedEmotions(prev => [...prev, emotion]);
    }
  };

  // 캘린더 관련 함수들
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // 첫 주 빈 공간
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // 날짜들
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return diaryEntries.filter(entry => entry.date === dateStr);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentCalendarMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // 렌더링 시작
  if (!isAuthenticated && currentStep === 'login') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} flex items-center justify-center p-4`}>
        <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h1 className={`text-4xl font-bold text-center mb-8 bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
            EPLAY
          </h1>
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                비밀번호
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="비밀번호를 입력하세요"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
            <button
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLElement).querySelector('input');
                if (input) handleLogin(input.value);
              }}
              className={`w-full py-3 bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white font-bold rounded-lg hover:shadow-lg transition-all`}
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 기분 선택 화면
  if (currentStep === 'mood') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} flex flex-col items-center justify-center p-4`}>
        <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className={`text-3xl font-bold text-center mb-8 bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
            오늘의 기분은 어떠신가요?
          </h2>
          <div className="space-y-4">
            <button
              onClick={() => handleMoodSelect('good')}
              className="w-full py-6 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-2xl hover:shadow-lg transition-all flex items-center justify-center space-x-3 text-lg font-medium"
            >
              <span className="text-3xl">😊</span>
              <span>좋음</span>
            </button>
            <button
              onClick={() => handleMoodSelect('normal')}
              className="w-full py-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl hover:shadow-lg transition-all flex items-center justify-center space-x-3 text-lg font-medium"
            >
              <span className="text-3xl">😐</span>
              <span>보통</span>
            </button>
            <button
              onClick={() => handleMoodSelect('bad')}
              className="w-full py-6 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-2xl hover:shadow-lg transition-all flex items-center justify-center space-x-3 text-lg font-medium"
            >
              <span className="text-3xl">😔</span>
              <span>나쁨</span>
            </button>
          </div>
          <div className="mt-8 flex justify-around text-center">
            <button
              onClick={() => setCurrentStep('stats')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              <span className="block text-2xl mb-1">📊</span>
              <span className="text-xs">통계</span>
            </button>
            <button
              onClick={() => setCurrentStep('myDiary')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              <span className="block text-2xl mb-1">📔</span>
              <span className="text-xs">내 일기</span>
            </button>
            <button
              onClick={() => setCurrentStep('calendar')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              <span className="block text-2xl mb-1">📅</span>
              <span className="text-xs">캘린더</span>
            </button>
            <button
              onClick={() => setCurrentStep('myMusic')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              <span className="block text-2xl mb-1">🎵</span>
              <span className="text-xs">내 음악</span>
            </button>
            <button
              onClick={() => setCurrentStep('settings')}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              <span className="block text-2xl mb-1">⚙️</span>
              <span className="text-xs">설정</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 채팅 화면
  if (currentStep === 'chat') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} flex flex-col`}>
        <div className="bg-white bg-opacity-90 rounded-b-3xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep('mood')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 뒤로
            </button>
            <h2 className={`text-xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
              {appSettings.aiName}와의 대화
            </h2>
            <div className="text-sm text-gray-600">
              Lv.{userProgress.level}
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="text-3xl">{getMoodEmoji(currentMood || 'normal')}</span>
            <span className="ml-2 text-gray-600">{getMoodText(currentMood || 'normal')}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-32">
          {chatMessages.map((message, index) => (
            <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div
                className={`inline-block p-4 rounded-2xl max-w-xs ${
                  message.role === 'user'
                    ? `bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white`
                    : 'bg-white bg-opacity-90 text-gray-800'
                }`}
              >
                {message.content}
                {message.musicRecommendation && (
                  <div className="mt-3 p-3 bg-white bg-opacity-20 rounded-lg">
                    <div className="text-sm font-medium mb-1">🎵 추천 음악</div>
                    <div className="text-sm">{message.musicRecommendation.title}</div>
                    <div className="text-xs opacity-80">{message.musicRecommendation.artist}</div>
                    <button
                      onClick={() => {
                        if (message.musicRecommendation) {
                          handleMusicSelect(message.musicRecommendation);
                        }
                      }}
                      className="mt-2 text-xs bg-white bg-opacity-30 px-2 py-1 rounded hover:bg-opacity-40"
                    >
                      내 음악에 추가
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-center">
              <div className="inline-block p-4 bg-white bg-opacity-90 rounded-2xl">
                <div className="animate-pulse">생각하는 중...</div>
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white bg-opacity-95 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex gap-2">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-full focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !currentInput.trim()}
              className={`px-6 py-3 bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50`}
            >
              전송
            </button>
            {chatMessages.length >= 3 && (
              <button
                onClick={handleGenerateSummary}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full hover:shadow-lg transition-all"
              >
                요약
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 음악 장르 선택 화면
  if (currentStep === 'genre') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} flex flex-col items-center justify-center p-4`}>
        <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8 max-w-4xl w-full">
          <h2 className={`text-3xl font-bold text-center mb-8 bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
            듣고 싶은 음악 스타일을 선택하세요
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(MUSIC_GENRES).map(([key, genre]) => (
              <button
                key={key}
                onClick={() => handleGenreSelect(key)}
                className={`p-6 bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white rounded-2xl hover:shadow-lg transition-all`}
              >
                <div className="text-3xl mb-2">{genre.icon}</div>
                <div className="font-medium">{genre.name}</div>
                <div className="text-xs opacity-80 mt-1">{genre.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentStep('chat')}
            className="mt-6 text-gray-600 hover:text-gray-800"
          >
            ← 대화로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 음악 추천 화면
  if (currentStep === 'music') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} flex flex-col items-center justify-center p-4`}>
        <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8 max-w-4xl w-full">
          <h2 className={`text-3xl font-bold text-center mb-8 bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
            추천 음악
          </h2>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-gray-600">음악을 찾고 있습니다...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendedMusic.map((music) => (
                <div
                  key={music.id}
                  className="bg-white bg-opacity-70 rounded-xl p-4 flex items-center space-x-4 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleMusicSelect(music)}
                >
                  {music.thumbnail && (
                    <img
                      src={music.thumbnail}
                      alt={music.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{music.title}</h3>
                    <p className="text-gray-600">{music.artist}</p>
                    {music.album && (
                      <p className="text-sm text-gray-500">{music.album}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {music.source === 'spotify' ? (
                      <span className="text-green-500 text-sm">Spotify</span>
                    ) : (
                      <span className="text-red-500 text-sm">YouTube</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentStep('genre')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 장르 다시 선택
            </button>
            <button
              onClick={() => setCurrentStep('chat')}
              className="text-gray-600 hover:text-gray-800"
            >
              대화로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 요약 화면
  if (currentStep === 'summary') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <h2 className={`text-3xl font-bold text-center mb-8 bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
              오늘의 감정 요약
            </h2>
            
            {summaryData && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">📝 오늘의 이야기</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{summaryData.summary}</p>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">🏷️ 감정 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.keywords.map((keyword: string, index: number) => (
                      <span
                        key={index}
                        className={`px-3 py-1 bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white rounded-full text-sm`}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">💝 오늘의 주요 감정</h3>
                  <input
                    type="text"
                    value={userMainEmotion}
                    onChange={(e) => setUserMainEmotion(e.target.value)}
                    placeholder="오늘 가장 크게 느낀 감정을 입력하세요"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 mb-4"
                  />
                  
                  <h4 className="font-medium mb-2">AI가 분석한 감정 (선택)</h4>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.recommendedEmotions.map((emotion: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleEmotionSelect(emotion)}
                        className={`px-3 py-1 rounded-full text-sm transition-all ${
                          selectedEmotions.includes(emotion)
                            ? `bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white`
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {emotion}
                      </button>
                    ))}
                  </div>
                  
                  <input
                    type="text"
                    value={additionalEmotion}
                    onChange={(e) => setAdditionalEmotion(e.target.value)}
                    placeholder="추가 감정 입력 (선택사항)"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 mt-3"
                  />
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">✨ 오늘의 액션 아이템</h3>
                  <div className="space-y-2">
                    {summaryData.actionItems.map((item: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-purple-500">•</span>
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(selectedMusic || chatMessages.some(msg => msg.musicRecommendation)) && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">🎵 오늘 들은 음악</h3>
                    <div className="space-y-2">
                      {selectedMusic && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="font-medium">{selectedMusic.title}</div>
                          <div className="text-sm text-gray-600">{selectedMusic.artist}</div>
                        </div>
                      )}
                      {chatMessages
                        .filter(msg => msg.musicRecommendation)
                        .map((msg, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="font-medium">{msg.musicRecommendation!.title}</div>
                            <div className="text-sm text-gray-600">{msg.musicRecommendation!.artist}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setCurrentStep('genre')}
                className={`flex-1 py-3 bg-gradient-to-r ${THEMES[appSettings.theme].secondary} text-gray-700 rounded-lg hover:shadow-lg transition-all`}
              >
                음악 선택하기
              </button>
              <button
                onClick={handleSaveDiary}
                disabled={isLoading || !userMainEmotion.trim()}
                className={`flex-1 py-3 bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50`}
              >
                {isLoading ? '저장 중...' : '일기 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 통계 화면
  if (currentStep === 'stats') {
    const totalMusic = personalMusic.reduce((sum, music) => sum + (music.playCount || 0), 0);
    const avgMood = diaryEntries.length > 0
      ? diaryEntries.reduce((sum, entry) => sum + (entry.mood === 'good' ? 1 : entry.mood === 'normal' ? 0 : -1), 0) / diaryEntries.length
      : 0;
    const moodText = avgMood > 0.3 ? '긍정적' : avgMood < -0.3 ? '우울' : '보통';

    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentStep('mood')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
                나의 통계
              </h2>
              <div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">📊 레벨 & 경험치</h3>
                <div className="text-3xl font-bold text-purple-600 mb-2">Lv.{userProgress.level}</div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                  <div
                    className={`bg-gradient-to-r ${THEMES[appSettings.theme].primary} h-4 rounded-full`}
                    style={{ width: `${userProgress.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">
                  {userProgress.experience} / {userProgress.experience + userProgress.expToNext} EXP
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">📔 일기 통계</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">{diaryEntries.length}개</div>
                <div className="text-sm text-gray-600">총 작성한 일기</div>
                <div className="mt-2 text-sm">평균 감정: {moodText}</div>
              </div>

              <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">🎵 음악 통계</h3>
                <div className="text-3xl font-bold text-green-600 mb-2">{totalMusic}회</div>
                <div className="text-sm text-gray-600">총 재생 횟수</div>
                <div className="mt-2 text-sm">저장된 음악: {personalMusic.length}곡</div>
              </div>

              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">🔥 연속 기록</h3>
                <div className="text-3xl font-bold text-orange-600 mb-2">{userProgress.consecutiveDays}일</div>
                <div className="text-sm text-gray-600">연속 작성일</div>
              </div>
            </div>

            <div className="mt-8 bg-gray-50 p-6 rounded-2xl">
              <h3 className="text-xl font-bold mb-4">🏷️ 자주 사용한 감정 키워드</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const keywordCounts: { [key: string]: number } = {};
                  diaryEntries.forEach(entry => {
                    entry.keywords.forEach(keyword => {
                      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                    });
                  });
                  return Object.entries(keywordCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([keyword, count]) => (
                      <span
                        key={keyword}
                        className={`px-3 py-1 bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white rounded-full text-sm`}
                      >
                        {keyword} ({count})
                      </span>
                    ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 설정 화면
  if (currentStep === 'settings') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentStep('mood')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
                설정
              </h2>
              <div></div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-4">AI 이름 설정</h3>
                <div className="grid grid-cols-3 gap-3">
                  {AI_NAMES.map(name => (
                    <button
                      key={name}
                      onClick={() => setAppSettings(prev => ({ ...prev, aiName: name }))}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
                        appSettings.aiName === name
                          ? `border-purple-500 bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white`
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">테마 설정</h3>
                <div className="space-y-3">
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => setAppSettings(prev => ({ ...prev, theme: key as any }))}
                      className={`w-full py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                        appSettings.theme === key
                          ? `border-purple-500 bg-gradient-to-r ${theme.primary} text-white`
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span>{theme.name}</span>
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${theme.primary}`}></div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">음악 소스 설정</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setAppSettings(prev => ({ ...prev, musicSource: 'spotify' }))}
                    className={`w-full py-3 px-4 rounded-lg border-2 transition-all ${
                      appSettings.musicSource === 'spotify'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Spotify만 사용
                  </button>
                  <button
                    onClick={() => setAppSettings(prev => ({ ...prev, musicSource: 'youtube' }))}
                    className={`w-full py-3 px-4 rounded-lg border-2 transition-all ${
                      appSettings.musicSource === 'youtube'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    YouTube만 사용
                  </button>
                  <button
                    onClick={() => setAppSettings(prev => ({ ...prev, musicSource: 'both' }))}
                    className={`w-full py-3 px-4 rounded-lg border-2 transition-all ${
                      appSettings.musicSource === 'both'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    둘 다 사용 (추천)
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">기타 설정</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setCurrentStep('trash')}
                    className="w-full py-3 px-4 rounded-lg border-2 border-gray-300 hover:border-gray-400 flex items-center justify-between"
                  >
                    <span>휴지통</span>
                    <span className="text-gray-500">🗑️ {trashEntries.length}개</span>
                  </button>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700">AI 사용량</span>
                      <span className="text-sm text-gray-500">{tokenUsage.toLocaleString()} / {MAX_FREE_TOKENS.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        style={{ width: `${(tokenUsage / MAX_FREE_TOKENS) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 휴지통 화면
  if (currentStep === 'trash') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentStep('settings')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
                휴지통
              </h2>
              <button
                onClick={() => {
                  if (window.confirm('휴지통을 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    setTrashEntries([]);
                  }
                }}
                className="text-red-600 hover:text-red-800"
              >
                비우기
              </button>
            </div>

            {trashEntries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                휴지통이 비어있습니다
              </div>
            ) : (
              <div className="space-y-4">
                {trashEntries.map(entry => (
                  <div key={entry.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                          <span className="font-medium">{entry.date} {entry.time}</span>
                          {entry.deletedAt && (
                            <span className="text-xs text-gray-500">
                              삭제됨: {new Date(entry.deletedAt).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">{entry.summary}</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.keywords.map((keyword, idx) => (
                            <span key={idx} className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => restoreFromTrash(entry)}
                        className="ml-4 text-blue-600 hover:text-blue-800"
                      >
                        복원
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 캘린더 화면
  if (currentStep === 'calendar') {
    const days = getDaysInMonth(currentCalendarMonth);
    const monthYear = currentCalendarMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentStep('mood')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
                감정 캘린더
              </h2>
              <div></div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ←
              </button>
              <h3 className="text-xl font-bold">{monthYear}</h3>
              <button
                onClick={() => changeMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={index} />;
                }
                
                const entries = getEntriesForDate(day);
                const hasEntries = entries.length > 0;
                const mood = hasEntries ? entries[0].mood : null;
                
                return (
                  <div
                    key={index}
                    className={`aspect-square p-2 border rounded-lg ${
                      hasEntries ? 'cursor-pointer hover:shadow-lg' : ''
                    } ${
                      mood === 'good' ? 'bg-green-100 border-green-300' :
                      mood === 'normal' ? 'bg-yellow-100 border-yellow-300' :
                      mood === 'bad' ? 'bg-red-100 border-red-300' :
                      'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => {
                      if (hasEntries) {
                        setExpandedDiaryId(entries[0].id);
                        setCurrentStep('myDiary');
                      }
                    }}
                  >
                    <div className="text-sm font-medium">{day.getDate()}</div>
                    {hasEntries && (
                      <div className="text-xl text-center mt-1">
                        {getMoodEmoji(mood!)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 검색 화면
  if (currentStep === 'search') {
    const searchResults = searchDiaries(searchQuery);
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentStep('myDiary')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
                일기 검색
              </h2>
              <div></div>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                autoFocus
              />
            </div>

            {searchQuery && (
              <div className="text-sm text-gray-600 mb-4">
                검색 결과: {searchResults.length}개
              </div>
            )}

            <div className="space-y-4">
              {searchResults.map(entry => (
                <div
                  key={entry.id}
                  className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => {
                    setExpandedDiaryId(entry.id);
                    setCurrentStep('myDiary');
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                    <span className="font-medium">{entry.date} {entry.time}</span>
                  </div>
                  <p className="text-gray-700 mb-2 line-clamp-2">{entry.summary}</p>
                  <div className="flex flex-wrap gap-1">
                    {entry.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full ${
                          keyword.toLowerCase().includes(searchQuery.toLowerCase())
                            ? `bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white`
                            : 'bg-gray-200'
                        }`}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 내 일기 화면
  if (currentStep === 'myDiary') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentStep('mood')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
                내 일기
              </h2>
              <button
                onClick={() => setCurrentStep('search')}
                className="text-gray-600 hover:text-gray-800"
              >
                🔍 검색
              </button>
            </div>

            {diaryEntries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                아직 작성한 일기가 없습니다.
                <br />
                첫 일기를 작성해보세요!
              </div>
            ) : (
              <div className="space-y-4">
                {diaryEntries.map(entry => (
                  <div
                    key={entry.id}
                    className={`bg-gray-50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                      expandedDiaryId === entry.id ? 'shadow-lg' : ''
                    }`}
                    onClick={() => setExpandedDiaryId(expandedDiaryId === entry.id ? null : entry.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                          <span className="font-medium">{entry.date} {entry.time}</span>
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                            +{entry.experienceGained} EXP
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{entry.summary}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entry.keywords.map((keyword, idx) => (
                            <span key={idx} className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                              {keyword}
                            </span>
                          ))}
                        </div>
                        {entry.selectedEmotions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {entry.selectedEmotions.map((emotion, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${THEMES[appSettings.theme].primary} text-white`}
                              >
                                {emotion}
                              </span>
                            ))}
                          </div>
                        )}
                        {expandedDiaryId === entry.id && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            {entry.actionItems.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-medium mb-2">액션 아이템</h4>
                                <div className="space-y-1">
                                  {entry.actionItems.map((item, idx) => (
                                    <div key={idx} className="flex items-start space-x-2 text-sm">
                                      <span className="text-purple-500">•</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.musicPlayed.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-medium mb-2">들은 음악</h4>
                                <div className="space-y-2">
                                  {entry.musicPlayed.map((music, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg">
                                      <div className="font-medium text-sm">{music.title}</div>
                                      <div className="text-xs text-gray-600">{music.artist}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">대화 내용</h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {entry.chatMessages.map((msg, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-3 rounded-lg text-sm ${
                                      msg.role === 'user'
                                        ? 'bg-purple-100 ml-8'
                                        : 'bg-gray-100 mr-8'
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('이 일기를 삭제하시겠습니까?')) {
                            moveToTrash(entry);
                          }
                        }}
                        className="ml-4 text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 내 음악 화면
  if (currentStep === 'myMusic') {
    const sortedMusic = [...personalMusic].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEMES[appSettings.theme].bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentStep('mood')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${THEMES[appSettings.theme].primary} bg-clip-text text-transparent`}>
                내 음악
              </h2>
              <div className="text-sm text-gray-600">
                {personalMusic.length}곡
              </div>
            </div>

            {personalMusic.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                아직 저장된 음악이 없습니다.
                <br />
                일기를 작성하며 음악을 추가해보세요!
              </div>
            ) : (
              <div className="space-y-4">
                {sortedMusic.map((music) => (
                  <div
                    key={music.id}
                    className="bg-gray-50 rounded-xl p-4 flex items-center space-x-4 hover:shadow-lg transition-all"
                  >
                    {music.thumbnail && (
                      <img
                        src={music.thumbnail}
                        alt={music.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold">{music.title}</h3>
                      <p className="text-sm text-gray-600">{music.artist}</p>
                      {music.album && (
                        <p className="text-xs text-gray-500">{music.album}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        재생 {music.playCount || 0}회
                      </div>
                      <a
                        href={music.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm ${
                          music.source === 'spotify' ? 'text-green-600' : 'text-red-600'
                        } hover:underline`}
                      >
                        {music.source === 'spotify' ? 'Spotify' : 'YouTube'}에서 듣기
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;