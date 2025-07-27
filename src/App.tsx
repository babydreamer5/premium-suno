import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, googleProvider } from './firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  searchMusicByEmotion, 
  improvedSearchMusicByEmotion,
  EMOTION_MUSIC_DATABASE,
  MUSIC_GENRES,
  MusicItem
} from './musicData';

// 기본 설정
const APP_THEME = {
  name: '이플레이 퍼플',
  primary: 'from-purple-500 to-pink-500',
  secondary: 'from-purple-100 to-pink-100',
  accent: 'purple-500',
  bgClass: 'from-purple-100 to-pink-100'
};
const AI_NAME = "하모니";

// 타입 정의
interface DiaryEntry {
  id: string;
  userId: string;
  date: string;
  time: string;
  mood: 'good' | 'normal' | 'bad';
  summary: string;
  keywords: string[];
  selectedEmotions: string[];
  musicPlayed: MusicItem[];
  chatMessages: ChatMessage[];
  experienceGained: number;
  actionItems: string[];
  deletedAt?: string | null;
  createdAt: Timestamp | Date | any;
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
  isPremium: boolean;
  notifications: boolean;
  musicPreferences: string[];
  aiPartnerName?: string;
}

interface SummaryData {
  summary: string;
  keywords: string[];
  recommendedEmotions: string[];
  actionItems: string[];
  recommendedMusic?: MusicItem[];
}

// 상수 정의
const MAX_FREE_TOKENS = 100000;
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

// 음악 데이터 캐싱 시스템
const MUSIC_CACHE_KEY = 'enrichedMusicData';
const CACHE_TIME_KEY = 'musicDataCacheTime';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일

const App: React.FC = () => {
  // 상태 관리
  const [user, setUser] = useState<User | null>(null);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'auth' | 'onboard-name' | 'onboard-name-input' | 'onboard-music' | 'mood' | 'chat' | 'summary' | 'stats' | 'settings' | 'trash' | 'calendar' | 'search' | 'myDiary' | 'myMusic'>('auth');
  const [currentMood, setCurrentMood] = useState<'good' | 'normal' | 'bad' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [trashEntries, setTrashEntries] = useState<DiaryEntry[]>([]);
  const [personalMusic, setPersonalMusic] = useState<MusicItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [userMainEmotion, setUserMainEmotion] = useState('');
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
    isPremium: false,
    notifications: true,
    musicPreferences: [],
    aiPartnerName: ''
  });
  const [currentInput, setCurrentInput] = useState("");
  const [tokenUsage, setTokenUsage] = useState(0);
  const [expandedDiaryId, setExpandedDiaryId] = useState<string | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [hasRecommendedMusic, setHasRecommendedMusic] = useState(false);
  const [recommendedMusicForSummary, setRecommendedMusicForSummary] = useState<MusicItem[]>([]);
  const [enrichedMusicDatabase, setEnrichedMusicDatabase] = useState<MusicItem[]>(EMOTION_MUSIC_DATABASE);

  // 온보딩 관련 상태
  const [selectedPersonType, setSelectedPersonType] = useState('');
  const [selectedPersonName, setSelectedPersonName] = useState('');
  const [selectedMusicGenres, setSelectedMusicGenres] = useState<string[]>([]);

  // API 키 설정
  const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

  // 유틸리티 함수들
  const getCurrentTheme = () => APP_THEME;
  const getAIPartnerName = () => {
    return appSettings.aiPartnerName || AI_NAME;
  };
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

  const searchDiaries = (query: string): DiaryEntry[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return diaryEntries.filter(entry => 
      entry.summary.toLowerCase().includes(lowerQuery) ||
      (entry.keywords && entry.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))) ||
      (entry.selectedEmotions && entry.selectedEmotions.some(emotion => emotion.toLowerCase().includes(lowerQuery))) ||
      (entry.musicPlayed && entry.musicPlayed.some(music => music.title.toLowerCase().includes(lowerQuery))) ||
      (entry.actionItems && entry.actionItems.some(action => action.toLowerCase().includes(lowerQuery)))
    );
  };

  // 음악 메타데이터 가져오기 함수
  const fetchYouTubeMetadata = async (title: string, artist: string): Promise<{ url: string; thumbnail: string } | null> => {
    if (!YOUTUBE_API_KEY) return null;
    
    try {
      const searchQuery = `${title} ${artist} official`;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          thumbnail: item.snippet.thumbnails.medium.url
        };
      }
    } catch (error) {
      console.error('YouTube API 오류:', error);
    }
    
    return null;
  };

  const fetchSpotifyMetadata = async (title: string, artist: string): Promise<{ url: string; thumbnail: string; preview_url?: string } | null> => {
    if (!spotifyToken) return null;
    
    try {
      const searchQuery = `${title} ${artist}`;
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
        {
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        const track = data.tracks.items[0];
        return {
          url: track.external_urls.spotify,
          thumbnail: track.album.images[0]?.url || '',
          preview_url: track.preview_url
        };
      }
    } catch (error) {
      console.error('Spotify API 오류:', error);
    }
    
    return null;
  };

  // 음악 데이터 보강 함수
  const enrichMusicDatabase = async () => {
    // 캐시 확인
    const cachedData = localStorage.getItem(MUSIC_CACHE_KEY);
    const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
    
    if (cachedData && cacheTime && Date.now() - parseInt(cacheTime) < CACHE_DURATION) {
      console.log('캐시된 음악 데이터 사용');
      return JSON.parse(cachedData) as MusicItem[];
    }
    
    console.log('음악 메타데이터 API 호출 시작');
    const enrichedData: MusicItem[] = [];
    
    // Spotify 토큰이 없으면 YouTube만 사용
    const useSpotify = !!spotifyToken;
    
    for (const music of EMOTION_MUSIC_DATABASE) {
      let enrichedMusic = { ...music };
      
      // 이미 URL과 썸네일이 있으면 스킵
      if (music.url && music.thumbnail) {
        enrichedData.push(enrichedMusic);
        continue;
      }
      
      // YouTube 우선 시도
      const youtubeData = await fetchYouTubeMetadata(music.title, music.artist);
      if (youtubeData) {
        enrichedMusic.url = youtubeData.url;
        enrichedMusic.thumbnail = youtubeData.thumbnail;
      }
      
      // Spotify도 시도 (preview URL을 위해)
      if (useSpotify && !enrichedMusic.preview_url) {
        const spotifyData = await fetchSpotifyMetadata(music.title, music.artist);
        if (spotifyData) {
          if (!enrichedMusic.url) enrichedMusic.url = spotifyData.url;
          if (!enrichedMusic.thumbnail) enrichedMusic.thumbnail = spotifyData.thumbnail;
          if (spotifyData.preview_url) enrichedMusic.preview_url = spotifyData.preview_url;
        }
      }
      
      enrichedData.push(enrichedMusic);
      
      // API 호출 제한을 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 캐시 저장
    localStorage.setItem(MUSIC_CACHE_KEY, JSON.stringify(enrichedData));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    
    return enrichedData;
  };

  // 컴포넌트 마운트시 음악 데이터 보강
  useEffect(() => {
    const loadEnrichedMusic = async () => {
      const enriched = await enrichMusicDatabase();
      setEnrichedMusicDatabase(enriched);
    };
    
    if (spotifyToken || YOUTUBE_API_KEY) {
      loadEnrichedMusic();
    }
  }, [spotifyToken]);

  // Firebase 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      setUser(user);
      if (user) {
        await loadUserData(user.uid);
      } else {
        setCurrentStep('auth');
        setDiaryEntries([]);
        setTrashEntries([]);
        setPersonalMusic([]);
        setRecommendedMusicForSummary([]);
        setUserProgress({
          level: 1,
          experience: 0,
          totalEntries: 0,
          consecutiveDays: 0,
          expToNext: 100,
          progressPercentage: 0,
          isPremium: false
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 화면 전환 시 음악 리스트 완전 초기화
  const handleStepChange = (newStep: typeof currentStep) => {
    setRecommendedMusicForSummary([]);
    
    if (currentStep === 'chat' && newStep !== 'chat' && newStep !== 'summary') {
      setChatMessages(prev => prev.map(msg => ({ ...msg, musicRecommendation: undefined, hasMusic: false })));
    }
    
    setCurrentStep(newStep);
  };

  const loadUserData = async (userId: string) => {
    try {
      console.log('Loading user data for:', userId);
      
      const diariesCollection = collection(db, 'diaries');
      const diariesQuery = query(
        diariesCollection,
        where('userId', '==', userId)
      );
      const diariesSnapshot = await getDocs(diariesQuery);
      const diariesData = diariesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((entry: any) => !entry.deletedAt)
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        }) as DiaryEntry[];
      
      setDiaryEntries(diariesData);

      const trashData = diariesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((entry: any) => entry.deletedAt)
        .sort((a: any, b: any) => {
          const aTime = new Date(a.deletedAt);
          const bTime = new Date(b.deletedAt);
          return bTime.getTime() - aTime.getTime();
        }) as DiaryEntry[];
      
      setTrashEntries(trashData);

      const musicCollection = collection(db, 'personalMusic');
      const musicQuery = query(
        musicCollection,
        where('userId', '==', userId)
      );
      const musicSnapshot = await getDocs(musicQuery);
      const musicData = musicSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        }) as MusicItem[];
      
      setPersonalMusic(musicData);

      const progressCollection = collection(db, 'userProgress');
      const progressQuery = query(
        progressCollection,
        where('userId', '==', userId)
      );
      const progressSnapshot = await getDocs(progressQuery);
      if (!progressSnapshot.empty) {
        const progressData = progressSnapshot.docs[0].data() as UserProgress;
        setUserProgress(progressData);
      }

      const settingsCollection = collection(db, 'appSettings');
      const settingsQuery = query(
        settingsCollection,
        where('userId', '==', userId)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      if (!settingsSnapshot.empty) {
        const settingsData = settingsSnapshot.docs[0].data() as AppSettings;
        setAppSettings(settingsData);

        // 온보딩 완료 여부 확인
        if (settingsData.musicPreferences && settingsData.musicPreferences.length > 0) {
          setCurrentStep('mood');
        } else if (settingsData.aiPartnerName) {
          setCurrentStep('onboard-music');
        } else {
          setCurrentStep('onboard-name');
        }
      } else {
        setCurrentStep('onboard-name');
      }
      
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      alert('로그인 실패: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await initializeNewUser(userCredential.user.uid);
    } catch (error: any) {
      alert('회원가입 실패: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const progressQuery = query(
        collection(db, 'userProgress'),
        where('userId', '==', result.user.uid)
      );
      const progressSnapshot = await getDocs(progressQuery);
      if (progressSnapshot.empty) {
        await initializeNewUser(result.user.uid);
      }
    } catch (error: any) {
      alert('Google 로그인 실패: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeNewUser = async (userId: string) => {
    try {
      await addDoc(collection(db, 'userProgress'), {
        userId,
        level: 1,
        experience: 0,
        totalEntries: 0,
        consecutiveDays: 0,
        expToNext: 100,
        progressPercentage: 0,
        isPremium: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'appSettings'), {
        userId,
        isPremium: false,
        notifications: true,
        musicPreferences: [],
        aiPartnerName: '',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('새 사용자 초기화 오류:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

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
      }
    } catch (error) {
      console.error('Spotify 토큰 획득 오류:', error);
    }
  }, [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET]);

  useEffect(() => {
    getSpotifyToken();
  }, [getSpotifyToken]);

  const calculateLevel = (experience: number) => {
    for (let level = 15; level >= 1; level--) {
      if (experience >= LEVEL_SYSTEM.experienceBase[level as keyof typeof LEVEL_SYSTEM.experienceBase]) {
        return level;
      }
    }
    return 1;
  };

  const updateExperience = async (expGained: number) => {
    if (!user) return;

    const newExp = userProgress.experience + expGained;
    const level = calculateLevel(newExp);
    const currentLevelExp = LEVEL_SYSTEM.experienceBase[level as keyof typeof LEVEL_SYSTEM.experienceBase] || 0;
    const nextLevelExp = LEVEL_SYSTEM.experienceBase[(level + 1) as keyof typeof LEVEL_SYSTEM.experienceBase] || newExp;
    const expToNext = nextLevelExp - newExp;
    const expProgress = newExp - currentLevelExp;
    const expNeeded = nextLevelExp - currentLevelExp;
    const progressPercentage = expNeeded > 0 ? (expProgress / expNeeded) * 100 : 100;

    const updatedProgress = {
      ...userProgress,
      level,
      experience: newExp,
      expToNext: Math.max(0, expToNext),
      progressPercentage: Math.min(100, progressPercentage),
      totalEntries: userProgress.totalEntries + (expGained === LEVEL_SYSTEM.experienceGain.diaryWrite ? 1 : 0)
    };

    setUserProgress(updatedProgress);

    try {
      const progressQuery = query(
        collection(db, 'userProgress'),
        where('userId', '==', user.uid)
      );
      const progressSnapshot = await getDocs(progressQuery);
      if (!progressSnapshot.empty) {
        await updateDoc(doc(db, 'userProgress', progressSnapshot.docs[0].id), updatedProgress);
      }
    } catch (error) {
      console.error('경험치 업데이트 오류:', error);
    }

    if (level > userProgress.level) {
      alert(`축하합니다! 레벨 ${level}로 레벨업했습니다!`);
    }
  };

  const moveToTrash = async (entry: DiaryEntry) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'diaries', entry.id), {
        deletedAt: serverTimestamp()
      });
      setDiaryEntries(prev => prev.filter(e => e.id !== entry.id));
      setTrashEntries(prev => [...prev, { ...entry, deletedAt: new Date().toISOString() }]);
    } catch (error) {
      console.error('휴지통 이동 오류:', error);
    }
  };

  const restoreFromTrash = async (entry: DiaryEntry) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'diaries', entry.id), {
        deletedAt: null
      });
      const restoredEntry = { ...entry, deletedAt: null };
      setDiaryEntries(prev => [...prev, restoredEntry]);
      setTrashEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (error) {
      console.error('복원 오류:', error);
    }
  };

  const callOpenAI = async (messages: any[], systemPrompt: string) => {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    if (tokenUsage >= MAX_FREE_TOKENS) {
      throw new Error('AI와 대화할 수 있는 에너지가 다 떨어졌습니다.');
    }

    try {
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
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${response.status}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      setTokenUsage(prev => prev + tokensUsed);
      return data.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI 호출 에러:', error);
      throw error;
    }
  };

  // 로컬 DB에서 음악 검색 (enrichedMusicDatabase 사용)
  const searchLocalMusic = (query: string, emotion: string, userPreferences: string[]): MusicItem[] => {
    if (!currentMood) return [];
    
    // enriched 데이터베이스에서 검색
    const results = improvedSearchMusicByEmotion(currentMood, emotion, userPreferences);
    
    // enriched 데이터의 URL과 썸네일 정보를 포함
    return results.map(music => {
      const enrichedVersion = enrichedMusicDatabase.find(m => m.id === music.id);
      return enrichedVersion || music;
    });
  };

  const searchSpotifyMusic = async (query: string): Promise<MusicItem[]> => {
    if (!spotifyToken) return [];
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=KR&limit=20`,
        { headers: { 'Authorization': `Bearer ${spotifyToken}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.tracks?.items?.slice(0, 5).map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((artist: any) => artist.name).join(', '),
        emotions: ['추천'],
        genre: 'spotify',
        description: '스포티파이에서 찾은 추천 음악',
        intro_message: '이 곡이 지금 기분에 어울릴 것 같아요',
        mood_tags: ['recommended'],
        thumbnail: item.album.images[0]?.url || '',
        url: item.external_urls.spotify,
        publishedAt: '',
        preview_url: item.preview_url,
        album: item.album.name
      })) || [];
    } catch (error) {
      return [];
    }
  };

  const searchYouTubeMusic = async (query: string, isOfficialSearch: boolean = false): Promise<MusicItem[]> => {
    if (!YOUTUBE_API_KEY) return [];
    try {
      const searchQuery = isOfficialSearch ? `${query} official MV` : `${query} 2024 2025 latest`;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&order=relevance&videoDuration=medium&regionCode=KR&key=${YOUTUBE_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.items?.slice(0, 3).map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title || 'Unknown Title',
        artist: item.snippet.channelTitle || 'Unknown Artist',
        emotions: ['추천'],
        genre: 'youtube',
        description: '유튜브에서 찾은 추천 음악',
        intro_message: '이 곡을 들어보시는 건 어떨까요?',
        mood_tags: ['recommended'],
        thumbnail: item.snippet.thumbnails?.medium?.url || '',
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        publishedAt: item.snippet.publishedAt || ''
      })) || [];
    } catch (error) {
      return [];
    }
  };

  const searchMusic = async (query: string, emotion: string = '', isUserRequest: boolean = false): Promise<MusicItem[]> => {
    console.log('음악 검색 시작:', { query, emotion, isUserRequest });
    
    // 1. 로컬 DB 우선 검색 (enriched 데이터 사용)
    const localResults = searchLocalMusic(query, emotion, appSettings.musicPreferences);
    if (localResults.length >= 2) {
      console.log('로컬 DB에서 충분한 결과:', localResults.length);
      return localResults.slice(0, 3);
    }

    // 2. 부족할 때만 외부 API 사용
    console.log('외부 API로 보충 검색');
    const spotifyResults = await searchSpotifyMusic(query);
    const youtubeResults = await searchYouTubeMusic(query, isUserRequest);
    
    // 3. 로컬 + 외부 결과 합성
    const allResults = [...localResults, ...spotifyResults.slice(0, 2), ...youtubeResults.slice(0, 1)];
    return allResults.slice(0, 3);
  };

  const addToPersonalMusic = async (music: MusicItem) => {
    if (!user) return;
    try {
      const existing = personalMusic.find(m => m.id === music.id);
      if (!existing) {
        const newMusic = { 
          ...music, 
          userId: user.uid, 
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'personalMusic'), newMusic);
        setPersonalMusic(prev => [...prev, { ...newMusic, id: docRef.id }]);
      }
    } catch (error) {
      console.error('음악 추가 오류:', error);
    }
  };

  const removeFromPersonalMusic = async (musicId: string) => {
    if (!user) return;
    try {
      const musicToRemove = personalMusic.find(m => m.id === musicId);
      if (musicToRemove) {
        const musicQuery = query(
          collection(db, 'personalMusic'),
          where('userId', '==', user.uid),
          where('id', '==', musicId)
        );
        const musicSnapshot = await getDocs(musicQuery);
        
        if (!musicSnapshot.empty) {
          await deleteDoc(doc(db, 'personalMusic', musicSnapshot.docs[0].id));
        }
        
        setPersonalMusic(prev => prev.filter(m => m.id !== musicId));
        alert('음악이 삭제되었습니다.');
      }
    } catch (error) {
      console.error('음악 삭제 오류:', error);
      alert('음악 삭제 중 오류가 발생했습니다.');
    }
  };

  const getAIResponse = async (userMessage: string, conversationHistory: ChatMessage[]) => {
    const conversationNum = conversationCount + 1;
    setConversationCount(conversationNum);

    const musicRequestKeywords = ['음악', '노래', '듣고 싶어', '추천', '플레이리스트', '멜로디', 'song', 'music', '찾아줘', '틀어줘'];
    const hasMusicRequest = musicRequestKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    const specificMusicPattern = /(.+)(노래|곡|뮤비|MV|official)/i;
    const specificMusicMatch = userMessage.match(specificMusicPattern);

    // 사용자가 선호하는 장르 정보 가져오기
    const userGenres = appSettings.musicPreferences || [];
    const genreNames = userGenres.map(genreId => {
      const genre = MUSIC_GENRES.find(g => g.id === genreId);
      return genre ? genre.name : genreId;
    }).join(', ');

    // 다른 장르 요청 감지
    const otherGenreKeywords = ['다른 장르', '다른 음악', '다른 스타일', '별의 장르', '다른거', '바꿔줘', '클래식', '재즈', '힙합', '록', '발라드', '팝', '인디', '일렉트로닉'];
    const wantsOtherGenre = otherGenreKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

    let systemPrompt = `당신은 ${getAIPartnerName()}입니다. 사용자의 감정에 공감하는 따뜻한 AI 친구입니다.

현재 대화 상황:
- 대화 횟수: ${conversationNum}번째
- 사용자 감정 상태: ${currentMood ? getMoodText(currentMood) : '선택 안함'}
- 사용자 레벨: ${userProgress.level}
- 음악 추천 여부: ${hasRecommendedMusic ? '이미 추천함' : '아직 안함'}
- 사용자 선호 장르: ${genreNames || '없음'}

대화 규칙:
1. 첫 번째 대화: 친근하게 인사하고 오늘 하루에 대해 묻기
2. 두 번째 대화: 사용자 이야기에 공감하고 추가 질문하기
3. 세 번째 대화부터: 아직 음악 추천을 안했다면 사용자가 좋아한다고 설정한 "${genreNames}" 장르를 언급하며 자연스럽게 음악 추천 제안하기
   예: "${genreNames}를 좋아한다고 하셨는데 제가 음악 추천해드릴까요?"
4. 음악 추천 후: 음악 얘기는 그만하고 사용자와의 일반적인 대화에 집중하기
5. 사용자가 구체적인 음악을 찾아달라고 하면: "[MUSIC_SEARCH: 곡명 - 아티스트]" 형태로 끝에 추가
6. 사용자가 다른 장르를 원한다면: 어떤 장르를 원하는지 물어보고 "[GENRE_SEARCH: 장르명]" 형태로 추가

${hasRecommendedMusic ? '이미 음악을 추천했으므로 음악 얘기는 하지 말고 사용자의 감정과 일상에 집중해서 대화하세요.' : ''}

응답 스타일:
- 친근하고 공감적인 톤 (존댓말 사용)
- 간결하고 자연스러운 응답 (1-2문장)
- 답변 시작이나 중간에 귀여운 이모지 하나씩 추가

현재 상황: ${conversationNum <= 2 ? '아직 음악 추천 단계가 아님. 대화를 더 나누기' : hasRecommendedMusic ? '음악 추천은 끝났으니 일반 대화 집중' : '사용자 선호 장르를 언급하며 음악 추천을 자연스럽게 제안할 수 있는 단계'}`;

    if (specificMusicMatch && hasMusicRequest) {
      systemPrompt += `\n\n사용자가 구체적인 음악을 찾아달라고 요청했습니다. "[MUSIC_SEARCH: ${specificMusicMatch[1].trim()}]" 형식으로 검색어를 포함해주세요.`;
    } else if (wantsOtherGenre) {
      systemPrompt += `\n\n사용자가 다른 장르의 음악을 원한다고 감지되었습니다. 어떤 장르를 원하는지 물어보고 "[GENRE_SEARCH: 요청장르]" 형식으로 포함해주세요.`;
    } else if (hasMusicRequest && !hasRecommendedMusic) {
      systemPrompt += `\n\n음악 요청이 감지되었습니다. 사용자가 설정한 선호 장르 "${genreNames}"에서 현재 감정에 맞는 곡을 추천하고 "[MUSIC_SEARCH: ${genreNames} 추천곡명]" 형식으로 검색어를 포함해주세요.`;
    } else if (conversationNum >= 3 && !hasRecommendedMusic && !hasMusicRequest) {
      systemPrompt += `\n\n이제 음악 추천을 제안할 때입니다. 사용자가 선호한다고 설정한 "${genreNames}" 장르를 반드시 대화에서 구체적으로 언급하며 음악 추천을 제안하세요.
      반드시 이런 형태로 말하세요: "${genreNames}를 좋아한다고 하셨는데 제가 음악 추천해드릴까요?"
      그리고 응답 끝에 "[MUSIC_SEARCH: ${genreNames} 감정맞춤]" 형식으로 포함해주세요.
      장르 이름을 반드시 대화 내용에 포함시키는 것이 중요합니다.`;
    }

    const messages = [...conversationHistory.slice(-5), { role: 'user', content: userMessage }];
    const aiResponse = await callOpenAI(messages, systemPrompt);

    // 음악 검색 패턴 매칭
    const musicSearchMatch = aiResponse.match(/\[MUSIC_SEARCH: ([^\]]+)\]/);
    const genreSearchMatch = aiResponse.match(/\[GENRE_SEARCH: ([^\]]+)\]/);

    if (musicSearchMatch || genreSearchMatch) {
      const searchQuery = musicSearchMatch ? musicSearchMatch[1].trim() : genreSearchMatch![1].trim();
      const cleanResponse = aiResponse.replace(/\[MUSIC_SEARCH: [^\]]+\]|\[GENRE_SEARCH: [^\]]+\]/, '').trim();
      const isUserRequest = !!(specificMusicMatch && hasMusicRequest);

      try {
        let musicResults: MusicItem[] = [];
        
        // 장르 기반 검색인지 확인
        const isGenreBased = userGenres.some(genreId => {
          const genre = MUSIC_GENRES.find(g => g.id === genreId);
          return genre && searchQuery.toLowerCase().includes(genre.name.toLowerCase());
        });

        if (isGenreBased || searchQuery.includes('감정맞춤')) {
          // 사용자 선호 장르 + 현재 감정 기반 검색
          const emotion = currentMood === 'good' ? '행복' : 
                         currentMood === 'bad' ? '슬픔' : '평온';
          musicResults = searchLocalMusic(searchQuery, emotion, userGenres);
          
          if (musicResults.length === 0) {
            musicResults = await searchMusic(searchQuery, emotion, false);
          }
        } else {
          // 일반 검색
          musicResults = await searchMusic(searchQuery, '', isUserRequest);
        }
        
        if (musicResults.length > 0) {
          const selectedMusic = musicResults[0];
          setHasRecommendedMusic(true);
          
          // intro_message가 있으면 응답에 포함
          const musicIntro = selectedMusic.intro_message ? 
            `\n\n${selectedMusic.intro_message}` : '';
          
          return { 
            response: cleanResponse + musicIntro, 
            music: selectedMusic 
          };
        }
      } catch (error) {
        console.error('음악 검색 오류:', error);
      }
    }

    return { response: aiResponse, music: null };
  };

  const generateConversationSummary = async (messages: ChatMessage[]): Promise<SummaryData> => {
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content).join('\n');

    if (!userMessages.trim()) {
      // 기본 음악 추천 - enriched 데이터베이스에서
      const defaultMusic = searchLocalMusic('힐링', '평온', appSettings.musicPreferences);
      const fallbackMusic = defaultMusic.length > 0 ? defaultMusic.slice(0, 2) : [];
      
      return {
        summary: '오늘도 감정을 나누며 이야기를 해봤어요. 대화를 통해 마음을 정리할 수 있었어요. 이런 시간들이 소중하다고 생각해요. 앞으로도 이렇게 대화하며 서로의 마음을 나누면 좋겠어요.',
        keywords: ['#감정나눔'],
        recommendedEmotions: ['평온', '만족', '편안'],
        actionItems: ['오늘의 감정을 일기장에 기록하여 패턴 파악하기', '잠들기 전 10분간 명상이나 깊은 호흡하기'],
        recommendedMusic: fallbackMusic
      };
    }

    const systemPrompt = `다음 대화 내용을 분석해서 감정 일기 관점에서 응답해주세요:

대화 내용:
${userMessages}

현재 감정 상태: ${currentMood ? getMoodText(currentMood) : '선택 안함'}

분석 요청:
1. 대화 내용을 바탕으로 오늘 있었던 일을 2-4줄로 요약 (해요체로 작성, 대화에서 나온 내용만 사용, 가공하지 말 것)
2. 대화에서 느껴진 감정 키워드 5개 추출 (예: #스트레스, #행복, #피곤함 등)
3. AI가 대화에서 분석한 세부 감정 5개 추천 (예: 행복, 걱정, 설렘, 피곤, 만족 등)
4. 사용자의 대화 내용과 감정 상태를 바탕으로 실제로 도움이 될 만한 구체적이고 실행 가능한 액션 아이템 2개 제안 (예: "30분 산책하며 오늘 있었던 좋은 일 3가지 떠올리기", "취침 전 따뜻한 차 마시며 내일 할 일 3가지 적어보기")
5. 사용자의 감정과 대화 내용에 가장 적합한 음악 검색 키워드 2개 제안 (각각 다른 스타일로)

응답 형식:
요약: [2-4줄 요약 - 각 줄은 대화에서 나온 구체적인 내용, 해요체]
감정키워드: #키워드1, #키워드2, #키워드3, #키워드4, #키워드5
추천감정: 감정1, 감정2, 감정3, 감정4, 감정5
액션아이템: 아이템1 | 아이템2
음악키워드: 키워드1 | 키워드2`;

    try {
      const result = await callOpenAI([], systemPrompt);
      const lines = result.split('\n');
      let summary = '', keywords: string[] = [], recommendedEmotions: string[] = [], actionItems: string[] = [], musicKeywords: string[] = [];
      lines.forEach((line: string) => {
        if (line.startsWith('요약:')) summary = line.replace('요약:', '').trim();
        else if (line.startsWith('감정키워드:')) keywords = line.replace('감정키워드:', '').trim().split(',').map((k: string) => k.trim()).filter(Boolean);
        else if (line.startsWith('추천감정:')) recommendedEmotions = line.replace('추천감정:', '').trim().split(',').map((e: string) => e.trim()).filter(Boolean);
        else if (line.startsWith('액션아이템:')) actionItems = line.replace('액션아이템:', '').trim().split('|').map((a: string) => a.trim()).filter(Boolean);
        else if (line.startsWith('음악키워드:')) musicKeywords = line.replace('음악키워드:', '').trim().split('|').map((k: string) => k.trim()).filter(Boolean);
      });

      // 음악 추천 생성 - enriched 데이터베이스 우선
      let recommendedMusic: MusicItem[] = [];
      if (musicKeywords.length > 0) {
        try {
          const emotion1 = recommendedEmotions[0] || '평온';
          const emotion2 = recommendedEmotions[1] || '위로';
          
          const music1 = searchLocalMusic(musicKeywords[0] || 'healing music', emotion1, appSettings.musicPreferences);
          const music2 = searchLocalMusic(musicKeywords[1] || 'uplifting music', emotion2, appSettings.musicPreferences);
          
          recommendedMusic = [...music1.slice(0, 1), ...music2.slice(0, 1)];
          
          // 로컬에서 부족하면 외부 API로 보충
          if (recommendedMusic.length < 2) {
            const additionalMusic = await searchMusic(musicKeywords[0] || 'calm music', emotion1, false);
            recommendedMusic = [...recommendedMusic, ...additionalMusic.slice(0, 2 - recommendedMusic.length)];
          }
        } catch (error) {
          console.error('음악 검색 오류:', error);
          const defaultMusic = searchLocalMusic('calm music', '평온', appSettings.musicPreferences);
          recommendedMusic = defaultMusic.slice(0, 2);
        }
      } else {
        const defaultMusic = searchLocalMusic('peaceful music', '평온', appSettings.musicPreferences);
        recommendedMusic = defaultMusic.slice(0, 2);
      }

      return {
        summary: summary || '오늘의 감정과 상황을 나누었어요. 대화를 통해 마음을 정리할 수 있었어요.',
        keywords: keywords.slice(0, 5),
        recommendedEmotions: recommendedEmotions.slice(0, 5),
        actionItems: actionItems.slice(0, 2).length > 0 ? actionItems.slice(0, 2) : ['오늘 느낀 감정을 일기에 자세히 기록해보기', '내일 하고 싶은 일 하나를 구체적으로 계획하기'],
        recommendedMusic: recommendedMusic
      };
    } catch (error) {
      console.error('대화 요약 생성 오류:', error);
      // 에러 시 기본 음악 추천
      const defaultMusic = searchLocalMusic('healing peaceful music', '평온', appSettings.musicPreferences);
      return {
        summary: '대화 요약을 생성하는 중에 문제가 발생했어요. 그래도 오늘 이야기를 나눌 수 있어서 좋았어요.',
        keywords: ['#감정나눔'],
        recommendedEmotions: ['평온', '만족'],
        actionItems: ['오늘의 대화 내용을 다시 한번 되새겨보며 긍정적인 부분 찾기', '따뜻한 차나 음료를 마시며 마음의 여유 갖기'],
        recommendedMusic: defaultMusic.slice(0, 2)
      };
    }
  };

  const generateEmotionBasedMusic = async (emotions: string[], mood: string) => {
    try {
      const emotionQuery = emotions.join(' ');
      const moodText = getMoodText(mood);
      
      // enriched 데이터베이스에서 감정 기반 음악 검색
      const musicResults = searchLocalMusic(emotionQuery, emotions[0] || '평온', appSettings.musicPreferences);
      if (musicResults.length > 0) {
        setRecommendedMusicForSummary(musicResults.slice(0, 2));
      } else {
        // 로컬에서 없으면 외부 API 사용
        const fallbackResults = await searchMusic(`${emotionQuery} ${moodText}`, emotions[0], false);
        setRecommendedMusicForSummary(fallbackResults.slice(0, 2));
      }
    } catch (error) {
      console.error('감정 기반 음악 추천 오류:', error);
    }
  };

  const handleMoodSelect = (mood: 'good' | 'normal' | 'bad') => {
    setCurrentMood(mood);
    handleStepChange('chat');
    setConversationCount(0);
    setHasRecommendedMusic(false);
    setRecommendedMusicForSummary([]);
    const initialMessage: ChatMessage = {
      role: 'assistant',
      content: `안녕하세요! 🎵 오늘은 ${getMoodText(mood)} 기분이시군요. 오늘 하루 어떻게 보내셨는지 편하게 말씀해주세요. ✨`,
      timestamp: new Date()
    };
    setChatMessages([initialMessage]);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || !currentMood) return;
    const userMessage: ChatMessage = { role: 'user', content: currentInput, timestamp: new Date() };
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

  const addChatMusicToMyList = (music: MusicItem) => {
    addToPersonalMusic(music);
    alert(`"${music.title}" 음악이 내 음악 리스트에 추가되었습니다! '내 음악'에서 확인할 수 있어요.`);
  };

  const handleGenerateSummary = async () => {
    if (!currentMood || chatMessages.length === 0) return;
    setIsLoading(true);
    try {
      const summary = await generateConversationSummary(chatMessages);
      setSummaryData(summary);
      setSelectedEmotions([]);
      
      await generateEmotionBasedMusic(summary.recommendedEmotions, currentMood);
      
      handleStepChange('summary');
    } catch (error) {
      console.error('요약 생성 오류:', error);
      alert('요약 생성 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDiary = async () => {
    if (!currentMood || !summaryData || !user) {
      alert('저장에 필요한 정보가 부족합니다.');
      return;
    }
    setIsLoading(true);
    try {
      const now = new Date();
      const allEmotions: string[] = [];

      if (userMainEmotion.trim()) {
        allEmotions.push(userMainEmotion.trim());
      }
      allEmotions.push(...selectedEmotions);

      const chatMusic = chatMessages
        .filter(msg => msg.musicRecommendation)
        .map(msg => msg.musicRecommendation!)
        .filter(music => music);

      // 요약에서 추천된 음악도 포함
      const summaryMusic = summaryData.recommendedMusic || [];
      const allMusic = [...chatMusic, ...summaryMusic];

      const newEntry = {
        userId: user.uid,
        date: formatDate(now),
        time: formatTime(now),
        mood: currentMood,
        summary: summaryData.summary || "내용 없음",
        keywords: summaryData.keywords || [],
        selectedEmotions: allEmotions,
        musicPlayed: allMusic, // 채팅 + 요약 음악 모두 포함
        chatMessages: chatMessages,
        experienceGained: LEVEL_SYSTEM.experienceGain.diaryWrite,
        actionItems: summaryData.actionItems || [],
        deletedAt: null,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'diaries'), newEntry);

      const savedEntry: DiaryEntry = { ...newEntry, id: docRef.id, createdAt: now };
      setDiaryEntries(prev => [savedEntry, ...prev]);

      updateExperience(LEVEL_SYSTEM.experienceGain.diaryWrite);

      setChatMessages([]);
      setCurrentMood(null);
      setSummaryData(null);
      setSelectedEmotions([]);
      setUserMainEmotion('');
      setConversationCount(0);
      setHasRecommendedMusic(false);
      setRecommendedMusicForSummary([]);
      handleStepChange('mood');

      alert('일기가 성공적으로 저장되었습니다! +20 EXP');
    } catch (error) {
      console.error('일기 저장 오류:', error);
      alert('일기 저장에 문제가 생겼어요. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotion)) {
        return prev.filter(e => e !== emotion);
      } else if (prev.length < 2) {
        return [...prev, emotion];
      } else {
        return [prev[1], emotion];
      }
    });
  };

  // 온보딩 핸들러
  const handlePersonTypeSelect = (type: string) => {
    setSelectedPersonType(type);
  };

  const handlePersonNameSubmit = async () => {
    if (!selectedPersonName.trim()) {
      alert('상대의 이름을 입력해주세요.');
      return;
    }

    if (!user) return;

    try {
      // 설정 업데이트 - AI 파트너 이름만 저장
      const settingsQuery = query(
        collection(db, 'appSettings'),
        where('userId', '==', user.uid)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      
      const updatedSettings = {
        ...appSettings,
        aiPartnerName: selectedPersonName.trim()
      };

      if (!settingsSnapshot.empty) {
        await updateDoc(doc(db, 'appSettings', settingsSnapshot.docs[0].id), updatedSettings);
      } else {
        await addDoc(collection(db, 'appSettings'), {
          userId: user.uid,
          ...updatedSettings,
          createdAt: serverTimestamp()
        });
      }

      setAppSettings(updatedSettings);
      setCurrentStep('onboard-music');
    } catch (error) {
      console.error('이름 저장 오류:', error);
      alert('이름 저장 중 오류가 발생했습니다.');
    }
  };

  const handleMusicGenreSelect = (genreId: string) => {
    setSelectedMusicGenres(prev => {
      if (prev.includes(genreId)) {
        return prev.filter(id => id !== genreId);
      } else if (prev.length < 3) {
        return [...prev, genreId];
      } else {
        return [prev[1], prev[2], genreId];
      }
    });
  };

  const handleOnboardingComplete = async () => {
    if (selectedMusicGenres.length === 0) {
      alert('최소 1개 이상의 음악 취향을 선택해주세요.');
      return;
    }

    if (!user) return;

    try {
      // 설정 업데이트
      const settingsQuery = query(
        collection(db, 'appSettings'),
        where('userId', '==', user.uid)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      
      const updatedSettings = {
        ...appSettings,
        musicPreferences: selectedMusicGenres
      };

      if (!settingsSnapshot.empty) {
        await updateDoc(doc(db, 'appSettings', settingsSnapshot.docs[0].id), updatedSettings);
      } else {
        await addDoc(collection(db, 'appSettings'), {
          userId: user.uid,
          ...updatedSettings,
          createdAt: serverTimestamp()
        });
      }

      setAppSettings(updatedSettings);
      setCurrentStep('mood');
    } catch (error) {
     console.error('온보딩 완료 오류:', error);
     alert('설정 저장 중 오류가 발생했습니다.');
   }
 };

 const renderTokenBar = () => {
   const usageRatio = Math.min(tokenUsage / MAX_FREE_TOKENS, 1.0);
   const remaining = Math.max(0, MAX_FREE_TOKENS - tokenUsage);
   let status = usageRatio >= 0.95 ? '조금 부족해요' : usageRatio >= 0.5 ? '적당해요' : '충분해요';

   return (
     <div className={`bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg p-4 mb-4 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>
       <div className="flex justify-between items-center mb-2">
         <span className={`text-sm font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800`}>AI와 대화할 수 있는 에너지</span>
         <span className={`text-xs text-${getCurrentTheme().accent.split('-')[0]}-600`}>{remaining.toLocaleString()} / {MAX_FREE_TOKENS.toLocaleString()} 남음</span>
       </div>
       <div className={`w-full bg-${getCurrentTheme().accent.split('-')[0]}-100 rounded-full h-2`}>
         <div className={`h-2 rounded-full transition-all bg-gradient-to-r ${getCurrentTheme().primary}`} style={{ width: `${usageRatio * 100}%` }}></div>
       </div>
       <div className={`text-center text-xs mt-1 text-${getCurrentTheme().accent.split('-')[0]}-600`}>상태: {status}</div>
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
       <div className={`bg-gradient-to-r ${getCurrentTheme().primary} h-3 rounded-full transition-all`} style={{ width: `${userProgress.progressPercentage}%` }}></div>
     </div>
     <div className={`text-center text-xs text-${getCurrentTheme().accent.split('-')[0]}-600 mt-2`}>총 경험치: {userProgress.experience} EXP</div>
   </div>
 );

 const renderAuth = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center p-4`}>
     <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
       <div className="text-center mb-6">
         <div className="text-4xl mb-2">🎵</div>
         <h1 className={`text-2xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>EPLAY</h1>
         <p className={`text-${getCurrentTheme().accent.split('-')[0]}-600`}>감정기반 음악 추천</p>
       </div>
       <div className="flex justify-center mb-6">
         <div className="flex bg-gray-100 rounded-lg p-1">
           <button onClick={() => setIsAuthMode('login')} className={`px-4 py-2 rounded-md font-medium transition-all ${isAuthMode === 'login' ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white` : 'text-gray-600'}`}>로그인</button>
           <button onClick={() => setIsAuthMode('register')} className={`px-4 py-2 rounded-md font-medium transition-all ${isAuthMode === 'register' ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white` : 'text-gray-600'}`}>회원가입</button>
         </div>
       </div>
       <div className="space-y-4">
         <input type="email" placeholder="이메일을 입력하세요" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}/>
         <input type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { isAuthMode === 'login' ? handleLogin() : handleRegister(); } }} className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}/>
         <button onClick={isAuthMode === 'login' ? handleLogin : handleRegister} disabled={isLoading} className={`w-full py-3 rounded-lg font-semibold bg-gradient-to-r ${getCurrentTheme().primary} text-white hover:opacity-90 disabled:opacity-50 transition-all`}>
           {isLoading ? '처리중...' : (isAuthMode === 'login' ? '로그인' : '회원가입')}
         </button>
       </div>
       <div className="mt-4 text-center">
         <span className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>또는</span>
       </div>
       <button onClick={handleGoogleLogin} disabled={isLoading} className={`w-full mt-4 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2`}>
         <svg className="w-5 h-5" viewBox="0 0 24 24">
           <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
           <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
           <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
           <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
         </svg>
         <span>Google로 로그인</span>
       </button>
     </div>
   </div>
 );

 const renderOnboardingName = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center p-4`}>
     <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
       <div className="text-center mb-6">
         <h2 className={`text-2xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>반가워요! 👋</h2>
         <p className={`text-${getCurrentTheme().accent.split('-')[0]}-600`}>어떤 분과 대화하고 싶으신가요?</p>
       </div>
       <div className="space-y-3">
         <button onClick={() => { setSelectedPersonType('friend'); setCurrentStep('onboard-name-input'); }} className={`w-full p-4 rounded-lg border-2 hover:border-${getCurrentTheme().accent} transition-all ${selectedPersonType === 'friend' ? `border-${getCurrentTheme().accent} bg-${getCurrentTheme().accent.split('-')[0]}-50` : 'border-gray-200'}`}>
           <span className="text-lg font-medium">👭 친구</span>
         </button>
         <button onClick={() => { setSelectedPersonType('lover'); setCurrentStep('onboard-name-input'); }} className={`w-full p-4 rounded-lg border-2 hover:border-${getCurrentTheme().accent} transition-all ${selectedPersonType === 'lover' ? `border-${getCurrentTheme().accent} bg-${getCurrentTheme().accent.split('-')[0]}-50` : 'border-gray-200'}`}>
           <span className="text-lg font-medium">💕 연인</span>
         </button>
         <button onClick={() => { setSelectedPersonType('family'); setCurrentStep('onboard-name-input'); }} className={`w-full p-4 rounded-lg border-2 hover:border-${getCurrentTheme().accent} transition-all ${selectedPersonType === 'family' ? `border-${getCurrentTheme().accent} bg-${getCurrentTheme().accent.split('-')[0]}-50` : 'border-gray-200'}`}>
           <span className="text-lg font-medium">👨‍👩‍👧‍👦 가족</span>
         </button>
         <button onClick={() => { setSelectedPersonType('ai'); setSelectedPersonName(AI_NAME); handlePersonNameSubmit(); }} className={`w-full p-4 rounded-lg border-2 hover:border-${getCurrentTheme().accent} transition-all ${selectedPersonType === 'ai' ? `border-${getCurrentTheme().accent} bg-${getCurrentTheme().accent.split('-')[0]}-50` : 'border-gray-200'}`}>
           <span className="text-lg font-medium">🤖 AI 친구 (기본)</span>
         </button>
       </div>
     </div>
   </div>
 );

 const renderOnboardingNameInput = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center p-4`}>
     <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
       <div className="text-center mb-6">
         <h2 className={`text-2xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>이름을 알려주세요</h2>
         <p className={`text-${getCurrentTheme().accent.split('-')[0]}-600`}>
           {selectedPersonType === 'friend' ? '친구' : selectedPersonType === 'lover' ? '연인' : '가족'}의 이름이 무엇인가요?
         </p>
       </div>
       <input
         type="text"
         placeholder="이름을 입력하세요"
         value={selectedPersonName}
         onChange={(e) => setSelectedPersonName(e.target.value)}
         onKeyPress={(e) => { if (e.key === 'Enter') handlePersonNameSubmit(); }}
         className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent} mb-4`}
       />
       <button onClick={handlePersonNameSubmit} disabled={!selectedPersonName.trim()} className={`w-full py-3 rounded-lg font-semibold bg-gradient-to-r ${getCurrentTheme().primary} text-white hover:opacity-90 disabled:opacity-50 transition-all`}>
         다음
       </button>
       <button onClick={() => setCurrentStep('onboard-name')} className={`w-full mt-2 py-2 text-${getCurrentTheme().accent.split('-')[0]}-600 hover:text-${getCurrentTheme().accent.split('-')[0]}-800`}>
         뒤로 가기
       </button>
     </div>
   </div>
 );

 const renderOnboardingMusic = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center p-4`}>
     <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
       <div className="text-center mb-6">
         <h2 className={`text-2xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>음악 취향을 알려주세요</h2>
         <p className={`text-${getCurrentTheme().accent.split('-')[0]}-600`}>좋아하는 장르를 최대 3개까지 선택해주세요</p>
       </div>
       <div className="space-y-3 mb-6">
         {MUSIC_GENRES.map(genre => (
           <button
             key={genre.id}
             onClick={() => handleMusicGenreSelect(genre.id)}
             className={`w-full p-4 rounded-lg border-2 hover:border-${getCurrentTheme().accent} transition-all flex items-center gap-3 ${
               selectedMusicGenres.includes(genre.id) 
                 ? `border-${getCurrentTheme().accent} bg-${getCurrentTheme().accent.split('-')[0]}-50` 
                 : 'border-gray-200'
             }`}
           >
             <span className="text-2xl">{genre.emoji}</span>
             <span className="text-lg font-medium">{genre.name}</span>
           </button>
         ))}
       </div>
       <button onClick={handleOnboardingComplete} disabled={selectedMusicGenres.length === 0} className={`w-full py-3 rounded-lg font-semibold bg-gradient-to-r ${getCurrentTheme().primary} text-white hover:opacity-90 disabled:opacity-50 transition-all`}>
         시작하기
       </button>
     </div>
   </div>
 );

 const renderMoodSelection = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
     <div className="max-w-lg mx-auto">
       <header className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
         <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>오늘의 기분은?</h1>
         <div className="flex gap-2">
           <button onClick={() => handleStepChange('stats')} className={`p-2 rounded-lg bg-${getCurrentTheme().accent.split('-')[0]}-100 hover:bg-${getCurrentTheme().accent.split('-')[0]}-200`}>📊</button>
           <button onClick={() => handleStepChange('myDiary')} className={`p-2 rounded-lg bg-${getCurrentTheme().accent.split('-')[0]}-100 hover:bg-${getCurrentTheme().accent.split('-')[0]}-200`}>📔</button>
           <button onClick={() => handleStepChange('myMusic')} className={`p-2 rounded-lg bg-${getCurrentTheme().accent.split('-')[0]}-100 hover:bg-${getCurrentTheme().accent.split('-')[0]}-200`}>🎵</button>
           <button onClick={() => handleStepChange('settings')} className={`p-2 rounded-lg bg-${getCurrentTheme().accent.split('-')[0]}-100 hover:bg-${getCurrentTheme().accent.split('-')[0]}-200`}>⚙️</button>
         </div>
       </header>
       
       {renderUserProgress()}
       
       <div className="space-y-4">
         <button onClick={() => handleMoodSelect('good')} className={`w-full p-6 rounded-xl bg-gradient-to-r from-green-400 to-blue-400 text-white shadow-lg hover:shadow-xl transition-all`}>
           <div className="text-4xl mb-2">😊</div>
           <div className="text-xl font-bold">좋음</div>
         </button>
         
         <button onClick={() => handleMoodSelect('normal')} className={`w-full p-6 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 text-white shadow-lg hover:shadow-xl transition-all`}>
           <div className="text-4xl mb-2">😐</div>
           <div className="text-xl font-bold">보통</div>
         </button>
         
         <button onClick={() => handleMoodSelect('bad')} className={`w-full p-6 rounded-xl bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-lg hover:shadow-xl transition-all`}>
           <div className="text-4xl mb-2">😔</div>
           <div className="text-xl font-bold">나쁨</div>
         </button>
       </div>
     </div>
   </div>
 );

 const renderChat = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
     <div className="max-w-lg mx-auto">
       <header className="bg-white rounded-lg shadow-md p-4 mb-4 flex justify-between items-center">
         <button onClick={() => handleStepChange('mood')} className="text-gray-600 hover:text-gray-800">⬅️</button>
         <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>{getAIPartnerName()}와의 대화</h1>
         <span className="text-2xl">{getMoodEmoji(currentMood || 'normal')}</span>
       </header>
       
       {renderTokenBar()}
       
       <div className="bg-white rounded-lg shadow-md p-4 mb-4 h-96 overflow-y-auto">
         {chatMessages.map((msg, idx) => (
           <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
             <div className={`inline-block p-3 rounded-lg max-w-xs ${msg.role === 'user' ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white` : 'bg-gray-100 text-gray-800'}`}>
               {msg.content}
             </div>
             {msg.musicRecommendation && (
               <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                 <div className="flex items-center gap-3">
                   {msg.musicRecommendation.thumbnail && (
                     <img src={msg.musicRecommendation.thumbnail} alt={msg.musicRecommendation.title} className="w-16 h-16 rounded-lg object-cover" />
                   )}
                   <div className="flex-1">
                     <h4 className="font-semibold text-gray-800">{msg.musicRecommendation.title}</h4>
                     <p className="text-sm text-gray-600">{msg.musicRecommendation.artist}</p>
                     <p className="text-xs text-gray-500 mt-1">{msg.musicRecommendation.description}</p>
                   </div>
                 </div>
                 {msg.musicRecommendation.preview_url && (
                   <audio controls className="w-full mt-3">
                     <source src={msg.musicRecommendation.preview_url} type="audio/mpeg" />
                   </audio>
                 )}
                 <div className="flex gap-2 mt-3">
                   {msg.musicRecommendation.url && (
                     <a href={msg.musicRecommendation.url} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 px-4 bg-purple-500 text-white rounded-lg text-center hover:bg-purple-600">
                       들으러 가기
                     </a>
                   )}
                   <button onClick={() => addChatMusicToMyList(msg.musicRecommendation!)} className="flex-1 py-2 px-4 bg-pink-500 text-white rounded-lg hover:bg-pink-600">
                     내 음악에 추가
                   </button>
                 </div>
               </div>
             )}
           </div>
         ))}
         {isLoading && (
           <div className="text-left mb-4">
             <div className="inline-block p-3 rounded-lg bg-gray-100">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
               </div>
             </div>
           </div>
         )}
       </div>
       
       <div className="bg-white rounded-lg shadow-md p-4">
         <div className="flex gap-2">
           <input
             type="text"
             value={currentInput}
             onChange={(e) => setCurrentInput(e.target.value)}
             onKeyPress={(e) => { if (e.key === 'Enter' && !isLoading) handleSendMessage(); }}
             placeholder="메시지를 입력하세요..."
             className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}
             disabled={isLoading}
           />
           <button onClick={handleSendMessage} disabled={isLoading || !currentInput.trim()} className={`px-6 py-2 rounded-lg font-semibold bg-gradient-to-r ${getCurrentTheme().primary} text-white hover:opacity-90 disabled:opacity-50`}>
             전송
           </button>
         </div>
         <button onClick={handleGenerateSummary} className={`w-full mt-3 py-2 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90`}>
           대화 마무리하기
         </button>
       </div>
     </div>
   </div>
 );

 const renderSummary = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
     <div className="max-w-lg mx-auto">
       <header className="bg-white rounded-lg shadow-md p-4 mb-4">
         <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800 text-center`}>오늘의 일기 요약</h1>
       </header>
       
       {summaryData && (
         <div className="bg-white rounded-lg shadow-md p-6 mb-4">
           <div className="mb-6">
             <h3 className={`text-lg font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>📝 오늘의 이야기</h3>
             <p className="text-gray-700 leading-relaxed">{summaryData.summary}</p>
           </div>
           
           <div className="mb-6">
             <h3 className={`text-lg font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>🏷️ 감정 키워드</h3>
             <div className="flex flex-wrap gap-2">
               {summaryData.keywords.map((keyword, idx) => (
                 <span key={idx} className={`px-3 py-1 bg-${getCurrentTheme().accent.split('-')[0]}-100 text-${getCurrentTheme().accent.split('-')[0]}-700 rounded-full text-sm`}>
                   {keyword}
                 </span>
               ))}
             </div>
           </div>
           
           <div className="mb-6">
             <h3 className={`text-lg font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>💭 AI가 분석한 감정</h3>
             <div className="flex flex-wrap gap-2">
               {summaryData.recommendedEmotions.map((emotion, idx) => (
                 <button
                   key={idx}
                   onClick={() => handleEmotionSelect(emotion)}
                   className={`px-3 py-1 rounded-full text-sm transition-all ${
                     selectedEmotions.includes(emotion) 
                       ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white` 
                       : 'bg-gray-100 hover:bg-gray-200'
                   }`}
                 >
                   {emotion}
                 </button>
               ))}
             </div>
             <p className="text-xs text-gray-500 mt-2">최대 2개까지 선택 가능</p>
           </div>
           
           <div className="mb-6">
             <h3 className={`text-lg font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>🎯 추천 활동</h3>
             <ul className="space-y-2">
               {summaryData.actionItems.map((item, idx) => (
                 <li key={idx} className="flex items-start gap-2">
                   <span className="text-purple-500">•</span>
                   <span className="text-gray-700 text-sm">{item}</span>
                 </li>
               ))}
             </ul>
           </div>
           
           <div className="mb-6">
             <h3 className={`text-lg font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>🎵 추천 음악</h3>
             <div className="space-y-3">
               {recommendedMusicForSummary.map((music, idx) => (
                 <div key={idx} className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                   <div className="flex items-center gap-3">
                     {music.thumbnail && (
                       <img src={music.thumbnail} alt={music.title} className="w-12 h-12 rounded-lg object-cover" />
                     )}
                     <div className="flex-1">
                       <h4 className="font-medium text-gray-800">{music.title}</h4>
                       <p className="text-sm text-gray-600">{music.artist}</p>
                     </div>
                   </div>
                   {music.url && (
                     <a href={music.url} target="_blank" rel="noopener noreferrer" className="block mt-2 text-center py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                       들으러 가기
                     </a>
                   )}
                 </div>
               ))}
             </div>
           </div>
           
           <div className="mb-4">
             <h3 className={`text-lg font-semibold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-2`}>✏️ 나의 주요 감정 (선택사항)</h3>
             <input
               type="text"
               placeholder="오늘 가장 크게 느낀 감정을 적어보세요"
               value={userMainEmotion}
               onChange={(e) => setUserMainEmotion(e.target.value)}
               className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}
             />
           </div>
         </div>
       )}
       
       <button onClick={handleSaveDiary} disabled={isLoading} className={`w-full py-3 rounded-lg font-semibold bg-gradient-to-r ${getCurrentTheme().primary} text-white hover:opacity-90 disabled:opacity-50`}>
         {isLoading ? '저장 중...' : '일기 저장하기'}
       </button>
     </div>
   </div>
 );

 const renderStats = () => {
   const moodCounts = {
     good: diaryEntries.filter(e => e.mood === 'good').length,
     normal: diaryEntries.filter(e => e.mood === 'normal').length,
     bad: diaryEntries.filter(e => e.mood === 'bad').length
   };

   const totalMoodCount = moodCounts.good + moodCounts.normal + moodCounts.bad;
   const moodPercentages = {
     good: totalMoodCount > 0 ? (moodCounts.good / totalMoodCount * 100).toFixed(1) : '0.0',
     normal: totalMoodCount > 0 ? (moodCounts.normal / totalMoodCount * 100).toFixed(1) : '0.0',
     bad: totalMoodCount > 0 ? (moodCounts.bad / totalMoodCount * 100).toFixed(1) : '0.0'
   };

   const emotionFrequency: Record<string, number> = {};
   diaryEntries.forEach(entry => {
     entry.selectedEmotions?.forEach(emotion => {
       emotionFrequency[emotion] = (emotionFrequency[emotion] || 0) + 1;
     });
   });

   const topEmotions = Object.entries(emotionFrequency)
     .sort(([,a], [,b]) => b - a)
     .slice(0, 5);

   return (
     <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
       <div className="max-w-lg mx-auto">
         <header className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
           <button onClick={() => handleStepChange('mood')} className="text-gray-600 hover:text-gray-800">⬅️</button>
           <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>통계 & 감정 달력</h1>
           <button onClick={() => handleLogout()} className="text-gray-600 hover:text-gray-800">🚪</button>
         </header>
         
         <div className="bg-white rounded-lg shadow-md p-6 mb-6">
           <h2 className={`text-lg font-bold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-4`}>📊 통계</h2>
           
           <div className="grid grid-cols-4 gap-4 mb-6">
             <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white text-center">
               <div className="text-2xl font-bold">{diaryEntries.length}</div>
               <div className="text-xs">총 일기 수</div>
             </div>
             <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-4 text-white text-center">
               <div className="text-2xl font-bold">{personalMusic.length}</div>
               <div className="text-xs">저장된 음악</div>
             </div>
             <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-4 text-white text-center">
               <div className="text-2xl font-bold">{userProgress.level}</div>
               <div className="text-xs">현재 레벨</div>
             </div>
             <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-4 text-white text-center">
               <div className="text-2xl font-bold">{userProgress.experience}</div>
               <div className="text-xs">총 경험치</div>
             </div>
           </div>
           
           <div className="mb-6">
             <h3 className="font-semibold mb-2">기분 분포</h3>
             <div className="space-y-2">
               <div className="flex items-center gap-2">
                 <span className="w-12">😊 좋음</span>
                 <div className="flex-1 bg-gray-200 rounded-full h-4">
                   <div className="bg-green-500 h-4 rounded-full" style={{ width: `${moodPercentages.good}%` }}></div>
                 </div>
                 <span className="text-sm">{moodCounts.good}개 ({moodPercentages.good}%)</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-12">😐 보통</span>
                 <div className="flex-1 bg-gray-200 rounded-full h-4">
                   <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${moodPercentages.normal}%` }}></div>
                 </div>
                 <span className="text-sm">{moodCounts.normal}개 ({moodPercentages.normal}%)</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-12">😔 나쁨</span>
                 <div className="flex-1 bg-gray-200 rounded-full h-4">
                   <div className="bg-purple-500 h-4 rounded-full" style={{ width: `${moodPercentages.bad}%` }}></div>
                 </div>
                 <span className="text-sm">{moodCounts.bad}개 ({moodPercentages.bad}%)</span>
               </div>
             </div>
           </div>
           
           {topEmotions.length > 0 && (
             <div>
               <h3 className="font-semibold mb-2">자주 느끼는 감정 TOP 5</h3>
               <div className="space-y-1">
                 {topEmotions.map(([emotion, count], idx) => (
                   <div key={idx} className="flex items-center justify-between">
                     <span className="text-sm">{emotion}</span>
                     <span className="text-sm text-gray-500">{count}회</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
         
         <div className="bg-white rounded-lg shadow-md p-6">
           <h2 className={`text-lg font-bold text-${getCurrentTheme().accent.split('-')[0]}-800 mb-4`}>📅 감정 달력</h2>
           <div className="flex justify-between items-center mb-4">
             <button onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1))} className="text-gray-600 hover:text-gray-800">⬅️ 이전</button>
             <span className="font-semibold">{currentCalendarMonth.getFullYear()}년 {currentCalendarMonth.getMonth() + 1}월</span>
             <button onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1))} className="text-gray-600 hover:text-gray-800">다음 ➡️</button>
           </div>
           
           <div className="grid grid-cols-7 gap-1 text-center text-xs">
             {['일', '월', '화', '수', '목', '금', '토'].map(day => (
               <div key={day} className="font-semibold py-1">{day}</div>
             ))}
             {Array.from({ length: new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth(), 1).getDay() }, (_, i) => (
               <div key={`empty-${i}`} className="py-2"></div>
             ))}
             {Array.from({ length: new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 0).getDate() }, (_, i) => {
               const date = i + 1;
               const dateStr = `${currentCalendarMonth.getFullYear()}.${(currentCalendarMonth.getMonth() + 1).toString().padStart(2, '0')}.${date.toString().padStart(2, '0')}`;
               const entry = diaryEntries.find(e => e.date === dateStr);
               const isToday = new Date().toDateString() === new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth(), date).toDateString();
               
               return (
                 <div key={date} className={`py-2 rounded ${isToday ? 'border-2 border-purple-500' : ''} ${entry ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                   <div className="text-sm">{date}</div>
                   {entry && (
                     <div className="text-lg">{getMoodEmoji(entry.mood)}</div>
                   )}
                 </div>
               );
             })}
           </div>
           
           <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
             <div className="flex items-center gap-1">
               <div className="w-3 h-3 bg-green-500 rounded-full"></div>
               <span>😊 좋음</span>
             </div>
             <div className="flex items-center gap-1">
               <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
               <span>😐 보통</span>
             </div>
             <div className="flex items-center gap-1">
               <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
               <span>😔 나쁨</span>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 };

 const renderMyDiary = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
     <div className="max-w-lg mx-auto">
       <header className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
         <button onClick={() => handleStepChange('mood')} className="text-gray-600 hover:text-gray-800">⬅️</button>
         <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>내 일기</h1>
         <button onClick={() => handleStepChange('trash')} className="text-gray-600 hover:text-gray-800">🗑️</button>
       </header>
       
       <div className="bg-white rounded-lg shadow-md p-4 mb-4">
         <input
           type="text"
           placeholder="일기 검색..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent}`}
         />
       </div>
       
       <div className="space-y-4">
         {(searchQuery ? searchDiaries(searchQuery) : diaryEntries).map(entry => (
           <div key={entry.id} className="bg-white rounded-lg shadow-md p-4">
             <div className="flex justify-between items-start mb-2">
               <div>
                 <div className="flex items-center gap-2">
                   <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                   <span className="font-semibold">{entry.date}</span>
                   <span className="text-sm text-gray-500">{entry.time}</span>
                 </div>
                 <div className="flex flex-wrap gap-1 mt-1">
                   {entry.keywords?.map((keyword, idx) => (
                     <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                       {keyword}
                     </span>
                   ))}
                 </div>
               </div>
               <button onClick={() => setExpandedDiaryId(expandedDiaryId === entry.id ? null : entry.id)} className="text-gray-500 hover:text-gray-700">
                 {expandedDiaryId === entry.id ? '📖' : '📕'}
               </button>
             </div>
             
             <p className={`text-gray-700 ${expandedDiaryId === entry.id ? '' : 'line-clamp-2'}`}>
               {entry.summary}
             </p>
             
             {expandedDiaryId === entry.id && (
               <div className="mt-4 space-y-3">
                 {entry.selectedEmotions && entry.selectedEmotions.length > 0 && (
                   <div>
                     <h4 className="font-semibold text-sm mb-1">감정:</h4>
                     <div className="flex flex-wrap gap-1">
                       {entry.selectedEmotions.map((emotion, idx) => (
                         <span key={idx} className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                           {emotion}
                         </span>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {entry.musicPlayed && entry.musicPlayed.length > 0 && (
                   <div>
                     <h4 className="font-semibold text-sm mb-1">들은 음악:</h4>
                     <div className="space-y-2">
                       {entry.musicPlayed.map((music, idx) => (
                         <div key={idx} className="flex items-center gap-2 text-sm">
                           <span>🎵</span>
                           <span>{music.title} - {music.artist}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {entry.actionItems && entry.actionItems.length > 0 && (
                   <div>
                     <h4 className="font-semibold text-sm mb-1">추천 활동:</h4>
                     <ul className="text-sm text-gray-600">
                       {entry.actionItems.map((item, idx) => (
                         <li key={idx}>• {item}</li>
                       ))}
                     </ul>
                   </div>
                 )}
                 
                 <button onClick={() => moveToTrash(entry)} className="mt-2 text-sm text-red-500 hover:text-red-700">
                   🗑️ 삭제
                 </button>
               </div>
             )}
           </div>
         ))}
         
         {diaryEntries.length === 0 && (
           <div className="text-center py-8 text-gray-500">
             아직 작성한 일기가 없어요.<br />
             오늘의 감정을 기록해보세요!
           </div>
         )}
       </div>
     </div>
   </div>
 );

 const renderMyMusic = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
     <div className="max-w-lg mx-auto">
       <header className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
         <button onClick={() => handleStepChange('mood')} className="text-gray-600 hover:text-gray-800">⬅️</button>
         <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>내 음악</h1>
         <span className="text-sm text-gray-600">{personalMusic.length}곡</span>
       </header>
       
       <div className="space-y-4">
         {personalMusic.map((music, idx) => (
           <div key={idx} className="bg-white rounded-lg shadow-md p-4">
             <div className="flex items-center gap-4">
               {music.thumbnail && (
                 <img src={music.thumbnail} alt={music.title} className="w-20 h-20 rounded-lg object-cover" />
               )}
               <div className="flex-1">
                 <h3 className="font-semibold text-gray-800">{music.title}</h3>
                 <p className="text-sm text-gray-600">{music.artist}</p>
                 <div className="flex flex-wrap gap-1 mt-1">
                   {music.emotions.map((emotion, eidx) => (
                     <span key={eidx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                       {emotion}
                     </span>
                   ))}
                 </div>
               </div>
             </div>
             
             {music.preview_url && (
               <audio controls className="w-full mt-3">
                 <source src={music.preview_url} type="audio/mpeg" />
               </audio>
             )}
             
             <div className="flex gap-2 mt-3">
               {music.url && (
                 <a href={music.url} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 px-4 bg-purple-500 text-white rounded-lg text-center hover:bg-purple-600">
                   들으러 가기
                 </a>
               )}
               <button onClick={() => removeFromPersonalMusic(music.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                 삭제
               </button>
             </div>
           </div>
         ))}
         
         {personalMusic.length === 0 && (
           <div className="text-center py-8 text-gray-500">
             아직 저장한 음악이 없어요.<br />
             AI와 대화하며 음악을 추천받아보세요!
           </div>
         )}
       </div>
     </div>
   </div>
 );

 const renderTrash = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
     <div className="max-w-lg mx-auto">
       <header className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
         <button onClick={() => handleStepChange('myDiary')} className="text-gray-600 hover:text-gray-800">⬅️</button>
         <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>휴지통</h1>
         <span className="text-sm text-gray-600">{trashEntries.length}개</span>
       </header>
       
       <div className="space-y-4">
         {trashEntries.map(entry => (
           <div key={entry.id} className="bg-white rounded-lg shadow-md p-4 opacity-75">
             <div className="flex justify-between items-start mb-2">
               <div>
                 <div className="flex items-center gap-2">
                   <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                   <span className="font-semibold">{entry.date}</span>
                   <span className="text-sm text-gray-500">{entry.time}</span>
                 </div>
                 <p className="text-sm text-red-500 mt-1">삭제됨: {entry.deletedAt}</p>
               </div>
               <button onClick={() => restoreFromTrash(entry)} className="text-blue-500 hover:text-blue-700">
                 복원
               </button>
             </div>
             <p className="text-gray-700 line-clamp-2">{entry.summary}</p>
           </div>
         ))}
         
         {trashEntries.length === 0 && (
           <div className="text-center py-8 text-gray-500">
             휴지통이 비어있어요.
           </div>
         )}
       </div>
     </div>
   </div>
 );

 const renderSettings = () => (
   <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>
     <div className="max-w-lg mx-auto">
       <header className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
         <button onClick={() => handleStepChange('mood')} className="text-gray-600 hover:text-gray-800">⬅️</button>
         <h1 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>설정</h1>
         <button onClick={handleLogout} className="text-red-500 hover:text-red-700">로그아웃</button>
       </header>
       
       <div className="bg-white rounded-lg shadow-md p-6 mb-4">
         <h2 className="text-lg font-semibold mb-4">계정 정보</h2>
         <p className="text-gray-600 mb-2">이메일: {user?.email}</p>
         <p className="text-gray-600 mb-2">레벨: {userProgress.level}</p>
         <p className="text-gray-600">가입일: {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ko-KR') : '알 수 없음'}</p>
       </div>
       
       <div className="bg-white rounded-lg shadow-md p-6 mb-4">
         <h2 className="text-lg font-semibold mb-4">AI 파트너</h2>
         <p className="text-gray-600 mb-2">이름: {getAIPartnerName()}</p>
         <p className="text-gray-600">타입: {selectedPersonType || 'AI 친구'}</p>
       </div>
       
       <div className="bg-white rounded-lg shadow-md p-6 mb-4">
         <h2 className="text-lg font-semibold mb-4">음악 선호도</h2>
         <div className="flex flex-wrap gap-2">
           {appSettings.musicPreferences.map(genreId => {
             const genre = MUSIC_GENRES.find(g => g.id === genreId);
             return genre ? (
               <span key={genreId} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                 {genre.emoji} {genre.name}
               </span>
             ) : null;
           })}
         </div>
       </div>
       
       <div className="bg-white rounded-lg shadow-md p-6">
         <h2 className="text-lg font-semibold mb-4">프리미엄</h2>
         <p className="text-gray-600 mb-4">
           {appSettings.isPremium ? '프리미엄 사용중' : '무료 플랜 사용중'}
         </p>
         {!appSettings.isPremium && (
           <button className={`w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:opacity-90`}>
             프리미엄 업그레이드
           </button>
         )}
       </div>
     </div>
   </div>
 );

 // 메인 렌더링
 return (
   <>
     {currentStep === 'auth' && renderAuth()}
     {currentStep === 'onboard-name' && renderOnboardingName()}
     {currentStep === 'onboard-name-input' && renderOnboardingNameInput()}
     {currentStep === 'onboard-music' && renderOnboardingMusic()}
     {currentStep === 'mood' && renderMoodSelection()}
     {currentStep === 'chat' && renderChat()}
     {currentStep === 'summary' && renderSummary()}
     {currentStep === 'stats' && renderStats()}
     {currentStep === 'myDiary' && renderMyDiary()}
     {currentStep === 'myMusic' && renderMyMusic()}
     {currentStep === 'trash' && renderTrash()}
     {currentStep === 'settings' && renderSettings()}
   </>
 );
};

export default App;
