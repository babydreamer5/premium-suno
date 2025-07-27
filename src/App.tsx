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
import { searchMusicByEmotion } from './musicData';

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
  isPremium: boolean;      
  notifications: boolean;      
  musicPreferences: string[];      
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

const MUSIC_GENRES = [    
  { id: 'k-pop', name: 'K-Pop', emoji: '🎵' },    
  { id: 'pop', name: '팝', emoji: '🎤' },    
  { id: 'ballad', name: '발라드', emoji: '💙' },    
  { id: 'r&b', name: 'R&B', emoji: '🎶' },    
  { id: 'hip-hop', name: '힙합', emoji: '🎤' },    
  { id: 'indie', name: '인디', emoji: '🎸' },    
  { id: 'classic', name: '클래식', emoji: '🎼' },    
  { id: 'jazz', name: '재즈', emoji: '🎺' },    
  { id: 'electronic', name: '일렉트로닉', emoji: '🎛️' },    
  { id: 'rock', name: '록', emoji: '🤘' }    
];

const App: React.FC = () => {      
  // 상태 관리      
  const [user, setUser] = useState<User | null>(null);      
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');      
  const [email, setEmail] = useState('');      
  const [password, setPassword] = useState('');      
  const [isLoading, setIsLoading] = useState(false);      
  const [currentStep, setCurrentStep] = useState<'auth' | 'onboard-name' | 'onboard-music' | 'mood' | 'chat' | 'summary' | 'stats' | 'settings' | 'trash' | 'calendar' | 'search' | 'myDiary' | 'myMusic'>('auth');      
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
    musicPreferences: []    
  });      
  const [currentInput, setCurrentInput] = useState("");      
  const [tokenUsage, setTokenUsage] = useState(0);      
  const [expandedDiaryId, setExpandedDiaryId] = useState<string | null>(null);      
  const [conversationCount, setConversationCount] = useState(0);      
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);      
  const [hasRecommendedMusic, setHasRecommendedMusic] = useState(false);      
  const [recommendedMusicForSummary, setRecommendedMusicForSummary] = useState<MusicItem[]>([]);    
      
  // 온보딩 관련 상태    
  const [selectedPersonType, setSelectedPersonType] = useState('');    
  const [selectedMusicGenres, setSelectedMusicGenres] = useState<string[]>([]);

  // API 키 설정      
  const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;      
  const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;      
  const SPOTIFY_CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;      
  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

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

  const searchSpotifyMusic = async (query: string): Promise<MusicItem[]> => {      
    if (!spotifyToken) return [];      
    try {      
      const response = await fetch(      
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=KR&limit=20`,      
        { headers: { 'Authorization': `Bearer ${spotifyToken}` } }      
      );      
      if (!response.ok) return [];      
      const data = await response.json();      
      return data.tracks?.items?.slice(0, 10).map((item: any) => ({      
        id: item.id,      
        title: item.name,      
        artist: item.artists.map((artist: any) => artist.name).join(', '),      
        genre: 'recommended',      
        thumbnail: item.album.images[0]?.url || '',      
        url: item.external_urls.spotify,      
        publishedAt: '',      
        preview_url: item.preview_url,      
        album: item.album.name,      
        source: 'spotify'      
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
        genre: 'recommended',      
        thumbnail: item.snippet.thumbnails?.medium?.url || '',      
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,      
        publishedAt: item.snippet.publishedAt || '',      
        source: 'youtube'      
      })) || [];      
    } catch (error) {      
      return [];      
    }      
  };

  const searchMusic = async (query: string, isUserRequest: boolean = false): Promise<MusicItem[]> => {      
    if (isUserRequest) {      
      const youtubeResults = await searchYouTubeMusic(query, true);      
      if (youtubeResults.length > 0) return youtubeResults.slice(0, 1);      
    }      
                  
    const spotifyResults = await searchSpotifyMusic(query);      
    const youtubeResults = await searchYouTubeMusic(query);      
    const results = [...spotifyResults.slice(0, 2), ...youtubeResults.slice(0, 1)];      
                  
    if (results.length < 3) {      
      const additionalYoutube = youtubeResults.slice(1, 3 - results.length + 1);      
      results.push(...additionalYoutube);      
    }      
                  
    return results.slice(0, 3);      
  };

  const addToPersonalMusic = async (music: MusicItem) => {      
    if (!user) return;      
    try {      
      const existing = personalMusic.find(m => m.id === music.id);      
      if (!existing) {      
        const newMusic = { ...music, playCount: 1, userId: user.uid, createdAt: serverTimestamp() };      
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
        // Firebase에서 음악 삭제
        const musicQuery = query(
          collection(db, 'personalMusic'),
          where('userId', '==', user.uid),
          where('id', '==', musicId)
        );
        const musicSnapshot = await getDocs(musicQuery);
        
        if (!musicSnapshot.empty) {
          await deleteDoc(doc(db, 'personalMusic', musicSnapshot.docs[0].id));
        }
        
        // 로컬 상태에서 제거
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

    let systemPrompt = `당신은 ${AI_NAME}입니다. 사용자의 감정에 공감하는 따뜻한 AI 친구입니다.

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
   예: "${genreNames}를 좋아한다고 하셨는데 제가 음악 추천해드릴까요? 🎵"      
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
      반드시 이런 형태로 말하세요: "${genreNames}를 좋아한다고 하셨는데 제가 음악 추천해드릴까요? 🎵" 
      그리고 응답 끝에 "[MUSIC_SEARCH: ${genreNames} 감정맞춤]" 형식으로 포함해주세요.
      장르 이름을 반드시 대화 내용에 포함시키는 것이 중요합니다.`;
    }

    const messages = [...conversationHistory.slice(-5), { role: 'user', content: userMessage }];      
    const aiResponse = await callOpenAI(messages, systemPrompt);

    // 음악 검색 패턴 매칭
    const musicSearchMatch = aiResponse.match(/\[MUSIC_SEARCH: ([^\]]+)\]/);      
    const genreSearchMatch = aiResponse.match(/\[GENRE_SEARCH: ([^\]]+)\]/);
    
    if (musicSearchMatch) {      
      const searchQuery = musicSearchMatch[1].trim();      
      const cleanResponse = aiResponse.replace(/\[MUSIC_SEARCH: [^\]]+\]/, '').trim();      
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
          const genreQueries = userGenres.map(genreId => {
            const genre = MUSIC_GENRES.find(g => g.id === genreId);
            const moodKeyword = currentMood === 'good' ? 'upbeat happy' : 
                              currentMood === 'bad' ? 'sad emotional' : 'chill relaxing';
            return `${genre?.name || genreId} ${moodKeyword} popular`;
          });

          // 각 장르별로 검색해서 섞기
          for (const query of genreQueries) {
            const results = await searchSpotifyMusic(query);
            musicResults.push(...results.slice(0, 1)); // 각 장르에서 1곡씩
          }
          
          if (musicResults.length === 0) {
            musicResults = await searchMusic(searchQuery, false);
          }
        } else {
          // 일반 검색
          musicResults = await searchMusic(searchQuery, isUserRequest);
        }
        
        if (musicResults.length > 0) {      
          setHasRecommendedMusic(true);      
          return { response: cleanResponse, music: musicResults[0] };      
        }      
      } catch (error) {      
        console.error('음악 검색 오류:', error);      
      }      
    } else if (genreSearchMatch) {
      const requestedGenre = genreSearchMatch[1].trim();
      const cleanResponse = aiResponse.replace(/\[GENRE_SEARCH: [^\]]+\]/, '').trim();
      
      try {
        // 요청된 장르로 Spotify에서 검색
        const moodKeyword = currentMood === 'good' ? 'upbeat happy energetic' : 
                          currentMood === 'bad' ? 'sad emotional ballad' : 'chill relaxing';
        const genreQuery = `${requestedGenre} ${moodKeyword} popular korean`;
        
        const musicResults = await searchSpotifyMusic(genreQuery);
        if (musicResults.length > 0) {
          setHasRecommendedMusic(true);
          return { response: cleanResponse, music: musicResults[0] };
        }
      } catch (error) {
        console.error('장르 기반 음악 검색 오류:', error);
      }
    }
    
    return { response: aiResponse, music: null };      
  };

  const generateConversationSummary = async (messages: ChatMessage[]): Promise<SummaryData> => {      
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content).join('\n');

    if (!userMessages.trim()) {      
      // 기본 음악 추천  
      const defaultMusic = await searchMusic('healing relaxing music', false);  
      return {      
        summary: '오늘도 감정을 나누며 이야기를 해봤어요. 대화를 통해 마음을 정리할 수 있었어요. 이런 시간들이 소중하다고 생각해요. 앞으로도 이렇게 대화하며 서로의 마음을 나누면 좋겠어요.',      
        keywords: ['#감정나눔'],      
        recommendedEmotions: ['평온', '만족', '편안'],      
        actionItems: ['오늘의 감정을 일기장에 기록하여 패턴 파악하기', '잠들기 전 10분간 명상이나 깊은 호흡하기'],  
        recommendedMusic: defaultMusic.slice(0, 2)  
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

      // 음악 추천 생성  
      let recommendedMusic: MusicItem[] = [];  
      if (musicKeywords.length > 0) {  
        try {  
          const music1 = await searchMusic(musicKeywords[0] || 'healing music', false);  
          const music2 = await searchMusic(musicKeywords[1] || 'uplifting music', false);  
          recommendedMusic = [...music1.slice(0, 1), ...music2.slice(0, 1)];  
        } catch (error) {  
          console.error('음악 검색 오류:', error);  
          const defaultMusic = await searchMusic('calm relaxing music', false);  
          recommendedMusic = defaultMusic.slice(0, 2);  
        }  
      } else {  
        const defaultMusic = await searchMusic('calm peaceful music', false);  
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
      const defaultMusic = await searchMusic('healing peaceful music', false);  
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
      const searchQuery = `${emotionQuery} ${moodText} 음악`;      
            
      const musicResults = await searchMusic(searchQuery, false);      
      if (musicResults.length > 0) {      
        setRecommendedMusicForSummary(musicResults.slice(0, 2));      
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

  const getCurrentTheme = () => APP_THEME;

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
          <button onClick={isAuthMode === 'login' ? handleLogin : handleRegister} disabled={isLoading} className={`w-full bg-gradient-to-r ${getCurrentTheme().primary} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50`}>      
            {isLoading ? '처리 중...' : (isAuthMode === 'login' ? '로그인' : '회원가입')}      
          </button>      
        </div>      
        <div className="text-center my-4 text-gray-500">또는</div>      
        <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-white border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2">      
          <span>🗝</span>      
          <span>Google로 로그인</span>      
        </button>      
      </div>      
    </div>      
  );

  const renderOnboardName = () => (    
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center p-4`}>    
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">    
        <div className="text-center mb-8">    
          <h2 className="text-2xl font-bold text-gray-800 mb-2">누구에게 하루를 털어놓고 싶나요?</h2>    
        </div>    
            
        <div className="space-y-6 mb-8">    
          <button   
            onClick={() => handlePersonTypeSelect('idol')}  
            className={`w-full py-4 px-6 rounded-lg font-semibold transition-all ${  
              selectedPersonType === 'idol'   
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'   
                : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200'  
            }`}  
          >    
            좋아하는 아이돌    
          </button>    
          <button   
            onClick={() => handlePersonTypeSelect('crush')}  
            className={`w-full py-4 px-6 rounded-lg font-semibold transition-all ${  
              selectedPersonType === 'crush'   
                ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white'   
                : 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 hover:from-purple-100 hover:to-pink-100'  
            }`}  
          >    
            짝사랑 상대    
          </button>    
          <button   
            onClick={() => handlePersonTypeSelect('past-self')}  
            className={`w-full py-4 px-6 rounded-lg font-semibold transition-all ${  
              selectedPersonType === 'past-self'   
                ? 'bg-gradient-to-r from-purple-300 to-pink-300 text-white'   
                : 'bg-gradient-to-r from-purple-25 to-pink-25 text-purple-500 hover:from-purple-75 hover:to-pink-75'  
            }`}  
          >    
            어제의 나    
          </button>    
        </div>

        {selectedPersonType && (  
          <button   
            onClick={() => setCurrentStep('onboard-music')}   
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"  
          >    
            다음    
          </button>    
        )}  
      </div>    
    </div>    
  );

  const renderOnboardMusic = () => (    
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} flex items-center justify-center p-4`}>    
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">    
        <div className="text-center mb-8">    
          <h2 className="text-2xl font-bold text-gray-800 mb-2">좋아하는 음악 장르를 선택해주세요</h2>    
          <p className="text-gray-600">최대 3개까지 선택 가능</p>    
        </div>    
            
        <div className="grid grid-cols-2 gap-3 mb-8">    
          {MUSIC_GENRES.map((genre) => (  
            <button  
              key={genre.id}  
              onClick={() => handleMusicGenreSelect(genre.id)}  
              className={`p-3 rounded-lg text-center transition-all border-2 ${  
                selectedMusicGenres.includes(genre.id)  
                  ? 'bg-purple-500 text-white border-purple-500'  
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-purple-300'  
              }`}  
            >  
              <div className="text-lg mb-1">{genre.emoji}</div>  
              <div className="text-sm font-medium">{genre.name}</div>  
            </button>  
          ))}  
        </div>

        <div className="text-center mb-4">  
          <p className="text-sm text-gray-500">선택된 장르: {selectedMusicGenres.length}/3</p>  
        </div>

        {selectedMusicGenres.length > 0 && (  
          <button   
            onClick={handleOnboardingComplete}   
            className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all"  
          >    
            완료    
          </button>    
        )}  
      </div>    
    </div>    
  );

  const renderMoodSelection = () => (      
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
      <div className="max-w-4xl mx-auto">      
        {renderTokenBar()}      
        <div className="text-center mb-8">      
          <h2 className="text-3xl font-bold text-gray-800 mb-2">오늘 기분은 어떠세요?</h2>      
          <p className="text-gray-600">{AI_NAME}가 여러분의 감정에 맞는 음악을 찾아드릴게요</p>      
        </div>      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">      
          <div className="flex flex-col items-center">      
            <button onClick={() => handleMoodSelect('good')} className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg">      
              <div className="w-24 h-24 rounded-3xl bg-orange-400 flex items-center justify-center shadow-lg"><div className="text-4xl">😊</div></div>      
            </button>      
            <span className="text-lg font-semibold text-gray-700">좋아!</span>      
          </div>      
          <div className="flex flex-col items-center">      
            <button onClick={() => handleMoodSelect('normal')} className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg">      
              <div className="w-24 h-24 rounded-full bg-blue-300 flex items-center justify-center shadow-lg"><div className="text-4xl">😐</div></div>      
            </button>      
            <span className="text-lg font-semibold text-gray-700">그냥 뭐..</span>      
          </div>      
          <div className="flex flex-col items-center">      
            <button onClick={() => handleMoodSelect('bad')} className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg">      
              <div className="w-24 h-24 rounded-full bg-purple-300 flex items-center justify-center shadow-lg"><div className="text-4xl">😔</div></div>      
            </button>      
            <span className="text-lg font-semibold text-gray-700">별루야..</span>      
          </div>      
        </div>      
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">      
          <button onClick={() => handleStepChange('myDiary')} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow">      
            <span className="text-2xl mb-2">📖</span><span className="text-sm font-medium text-gray-700">내 일기장</span><span className="text-xs text-gray-500">({diaryEntries.length})</span>      
          </button>      
          <button onClick={() => handleStepChange('myMusic')} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow">      
            <span className="text-2xl mb-2">🎵</span><span className="text-sm font-medium text-gray-700">내 음악</span><span className="text-xs text-gray-500">({personalMusic.length})</span>      
          </button>      
          <button onClick={() => handleStepChange('search')} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow">      
            <span className="text-2xl mb-2">🔍</span><span className="text-sm font-medium text-gray-700">검색</span><span className="text-xs text-gray-500">기록 찾기</span>      
          </button>      
          <button onClick={() => handleStepChange('stats')} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow">      
            <span className="text-2xl mb-2">📊</span><span className="text-sm font-medium text-gray-700">통계 및 달력</span><span className="text-xs text-gray-500">감정 분석</span>      
          </button>      
          <button onClick={() => handleStepChange('trash')} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow">      
            <span className="text-2xl mb-2">🗑️</span><span className="text-sm font-medium text-gray-700">휴지통</span><span className="text-xs text-gray-500">({trashEntries.length})</span>      
          </button>      
          <button onClick={() => handleStepChange('settings')} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow">      
            <span className="text-2xl mb-2">⚙️</span><span className="text-sm font-medium text-gray-700">설정</span><span className="text-xs text-gray-500">옵션</span>      
          </button>      
        </div>      
        {diaryEntries.length > 0 && (      
          <div className="bg-white rounded-lg shadow-md p-6">      
            <h3 className="text-xl font-bold mb-4">최근 감정 기록</h3>      
            <div className="space-y-4">      
              {diaryEntries.slice(0, 5).map((entry) => (      
                <div key={entry.id} className={`flex items-center justify-between p-3 bg-gradient-to-r ${getCurrentTheme().secondary} rounded-lg border border-${getCurrentTheme().accent.split('-')[0]}-100`}>      
                  <div className="flex items-center space-x-3 flex-1">      
                    <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>      
                    <div className="flex-1">      
                      <p className={`font-medium text-${getCurrentTheme().accent.split('-')[0]}-800`}>{entry.date} {entry.time}</p>      
                      <p className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>{expandedDiaryId === entry.id ? entry.summary : `${entry.summary.substring(0, 50)}...`}</p>      
                      {entry.selectedEmotions?.length > 0 && (<p className={`text-xs text-${getCurrentTheme().accent.split('-')[0]}-500 mt-1`}>감정: {entry.selectedEmotions.slice(0, 3).join(', ')}</p>)}      
                      {entry.musicPlayed?.length > 0 && (<p className="text-xs text-pink-500 mt-1">🎵 {entry.musicPlayed[0]?.title || 'Unknown Music'}</p>)}      
                    </div>      
                  </div>      
                  <div className="flex space-x-2">      
                    <button onClick={() => setExpandedDiaryId(expandedDiaryId === entry.id ? null : entry.id)} className="text-blue-500 hover:text-blue-700 p-1 rounded text-sm" title="전체 보기">{expandedDiaryId === entry.id ? '접기' : '펼치기'}</button>      
                    <button onClick={() => moveToTrash(entry)} className="text-red-500 hover:text-red-700 p-1 rounded" title="휴지통으로 이동">🗑️</button>      
                  </div>      
                </div>      
              ))}      
            </div>      
          </div>      
        )}      
        <div className="text-center mt-6"><button onClick={handleLogout} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">로그아웃</button></div>      
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
            <h2 className={`text-xl font-bold text-${getCurrentTheme().accent.split('-')[0]}-800`}>{AI_NAME}와 대화하기</h2>      
            <div className="flex items-center space-x-2">      
              <span className={`text-sm text-${getCurrentTheme().accent.split('-')[0]}-600`}>현재 기분:</span>      
              <span className={`px-3 py-1 bg-${getCurrentTheme().accent.split('-')[0]}-100 text-${getCurrentTheme().accent.split('-')[0]}-800 rounded-full text-sm`}>{getMoodEmoji(currentMood || 'normal')} {getMoodText(currentMood || 'normal')}</span>      
            </div>      
          </div>      
          <div className={`h-96 overflow-y-auto mb-4 p-4 bg-gradient-to-br from-white to-${getCurrentTheme().accent.split('-')[0]}-50 rounded-lg border border-${getCurrentTheme().accent.split('-')[0]}-100`}>      
            {chatMessages.map((message, index) => (      
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>      
                <div className={`inline-block p-3 rounded-lg max-w-xs ${message.role === 'user' ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white` : `bg-white text-${getCurrentTheme().accent.split('-')[0]}-800 border border-${getCurrentTheme().accent.split('-')[0]}-200`}`}>      
                  {message.role === 'assistant' && (<div className={`font-semibold mb-1 text-${getCurrentTheme().accent.split('-')[0]}-600`}>{AI_NAME}:</div>)}      
                  {message.content}      
                  {message.musicRecommendation && (      
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">      
                      <div className="text-sm font-semibold text-gray-700 mb-2">🎵 추천 음악</div>      
                      <div className="flex items-center space-x-2 mb-2">      
                        <img src={message.musicRecommendation.thumbnail} alt={message.musicRecommendation.title} className="w-12 h-12 object-cover rounded"/>      
                        <div className="flex-1">      
                          <p className="text-sm font-medium text-gray-800">{message.musicRecommendation.title}</p>      
                          <p className="text-xs text-gray-600">{message.musicRecommendation.artist}</p>      
                          <p className="text-xs text-purple-500">{message.musicRecommendation.source === 'spotify' ? 'Spotify' : 'YouTube'}</p>      
                        </div>      
                      </div>      
                      <div className="flex space-x-2">      
                        <a href={message.musicRecommendation.url} target="_blank" rel="noopener noreferrer" className={`flex-1 py-1 px-2 ${message.musicRecommendation.source === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded text-center text-xs`}>      
                          {message.musicRecommendation.source === 'spotify' ? 'Spotify에서 듣기' : 'YouTube에서 듣기'}      
                        </a>      
                        <button onClick={() => addChatMusicToMyList(message.musicRecommendation!)} className="flex-1 py-1 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">내 리스트 추가</button>      
                      </div>      
                    </div>      
                  )}      
                </div>      
              </div>      
            ))}      
            {isLoading && (      
              <div className="text-left">      
                <div className={`inline-block p-3 rounded-lg bg-white text-${getCurrentTheme().accent.split('-')[0]}-800 border border-${getCurrentTheme().accent.split('-')[0]}-200`}>      
                  <div className={`font-semibold mb-1 text-${getCurrentTheme().accent.split('-')[0]}-600`}>{AI_NAME}:</div>답변을 준비하고 있어요... 💜      
                </div>      
              </div>      
            )}      
          </div>      
          <div className="flex space-x-2">      
            <input type="text" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="오늘 하루 어떠셨나요?" className={`flex-1 px-4 py-2 border border-${getCurrentTheme().accent.split('-')[0]}-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${getCurrentTheme().accent} bg-white`} disabled={isLoading}/>      
            <button onClick={handleSendMessage} disabled={isLoading} className={`px-6 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90 disabled:opacity-50`}>전송</button>      
          </div>      
        </div>      
        <div className="flex space-x-4">      
            <button onClick={handleGenerateSummary} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90" disabled={chatMessages.length <= 1}>      
            📝 감정 요약하기      
            </button>      
        </div>      
        <div className="flex space-x-4 mt-4">      
          <button onClick={() => handleStepChange('mood')} className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600">🏠 홈으로</button>      
        </div>      
      </div>      
    </div>      
  );

  const renderSummary = () => (      
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
      <div className="max-w-4xl mx-auto">      
        {renderTokenBar()}      
        <div className="text-center mb-8">      
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📝 오늘의 감정 요약</h2>      
          <p className="text-gray-600">AI가 분석한 내용을 확인하고 추가 감정을 선택해보세요</p>      
        </div>      
        {summaryData && (      
          <div className="space-y-6">      
            <div className="bg-white rounded-xl shadow-lg p-6">      
              <h3 className="text-xl font-bold mb-4 text-gray-800">📖 오늘의 이야기</h3>      
              <p className="text-gray-700 leading-relaxed">{summaryData.summary}</p>      
            </div>      
            <div className="bg-white rounded-xl shadow-lg p-6">      
              <h3 className="text-xl font-bold mb-4 text-gray-800">🏷️ 감정 키워드</h3>      
              <div className="flex flex-wrap gap-2">      
                {summaryData.keywords.map((keyword: string, index: number) => (<span key={index} className={`px-3 py-1 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-full text-sm`}>{keyword}</span>))}      
              </div>      
            </div>      
            <div className="bg-white rounded-xl shadow-lg p-6">      
              <h3 className="text-xl font-bold mb-4 text-gray-800">🤖 AI 추천 세부 감정</h3>      
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">      
                {summaryData.recommendedEmotions.map((emotion: string, index: number) => (<button key={index} onClick={() => handleEmotionSelect(emotion)} className={`p-3 rounded-lg text-sm font-medium transition-all border-2 ${selectedEmotions.includes(emotion) ? `bg-gradient-to-r ${getCurrentTheme().primary} text-white border-purple-500 shadow-lg transform scale-105` : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}>{emotion}</button>))}      
              </div>      
              <p className="text-xs text-gray-500">최대 2개까지 선택 가능 (선택한 감정: {selectedEmotions.length}/2)</p>      
            </div>      
            <div className="bg-white rounded-xl shadow-lg p-6">      
              <h3 className="text-xl font-bold mb-4 text-gray-800">💭 나의 오늘 감정</h3>      
              <p className="text-gray-600 text-sm mb-3">오늘 가장 크게 느낀 감정을 한 가지만 입력해주세요</p>      
              <input type="text" value={userMainEmotion} onChange={(e) => setUserMainEmotion(e.target.value)} placeholder="예: 행복, 걱정, 설렘, 피곤함 등" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg" maxLength={10}/>      
              <p className="text-xs text-gray-500 mt-2">최대 10자까지 입력 가능</p>      
            </div>      
            <div className="bg-white rounded-xl shadow-lg p-6">      
              <h3 className="text-xl font-bold mb-4 text-gray-800">🎯 추천 액션</h3>      
              <div className="space-y-2">      
                {summaryData.actionItems.map((item: string, index: number) => (<div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"><span className="text-green-500">✅</span><span className="text-gray-700">{item}</span></div>))}      
              </div>      
            </div>      
            {summaryData.recommendedMusic && summaryData.recommendedMusic.length > 0 && (      
              <div className="bg-white rounded-xl shadow-lg p-6">      
                <h3 className="text-xl font-bold mb-4 text-gray-800">🎵 감정 맞춤 추천 음악</h3>      
                <p className="text-sm text-gray-600 mb-4">당신의 대화와 감정을 분석해서 선별한 음악입니다</p>  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">      
                  {summaryData.recommendedMusic.map((music: MusicItem, index: number) => (      
                    <div key={index} className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">      
                      <img src={music.thumbnail} alt={music.title} className="w-16 h-16 object-cover rounded-lg shadow-md"/>      
                      <div className="flex-1">      
                        <p className="text-sm font-bold text-gray-800 mb-1">{music.title}</p>      
                        <p className="text-xs text-gray-600 mb-2">{music.artist}</p>      
                        <p className="text-xs text-purple-600 font-medium">{music.source === 'spotify' ? '🎧 Spotify' : '🎬 YouTube'}</p>      
                      </div>      
                      <div className="flex flex-col space-y-2">      
                        <a href={music.url} target="_blank" rel="noopener noreferrer" className={`py-2 px-4 ${music.source === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg text-xs text-center font-medium transition-all`}>      
                          듣기      
                        </a>      
                        <button onClick={() => addToPersonalMusic(music)} className="py-2 px-4 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-all font-medium">      
                          저장      
                        </button>      
                      </div>      
                    </div>      
                  ))}      
                </div>      
              </div>      
            )}      
            {recommendedMusicForSummary.length > 0 && (      
              <div className="bg-white rounded-xl shadow-lg p-6">      
                <h3 className="text-xl font-bold mb-4 text-gray-800">🎵 감정에 맞는 추천 음악</h3>      
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">      
                  {recommendedMusicForSummary.map((music, index) => (      
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">      
                      <img src={music.thumbnail} alt={music.title} className="w-16 h-16 object-cover rounded"/>      
                      <div className="flex-1">      
                        <p className="text-sm font-medium text-gray-800">{music.title}</p>      
                        <p className="text-xs text-gray-600">{music.artist}</p>      
                        <p className="text-xs text-purple-500">{music.source === 'spotify' ? 'Spotify' : 'YouTube'}</p>      
                      </div>      
                      <div className="flex flex-col space-y-1">      
                        <a href={music.url} target="_blank" rel="noopener noreferrer" className={`py-1 px-3 ${music.source === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded text-xs text-center`}>      
                          🎧 듣기      
                        </a>      
                        <button onClick={() => addToPersonalMusic(music)} className="py-1 px-3 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">      
                          추가      
                        </button>      
                      </div>      
                    </div>      
                  ))}      
                </div>      
              </div>      
            )}      
            <div className="text-center">      
              <button onClick={handleSaveDiary} disabled={isLoading} className={`px-8 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50`}>💾 일기 저장하기 (+20 EXP)</button>      
            </div>      
          </div>      
        )}      
        <div className="text-center mt-6">      
          <button onClick={() => handleStepChange('chat')} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">대화로 돌아가기</button>      
        </div>      
      </div>      
    </div>      
  );

  const renderStats = () => {      
    const moodStats = ['good', 'normal', 'bad'].map(mood => {      
        const count = diaryEntries.filter(entry => entry.mood === mood).length;      
        const percentage = diaryEntries.length > 0 ? (count / diaryEntries.length) * 100 : 0;      
        return { mood, count, percentage };      
    });      
    const emotionFreq: { [key: string]: number } = {};      
    diaryEntries.forEach(entry => {      
        entry.selectedEmotions?.forEach(emotion => {      
            emotionFreq[emotion] = (emotionFreq[emotion] || 0) + 1;      
        });      
    });      
    const topEmotions = Object.entries(emotionFreq).sort(([,a], [,b]) => b - a).slice(0, 5);      
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];      
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const getCalendarData = (month: Date) => {      
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);      
        const startDate = new Date(startOfMonth);      
        startDate.setDate(startDate.getDate() - startDate.getDay());      
        const calendarData = [];      
        for (let week = 0; week < 6; week++) {      
            const weekData = [];      
            for (let day = 0; day < 7; day++) {      
                const currentDate = new Date(startDate);      
                currentDate.setDate(startDate.getDate() + (week * 7) + day);      
                const dayEntries = diaryEntries.filter(entry => new Date(entry.date).toDateString() === currentDate.toDateString());      
                weekData.push({      
                    date: currentDate,      
                    entries: dayEntries,      
                    isCurrentMonth: currentDate.getMonth() === month.getMonth(),      
                    isToday: currentDate.toDateString() === new Date().toDateString()      
                });      
            }      
            calendarData.push(weekData);      
        }      
        return calendarData;      
    };      
    const calendarData = getCalendarData(currentCalendarMonth);

    return (      
        <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
            <div className="max-w-4xl mx-auto">      
                {renderTokenBar()}      
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">      
                    <div className="flex items-center justify-between mb-6">      
                        <h2 className="text-2xl font-bold">📊 통계 & 📅 감정 달력</h2>      
                        <button onClick={() => handleStepChange('mood')} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">🏠 홈으로</button>      
                    </div>      
                    <div className="mb-8">      
                        <h3 className="text-xl font-bold mb-4">📊 통계</h3>      
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">      
                            <div className={`bg-gradient-to-r ${getCurrentTheme().primary} text-white p-6 rounded-lg`}><h4 className="text-lg font-semibold mb-2">총 일기 수</h4><p className="text-3xl font-bold">{diaryEntries.length}</p></div>      
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-lg"><h4 className="text-lg font-semibold mb-2">저장된 음악</h4><p className="text-3xl font-bold">{personalMusic.length}</p></div>      
                            <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-lg"><h4 className="text-lg font-semibold mb-2">현재 레벨</h4><p className="text-3xl font-bold">{userProgress.level}</p></div>      
                            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-lg"><h4 className="text-lg font-semibold mb-2">총 경험치</h4><p className="text-3xl font-bold">{userProgress.experience}</p></div>      
                        </div>      
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">      
                            <div className="bg-gray-50 p-6 rounded-lg">      
                                <h4 className="text-lg font-semibold mb-4">기분 분포</h4>      
                                <div className="space-y-3">      
                                    {moodStats.map(({ mood, count, percentage }) => (<div key={mood} className="flex items-center space-x-3"><span className="text-2xl">{getMoodEmoji(mood)}</span><div className="flex-1"><div className="flex justify-between text-sm mb-1"><span>{getMoodText(mood)}</span><span>{count}개 ({percentage.toFixed(1)}%)</span></div><div className={`w-full bg-${getCurrentTheme().accent.split('-')[0]}-100 rounded-full h-2`}><div className={`bg-gradient-to-r ${getCurrentTheme().primary} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }}/></div></div></div>))}      
                                </div>      
                            </div>      
                            <div className="bg-gray-50 p-6 rounded-lg">      
                                <h4 className="text-lg font-semibold mb-4">자주 느끼는 감정 TOP 5</h4>      
                                <div className="space-y-2">{topEmotions.length > 0 ? topEmotions.map(([emotion, count], index) => (<div key={emotion} className="flex items-center justify-between"><div className="flex items-center space-x-2"><span className="text-lg">{index + 1}</span><span className="font-medium">{emotion}</span></div><span className="text-sm text-gray-600">{count}회</span></div>)) : (<p className="text-gray-500 text-sm">아직 감정 데이터가 부족해요</p>)}</div>      
                            </div>      
                        </div>      
                    </div>      
                    <div>      
                        <h3 className="text-xl font-bold mb-4">📅 감정 달력</h3>      
                        <div className="flex items-center justify-between mb-6">      
                            <button onClick={() => setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className={`px-4 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}>← 이전</button>      
                            <h4 className="text-lg font-bold">{currentCalendarMonth.getFullYear()}년 {monthNames[currentCalendarMonth.getMonth()]}</h4>      
                            <button onClick={() => setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className={`px-4 py-2 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg hover:opacity-90`}>다음 →</button>      
                        </div>      
                        <div className="grid grid-cols-7 gap-1 mb-2">{dayNames.map((day) => (<div key={day} className="p-2 text-center font-semibold text-gray-600">{day}</div>))}</div>      
                        <div className="grid grid-cols-7 gap-1 mb-4">      
                            {calendarData.flat().map((day, index) => (<div key={index} className={`p-2 h-16 border rounded ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-100'} ${day.isToday ? `ring-2 ring-${getCurrentTheme().accent}` : ''}`}><div className="text-xs font-medium">{day.date.getDate()}</div>{day.entries.length > 0 && (<div className="flex flex-wrap gap-1 mt-1">{day.entries.map((entry) => (<div key={entry.id} className="relative group"><div className="w-2 h-2 rounded-full cursor-pointer" style={{ backgroundColor: entry.mood === 'good' ? '#10b981' : entry.mood === 'normal' ? '#f59e0b' : '#ef4444' }}/><div className="absolute bottom-full left-0 mb-2 w-40 p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"><p className="font-bold">{getMoodText(entry.mood)}: {entry.summary.substring(0, 30)}...</p></div></div>))}</div>)}</div>))}      
                        </div>      
                        <div className="flex justify-center space-x-6"><div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-xs">좋음</span></div><div className="flex items-center space-x-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span className="text-xs">보통</span></div><div className="flex items-center space-x-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-xs">나쁨</span></div></div>      
                    </div>      
                </div>      
            </div>      
        </div>      
    );      
  };

  const renderMyDiary = () => (      
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
      <div className="max-w-4xl mx-auto">      
        <div className="text-center mb-8">      
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📖 내 일기장</h2>      
          <p className="text-gray-600">총 {diaryEntries.length}개의 기록이 있어요</p>      
        </div>      
        {diaryEntries.length === 0 ? (<div className="text-center"><div className="text-4xl mb-4">📝</div><p className="text-lg text-gray-600">아직 작성된 일기가 없어요</p><button onClick={() => handleStepChange('mood')} className={`mt-4 px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90 transition-all`}>첫 일기 작성하기</button></div>) : (      
          <div className="space-y-6">      
            {diaryEntries.map((entry) => (      
              <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">      
                <div className="flex items-center justify-between mb-4">      
                  <div className="flex items-center space-x-3"><span className="text-2xl">{getMoodEmoji(entry.mood)}</span><div><h3 className="font-bold text-gray-800">{entry.date} {entry.time}</h3><p className="text-sm text-gray-600">기분: {getMoodText(entry.mood)}</p></div></div>      
                  <button onClick={() => moveToTrash(entry)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all" title="휴지통으로 이동">🗑️</button>      
                </div>      
                <div className="space-y-4">      
                  <div><h4 className="font-semibold text-gray-700 mb-2">요약</h4><p className="text-gray-600">{entry.summary}</p></div>      
                  {entry.keywords?.length > 0 && (<div><h4 className="font-semibold text-gray-700 mb-2">키워드</h4><div className="flex flex-wrap gap-2">{entry.keywords.map((keyword, index) => (<span key={index} className={`px-2 py-1 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-full text-xs`}>{keyword}</span>))}</div></div>)}      
                  {entry.selectedEmotions?.length > 0 && (<div><h4 className="font-semibold text-gray-700 mb-2">선택한 감정</h4><div className="flex flex-wrap gap-2">{entry.selectedEmotions.map((emotion, index) => (<span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{emotion}</span>))}</div></div>)}      
                  {entry.musicPlayed?.length > 0 && (<div><h4 className="font-semibold text-gray-700 mb-2">들었던 음악</h4><div className="space-y-2">{entry.musicPlayed.slice(0, 3).map((music, index) => (<div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"><img src={music.thumbnail || '/placeholder-music.png'} alt={music.title} className="w-10 h-10 object-cover rounded"/><div className="flex-1"><p className="text-sm font-medium text-gray-800">{music.title}</p><p className="text-xs text-gray-600">{music.artist}</p></div><a href={music.url} target="_blank" rel="noopener noreferrer" className={`text-xs px-2 py-1 rounded ${music.source === 'spotify' ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}`}>🎧 듣기</a></div>))}</div></div>)}      
                  {entry.actionItems?.length > 0 && (<div><h4 className="font-semibold text-gray-700 mb-2">액션 아이템</h4><div className="space-y-1">{entry.actionItems.map((item, index) => (<div key={index} className="flex items-center space-x-2"><span className="text-green-500">✅</span><span className="text-sm text-gray-600">{item}</span></div>))}</div></div>)}      
                </div>      
              </div>      
            ))}      
          </div>      
        )}      
        <div className="text-center mt-6"><button onClick={() => handleStepChange('mood')} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">🏠 홈으로 돌아가기</button></div>      
      </div>      
    </div>      
  );

  const renderMyMusic = () => (      
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
        <div className="max-w-4xl mx-auto">      
            <div className="text-center mb-8">      
                <h2 className="text-3xl font-bold text-gray-800 mb-2">🎵 내 음악</h2>      
                <p className="text-gray-600">총 {personalMusic.length}곡이 저장되어 있어요</p>      
            </div>      
            {personalMusic.length === 0 ? (<div className="text-center"><div className="text-4xl mb-4">🎶</div><p className="text-lg text-gray-600">아직 저장된 음악이 없어요</p><button onClick={() => handleStepChange('mood')} className={`mt-4 px-6 py-3 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-lg font-semibold hover:opacity-90 transition-all`}>일기 쓰고 음악 추천받기</button></div>) : (      
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">      
                    {personalMusic.map((music) => (      
                        <div key={music.id} className="bg-white rounded-xl shadow-lg p-6">      
                            <div className="flex items-center space-x-4 mb-4">      
                                <img src={music.thumbnail} alt={music.title} className="w-16 h-16 object-cover rounded-lg"/>      
                                <div className="flex-1">      
                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{music.title}</h3>      
                                    <p className="text-gray-600 text-xs">{music.artist}</p>      
                                    {music.playCount && (<p className="text-xs text-purple-500 mt-1">{music.playCount}번 재생</p>)}      
                                </div>      
                            </div>      
                            <div className="space-y-2">      
                                <div className="flex space-x-2">
                                    <a href={music.url} target="_blank" rel="noopener noreferrer" className={`flex-1 block py-2 px-4 ${music.source === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg text-center text-sm transition-all`}>🎧 듣기</a>
                                    <button onClick={() => removeFromPersonalMusic(music.id)} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-all">삭제</button>
                                </div>     
                                {music.preview_url && (<audio controls className="w-full h-10"><source src={music.preview_url} type="audio/mpeg"/>미리듣기 미지원</audio>)}      
                            </div>      
                        </div>      
                    ))}      
                </div>      
            )}      
            <div className="text-center mt-6"><button onClick={() => handleStepChange('mood')} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">🏠 홈으로 돌아가기</button></div>      
        </div>      
    </div>      
  );

  const renderSearch = () => {      
    const searchResults = searchDiaries(searchQuery);      
    return (      
      <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
        <div className="max-w-4xl mx-auto">      
          <div className="text-center mb-8"><h2 className="text-3xl font-bold text-gray-800 mb-2">🔍 일기 검색</h2><p className="text-gray-600">키워드로 지난 기록들을 찾아보세요</p></div>      
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6"><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="검색할 키워드를 입력하세요 (감정, 음악, 내용 등)" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"/></div>      
          {searchQuery.trim() && (      
            <div className="mb-6"><h3 className="text-xl font-bold mb-4 text-gray-800">검색 결과: {searchResults.length}개</h3>{searchResults.length === 0 ? (<div className="text-center bg-white rounded-xl shadow-lg p-8"><div className="text-4xl mb-4">😅</div><p className="text-lg text-gray-600">검색 결과가 없어요</p></div>) : (<div className="space-y-4">{searchResults.map((entry) => (<div key={entry.id} className="bg-white rounded-xl shadow-lg p-6"><div className="flex items-center space-x-3 mb-3"><span className="text-2xl">{getMoodEmoji(entry.mood)}</span><div><h4 className="font-bold text-gray-800">{entry.date} {entry.time}</h4><p className="text-sm text-gray-600">기분: {getMoodText(entry.mood)}</p></div></div><p className="text-gray-700 mb-3">{entry.summary}</p>{entry.selectedEmotions?.length > 0 && (<div className="mb-3"><span className="text-sm font-semibold text-gray-600">감정: </span>{entry.selectedEmotions.slice(0, 3).join(', ')}</div>)}{entry.musicPlayed?.length > 0 && (<div className="mb-3"><span className="text-sm font-semibold text-gray-600">음악: </span>{entry.musicPlayed[0]?.title || 'Unknown Music'}</div>)}{entry.keywords?.length > 0 && (<div className="flex flex-wrap gap-2">{entry.keywords.map((keyword, index) => (<span key={index} className={`px-2 py-1 bg-gradient-to-r ${getCurrentTheme().primary} text-white rounded-full text-xs`}>{keyword}</span>))}</div>)}</div>))}</div>)}</div>      
          )}      
          <div className="text-center"><button onClick={() => handleStepChange('mood')} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">🏠 홈으로 돌아가기</button></div>      
        </div>      
      </div>      
    );      
  };

  const renderTrash = () => (      
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
        <div className="max-w-4xl mx-auto">      
            <div className="text-center mb-8"><h2 className="text-3xl font-bold text-gray-800 mb-2">🗑️ 휴지통</h2><p className="text-gray-600">삭제된 {trashEntries.length}개의 일기가 있어요</p></div>      
            {trashEntries.length === 0 ? (<div className="text-center bg-white rounded-xl shadow-lg p-8"><div className="text-4xl mb-4">🗑️</div><p className="text-lg text-gray-600">휴지통이 비어있어요</p></div>) : (      
                <div className="space-y-4">      
                    {trashEntries.map((entry) => (      
                        <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">      
                            <div className="flex items-center justify-between mb-4">      
                                <div className="flex items-center space-x-3"><span className="text-2xl">{getMoodEmoji(entry.mood)}</span><div><h4 className="font-bold text-gray-800">{entry.date} {entry.time}</h4><p className="text-sm text-gray-600">기분: {getMoodText(entry.mood)}</p>{entry.deletedAt && (<p className="text-xs text-red-500">삭제일: {new Date(entry.deletedAt).toLocaleString('ko-KR')}</p>)}</div></div>      
                                <div className="flex space-x-2"><button onClick={() => restoreFromTrash(entry)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-all">복원</button><button onClick={async () => { if (window.confirm('정말로 영구 삭제하시겠습니까?')) { try { await deleteDoc(doc(db, 'diaries', entry.id)); setTrashEntries(prev => prev.filter(e => e.id !== entry.id)); } catch (error) { console.error('영구 삭제 오류:', error); } } }} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-all">영구삭제</button></div>      
                            </div>      
                            <p className="text-gray-700">{entry.summary.substring(0, 100)}...</p>      
                        </div>      
                    ))}      
                </div>      
            )}      
            <div className="text-center mt-6"><button onClick={() => handleStepChange('mood')} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">🏠 홈으로 돌아가기</button></div>      
        </div>      
    </div>      
  );

  const renderSettings = () => (      
    <div className={`min-h-screen bg-gradient-to-br ${getCurrentTheme().bgClass} p-4`}>      
      <div className="max-w-4xl mx-auto">      
        <div className="text-center mb-8"><h2 className="text-3xl font-bold text-gray-800 mb-2">⚙️ 설정</h2><p className="text-gray-600">앱 설정을 관리합니다.</p></div>      
        <div className="space-y-6">      
          <div className="bg-white rounded-xl shadow-lg p-6">      
            <h3 className="text-xl font-bold mb-4 text-gray-800">알림 설정</h3>      
            <div className="flex items-center justify-between">      
              <span className="text-gray-700">일기 작성 알림</span>      
              <button onClick={() => setAppSettings(prev => ({ ...prev, notifications: !prev.notifications }))} className={`w-12 h-6 rounded-full transition-all ${appSettings.notifications ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full transition-all ${appSettings.notifications ? 'translate-x-6' : 'translate-x-0.5'}`}></div></button>      
            </div>      
          </div>      
          <div className="bg-white rounded-xl shadow-lg p-6">      
            <h3 className="text-xl font-bold mb-4 text-gray-800">데이터 관리</h3>      
            <div className="space-y-3">      
              <div className="flex justify-between items-center"><span className="text-gray-700">총 일기 수</span><span className="font-semibold text-gray-800">{diaryEntries.length}개</span></div>      
              <div className="flex justify-between items-center"><span className="text-gray-700">저장된 음악</span><span className="font-semibold text-gray-800">{personalMusic.length}곡</span></div>      
              <div className="flex justify-between items-center"><span className="text-gray-700">휴지통</span><span className="font-semibold text-gray-800">{trashEntries.length}개</span></div>      
              <button onClick={async () => {      
                  if (window.confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {      
                    if (!user) return;      
                    try {      
                      alert('모든 데이터가 초기화되었습니다.');      
                      loadUserData(user.uid);      
                    } catch (error) {      
                      console.error('데이터 초기화 오류:', error);      
                    }      
                  }      
                }} className="w-full mt-4 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all">모든 데이터 초기화</button>      
            </div>      
          </div>      
        </div>      
        <div className="text-center mt-6"><button onClick={() => handleStepChange('mood')} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">🏠 홈으로 돌아가기</button></div>      
      </div>      
    </div>      
  );

  if (!user) {      
    return renderAuth();      
  }

  switch (currentStep) {      
    case 'onboard-name': return renderOnboardName();    
    case 'onboard-music': return renderOnboardMusic();    
    case 'mood': return renderMoodSelection();      
    case 'chat': return renderChat();      
    case 'summary': return renderSummary();      
    case 'stats': return renderStats();      
    case 'myDiary': return renderMyDiary();      
    case 'myMusic': return renderMyMusic();      
    case 'search': return renderSearch();      
    case 'trash': return renderTrash();      
    case 'settings': return renderSettings();      
    default: return renderMoodSelection();      
  }      
};

export default App;