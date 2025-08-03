import React, { useState, useEffect, memo } from 'react';

// 타입 정의              
interface ChatMessage {              
  role: 'user' | 'assistant';              
  content: string;              
  timestamp: Date;              
  musicRequest?: MusicSearchResult; // 음악 요청 결과 추가
}

interface MusicSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
  isOfficialVideo: boolean;
  relevanceScore?: number;
  searchIndex?: number;
}

interface SunoMusicTask {              
  taskId: string;              
  status: 'pending' | 'processing' | 'completed' | 'failed';              
  prompt: string;              
  style: string;              
  title: string;              
  createdAt: Date;              
  musicUrl?: string;              
  streamUrl?: string;              
  error?: string;              
  youtubeVideoId?: string;  // YouTube 연동용          
  category?: string;         // 감정 카테고리          
  isPublic?: boolean;        // 공개 여부        
}

interface DiaryEntry {              
  id: string;              
  date: string;              
  time: string;              
  mood: 'good' | 'normal' | 'bad';              
  summary: string;              
  llmDiary?: string;         // LLM이 생성한 일기          
  keywords: string[];              
  selectedEmotions: string[];              
  musicTasks: SunoMusicTask[];              
  chatMessages: ChatMessage[];              
  createdAt: Date;              
}

interface SummaryData {              
  summary: string;              
  keywords: string[];              
  recommendedEmotions: string[];              
  actionItems: string[];              
  musicPrompt?: string;              
  musicStyle?: string;              
  musicTitle?: string;              
  llmDiary?: string;          // LLM 일기
  lyrics?: string;            // 생성된 가사
  musicSearchQuery?: string;  // 음악 검색어
  recommendedMusic?: MusicSearchResult; // 추천 음악 결과
}

// 상수 정의              
const APP_THEME = {              
  name: '이플레이 퍼플',              
  primary: 'from-purple-500 to-pink-500',              
  secondary: 'from-purple-100 to-pink-100',              
  accent: 'purple-500',              
  bgClass: 'from-purple-100 to-pink-100'              
};

const AI_NAME = "하모니";

const MUSIC_GENRES = [              
  { id: 'classical', name: '클래식', emoji: '🎼' },              
  { id: 'jazz', name: '재즈', emoji: '🎺' },              
  { id: 'lofi', name: 'Lo-fi', emoji: '🎧' },              
  { id: 'ambient', name: '앰비언트', emoji: '🌌' },              
  { id: 'pop', name: '팝', emoji: '🎤' },              
  { id: 'electronic', name: '일렉트로닉', emoji: '🎛️' },              
  { id: 'acoustic', name: '어쿠스틱', emoji: '🎸' },              
  { id: 'piano', name: '피아노', emoji: '🎹' }              
];

const EMOTION_CATEGORIES = [          
  { id: 'happy', name: '기쁠 때', emoji: '😊' },          
  { id: 'sad', name: '우울할 때', emoji: '😔' },          
  { id: 'anxious', name: '불안할 때', emoji: '😰' },          
  { id: 'angry', name: '화날 때', emoji: '😠' },          
  { id: 'lonely', name: '외로울 때', emoji: '😢' },          
  { id: 'stressed', name: '스트레스 받을 때', emoji: '😫' },          
  { id: 'peaceful', name: '평온할 때', emoji: '😌' },          
  { id: 'love', name: '사랑에 빠졌을 때', emoji: '🥰' },        
  { id: 'healing', name: '힐링이 필요할 때', emoji: '🌸' }          
];

const DIARY_STYLES = [          
  { id: 'poetic', name: '시적인', description: '감성적이고 은유적인 표현' },          
  { id: 'simple', name: '간결한', description: '핵심만 담백하게' },          
  { id: 'detailed', name: '상세한', description: '구체적인 상황 묘사' },          
  { id: 'reflective', name: '성찰적인', description: '깊이 있는 생각과 깨달음' }          
];

const App: React.FC = memo(() => {              
  // 상태 관리              
  const [currentStep, setCurrentStep] = useState<'mood' | 'chat' | 'summary' | 'myDiary' | 'generating' | 'musicLibrary'>('mood');              
  const [currentMood, setCurrentMood] = useState<'good' | 'normal' | 'bad' | null>(null);              
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);              
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);              
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);              
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);              
  const [userMainEmotion, setUserMainEmotion] = useState('');              
  const [currentInput, setCurrentInput] = useState("");              
  const [isLoading, setIsLoading] = useState(false);              
  const [conversationCount, setConversationCount] = useState(0);              
  const [selectedMusicGenres, setSelectedMusicGenres] = useState<string[]>([]);          
  const [selectedDiaryStyle, setSelectedDiaryStyle] = useState<string>('simple');          
  const [editingDiary, setEditingDiary] = useState<string>('');          
  const [isEditingDiary, setIsEditingDiary] = useState(false);          
  const [shareToYoutube, setShareToYoutube] = useState(false);          
  const [selectedCategory, setSelectedCategory] = useState<string>('');          
  const [publicMusicLibrary, setPublicMusicLibrary] = useState<SunoMusicTask[]>([]);        
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  
  // YouTube 음악 검색 관련 상태
  const [pendingMusicRequest, setPendingMusicRequest] = useState<string | null>(null);
  const [showMusicConfirmation, setShowMusicConfirmation] = useState(false);
  const [searchingMusic, setSearchingMusic] = useState(false);

  // localStorage에서 데이터 로드              
  useEffect(() => {              
    const savedEntries = localStorage.getItem('diaryEntries');              
    if (savedEntries) {              
      setDiaryEntries(JSON.parse(savedEntries));              
    }              
                  
    const savedGenres = localStorage.getItem('musicPreferences');              
    if (savedGenres) {              
      setSelectedMusicGenres(JSON.parse(savedGenres));              
    }          
              
    const savedLibrary = localStorage.getItem('publicMusicLibrary');          
    if (savedLibrary) {          
      setPublicMusicLibrary(JSON.parse(savedLibrary));          
    }          
  }, []);

  // 데이터 저장              
  const saveToLocalStorage = (key: string, data: any) => {              
    localStorage.setItem(key, JSON.stringify(data));              
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

  // 개선된 음악 요청 감지 함수 (오탐지 방지)
  const detectMusicRequest = (message: string): string | null => {
    console.log('음악 요청 감지 시작:', message);
    
    // 일반 대화 키워드 (음악 요청이 아닌 경우)
    const generalConversationKeywords = [
      '잘 보냄', '잘보냄', '잘 지냄', '잘지냄', '괜찮', '좋아', '나빠', '힘들어',
      '피곤해', '졸려', '배고파', '심심해', '재미있어', '슬퍼', '기뻐', '화나',
      '스트레스', '걱정', '고민', '생각', '일상', '하루', '오늘', '어제', '내일',
      '학교', '회사', '집', '친구', '가족', '연인', '사랑', '이별', '만남',
      '공부', '시험', '숙제', '과제', '업무', '일', '휴식', '잠', '꿈'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // 일반 대화인 경우 음악 요청이 아님
    const isGeneralConversation = generalConversationKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    if (isGeneralConversation) {
      console.log('일반 대화로 판단, 음악 요청 아님');
      return null;
    }
    
    // 명확한 음악 요청 키워드만 감지
    const explicitMusicKeywords = [
      '들려줘', '틀어줘', '재생해줘', '찾아줘', '플레이해줘',
      '듣고싶어', '듣고 싶어', '들어보고 싶어', '들어보고싶어',
      'play', 'listen', 'find music', 'search music'
    ];
    
    const hasExplicitKeyword = explicitMusicKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    console.log('명확한 음악 키워드 감지:', hasExplicitKeyword);
    
    if (!hasExplicitKeyword) {
      // 아티스트명 + 곡명 패턴도 더 엄격하게 체크
      const strictArtistSongPatterns = [
        /([가-힣a-zA-Z0-9\s]+)의\s*([가-힣a-zA-Z0-9\s]+)를?\s*(들려줘|틀어줘|재생해줘|찾아줘|플레이)/,
        /([가-힣a-zA-Z0-9\s]+)의\s*([가-힣a-zA-Z0-9\s]+)을?\s*(들려줘|틀어줘|재생해줘|찾아줘|플레이)/,
        /([a-zA-Z\s]+)\s+(official|music video|mv)\s*(들려줘|틀어줘|재생해줘|찾아줘|플레이)?/i
      ];
      
      for (const pattern of strictArtistSongPatterns) {
        const match = message.match(pattern);
        if (match && match[1] && match[2]) {
          const artist = match[1].trim();
          const song = match[2].trim();
          console.log('엄격한 아티스트-곡명 패턴 감지:', artist, song);
          return `${artist} ${song}`;
        }
      }
      
      return null;
    }
    
    // 명확한 음악 요청 키워드가 있는 경우에만 처리
    const musicPatterns = [
      // "아티스트의 곡명을/를 들려줘" 패턴
      /([가-힣a-zA-Z0-9\s]+)의\s*([가-힣a-zA-Z0-9\s]+)을?\s*(들려줘|틀어줘|재생해줘|찾아줘)/,
      /([가-힣a-zA-Z0-9\s]+)의\s*([가-힣a-zA-Z0-9\s]+)를?\s*(들려줘|틀어줘|재생해줘|찾아줘)/,
      
      // "곡명 들려줘" 패턴 (더 엄격하게)
      /([가-힣a-zA-Z0-9\s]{2,})\s*(들려줘|틀어줘|재생해줘|찾아줘)/,
      
      // 영어 패턴
      /play\s+([a-zA-Z0-9\s]{3,})/i,
      /listen\s+to\s+([a-zA-Z0-9\s]{3,})/i,
      /find\s+([a-zA-Z0-9\s]{3,})\s*(music|song)/i
    ];
    
    for (const pattern of musicPatterns) {
      const match = message.match(pattern);
      if (match) {
        console.log('음악 패턴 매칭 성공:', pattern, match);
        
        // 아티스트-곡명 패턴인 경우
        if (match[3] && match[1] && match[2]) {
          const artist = match[1].trim();
          const song = match[2].trim();
          console.log('아티스트-곡명 추출:', artist, song);
          return `${artist} ${song}`;
        }
        
        // 단일 곡명 패턴인 경우 (최소 3글자 이상)
        const extracted = match[1] || match[2];
        if (extracted && extracted.trim().length >= 3) {
          const cleanedExtracted = extracted.trim()
            .replace(/^(의|을|를|이|가)\s*/, '')
            .replace(/\s*(의|을|를|이|가)$/, '');
          
          console.log('곡명 추출:', cleanedExtracted);
          return cleanedExtracted;
        }
      }
    }
    
    console.log('음악 요청 감지 실패');
    return null;
  };

  // 개선된 YouTube API 음악 검색 (영어 팝송 우선순위 개선)
  const searchYouTubeMusic = async (query: string): Promise<MusicSearchResult[]> => {
    try {
      console.log('YouTube 음악 검색 시작:', query);
      
      // 영어 아티스트 감지 (팝송 가능성 높음)
      const isEnglishArtist = /^[a-zA-Z\s]+/.test(query.trim());
      console.log('영어 아티스트 감지:', isEnglishArtist);
      
      // 다중 검색 전략 사용 (영어 팝송은 영어 검색 우선)
      let searchQueries: string[];
      
      if (isEnglishArtist) {
        // 영어 아티스트인 경우 영어 검색어 우선
        searchQueries = [
          `${query} official music video`,           // 영어 공식 뮤비 우선
          `${query} music video`,                    // 영어 일반 뮤비
          `${query} official`,                       // 영어 공식 영상
          `${query} live performance`,               // 라이브 공연
          query,                                     // 원본 검색어
          `${query} 공식 뮤비`,                      // 한국어 검색 (후순위)
          `${query} official mv`                     // 한국식 표현 (후순위)
        ];
      } else {
        // 한국어 아티스트인 경우 기존 검색 전략
        searchQueries = [
          `${query} official music video`,           // 공식 뮤비 우선
          `${query} official mv`,                    // 한국식 뮤비 표현
          `${query} music video`,                    // 일반 뮤비
          `${query} official`,                       // 공식 영상
          query                                      // 원본 검색어
        ];
      }
      
      let allResults: MusicSearchResult[] = [];
      
      // 각 검색어로 순차 검색
      for (let i = 0; i < searchQueries.length && allResults.length < 10; i++) {
        const searchQuery = searchQueries[i];
        console.log(`검색 시도 ${i + 1}:`, searchQuery);
        
        try {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet&` +
            `q=${encodeURIComponent(searchQuery)}&` +
            `type=video&` +
            `videoCategoryId=10&` + // 음악 카테고리
            `order=relevance&` +
            `publishedAfter=2020-01-01T00:00:00Z&` + // 2020년 이후
            `maxResults=5&` +
            `key=${process.env.REACT_APP_YOUTUBE_API_KEY}`
          );

          if (!response.ok) {
            console.warn(`검색 ${i + 1} 실패:`, response.status);
            continue;
          }

          const data = await response.json();
          console.log(`검색 ${i + 1} 결과:`, data.items?.length || 0, '개');

          if (data.items && data.items.length > 0) {
            const searchResults = data.items.map((item: any) => {
              const title = item.snippet.title;
              const channelTitle = item.snippet.channelTitle;
              const description = item.snippet.description || '';
              
              // 향상된 공식 뮤비 판별 로직
              const officialKeywords = [
                'official', 'music video', 'mv', 'records', 'entertainment',
                'vevo', 'official video', 'official mv', '공식', '뮤직비디오'
              ];
              
              const isOfficialVideo = 
                officialKeywords.some(keyword => 
                  title.toLowerCase().includes(keyword.toLowerCase()) ||
                  channelTitle.toLowerCase().includes(keyword.toLowerCase()) ||
                  description.toLowerCase().includes(keyword.toLowerCase())
                );

              // 관련성 점수 계산
              const queryWords = query.toLowerCase().split(' ');
              const titleWords = title.toLowerCase().split(' ');
              const relevanceScore = queryWords.reduce((score, word) => {
                return score + (titleWords.some((titleWord: string) => 
                  titleWord.includes(word) || word.includes(titleWord)
                ) ? 1 : 0);
              }, 0);

              return {
                videoId: item.id.videoId,
                title: title,
                channelTitle: channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                publishedAt: item.snippet.publishedAt,
                description: description,
                isOfficialVideo: isOfficialVideo,
                relevanceScore: relevanceScore,
                searchIndex: i // 검색 순서 기록
              };
            });

            // 중복 제거 (같은 videoId)
            const newResults = searchResults.filter((newResult: MusicSearchResult) => 
              !allResults.some((existingResult: MusicSearchResult) => existingResult.videoId === newResult.videoId)
            );

            allResults.push(...newResults);
          }
        } catch (searchError) {
          console.warn(`검색 ${i + 1} 오류:`, searchError);
          continue;
        }
      }

      console.log('전체 검색 결과:', allResults.length, '개');

      if (allResults.length === 0) {
        return [];
      }

      // 결과 정렬 및 필터링
      const sortedResults = allResults
        .sort((a, b) => {
          // 1순위: 공식 뮤비 여부
          if (a.isOfficialVideo && !b.isOfficialVideo) return -1;
          if (!a.isOfficialVideo && b.isOfficialVideo) return 1;
          
          // 2순위: 관련성 점수
          if ((a.relevanceScore || 0) !== (b.relevanceScore || 0)) {
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
          }
          
          // 3순위: 검색 순서 (공식 검색어 우선)
          if ((a.searchIndex || 0) !== (b.searchIndex || 0)) {
            return (a.searchIndex || 0) - (b.searchIndex || 0);
          }
          
          // 4순위: 최신순
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        })
        .slice(0, 5); // 상위 5개만 반환

      console.log('최종 정렬된 결과:', sortedResults.map(r => ({
        title: r.title,
        isOfficial: r.isOfficialVideo,
        relevance: r.relevanceScore
      })));

      return sortedResults;
    } catch (error) {
      console.error('YouTube 검색 오류:', error);
      return [];
    }
  };

  // OpenAI API 직접 호출            
  const callOpenAI = async (messages: any[], systemPrompt: string) => {              
    try {              
      const response = await fetch('https://api.openai.com/v1/chat/completions', {              
        method: 'POST',              
        headers: {              
          'Content-Type': 'application/json',              
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY || ''}`            
        },              
        body: JSON.stringify({              
          model: 'gpt-3.5-turbo',              
          messages: [            
            { role: 'system', content: systemPrompt },            
            ...messages            
          ],              
          max_tokens: 500,              
          temperature: 0.7              
        })              
      });

      if (!response.ok) {              
        throw new Error(`OpenAI API 오류: ${response.status}`);              
      }

      const data = await response.json();              
      return data.choices[0].message.content || '';              
    } catch (error) {              
      console.error('OpenAI 호출 에러:', error);              
      // 개발 모드 fallback          
      if (!process.env.REACT_APP_OPENAI_API_KEY) {          
        return '안녕하세요! 오늘 하루는 어떠셨나요? 💜';          
      }          
      throw error;              
    }              
  };

  // LLM 일기 생성 함수 (100줄로 단축)          
  const generateDiaryWithLLM = async (          
    summaryData: SummaryData,           
    chatMessages: ChatMessage[],           
    mood: string,          
    style: string          
  ) => {          
    const chatContent = chatMessages          
      .filter(msg => msg.role === 'user')          
      .map(msg => msg.content)          
      .join('\n');          
              
    const styleGuides = {          
      poetic: '은유와 비유를 사용하여 시적으로 표현하세요. 감정을 자연현상이나 이미지로 묘사하세요.',          
      simple: '간결하고 담백하게 핵심만 전달하세요. 짧은 문장을 사용하세요.',          
      detailed: '구체적인 상황과 세부사항을 포함하여 상세히 묘사하세요.',          
      reflective: '오늘의 경험을 통해 얻은 깨달음과 성찰을 중심으로 작성하세요.'          
    };          
              
    const systemPrompt = `당신은 사용자의 하루를 아름답게 기록하는 일기 작가입니다.          
              
다음 정보를 바탕으로 감성적인 일기를 작성해주세요:          
- 오늘의 대화 내용: ${chatContent}          
- 감정 상태: ${getMoodText(mood)}          
- 핵심 키워드: ${summaryData.keywords.join(', ')}          
- 추천 감정: ${summaryData.recommendedEmotions.join(', ')}

일기 작성 규칙:          
- 1인칭 시점으로 작성          
- 100자 분량 (기존 200-300자에서 단축)          
- 스타일: ${styleGuides[style as keyof typeof styleGuides]}          
- 실제 있었던 일만 포함하고 과장하지 말 것          
- 희망적이고 따뜻한 마무리          
- 자연스러운 한국어 표현 사용

일기를 작성해주세요:`;

    try {          
      const diary = await callOpenAI([], systemPrompt);          
      return diary;          
    } catch (error) {          
      console.error('일기 생성 오류:', error);          
      return '오늘 하루도 수고했어요. 내일은 더 좋은 날이 될 거예요.';          
    }          
  };

  // AI 응답 생성 (음악 요청 감지 및 사용자 피드백 인정 포함)              
  const getAIResponse = async (userMessage: string, conversationHistory: ChatMessage[]) => {              
    const conversationNum = conversationCount + 1;              
    setConversationCount(conversationNum);

    // 사용자 피드백 인정 (공식 뮤비가 아니라는 지적)
    const feedbackKeywords = [
      '공식 뮤비가 아니', '공식뮤비가 아니', '공식이 아니', '공식 영상이 아니',
      '이건 공식이 아니', '공식 아니', '공식 영상 아니', '공식 뮤비 아니',
      '틀렸', '잘못', '아니야', '맞지 않', '다른 곡', '엉뚱한'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    const isFeedback = feedbackKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    if (isFeedback) {
      return `맞아요! 죄송해요. 🙏 제가 잘못 찾았네요. 다시 정확한 곡명이나 아티스트명을 알려주시면 더 정확하게 찾아드릴게요! 💜`;
    }

    // 음악 요청 감지 및 바로 검색
    const musicRequest = detectMusicRequest(userMessage);
    if (musicRequest) {
      try {
        setSearchingMusic(true);
        const searchResults = await searchYouTubeMusic(musicRequest);
        
        if (searchResults.length > 0) {
          const bestResult = searchResults[0];
          
          const musicMessage: ChatMessage = {
            role: 'assistant',
            content: `🎵 "${musicRequest}"를 찾았어요! 재생해드릴게요.`,
            timestamp: new Date(),
            musicRequest: bestResult
          };
          
          setChatMessages(prev => [...prev, musicMessage]);
          return `🎵 "${musicRequest}"를 찾았어요! 재생해드릴게요.`;
        } else {
          return `죄송해요. "${musicRequest}"를 찾지 못했어요. 다른 곡명이나 아티스트명으로 다시 시도해보세요! 🎵`;
        }
      } catch (error) {
        console.error('음악 검색 오류:', error);
        return `죄송해요. 음악 검색 중 문제가 발생했어요. 다시 시도해주세요! 🎵`;
      } finally {
        setSearchingMusic(false);
      }
    }

    const userGenres = selectedMusicGenres.map(genreId => {              
      const genre = MUSIC_GENRES.find(g => g.id === genreId);              
      return genre ? genre.name : genreId;              
    }).join(', ');

    const systemPrompt = `당신은 ${AI_NAME}입니다. 사용자의 감정에 공감하는 따뜻한 AI 친구입니다.

현재 대화 상황:              
- 대화 횟수: ${conversationNum}번째              
- 사용자 감정 상태: ${currentMood ? getMoodText(currentMood) : '선택 안함'}              
- 사용자 선호 장르: ${userGenres || '없음'}

대화 규칙:              
1. 첫 번째 대화: 친근하게 인사하고 오늘 하루에 대해 묻기              
2. 두 번째 대화: 사용자 이야기에 공감하고 추가 질문하기              
3. 세 번째 대화부터: 대화 내용을 바탕으로 감정을 파악하고 위로하기

응답 스타일:              
- 친근하고 공감적인 톤 (존댓말 사용)              
- 간결하고 자연스러운 응답 (1-2문장)              
- 답변 시작이나 중간에 귀여운 이모지 하나씩 추가
- 음악 검색 결과에 대해서는 "공식 뮤비"라는 표현을 사용하지 말 것`;

    const messages = [...conversationHistory.slice(-5), { role: 'user', content: userMessage }];              
    const aiResponse = await callOpenAI(messages, systemPrompt);

    return aiResponse;              
  };

  // 음악 검색 확인 처리
  const handleMusicConfirmation = async (confirmed: boolean) => {
    setShowMusicConfirmation(false);
    
    if (confirmed && pendingMusicRequest) {
      setSearchingMusic(true);
      
      try {
        const searchResults = await searchYouTubeMusic(pendingMusicRequest);
        
        if (searchResults.length > 0) {
          const bestResult = searchResults[0]; // 가장 관련성 높은 결과
          
          const musicMessage: ChatMessage = {
            role: 'assistant',
            content: `🎵 "${pendingMusicRequest}"를 찾았어요! 재생해드릴게요.`,
            timestamp: new Date(),
            musicRequest: bestResult
          };
          
          setChatMessages(prev => [...prev, musicMessage]);
        } else {
          const noResultMessage: ChatMessage = {
            role: 'assistant',
            content: `😅 죄송해요. "${pendingMusicRequest}"를 찾지 못했어요. 다른 검색어로 시도해보시겠어요?`,
            timestamp: new Date()
          };
          
          setChatMessages(prev => [...prev, noResultMessage]);
        }
      } catch (error) {
        console.error('음악 검색 오류:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: '음악 검색 중 오류가 발생했어요. 다시 시도해주세요. 💜',
          timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, errorMessage]);
      } finally {
        setSearchingMusic(false);
      }
    } else {
      const cancelMessage: ChatMessage = {
        role: 'assistant',
        content: '알겠어요! 다른 이야기를 나눠볼까요? 😊',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, cancelMessage]);
    }
    
    setPendingMusicRequest(null);
  };

  // 대화 요약 및 음악 프롬프트 생성 (가사 생성 제거)             
  const generateConversationSummary = async (messages: ChatMessage[]): Promise<SummaryData> => {              
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content).join('\n');

    // 무의미한 대화나 내용이 없어도 기본값 반환      
    if (!userMessages.trim()) {              
      return {              
        summary: '오늘도 감정을 나누며 이야기를 해봤어요.',              
        keywords: ['#감정나눔', '#하루일상'],              
        recommendedEmotions: ['평온', '만족'],              
        actionItems: ['오늘의 감정을 일기장에 기록하기', '잠들기 전 10분간 명상하기'],              
        musicPrompt: 'A peaceful and calming meditation music with soft ambient sounds',              
        musicStyle: 'Ambient Meditation',              
        musicTitle: 'Peaceful Mind Journey'        
      };              
    }

    const systemPrompt = `다음 대화 내용을 분석해서 감정 일기와 음악 생성을 위한 정보를 추출해주세요:

대화 내용:              
${userMessages}

현재 감정 상태: ${currentMood ? getMoodText(currentMood) : '선택 안함'}              
선호 장르: ${selectedMusicGenres.join(', ')}

분석 요청:              
1. 대화 내용을 바탕으로 "오늘은"으로 시작하여 오늘 있었던 일을 2-4줄로 요약 (~해요 체 사용)              
2. 대화에서 느껴진 감정 키워드 5개 추출              
3. AI가 분석한 세부 감정 5개 추천              
4. 실행 가능한 액션 아이템 2개 제안              
5. YouTube 음악 검색을 위한 한국어 검색어 생성 (감정과 상황을 반영한 구체적인 설명)              
6. 음악 스타일 추천 (사용자 선호 장르 고려)              
7. 음악 제목 추천 (한국어)
8. 대화 내용을 바탕으로 감정을 담은 가사 4줄 생성 (한국어)

응답 형식:              
요약: 오늘은 [요약 내용]해요.              
감정키워드: #키워드1, #키워드2, #키워드3, #키워드4, #키워드5              
추천감정: 감정1, 감정2, 감정3, 감정4, 감정5              
액션아이템: 아이템1 | 아이템2              
음악검색어: [한국어로 작성된 구체적인 음악 검색어]              
음악스타일: [한국어 스타일명]              
음악제목: [한국어 제목]
가사: [4줄의 감정적인 가사]`;

    try {              
      const result = await callOpenAI([], systemPrompt);              
      const lines = result.split('\n');              
                    
      let summary = '', keywords: string[] = [], recommendedEmotions: string[] = [],               
          actionItems: string[] = [], musicPrompt = '', musicStyle = '', musicTitle = '',
          lyrics = '', musicSearchQuery = '';              
                    
      lines.forEach((line: string) => {              
        if (line.startsWith('요약:')) summary = line.replace('요약:', '').trim();              
        else if (line.startsWith('감정키워드:')) keywords = line.replace('감정키워드:', '').trim().split(',').map((k: string) => k.trim());              
        else if (line.startsWith('추천감정:')) recommendedEmotions = line.replace('추천감정:', '').trim().split(',').map((e: string) => e.trim());              
        else if (line.startsWith('액션아이템:')) actionItems = line.replace('액션아이템:', '').trim().split('|').map((a: string) => a.trim());              
        else if (line.startsWith('음악검색어:')) musicSearchQuery = line.replace('음악검색어:', '').trim();              
        else if (line.startsWith('음악스타일:')) musicStyle = line.replace('음악스타일:', '').trim();              
        else if (line.startsWith('음악제목:')) musicTitle = line.replace('음악제목:', '').trim();
        else if (line.startsWith('가사:')) lyrics = line.replace('가사:', '').trim();              
      });

      // 기본값 보장      
      if (!summary) summary = '오늘은 일상을 나누었어요.';      
      if (keywords.length === 0) keywords = ['#일상', '#감정'];      
      if (recommendedEmotions.length === 0) recommendedEmotions = ['평온', '만족'];      
      if (actionItems.length === 0) actionItems = ['오늘을 돌아보기', '내일을 준비하기'];

      // 음악 검색 실행
      let recommendedMusic: MusicSearchResult | undefined;
      if (musicSearchQuery) {
        try {
          const searchResults = await searchYouTubeMusic(musicSearchQuery);
          if (searchResults.length > 0) {
            recommendedMusic = searchResults[0]; // 가장 관련성 높은 결과
          }
        } catch (error) {
          console.error('추천 음악 검색 오류:', error);
        }
      }

      return {              
        summary: summary,              
        keywords: keywords.slice(0, 5),              
        recommendedEmotions: recommendedEmotions.slice(0, 5),              
        actionItems: actionItems.slice(0, 2),              
        musicPrompt: musicPrompt || 'A calming and peaceful ambient music',              
        musicStyle: musicStyle || 'Ambient',              
        musicTitle: musicTitle || 'Emotional Journey',
        lyrics: lyrics || '감정을 담은 가사를 생성하지 못했어요.',
        musicSearchQuery: musicSearchQuery,
        recommendedMusic: recommendedMusic
      };              
    } catch (error) {              
      console.error('대화 요약 생성 오류:', error);              
      return {              
        summary: '오늘은 대화 요약 생성 중 문제가 발생했어요.',              
        keywords: ['#감정나눔', '#하루일상'],              
        recommendedEmotions: ['평온', '만족'],              
        actionItems: ['오늘의 대화 내용 되새기기', '마음의 여유 갖기'],              
        musicPrompt: 'A peaceful ambient music for relaxation',              
        musicStyle: 'Ambient',              
        musicTitle: 'Calm Moments',
        lyrics: '오늘 하루도 수고했어요\n내일은 더 좋은 날이 될 거예요\n마음의 평안을 찾아가요\n따뜻한 위로를 전해드려요'
      };              
    }              
  };

  // 기분 선택 핸들러              
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

  // 메시지 전송 핸들러              
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
      const aiResponse = await getAIResponse(currentInput, chatMessages);              
      const aiMessage: ChatMessage = {              
        role: 'assistant',              
        content: aiResponse,              
        timestamp: new Date()              
      };              
      setChatMessages(prev => [...prev, aiMessage]);              
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

  // 요약 생성 핸들러 (LLM 일기 생성 포함)             
  const handleGenerateSummary = async () => {              
    if (!currentMood || chatMessages.length === 0) return;              
    setIsLoading(true);              
    setIsGeneratingMusic(true);      
                  
    try {              
      const summary = await generateConversationSummary(chatMessages);          
                
      // LLM 일기 생성          
      const llmDiary = await generateDiaryWithLLM(          
        summary,          
        chatMessages,          
        currentMood,          
        selectedDiaryStyle          
      );          
                
      setSummaryData({          
        ...summary,          
        llmDiary          
      });          
      setEditingDiary(llmDiary);          
      setSelectedEmotions([]);              
      setCurrentStep('summary');              
    } catch (error) {              
      console.error('요약 생성 오류:', error);              
      alert('요약 생성 중 문제가 발생했습니다.');              
    } finally {              
      setIsLoading(false);              
      setIsGeneratingMusic(false);      
    }              
  };

  // 감정 선택 핸들러              
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

  // 일기 재생성 핸들러          
  const handleRegenerateDiary = async () => {          
    if (!summaryData || !currentMood) return;          
              
    setIsLoading(true);          
    try {          
      const newDiary = await generateDiaryWithLLM(          
        summaryData,          
        chatMessages,          
        currentMood,          
        selectedDiaryStyle          
      );          
      setEditingDiary(newDiary);          
      setSummaryData({          
        ...summaryData,          
        llmDiary: newDiary          
      });          
    } catch (error) {          
      console.error('일기 재생성 오류:', error);          
      alert('일기 재생성 중 문제가 발생했습니다.');          
    } finally {          
      setIsLoading(false);          
    }          
  };

  // YouTube 음악 컴포넌트
  const MusicPlayer: React.FC<{ musicData: MusicSearchResult }> = ({ musicData }) => (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200 mt-3">
      <div className="flex items-start space-x-4">
        <img 
          src={musicData.thumbnail} 
          alt={musicData.title}
          className="w-24 h-18 rounded-lg object-cover"
        />
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 text-sm mb-1">
            {musicData.title}
          </h4>
          <p className="text-gray-600 text-xs mb-2">
            {musicData.channelTitle}
          </p>
          <p className="text-gray-500 text-xs">
            {new Date(musicData.publishedAt).getFullYear()}년
          </p>
        </div>
      </div>
      
      <div className="mt-3">
        <iframe
          width="100%"
          height="200"
          src={`https://www.youtube.com/embed/${musicData.videoId}?autoplay=0&rel=0`}
          title={`YouTube video: ${musicData.title}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        />
      </div>
      
      <div className="mt-2 flex justify-between items-center">
        <a 
          href={`https://www.youtube.com/watch?v=${musicData.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-800 text-sm"
        >
          🔗 YouTube에서 보기
        </a>
        <span className="text-gray-400 text-xs">
          {formatTime(new Date())}
        </span>
      </div>
    </div>
  );

  // 기분 선택 화면              
  const renderMoodSelection = () => (              
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>              
      <div className="max-w-4xl mx-auto">              
        <div className="text-center mb-8">              
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI 감정 음악 일기</h1>              
          <p className="text-gray-600">{AI_NAME}가 당신의 감정을 읽고 맞춤 음악을 찾아드려요</p>              
        </div>              
                      
        <div className="text-center mb-8">              
          <h2 className="text-3xl font-bold text-gray-800 mb-2">오늘 기분은 어떠세요?</h2>              
          <p className="text-gray-600">AI가 당신과 대화하며 음악을 추천해드릴게요</p>              
        </div>              
                      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">              
          <div className="flex flex-col items-center">              
            <button               
              onClick={() => handleMoodSelect('good')}               
              className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg"              
            >              
              <div className="w-24 h-24 rounded-3xl bg-orange-400 flex items-center justify-center shadow-lg">              
                <div className="text-4xl">😊</div>              
              </div>              
            </button>              
            <span className="text-lg font-semibold text-gray-700">좋아!</span>              
          </div>              
                        
          <div className="flex flex-col items-center">              
            <button               
              onClick={() => handleMoodSelect('normal')}               
              className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg"              
            >              
              <div className="w-24 h-24 rounded-full bg-blue-300 flex items-center justify-center shadow-lg">              
                <div className="text-4xl">😮‍💨</div>              
              </div>              
            </button>              
            <span className="text-lg font-semibold text-gray-700">그냥 뭐..</span>              
          </div>              
                        
          <div className="flex flex-col items-center">              
            <button               
              onClick={() => handleMoodSelect('bad')}               
              className="mb-4 transform hover:scale-110 transition-all duration-300 hover:drop-shadow-lg"              
            >              
              <div className="w-24 h-24 rounded-full bg-purple-300 flex items-center justify-center shadow-lg">              
                <div className="text-4xl">😔</div>              
              </div>              
            </button>              
            <span className="text-lg font-semibold text-gray-700">별루야..</span>              
          </div>              
        </div>              
                      
        <div className="flex justify-center space-x-4">              
          <button               
            onClick={() => setCurrentStep('myDiary')}               
            className="px-6 py-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"              
          >              
            <span className="text-lg">📖</span>              
            <span className="ml-2">내 일기</span>              
            <span className="ml-1 text-sm text-gray-500">({diaryEntries.length})</span>              
          </button>          
          <button               
            onClick={() => setCurrentStep('musicLibrary')}               
            className="px-6 py-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"              
          >              
            <span className="text-lg">🎵</span>              
            <span className="ml-2">음악 라이브러리</span>              
            <span className="ml-1 text-sm text-gray-500">({publicMusicLibrary.length})</span>              
          </button>              
        </div>              
      </div>              
    </div>              
  );

  // 채팅 화면 (음악 검색 기능 포함)              
  const renderChat = () => (              
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>              
      <div className="max-w-4xl mx-auto">              
        <div className={`bg-gradient-to-r ${APP_THEME.secondary} rounded-lg shadow-lg p-6 mb-6 border border-purple-200`}>              
          <div className="flex items-center justify-between mb-4">              
            <h2 className={`text-xl font-bold text-purple-800`}>{AI_NAME}와 대화하기</h2>              
            <div className="flex items-center space-x-2">              
              <span className={`text-sm text-purple-600`}>현재 기분:</span>              
              <span className={`px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm`}>              
                {getMoodEmoji(currentMood || 'normal')} {getMoodText(currentMood || 'normal')}              
              </span>              
            </div>              
          </div>              
                        
          <div className={`h-96 overflow-y-auto mb-4 p-4 bg-gradient-to-br from-white to-purple-50 rounded-lg border border-purple-100`}>              
            {chatMessages.map((message, index) => (              
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>              
                <div className={`inline-block p-3 rounded-lg max-w-xs ${              
                  message.role === 'user'               
                    ? `bg-gradient-to-r ${APP_THEME.primary} text-white`               
                    : `bg-white text-purple-800 border border-purple-200`              
                }`}>              
                  {message.role === 'assistant' && (              
                    <div className={`font-semibold mb-1 text-purple-600`}>{AI_NAME}:</div>              
                  )}              
                  {message.content}
                </div>
                
                {/* 음악 플레이어 표시 */}
                {message.musicRequest && (
                  <div className="mt-2">
                    <MusicPlayer musicData={message.musicRequest} />
                  </div>
                )}
              </div>              
            ))}              
            {isLoading && (              
              <div className="text-left">              
                <div className={`inline-block p-3 rounded-lg bg-white text-purple-800 border border-purple-200`}>              
                  <div className={`font-semibold mb-1 text-purple-600`}>{AI_NAME}:</div>              
                  답변을 준비하고 있어요... 💜              
                </div>              
              </div>              
            )}
            {searchingMusic && (
              <div className="text-left">
                <div className={`inline-block p-3 rounded-lg bg-white text-purple-800 border border-purple-200`}>
                  <div className={`font-semibold mb-1 text-purple-600`}>{AI_NAME}:</div>
                  🎵 음악을 검색하고 있어요...
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
              className={`flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white`}               
              disabled={isLoading}               
            />              
            <button               
              onClick={handleSendMessage}               
              disabled={isLoading}               
              className={`px-6 py-2 bg-gradient-to-r ${APP_THEME.primary} text-white rounded-lg hover:opacity-90 disabled:opacity-50`}              
            >              
              전송              
            </button>              
          </div>
        </div>
        
        <div className="flex space-x-4">              
          <button               
            onClick={handleGenerateSummary}               
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90"               
            disabled={chatMessages.length <= 1 || isGeneratingMusic}              
          >              
            {isGeneratingMusic ? '🎵 잠시만 기다려주세요. 준비 중입니다...' : '📝 AI 일기 생성하기'}              
          </button>              
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

  // 요약 화면 (제목/아티스트 표시 제거)          
  const renderSummary = () => (              
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>              
      <div className="max-w-4xl mx-auto">              
        <div className="text-center mb-8">              
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📝 오늘의 감정 분석</h2>              
          <p className="text-gray-600">AI가 분석한 내용을 확인하고 일기를 저장해보세요</p>              
        </div>              
                      
        {summaryData && (              
          <div className="space-y-6">              
            <div className="bg-white rounded-xl shadow-lg p-6">              
              <h3 className="text-xl font-bold mb-4 text-gray-800">📖 오늘의 이야기</h3>              
              <p className="text-gray-700 leading-relaxed">{summaryData.summary}</p>              
            </div>          
                      
            {/* LLM 일기 섹션 */}          
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-orange-200">          
              <div className="flex items-center justify-between mb-4">          
                <h3 className="text-xl font-bold text-gray-800">✨ AI가 써준 일기</h3>          
                <div className="flex items-center space-x-2">          
                  <select          
                    value={selectedDiaryStyle}          
                    onChange={(e) => setSelectedDiaryStyle(e.target.value)}          
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"          
                  >          
                    {DIARY_STYLES.map(style => (          
                      <option key={style.id} value={style.id}>{style.name}</option>          
                    ))}          
                  </select>          
                  <button          
                    onClick={handleRegenerateDiary}          
                    disabled={isLoading}          
                    className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"          
                  >          
                    다시 생성          
                  </button>          
                </div>          
              </div>          
                        
              {isEditingDiary ? (          
                <textarea          
                  value={editingDiary}          
                  onChange={(e) => setEditingDiary(e.target.value)}          
                  className="w-full h-32 p-3 border-2 border-orange-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"          
                  placeholder="일기를 수정해보세요..."          
                />          
              ) : (          
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">          
                  {editingDiary || summaryData.llmDiary}          
                </p>          
              )}          
                        
              <div className="flex justify-end mt-3">          
                <button          
                  onClick={() => setIsEditingDiary(!isEditingDiary)}          
                  className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"          
                >          
                  {isEditingDiary ? '완료' : '수정'}          
                </button>          
              </div>          
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">              
              <h3 className="text-xl font-bold mb-4 text-gray-800">🏷️ 감정 키워드</h3>              
              <div className="flex flex-wrap gap-2">              
                {summaryData.keywords.map((keyword, index) => (              
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">              
                    {keyword}              
                  </span>              
                ))}              
              </div>              
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">              
              <h3 className="text-xl font-bold mb-4 text-gray-800">🧠 AI가 대화를 하면서 감지된 나의 감정</h3>              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">              
                {summaryData.recommendedEmotions.map((emotion, index) => (              
                  <button               
                    key={index}               
                    onClick={() => handleEmotionSelect(emotion)}               
                    className={`p-3 rounded-lg border-2 transition-all ${              
                      selectedEmotions.includes(emotion)               
                        ? 'border-purple-500 bg-purple-100 text-purple-800'               
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-purple-300'              
                    }`}              
                  >              
                    {emotion}              
                  </button>              
                ))}              
              </div>              
              <p className="text-sm text-gray-500 mt-2">최대 2개까지 선택 가능</p>              
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">              
              <h3 className="text-xl font-bold mb-4 text-gray-800">✅ 추천 액션</h3>              
              <ul className="space-y-2">              
                {summaryData.actionItems.map((item, index) => (              
                  <li key={index} className="flex items-center text-gray-700">              
                    <span className="text-green-500 mr-2">✓</span>              
                    {item}              
                  </li>              
                ))}              
              </ul>              
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">              
              <h3 className="text-xl font-bold mb-4 text-gray-800">🎯 추가 감정 입력</h3>              
              <input               
                type="text"               
                value={userMainEmotion}               
                onChange={(e) => setUserMainEmotion(e.target.value)}               
                placeholder="오늘의 주요 감정을 직접 입력해주세요"               
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"              
              />              
            </div>

            {/* AI 추천음악 섹션 */}
            {summaryData.recommendedMusic && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800">🎵 AI가 대화 속에서 감지된 추천음악</h3>
                <MusicPlayer musicData={summaryData.recommendedMusic} />
              </div>
            )}

            {/* 생성된 가사 섹션 */}
            {summaryData.lyrics && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-pink-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800">🎤 대화를 통해서 생성한 가사</h3>
                <div className="bg-white p-4 rounded-lg border border-pink-200">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line text-center italic">
                    {summaryData.lyrics}
                  </p>
                </div>
              </div>
            )}
              
            {/* 나의 음악 라이브러리 설정 섹션 */}          
            <div className="bg-white rounded-xl shadow-lg p-6">          
              <h3 className="text-xl font-bold mb-4 text-gray-800">📚 나의 음악 라이브러리에 담기</h3>          
              <div className="space-y-4">          
                <div className="flex items-center space-x-3">          
                  <input          
                    type="checkbox"          
                    id="shareToYoutube"          
                    checked={shareToYoutube}          
                    onChange={(e) => setShareToYoutube(e.target.checked)}          
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"          
                  />          
                  <label htmlFor="shareToYoutube" className="text-gray-700">          
                    나의 음악 라이브러리에 저장하기          
                  </label>          
                </div>          
                          
                {shareToYoutube && (          
                  <div>          
                    <label className="block text-sm font-medium text-gray-700 mb-2">          
                      카테고리 선택          
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {EMOTION_CATEGORIES.map(category => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-3 rounded-lg border-2 transition-all text-sm ${
                            selectedCategory === category.id
                              ? 'border-purple-500 bg-purple-100 text-purple-800'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-purple-300'
                          }`}
                        >
                          {category.emoji} {category.name}
                        </button>
                      ))}
                    </div>
                  </div>          
                )}          
              </div>          
            </div>

            <div className="flex space-x-4">              
              <button               
                onClick={() => {
                  // 간단한 일기 저장 (음악 생성 없이)
                  const now = new Date();
                  const allEmotions: string[] = [];
                  
                  if (userMainEmotion.trim()) {
                    allEmotions.push(userMainEmotion.trim());
                  }
                  allEmotions.push(...selectedEmotions);

                  const newEntry: DiaryEntry = {
                    id: Date.now().toString(),
                    date: formatDate(now),
                    time: formatTime(now),
                    mood: currentMood!,
                    summary: summaryData.summary || "내용 없음",
                    llmDiary: isEditingDiary ? editingDiary : summaryData.llmDiary,
                    keywords: summaryData.keywords || [],
                    selectedEmotions: allEmotions,
                    musicTasks: [],
                    chatMessages: chatMessages,
                    createdAt: now
                  };

                  const updatedEntries = [newEntry, ...diaryEntries];
                  setDiaryEntries(updatedEntries);
                  saveToLocalStorage('diaryEntries', updatedEntries);

                  // 초기화
                  setChatMessages([]);
                  setCurrentMood(null);
                  setSummaryData(null);
                  setSelectedEmotions([]);
                  setUserMainEmotion('');
                  setConversationCount(0);
                  setEditingDiary('');
                  setIsEditingDiary(false);
                  setShareToYoutube(false);
                  setSelectedCategory('');
                  setCurrentStep('mood');

                  alert('일기가 성공적으로 저장되었습니다!');
                }}               
                className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold text-lg hover:opacity-90"              
              >              
                📝 일기 저장하기              
              </button>              
              <button               
                onClick={() => setCurrentStep('chat')}               
                className="px-6 py-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"              
              >              
                ← 뒤로              
              </button>              
            </div>              
          </div>              
        )}              
      </div>              
    </div>              
  );

  // 내 일기 화면              
  const renderMyDiary = () => (              
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>              
      <div className="max-w-4xl mx-auto">              
        <div className="flex items-center justify-between mb-8">              
          <h2 className="text-3xl font-bold text-gray-800">📖 내 일기</h2>              
          <button               
            onClick={() => setCurrentStep('mood')}               
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"              
          >              
            🏠 홈으로              
          </button>              
        </div>              
                      
        {diaryEntries.length === 0 ? (              
          <div className="text-center py-12">              
            <div className="text-6xl mb-4">📝</div>              
            <h3 className="text-xl font-bold text-gray-600 mb-2">아직 작성된 일기가 없어요</h3>              
            <p className="text-gray-500">첫 번째 감정 일기를 작성해보세요!</p>              
          </div>              
        ) : (              
          <div className="space-y-6">              
            {diaryEntries.map((entry) => (              
              <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">              
                <div className="flex items-center justify-between mb-4">              
                  <div className="flex items-center space-x-3">              
                    <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>              
                    <div>              
                      <h3 className="font-bold text-gray-800">{entry.date}</h3>              
                      <p className="text-sm text-gray-500">{entry.time}</p>              
                    </div>              
                  </div>              
                  <span className={`px-3 py-1 rounded-full text-sm ${              
                    entry.mood === 'good' ? 'bg-green-100 text-green-800' :              
                    entry.mood === 'normal' ? 'bg-blue-100 text-blue-800' :              
                    'bg-purple-100 text-purple-800'              
                  }`}>              
                    {getMoodText(entry.mood)}              
                  </span>              
                </div>              
                              
                <div className="mb-4">              
                  <h4 className="font-semibold text-gray-700 mb-2">📖 오늘의 이야기</h4>              
                  <p className="text-gray-600">{entry.summary}</p>              
                </div>          
                          
                {entry.llmDiary && (          
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">          
                    <h4 className="font-semibold text-gray-700 mb-2">✨ AI 일기</h4>          
                    <p className="text-gray-600 whitespace-pre-wrap">{entry.llmDiary}</p>          
                  </div>          
                )}

                <div className="mb-4">              
                  <h4 className="font-semibold text-gray-700 mb-2">🏷️ 키워드</h4>              
                  <div className="flex flex-wrap gap-2">              
                    {entry.keywords.map((keyword, index) => (              
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">              
                        {keyword}              
                      </span>              
                    ))}              
                  </div>              
                </div>

                <div className="mb-4">              
                  <h4 className="font-semibold text-gray-700 mb-2">💭 선택한 감정</h4>              
                  <div className="flex flex-wrap gap-2">              
                    {entry.selectedEmotions.map((emotion, index) => (              
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">              
                        {emotion}              
                      </span>              
                    ))}              
                  </div>              
                </div>

                {/* 대화에서 찾은 음악들 표시 */}
                {entry.chatMessages.some(msg => msg.musicRequest) && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">🎵 대화 중 찾은 음악</h4>
                    <div className="space-y-3">
                      {entry.chatMessages
                        .filter(msg => msg.musicRequest)
                        .map((msg, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <MusicPlayer musicData={msg.musicRequest!} />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>              
            ))}              
          </div>              
        )}              
      </div>              
    </div>              
  );

  // 음악 라이브러리 화면          
  const renderMusicLibrary = () => {          
    const filteredMusic = selectedCategoryFilter === 'all'           
      ? publicMusicLibrary          
      : publicMusicLibrary.filter(music => music.category === selectedCategoryFilter);          
              
    return (          
      <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>          
        <div className="max-w-4xl mx-auto">          
          <div className="flex items-center justify-between mb-8">          
            <h2 className="text-3xl font-bold text-gray-800">🎵 음악 라이브러리</h2>          
            <button           
              onClick={() => setCurrentStep('mood')}           
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"          
            >          
              🏠 홈으로          
            </button>          
          </div>          
                    
          {/* 카테고리 필터 */}          
          <div className="mb-6">          
            <div className="flex flex-wrap gap-2">          
              <button          
                onClick={() => setSelectedCategoryFilter('all')}          
                className={`px-4 py-2 rounded-lg ${          
                  selectedCategoryFilter === 'all'          
                    ? 'bg-purple-500 text-white'          
                    : 'bg-white text-gray-700 border border-gray-300'          
                }`}          
              >          
                전체          
              </button>          
              {EMOTION_CATEGORIES.map(category => (          
                <button          
                  key={category.id}          
                  onClick={() => setSelectedCategoryFilter(category.id)}          
                  className={`px-4 py-2 rounded-lg ${          
                    selectedCategoryFilter === category.id          
                      ? 'bg-purple-500 text-white'          
                      : 'bg-white text-gray-700 border border-gray-300'          
                  }`}          
                >          
                  {category.emoji} {category.name}          
                </button>          
              ))}          
            </div>          
          </div>          
                    
          {filteredMusic.length === 0 ? (          
            <div className="text-center py-12">          
              <div className="text-6xl mb-4">🎵</div>          
              <h3 className="text-xl font-bold text-gray-600 mb-2">          
                {selectedCategoryFilter === 'all' ? '공유된 음악이 없어요' : '해당 카테고리의 음악이 없어요'}          
              </h3>          
              <p className="text-gray-500">첫 번째 음악을 공유해보세요!</p>          
            </div>          
          ) : (          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">          
              {filteredMusic.map((music, index) => (          
                <div key={index} className="bg-white rounded-xl shadow-lg p-6">          
                  <div className="flex items-center justify-between mb-4">          
                    <div className="flex items-center space-x-2">          
                      {music.category && (          
                        <span className="text-lg">          
                          {EMOTION_CATEGORIES.find(cat => cat.id === music.category)?.emoji}          
                        </span>          
                      )}          
                      <span className="font-semibold text-gray-800">감정 음악</span>          
                    </div>          
                    <span className="text-sm text-gray-500">          
                      {formatDate(music.createdAt)}          
                    </span>          
                  </div>          
                            
                  <div className="mb-4">          
                    <p className="text-gray-600 text-sm mb-2">{music.prompt}</p>          
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">          
                      {music.style}          
                    </span>          
                  </div>          
                            
                  {music.musicUrl && (          
                    <audio controls className="w-full">          
                      <source src={music.musicUrl} type="audio/mpeg" />          
                      브라우저가 오디오를 지원하지 않습니다.          
                    </audio>          
                  )}          
                </div>          
              ))}          
            </div>          
          )}          
        </div>          
      </div>          
    );          
  };

  // 메인 렌더링              
  return (              
    <div className="App">              
      {currentStep === 'mood' && renderMoodSelection()}              
      {currentStep === 'chat' && renderChat()}              
      {currentStep === 'summary' && renderSummary()}              
      {currentStep === 'myDiary' && renderMyDiary()}          
      {currentStep === 'musicLibrary' && renderMusicLibrary()}              
    </div>              
  );              
});

export default App;