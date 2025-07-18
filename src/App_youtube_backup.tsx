import React, { useState, useEffect } from 'react';

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

// 상수 정의
const APP_PASSWORD = "2752";
const MAX_FREE_TOKENS = 100000;

// 음악 장르 수를 4개로 줄이고 키워드도 2-3개로 제한
const MUSIC_GENRES = {
  kpop: {
    name: "K-POP",
    icon: "🇰🇷",
    desc: "한국 10대 필수템",
    searchKeywords: [
      "kpop 2025 official MV",
      "newjeans 2025 official MV",
      "aespa 2025 official MV"
    ]
  },
  healing: {
    name: "힐링 플레이리스트",
    icon: "🌸",
    desc: "마음 달래기용",
    searchKeywords: [
      "2025 healing music official MV",
      "2025 relaxing piano official",
      "calm music 2025 official MV"
    ]
  },
  ballad: {
    name: "발라드",
    icon: "🎤",
    desc: "감정 표현용",
    searchKeywords: [
      "korean ballad 2025 official MV",
      "iu 2025 official music video",
      "mamamoo 2025 ballad official"
    ]
  },
  pop: {
    name: "팝송",
    icon: "🌍",
    desc: "해외 인기곡들",
    searchKeywords: [
      "pop music 2025 official MV",
      "billboard hits 2025 official",
      "taylor swift 2025 official MV"
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
    name: '이플리 퍼플',
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

const EMOTION_OPTIONS = [
  "행복", "기쁨", "설렘", "감사", "만족", "평온", "차분", "편안",
  "걱정", "불안", "스트레스", "피곤", "우울", "슬픔", "화남", "짜증",
  "외로움", "아쉬움", "후회", "부끄러움", "놀라움", "혼란", "무기력", "지루함"
];

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

  // API 키 설정 - 환경변수나 .env 파일에서 가져오기
  const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || "";
  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || "";

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

  // YouTube API 호출 - 단일 검색으로 최적화
  const searchYouTubeMusic = async (query: string): Promise<MusicItem | null> => {
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API 키가 설정되지 않았습니다.');
      return null;
    }

    try {
      const searchQuery = `${query} official MV`;
      const url = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `type=video&` +
        `maxResults=5&` +
        `order=relevance&` +
        `videoDuration=medium&` +
        `regionCode=KR&` +
        `key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('YouTube API Error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        // 사용되지 않은 음악 찾기
        for (const item of data.items) {
          const videoId = item.id.videoId;
          if (!usedMusicIds.has(videoId)) {
            // 새로운 음악 발견 시 사용 목록에 추가
            setUsedMusicIds(prev => new Set([...Array.from(prev), videoId]));
            
            return {
              id: videoId,
              title: item.snippet.title,
              artist: item.snippet.channelTitle,
              genre: 'recommended',
              thumbnail: item.snippet.thumbnails.medium.url,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              publishedAt: item.snippet.publishedAt,
              rating: 0,
              playCount: 0
            };
          }
        }
        
        // 모든 결과가 중복이면 첫 번째 결과 반환
        const item = data.items[0];
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          genre: 'recommended',
          thumbnail: item.snippet.thumbnails.medium.url,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          publishedAt: item.snippet.publishedAt,
          rating: 0,
          playCount: 0
        };
      }
    } catch (error) {
      console.error('YouTube 검색 오류:', error);
    }

    return null;
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
4. 음악 요청이 있으면: 2025년 최신 곡 중에서 구체적인 곡명과 아티스트를 추천하되, "[MUSIC_SEARCH: 곡명 - 아티스트]" 형태로 끝에 추가

추천 우선순위 음악 (2025년 기준):
- K-pop: Demonhunters의 Golden, Soda pop 등
- 최신 한국 드라마 OST 2025
- 영화 OST 2025

응답 스타일:
- 친근하고 공감적인 톤 (존댓말 사용)
- 간결하고 자연스러운 응답 (1-2문장)
- 답변 시작이나 중간에 귀여운 이모지 하나씩 추가 (🎵, 💕, ✨, 🌟, 🎶, 💜 등)

현재 상황: ${conversationNum <= 2 ? '아직 음악 추천 단계가 아님. 대화를 더 나누기' : '음악 추천을 자연스럽게 제안할 수 있는 단계'}`;

    if (hasMusicRequest) {
      systemPrompt += `\n\n음악 요청 감지: 사용자가 음악을 원하므로 2025년 신곡 중에서 구체적인 곡을 추천하고 "[MUSIC_SEARCH: 곡명 - 아티스트]" 형식으로 검색어를 포함해주세요.`;
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
      const searchQuery = musicSearchMatch[1];
      const cleanResponse = aiResponse.replace(/\[MUSIC_SEARCH: [^\]]+\]/, '').trim();
      
      try {
        const musicResult = await searchYouTubeMusic(searchQuery);
        if (musicResult) {
          return {
            response: cleanResponse,
            music: musicResult
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

  // 음악 장르 선택 - API 호출 최소화
  const handleGenreSelect = async (genre: string) => {
    setSelectedGenre(genre);
    setCurrentStep('music');
    setIsLoading(true);
    
    try {
      const genreData = MUSIC_GENRES[genre as keyof typeof MUSIC_GENRES];
      const keywords = genreData?.searchKeywords || ['music official MV'];
      
      const musicResults: MusicItem[] = [];
      
      // 한 번에 하나씩만 검색하고 최대 3개까지
      for (let i = 0; i < Math.min(3, keywords.length); i++) {
        const keyword = keywords[i];
        const music = await searchYouTubeMusic(keyword);
        
        if (music && !musicResults.find(m => m.id === music.id)) {
          musicResults.push(music);
        }
        
        // API 호출 간격을 늘림
        if (i < keywords.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setRecommendedMusic(musicResults);
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
      const finalEmotions = customEmotion.trim() ? [...selectedEmotions, customEmotion.trim()] : selectedEmotions;
      
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

      // 상태 초기화
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

  // 컴포넌트 렌더링 함수들
  const getCurrentTheme = () => THEMES[appSettings.theme];

  const renderTokenBar = () => {
    const usageRatio = Math.min(tokenUsage / MAX_FREE_TOKENS, 1.0);
    const remaining = Math.max(0, MAX_FREE_TOKENS - tokenUsage);

    let color = '#9c27b0';
    let status = '충분해요';

    if (usageRatio >= 0.95) {
      color = '#f44336';
      status = '조금 부족해요';
    } else if (usageRatio >= 0.5) {
      color = '#ff9800';
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
          <h1 className={`text-2xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>이플리</h1>
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

        {/* 메뉴 아이콘 버튼들 - 순서 수정 */}
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
            <span className="text-sm font-medium text-gray-700">음악 장르</span>
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
            <span className="text-sm font-medium text-gray-700">감정달력</span>
            <span className="text-xs text-gray-500">통계</span>
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
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={message.musicRecommendation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1 px-2 bg-red-500 text-white rounded text-center text-xs hover:bg-red-600"
                        >
                          유튜브에서 듣기
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
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">음악 장르 선택</h2>
          <p className="text-gray-600">{getMoodEmoji(currentMood || 'normal')} {getMoodText(currentMood || 'normal')} 기분에 어떤 음악을 들어보시겠어요?</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mb-8">
          {Object.entries(MUSIC_GENRES).map(([key, genre]) => (
            <button
              key={key}
              onClick={() => handleGenreSelect(key)}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{genre.icon}</div>
              <h3 className="text-lg font-bold mb-2">{genre.name}</h3>
              <p className="text-sm text-gray-600">{genre.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex space-x-4 justify-center">
          <button
            onClick={() => setCurrentStep('mood')}
            className={`px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}
          >
            🏠 홈으로
          </button>
        </div>
      </div>
    </div>
  );

  const renderMusicPlayer = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🎵 음악 추천</h2>
          
          {isLoading ? (
            <div className="text-center">
              <div className={`animate-spin rounded-full h-32 w-32 border-b-2 border-${getCurrentTheme().accent} mx-auto mb-4`}></div>
              <p className="text-gray-600">음악을 찾고 있어요...</p>
            </div>
          ) : recommendedMusic.length > 0 ? (
            <div>
              {/* 메인 추천곡 */}
              {recommendedMusic[0] && (
                <div className="mb-8 text-center border-b pb-6">
                  <h3 className="text-xl font-bold mb-4 text-blue-600">메인 추천곡</h3>
                  <div className="mb-6">
                    <img 
                      src={recommendedMusic[0].thumbnail} 
                      alt={recommendedMusic[0].title}
                      className="w-64 h-48 object-cover rounded-lg mx-auto mb-4"
                    />
                    <h4 className="text-xl font-bold mb-2">{recommendedMusic[0].title}</h4>
                    <p className="text-gray-600 mb-4">{recommendedMusic[0].artist}</p>
                    
                    <div className="mb-6">
                      <iframe
                        width="100%"
                        height="315"
                        src={`https://www.youtube.com/embed/${recommendedMusic[0].id}?autoplay=0`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                      ></iframe>
                    </div>

                    <button
                      onClick={() => handleMusicSelect(recommendedMusic[0])}
                      className={`w-full py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90 mb-4`}
                    >
                      이 음악을 내 리스트에 추가하기
                    </button>
                  </div>
                </div>
              )}

              {/* 추가 음악 목록 */}
              {recommendedMusic.length > 1 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 text-green-600">추가 추천 음악</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedMusic.slice(1).map((music) => (
                      <div key={music.id} className="bg-gray-50 rounded-lg p-4">
                        <img 
                          src={music.thumbnail} 
                          alt={music.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                        <h4 className="font-bold text-sm mb-1">{music.title}</h4>
                        <p className="text-gray-600 text-xs mb-3">{music.artist}</p>
                        <div className="flex space-x-2">
                          <a
                            href={music.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-red-500 text-white rounded text-center text-sm hover:bg-red-600"
                          >
                            유튜브에서 듣기
                          </a>
                          <button
                            onClick={() => handleMusicSelect(music)}
                            className="flex-1 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            리스트 추가
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">죄송해요. 현재 음악을 불러올 수 없습니다.</p>
              <p className="text-gray-500 text-sm mb-4">YouTube API 제한이나 네트워크 문제일 수 있어요.</p>
              <button
                onClick={() => handleGenreSelect(selectedGenre || 'kpop')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                다시 시도하기
              </button>
            </div>
          )}

          <div className="flex space-x-4 justify-center mt-6">
            <button
              onClick={() => setCurrentStep('genre')}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              ← 이전으로
            </button>
            <button
              onClick={() => setCurrentStep('mood')}
              className={`px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}
            >
              🏠 홈으로
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">📝 감정 요약</h2>

          {summaryData && (
            <>
              <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg p-4 mb-6 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
                <h3 className={`text-lg font-bold mb-2 text-${getCurrentTheme().accent.split('-')[0]}-800`}>오늘의 요약</h3>
                <p className={`text-${getCurrentTheme().accent.split('-')[0]}-700`}>{summaryData.summary}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3">AI 추천 감정 (최대 2개 선택)</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {summaryData.recommendedEmotions.map((emotion: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleEmotionSelect(emotion)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedEmotions.includes(emotion)
                          ? 'bg-white text-purple-800 shadow-lg border-2 border-purple-500'
                          : `bg-gray-200 text-gray-700 hover:bg-${getCurrentTheme().accent.split('-')[0]}-100 hover:text-${getCurrentTheme().accent.split('-')[0]}-800`
                      }`}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>

                <h3 className="text-lg font-bold mb-3">직접 감정 입력</h3>
                <input
                  type="text"
                  value={customEmotion}
                  onChange={(e) => setCustomEmotion(e.target.value)}
                  placeholder="나만의 감정을 입력해주세요"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent} mb-4`}
                />

                <div className="text-sm text-gray-600 mb-4">
                  선택된 감정: {selectedEmotions.join(', ')} {customEmotion && `+ ${customEmotion}`}
                </div>
              </div>

              {summaryData.actionItems && summaryData.actionItems.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6 border border-green-200">
                  <h3 className="text-lg font-bold mb-2 text-green-800">오늘의 액션 아이템</h3>
                  <ul className="space-y-2">
                    {summaryData.actionItems.map((item: string, index: number) => (
                      <li key={index} className="text-green-700 flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('chat')}
                  className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  ← 이전으로
                </button>
                <button
                  onClick={handleSaveDiary}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90"
                >
                  💾 일기로 저장하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderMyDiary = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">📖 내 일기장</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentStep('mood')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🏠 홈으로
              </button>
            </div>
          </div>

          {diaryEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">아직 저장된 일기가 없습니다</p>
              <p className="text-gray-400 text-sm mt-2">첫 번째 감정 일기를 작성해보세요!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {diaryEntries.slice().reverse().map((entry) => (
                <div key={entry.id} className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg p-6 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{getMoodEmoji(entry.mood)}</span>
                      <div>
                        <h3 className={`text-lg font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>
                          {entry.date} {entry.time}
                        </h3>
                        <p className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>
                          기분: {getMoodText(entry.mood)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => moveToTrash(entry)}
                      className="text-red-500 hover:text-red-700 p-2 rounded"
                      title="휴지통으로 이동"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">오늘의 요약</h4>
                    <p className="text-gray-700">{entry.summary}</p>
                  </div>

                  {entry.selectedEmotions && entry.selectedEmotions.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">선택한 감정</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.selectedEmotions.map((emotion, index) => (
                          <span
                            key={index}
                            className={`px-3 py-1 bg-${getCurrentTheme().accent.split('-')[0]}-100 text-${getCurrentTheme().accent.split('-')[0]}-800 rounded-full text-sm`}
                          >
                            {emotion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.keywords && entry.keywords.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">키워드</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.actionItems && entry.actionItems.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">액션 아이템</h4>
                      <ul className="space-y-1">
                        {entry.actionItems.map((item, index) => (
                          <li key={index} className="text-green-700 flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.musicPlayed && entry.musicPlayed.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">선택한 음악</h4>
                      {entry.musicPlayed.map((music, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg mb-2">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={music.thumbnail} 
                              alt={music.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium">{music.title}</p>
                              <p className="text-sm text-gray-600">{music.artist}</p>
                            </div>
                            <a
                              href={music.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              듣기
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMyMusic = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🎵 내 음악 리스트</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentStep('mood')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🏠 홈으로
              </button>
            </div>
          </div>

          {personalMusic.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">저장된 음악이 없습니다</p>
              <p className="text-gray-400 text-sm mt-2">음악을 선택해서 나만의 플레이리스트를 만들어보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personalMusic.map((music, index) => (
                <div key={music.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <img 
                    src={music.thumbnail} 
                    alt={music.title}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                  <h3 className="font-bold text-sm mb-1">{music.title}</h3>
                  <p className="text-gray-600 text-xs mb-2">{music.artist}</p>
                  <p className="text-gray-500 text-xs mb-3">
                    장르: {MUSIC_GENRES[music.genre as keyof typeof MUSIC_GENRES]?.name || music.genre}
                  </p>
                  <p className="text-gray-500 text-xs mb-3">
                    재생 횟수: {music.playCount || 1}회
                  </p>
                  <div className="flex space-x-2">
                    <a
                      href={music.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-red-500 text-white rounded text-center text-sm hover:bg-red-600"
                    >
                      유튜브에서 듣기
                    </a>
                    <button
                      onClick={() => {
                        setPersonalMusic(prev => prev.filter(m => m.id !== music.id));
                        alert('음악이 리스트에서 제거되었습니다.');
                      }}
                      className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      title="리스트에서 제거"
                    >
                      🗑️
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

  const renderTrash = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">🗑️ 휴지통</h2>
            <div className="flex space-x-2">
              {trashEntries.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('휴지통을 모두 비우시겠습니까?')) {
                      setTrashEntries([]);
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  전체 비우기
                </button>
              )}
              <button
                onClick={() => setCurrentStep('mood')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🏠 홈으로
              </button>
            </div>
          </div>

          {trashEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">휴지통이 비어있습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trashEntries.map((entry) => (
                <div key={entry.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                      <div>
                        <p className="font-medium">{entry.date} {entry.time}</p>
                        <p className="text-sm text-gray-600">{entry.summary}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => restoreFromTrash(entry)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        복원
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('영구적으로 삭제하시겠습니까?')) {
                            setTrashEntries(prev => prev.filter(e => e.id !== entry.id));
                          }
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        완전 삭제
                      </button>
                    </div>
                  </div>
                  {entry.deletedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      삭제일: {new Date(entry.deletedAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCalendar = () => {
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
              <h2 className="text-2xl font-bold">📅 감정 달력</h2>
              <button
                onClick={() => setCurrentStep('mood')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🏠 홈으로
              </button>
            </div>

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
              <h3 className="text-xl font-bold">
                {currentCalendarMonth.getFullYear()}년 {monthNames[currentCalendarMonth.getMonth()]}
              </h3>
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

            <div className="grid grid-cols-7 gap-1">
              {calendarData.flat().map((day, index) => (
                <div
                  key={index}
                  className={`p-2 h-20 border rounded ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-gray-100'
                  } ${day.isToday ? `ring-2 ring-${getCurrentTheme().accent}` : ''}`}
                >
                  <div className="text-sm font-medium">{day.date.getDate()}</div>
                  {day.entries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {day.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="relative group"
                        >
                          <div
                            className="w-3 h-3 rounded-full cursor-pointer"
                            style={{
                              backgroundColor: entry.mood === 'good' ? '#10b981' : 
                                             entry.mood === 'normal' ? '#f59e0b' : '#ef4444'
                            }}
                          />
                          <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <p className="font-bold">{getMoodText(entry.mood)}: {entry.summary.substring(0, 50)}...</p>
                            {entry.selectedEmotions && entry.selectedEmotions.length > 0 && (
                              <p className="mt-1">감정: {entry.selectedEmotions.slice(0, 2).join(', ')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm">좋음</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">보통</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm">나쁨</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSearch = () => {
    const searchResults = searchDiaries(searchQuery);

    return (
      <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          {renderUserProgress()}
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">🔍 일기 검색</h2>
              <button
                onClick={() => setCurrentStep('mood')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🏠 홈으로
              </button>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="감정, 키워드, 액션아이템, 음악 제목으로 검색하세요..."
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}
              />
              <p className="text-sm text-gray-500 mt-2">
                총 {diaryEntries.length}개의 일기에서 검색합니다
              </p>
            </div>

            <div className="space-y-4">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">검색어를 입력하세요</p>
                  <p className="text-gray-400 text-sm mt-2">감정, 키워드, 음악 제목 등으로 검색할 수 있어요</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">'{searchQuery}'에 대한 검색 결과가 없습니다</p>
                  <p className="text-gray-400 text-sm mt-2">다른 키워드로 검색해보세요</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    '{searchQuery}'에 대한 검색 결과 {searchResults.length}개
                  </p>
                  {searchResults.map((entry) => (
                    <div key={entry.id} className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg p-4 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                          <div>
                            <p className="font-medium">{entry.date} {entry.time}</p>
                            <p className="text-sm text-gray-600">{entry.summary}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => moveToTrash(entry)}
                          className="text-red-500 hover:text-red-700 p-1 rounded"
                          title="휴지통으로 이동"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      {entry.selectedEmotions && entry.selectedEmotions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            감정: {entry.selectedEmotions.join(', ')}
                          </p>
                        </div>
                      )}
                      
                      {entry.keywords && entry.keywords.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            키워드: {entry.keywords.join(', ')}
                          </p>
                        </div>
                      )}
                      
                      {entry.actionItems && entry.actionItems.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            액션아이템: {entry.actionItems.join(', ')}
                          </p>
                        </div>
                      )}
                      
                      {entry.musicPlayed && entry.musicPlayed.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            음악: {entry.musicPlayed.map(m => m.title).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 통계와 달력을 합친 renderStats 함수
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

  const renderSettings = () => (
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {renderUserProgress()}
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">⚙️ 설정</h2>
            <button
              onClick={() => setCurrentStep('mood')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              🏠 홈으로
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-3">AI 이름 설정 (현재: {appSettings.aiName})</h3>
              <div className="grid grid-cols-3 gap-2">
                {AI_NAMES.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setAppSettings(prev => ({ ...prev, aiName: name }));
                      alert(`AI 이름이 ${name}로 변경되었습니다!`);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      appSettings.aiName === name
                        ? 'bg-white text-purple-800 shadow-lg border-2 border-purple-500'
                        : `bg-gray-200 text-gray-700 hover:bg-${getCurrentTheme().accent.split('-')[0]}-100 hover:text-${getCurrentTheme().accent.split('-')[0]}-800`
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">테마 설정 (현재: {getCurrentTheme().name})</h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setAppSettings(prev => ({ ...prev, theme: key as 'purple' | 'blue' | 'pink' }));
                      alert(`테마가 ${theme.name}로 변경되었습니다!`);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      appSettings.theme === key
                        ? 'bg-white text-purple-800 shadow-lg border-2 border-purple-500'
                        : `bg-gray-200 text-gray-700 hover:bg-${getCurrentTheme().accent.split('-')[0]}-100 hover:text-${getCurrentTheme().accent.split('-')[0]}-800`
                    }`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">음악 중복 방지 설정</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">사용된 음악 ID 개수: {usedMusicIds.size}개</p>
                <button
                  onClick={() => {
                    if (window.confirm('음악 중복 방지 기록을 초기화하시겠습니까?')) {
                      setUsedMusicIds(new Set());
                      alert('음악 중복 방지 기록이 초기화되었습니다.');
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  중복 방지 기록 초기화
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">앱 정보</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">버전: 2.4.0 (API 최적화 업데이트)</p>
                <p className="text-sm text-gray-600 mb-2">총 기록: {diaryEntries.length}개</p>
                <p className="text-sm text-gray-600 mb-2">저장된 음악: {personalMusic.length}개</p>
                <p className="text-sm text-gray-600 mb-2">휴지통: {trashEntries.length}개</p>
                <p className="text-sm text-gray-600 mb-2">현재 레벨: {userProgress.level}</p>
                <p className="text-sm text-gray-600">AI 이름: {appSettings.aiName}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3 text-red-600">모든 데이터 삭제</h3>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <button
                  onClick={() => {
                    if (window.confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                      if (window.confirm('마지막 확인: 모든 일기, 음악, 설정이 삭제됩니다. 계속하시겠습니까?')) {
                        localStorage.clear();
                        setDiaryEntries([]);
                        setPersonalMusic([]);
                        setTrashEntries([]);
                        setUsedMusicIds(new Set());
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
                        alert('모든 데이터가 삭제되었습니다.');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                >
                  모든 데이터 삭제
                </button>
                <p className="text-xs text-red-600 mt-2">
                  주의: 이 기능은 모든 일기, 음악, 설정을 완전히 삭제합니다.
                </p>
              </div>
            </div>
          </div>
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
      return renderMusicPlayer();
    case 'summary':
      return renderSummary();
    case 'myDiary':
      return renderMyDiary();
    case 'myMusic':
      return renderMyMusic();
    case 'trash':
      return renderTrash();
    case 'calendar':
      return renderCalendar();
    case 'search':
      return renderSearch();
    case 'stats':
      return renderStats();
    case 'settings':
      return renderSettings();
    default:
      return renderMoodSelection();
  }
};

export default App;