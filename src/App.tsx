import React, { useState, useEffect, useCallback, memo } from 'react';

// 타입 정의          
interface ChatMessage {          
  role: 'user' | 'assistant';          
  content: string;          
  timestamp: Date;          
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
  lyrics?: string;           // 가사 추가    
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
  lyrics?: string;            // 한글 가사 추가    
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
  { id: 'sad', name: '우울할 때', emoji: '😔' },      
  { id: 'happy', name: '기쁠 때', emoji: '😊' },      
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
  const [currentMusicTask, setCurrentMusicTask] = useState<SunoMusicTask | null>(null);          
  const [generationProgress, setGenerationProgress] = useState(0);          
  const [selectedMusicGenres, setSelectedMusicGenres] = useState<string[]>([]);      
  const [selectedDiaryStyle, setSelectedDiaryStyle] = useState<string>('simple');      
  const [editingDiary, setEditingDiary] = useState<string>('');      
  const [isEditingDiary, setIsEditingDiary] = useState(false);      
  const [shareToYoutube, setShareToYoutube] = useState(false);      
  const [selectedCategory, setSelectedCategory] = useState<string>('');      
  const [publicMusicLibrary, setPublicMusicLibrary] = useState<SunoMusicTask[]>([]);    
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

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

  // 한글 가사 생성 함수    
  const generateKoreanLyrics = async (    
    summaryData: SummaryData,    
    chatMessages: ChatMessage[],    
    mood: string    
  ): Promise<string> => {    
    const chatContent = chatMessages    
      .filter(msg => msg.role === 'user')    
      .map(msg => msg.content)    
      .join('\n');

    const systemPrompt = `당신은 감성적인 작사가입니다.    
        
다음 정보를 바탕으로 5줄의 한글 가사를 작성해주세요:    
- 대화 내용: ${chatContent}    
- 감정 상태: ${getMoodText(mood)}    
- 핵심 키워드: ${summaryData.keywords.join(', ')}    
- 추천 감정: ${summaryData.recommendedEmotions.join(', ')}

가사 작성 규칙:    
- 정확히 5줄로 작성    
- 감정을 자연스럽게 표현    
- 은유와 비유 사용    
- 희망적인 메시지 포함    
- 각 줄은 10-15자 정도

가사만 작성하고 다른 설명은 하지 마세요:`;

    try {    
      const lyrics = await callOpenAI([], systemPrompt);    
      return lyrics.trim();    
    } catch (error) {    
      console.error('가사 생성 오류:', error);    
      return '오늘 하루도 고생했어\n내일은 더 나은 날이 될거야\n힘들어도 웃어보자\n우리 함께 걸어가자\n행복이 찾아올거야';    
    }    
  };

  // LLM 일기 생성 함수      
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
- 200-300자 분량      
- 스타일: ${styleGuides[style as keyof typeof styleGuides]}      
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

  // Suno API로 음악 생성 (수정된 버전 - API 명세서 반영)      
  const generateMusicWithSuno = async (prompt: string, style: string, title: string, lyrics?: string): Promise<SunoMusicTask> => {          
    try {          
      console.log('Suno API 호출 시작:', { prompt, style, title, lyrics });          
                
      // API 키가 없으면 모의 데이터 반환      
      if (!process.env.REACT_APP_SUNO_API_KEY) {        
        console.warn('Suno API 키가 없어 모의 데이터를 사용합니다.');        
        return {        
          taskId: `mock-${Date.now()}`,        
          status: 'pending',        
          prompt,        
          style,        
          title,        
          lyrics,    
          createdAt: new Date()        
        };        
      }        
              
      // 실제 Suno API 호출 - 올바른 엔드포인트와 파라미터 사용
      const response = await fetch('https://api.sunoapi.org/api/v1/music', {          
        method: 'POST',          
        headers: {          
          'Content-Type': 'application/json',          
          'Authorization': `Bearer ${process.env.REACT_APP_SUNO_API_KEY}`        
        },          
        body: JSON.stringify({          
          title: title,
          tags: style,  // style 대신 tags 사용
          prompt: lyrics || prompt, // 가사가 있으면 가사를 프롬프트로 사용
          mv: 'chirp-v3-5'  // 올바른 모델 버전
        })          
      });

      if (!response.ok) {      
        const errorData = await response.json();      
        console.error('Suno API 에러:', errorData);      
        throw new Error(`API 오류: ${response.status} ${response.statusText}`);      
      }

      const data = await response.json();          
      console.log('Suno API 응답:', data);          
                
      if (data.code === 0 && data.data && data.data.length > 0) {          
        // 첫 번째 생성된 음악의 song_id를 사용
        const songId = data.data[0].song_id;
        return {          
          taskId: songId,  // song_id를 taskId로 사용
          status: 'pending',          
          prompt,          
          style,          
          title,          
          lyrics,    
          createdAt: new Date()          
        };          
      } else {          
        throw new Error(`API 응답 오류: ${data.msg || '알 수 없는 오류'}`);          
      }          
    } catch (error) {          
      console.error('Suno 음악 생성 오류:', error);          
              
      // 오류 시 모의 데이터 반환        
      return {        
        taskId: `mock-${Date.now()}`,        
        status: 'pending',        
        prompt,        
        style,        
        title,        
        lyrics,    
        createdAt: new Date()        
      };        
    }          
  };

  // Suno 작업 상태 체크 (수정된 버전 - API 명세서 반영)      
  const checkSunoTaskStatus = async (taskId: string): Promise<SunoMusicTask> => {          
    // 모의 taskId인 경우 모의 응답 반환          
    if (taskId.startsWith('mock-')) {          
      console.log('모의 작업 상태 반환');          
      return {          
        taskId,          
        status: 'completed',          
        prompt: currentMusicTask?.prompt || '',          
        style: currentMusicTask?.style || '',          
        title: currentMusicTask?.title || '',          
        lyrics: currentMusicTask?.lyrics,    
        createdAt: currentMusicTask?.createdAt || new Date(),          
        musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',          
        streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',      
        category: selectedCategory,      
        isPublic: shareToYoutube      
      };          
    }

    try {          
      // 올바른 엔드포인트 사용
      const response = await fetch(`https://api.sunoapi.org/api/v1/music/?ids=${taskId}`, {          
        method: 'GET',          
        headers: {          
          'Authorization': `Bearer ${process.env.REACT_APP_SUNO_API_KEY}`        
        }          
      });

      if (!response.ok) {      
        throw new Error(`API 오류: ${response.status} ${response.statusText}`);      
      }

      const data = await response.json();          
      console.log('Suno 상태 확인 응답:', data);      
              
      if (data.code === 0 && data.data && data.data.length > 0) {          
        const songData = data.data[0];          
                
        let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';          
        let musicUrl: string | undefined;          
        let streamUrl: string | undefined;          
                
        // 상태 매핑 - API 응답에 맞게 수정
        if (songData.audio_url) {          
          status = 'completed';          
          musicUrl = songData.audio_url;          
          streamUrl = songData.audio_url;  // stream_audio_url이 없으면 audio_url 사용
        } else if (songData.status === 'error') {          
          status = 'failed';          
        } else {          
          status = 'processing';          
        }          
                
        return {          
          taskId,          
          status,          
          prompt: currentMusicTask?.prompt || songData.prompt || '',          
          style: currentMusicTask?.style || songData.tags || '',          
          title: currentMusicTask?.title || songData.title || '',          
          lyrics: currentMusicTask?.lyrics,    
          createdAt: currentMusicTask?.createdAt || new Date(),          
          musicUrl,          
          streamUrl,          
          error: songData.error_message,      
          category: selectedCategory,      
          isPublic: shareToYoutube      
        };          
      } else {          
        throw new Error(`API 응답 오류: ${data.msg || '작업을 찾을 수 없습니다'}`);          
      }          
    } catch (error) {          
      console.error('Suno 작업 상태 확인 오류:', error);          
              
      // 개발 모드 fallback      
      return {        
        taskId,        
        status: 'completed',        
        prompt: currentMusicTask?.prompt || '',        
        style: currentMusicTask?.style || '',        
        title: currentMusicTask?.title || '',        
        lyrics: currentMusicTask?.lyrics,    
        createdAt: currentMusicTask?.createdAt || new Date(),        
        musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',        
        streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',      
        category: selectedCategory,      
        isPublic: shareToYoutube      
      };        
    }          
  };

  // AI 응답 생성          
  const getAIResponse = async (userMessage: string, conversationHistory: ChatMessage[]) => {          
    const conversationNum = conversationCount + 1;          
    setConversationCount(conversationNum);

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
- 답변 시작이나 중간에 귀여운 이모지 하나씩 추가`;

    const messages = [...conversationHistory.slice(-5), { role: 'user', content: userMessage }];          
    const aiResponse = await callOpenAI(messages, systemPrompt);

    return aiResponse;          
  };

  // 대화 요약 및 음악 프롬프트 생성 (가사 생성 포함)         
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
        musicTitle: 'Peaceful Mind Journey',    
        lyrics: '오늘 하루도 고생했어\n내일은 더 나은 날이 될거야\n힘들어도 웃어보자\n우리 함께 걸어가자\n행복이 찾아올거야'    
      };          
    }

    const systemPrompt = `다음 대화 내용을 분석해서 감정 일기와 음악 생성을 위한 정보를 추출해주세요:

대화 내용:          
${userMessages}

현재 감정 상태: ${currentMood ? getMoodText(currentMood) : '선택 안함'}          
선호 장르: ${selectedMusicGenres.join(', ')}

분석 요청:          
1. 대화 내용을 바탕으로 오늘 있었던 일을 2-4줄로 요약          
2. 대화에서 느껴진 감정 키워드 5개 추출          
3. AI가 분석한 세부 감정 5개 추천          
4. 실행 가능한 액션 아이템 2개 제안          
5. Suno AI 음악 생성을 위한 영어 프롬프트 생성 (감정과 상황을 반영한 구체적인 설명)          
6. 음악 스타일 추천 (사용자 선호 장르 고려)          
7. 음악 제목 추천 (영어)

응답 형식:          
요약: [요약 내용]          
감정키워드: #키워드1, #키워드2, #키워드3, #키워드4, #키워드5          
추천감정: 감정1, 감정2, 감정3, 감정4, 감정5          
액션아이템: 아이템1 | 아이템2          
음악프롬프트: [영어로 작성된 구체적인 음악 설명]          
음악스타일: [영어 스타일명]          
음악제목: [영어 제목]`;

    try {          
      const result = await callOpenAI([], systemPrompt);          
      const lines = result.split('\n');          
                
      let summary = '', keywords: string[] = [], recommendedEmotions: string[] = [],           
          actionItems: string[] = [], musicPrompt = '', musicStyle = '', musicTitle = '';          
                
      lines.forEach((line: string) => {          
        if (line.startsWith('요약:')) summary = line.replace('요약:', '').trim();          
        else if (line.startsWith('감정키워드:')) keywords = line.replace('감정키워드:', '').trim().split(',').map((k: string) => k.trim());          
        else if (line.startsWith('추천감정:')) recommendedEmotions = line.replace('추천감정:', '').trim().split(',').map((e: string) => e.trim());          
        else if (line.startsWith('액션아이템:')) actionItems = line.replace('액션아이템:', '').trim().split('|').map((a: string) => a.trim());          
        else if (line.startsWith('음악프롬프트:')) musicPrompt = line.replace('음악프롬프트:', '').trim();          
        else if (line.startsWith('음악스타일:')) musicStyle = line.replace('음악스타일:', '').trim();          
        else if (line.startsWith('음악제목:')) musicTitle = line.replace('음악제목:', '').trim();          
      });

      // 기본값 보장  
      if (!summary) summary = '오늘의 일상을 나누었어요.';  
      if (keywords.length === 0) keywords = ['#일상', '#감정'];  
      if (recommendedEmotions.length === 0) recommendedEmotions = ['평온', '만족'];  
      if (actionItems.length === 0) actionItems = ['오늘을 돌아보기', '내일을 준비하기'];

      // 한글 가사 생성    
      const summaryDataTemp = {    
        summary: summary,          
        keywords: keywords.slice(0, 5),          
        recommendedEmotions: recommendedEmotions.slice(0, 5),          
        actionItems: actionItems.slice(0, 2),          
        musicPrompt: musicPrompt || 'A calming and peaceful ambient music',          
        musicStyle: musicStyle || 'Ambient',          
        musicTitle: musicTitle || 'Emotional Journey'    
      };

      const lyrics = await generateKoreanLyrics(summaryDataTemp, messages, currentMood || 'normal');

      return {          
        ...summaryDataTemp,    
        lyrics         
      };          
    } catch (error) {          
      console.error('대화 요약 생성 오류:', error);          
      return {          
        summary: '대화 요약 생성 중 문제가 발생했어요.',          
        keywords: ['#감정나눔', '#하루일상'],          
        recommendedEmotions: ['평온', '만족'],          
        actionItems: ['오늘의 대화 내용 되새기기', '마음의 여유 갖기'],          
        musicPrompt: 'A peaceful ambient music for relaxation',          
        musicStyle: 'Ambient',          
        musicTitle: 'Calm Moments',    
        lyrics: '오늘 하루도 고생했어\n내일은 더 나은 날이 될거야\n힘들어도 웃어보자\n우리 함께 걸어가자\n행복이 찾아올거야'    
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

  // 음악 생성 및 일기 저장 핸들러          
  const handleGenerateMusicAndSave = async () => {          
    if (!currentMood || !summaryData) {          
      alert('저장에 필요한 정보가 부족합니다.');          
      return;          
    }          
              
    setCurrentStep('generating');          
    setGenerationProgress(0);          
              
    try {          
      // 프로그레스 업데이트          
      const progressInterval = setInterval(() => {          
        setGenerationProgress(prev => {          
          if (prev >= 90) {          
            clearInterval(progressInterval);          
            return 90;          
          }          
          return prev + 10;          
        });          
      }, 500);

      let completedTask: SunoMusicTask;

      // Suno API로 음악 생성          
      const musicTask = await generateMusicWithSuno(          
        summaryData.musicPrompt || 'A calming ambient music',          
        summaryData.musicStyle || 'Ambient',          
        summaryData.musicTitle || 'Emotional Journey',    
        summaryData.lyrics // 가사 전달    
      );          
                
      setCurrentMusicTask(musicTask);          
                
      // 작업 상태 확인        
      completedTask = musicTask;          
      let attempts = 0;          
      const maxAttempts = 60; // 최대 3분 대기          
                
      while (attempts < maxAttempts) {          
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기          
                  
        try {          
          completedTask = await checkSunoTaskStatus(musicTask.taskId);          
          setCurrentMusicTask(completedTask);          
                    
          if (completedTask.status === 'completed' || completedTask.status === 'failed') {          
            break;          
          }          
                    
          // 진행률 업데이트          
          const progress = Math.min(90, (attempts / maxAttempts) * 90);          
          setGenerationProgress(progress);          
                    
        } catch (error) {          
          console.error('상태 확인 오류:', error);          
        }          
                  
        attempts++;          
      }          
                
      if (completedTask.status !== 'completed') {          
        throw new Error('음악 생성이 시간 초과되었습니다.');          
      }    
                
      clearInterval(progressInterval);          
      setGenerationProgress(100);          
            
      // 공유 설정이 있으면 공개 라이브러리에 추가      
      if (shareToYoutube && selectedCategory) {      
        const updatedLibrary = [...publicMusicLibrary, completedTask];      
        setPublicMusicLibrary(updatedLibrary);      
        saveToLocalStorage('publicMusicLibrary', updatedLibrary);      
      }      
                
      // 일기 저장          
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
        mood: currentMood,          
        summary: summaryData.summary || "내용 없음",      
        llmDiary: isEditingDiary ? editingDiary : summaryData.llmDiary,          
        keywords: summaryData.keywords || [],          
        selectedEmotions: allEmotions,          
        musicTasks: [completedTask],          
        chatMessages: chatMessages,          
        createdAt: now          
      };

      const updatedEntries = [newEntry, ...diaryEntries];          
      setDiaryEntries(updatedEntries);          
      saveToLocalStorage('diaryEntries', updatedEntries);          
                
      // 초기화          
      setTimeout(() => {          
        setChatMessages([]);          
        setCurrentMood(null);          
        setSummaryData(null);          
        setSelectedEmotions([]);          
        setUserMainEmotion('');          
        setConversationCount(0);          
        setCurrentMusicTask(null);          
        setGenerationProgress(0);      
        setEditingDiary('');      
        setIsEditingDiary(false);      
        setShareToYoutube(false);      
        setSelectedCategory('');          
        setCurrentStep('mood');          
                  
        alert('일기와 AI 음악이 성공적으로 생성되었습니다!');          
      }, 1000);          
                
    } catch (error) {          
      console.error('음악 생성 및 저장 오류:', error);          
      alert('음악 생성 중 문제가 발생했습니다. 다시 시도해주세요.');          
      setCurrentStep('summary');          
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

  // 장르 선택 핸들러          
  const handleGenreSelect = (genreId: string) => {          
    setSelectedMusicGenres(prev => {          
      const updated = prev.includes(genreId)           
        ? prev.filter(id => id !== genreId)          
        : [...prev, genreId];          
                
      saveToLocalStorage('musicPreferences', updated);          
      return updated;          
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

  // 기분 선택 화면          
  const renderMoodSelection = () => (          
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>          
      <div className="max-w-4xl mx-auto">          
        <div className="text-center mb-8">          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI 감정 음악 일기</h1>          
          <p className="text-gray-600">{AI_NAME}가 당신의 감정을 읽고 맞춤 음악을 만들어드려요</p>          
        </div>          
                  
        <div className="text-center mb-8">          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">오늘 기분은 어떠세요?</h2>          
          <p className="text-gray-600">AI가 당신만을 위한 음악을 만들어드릴게요</p>          
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

  // 채팅 화면          
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
            {isGeneratingMusic ? '🎵 잠시만 기다려주세요. 준비 중입니다...' : '📝 AI 음악 생성하기'}          
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

  // 요약 화면 (LLM 일기 추가)      
  const renderSummary = () => (          
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>          
      <div className="max-w-4xl mx-auto">          
        <div className="text-center mb-8">          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📝 오늘의 감정 분석</h2>          
          <p className="text-gray-600">AI가 분석한 내용을 확인하고 음악을 생성해보세요</p>          
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
                    
              <div className="mt-3 flex justify-end">      
                <button      
                  onClick={() => setIsEditingDiary(!isEditingDiary)}      
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium"      
                >      
                  {isEditingDiary ? '수정 완료' : '수정하기'}      
                </button>      
              </div>      
            </div>          
                      
            <div className="bg-white rounded-xl shadow-lg p-6">          
              <h3 className="text-xl font-bold mb-4 text-gray-800">🏷️ 감정 키워드</h3>          
              <div className="flex flex-wrap gap-2">          
                {summaryData.keywords.map((keyword: string, index: number) => (          
                  <span key={index} className={`px-3 py-1 bg-gradient-to-r ${APP_THEME.primary} text-white rounded-full text-sm`}>          
                    {keyword}          
                  </span>          
                ))}          
              </div>          
            </div>          
                      
            <div className="bg-white rounded-xl shadow-lg p-6">          
              <h3 className="text-xl font-bold mb-4 text-gray-800">🤖 AI 추천 감정</h3>          
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">          
                {summaryData.recommendedEmotions.map((emotion: string, index: number) => (          
                  <button           
                    key={index}           
                    onClick={() => handleEmotionSelect(emotion)}           
                    className={`p-3 rounded-lg text-sm font-medium transition-all border-2 ${          
                      selectedEmotions.includes(emotion)           
                        ? `bg-gradient-to-r ${APP_THEME.primary} text-white border-purple-500 shadow-lg transform scale-105`           
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'          
                    }`}          
                  >          
                    {emotion}          
                  </button>          
                ))}          
              </div>          
              <p className="text-xs text-gray-500">최대 2개까지 선택 가능 (선택한 감정: {selectedEmotions.length}/2)</p>          
            </div>          
                      
            <div className="bg-white rounded-xl shadow-lg p-6">          
              <h3 className="text-xl font-bold mb-4 text-gray-800">💭 나의 오늘 감정</h3>          
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
                      
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl shadow-lg p-6 border-2 border-purple-300">          
              <h3 className="text-xl font-bold mb-4 text-purple-800">🎵 AI 음악 생성 정보</h3>          
              <div className="space-y-3">          
                <div>          
                  <span className="font-semibold text-purple-700">프롬프트:</span>          
                  <p className="text-gray-700 mt-1">{summaryData.musicPrompt}</p>          
                </div>          
                <div>          
                  <span className="font-semibold text-purple-700">스타일:</span>          
                  <span className="ml-2 text-gray-700">{summaryData.musicStyle}</span>          
                </div>          
                <div>          
                  <span className="font-semibold text-purple-700">제목:</span>          
                  <span className="ml-2 text-gray-700">{summaryData.musicTitle}</span>          
                </div>    
                {summaryData.lyrics && (    
                  <div>          
                    <span className="font-semibold text-purple-700">가사 (한글 5줄):</span>          
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap bg-white p-3 rounded-lg">{summaryData.lyrics}</p>          
                  </div>    
                )}    
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">  
                  <p className="text-sm text-yellow-800">  
                    <span className="font-semibold">음악 생성 시간:</span> 약 30-40초 소요됩니다  
                  </p>  
                </div>  
              </div>          
            </div>  
      
            {/* 공유 옵션 */}      
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl shadow-lg p-6 border-2 border-red-200">      
              <h3 className="text-xl font-bold mb-4 text-red-700">🎬 음악 공유 설정</h3>      
              <div className="space-y-4">      
                <div className="flex items-center space-x-3">      
                  <input      
                    type="checkbox"      
                    id="shareToYoutube"      
                    checked={shareToYoutube}      
                    onChange={(e) => setShareToYoutube(e.target.checked)}      
                    className="w-5 h-5 text-red-600 rounded"      
                  />      
                  <label htmlFor="shareToYoutube" className="text-gray-700 font-medium">      
                    이 음악을 저장하고 다른 사용자와 공유하기      
                  </label>      
                </div>      
                      
                {shareToYoutube && (      
                  <div>      
                    <label className="block text-sm font-medium text-gray-700 mb-2">      
                      감정 카테고리 선택:      
                    </label>      
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">      
                      {EMOTION_CATEGORIES.map(category => (      
                        <button      
                          key={category.id}      
                          onClick={() => setSelectedCategory(category.id)}      
                          className={`p-2 rounded-lg text-sm transition-all border-2 ${      
                            selectedCategory === category.id      
                              ? 'bg-red-500 text-white border-red-500'      
                              : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'      
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
                      
            <div className="text-center">          
              <button           
                onClick={handleGenerateMusicAndSave}           
                disabled={isLoading || (shareToYoutube && !selectedCategory)}           
                className={`px-8 py-3 bg-gradient-to-r ${APP_THEME.primary} text-white rounded-lg font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50`}          
              >          
                🎵 AI 음악 생성 & 일기 저장하기          
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

  // 음악 생성 중 화면          
  const renderGenerating = () => (          
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4 flex items-center justify-center`}>          
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">          
        <div className="text-center">          
          <div className="mb-6">          
            <div className="text-6xl mb-4 animate-pulse">🎵</div>          
            <h2 className="text-2xl font-bold text-gray-800 mb-2">AI 음악 생성 중...</h2>          
            <p className="text-gray-600">당신의 감정에 맞는 음악을 만들고 있어요</p>          
          </div>          
                    
          {currentMusicTask && (          
            <div className="mb-6 text-left bg-purple-50 rounded-lg p-4">          
              <p className="text-sm text-purple-700 mb-1">          
                <span className="font-semibold">제목:</span> {currentMusicTask.title}          
              </p>          
              <p className="text-sm text-purple-700 mb-1">          
                <span className="font-semibold">스타일:</span> {currentMusicTask.style}          
              </p>      
              {shareToYoutube && (      
                <p className="text-sm text-purple-700 mb-1">          
                  <span className="font-semibold">공유 카테고리:</span> {      
                    EMOTION_CATEGORIES.find(c => c.id === selectedCategory)?.name      
                  }          
                </p>      
              )}    
              {currentMusicTask.lyrics && (    
                <div className="mt-2">    
                  <p className="text-sm text-purple-700 font-semibold">가사:</p>    
                  <p className="text-xs text-purple-600 mt-1 whitespace-pre-wrap">{currentMusicTask.lyrics}</p>    
                </div>    
              )}    
              <p className="text-xs text-purple-600 mt-2">          
                작업 ID: {currentMusicTask.taskId}          
              </p>          
            </div>          
          )}          
                    
          <div className="mb-6">          
            <div className="w-full bg-gray-200 rounded-full h-3">          
              <div           
                className={`bg-gradient-to-r ${APP_THEME.primary} h-3 rounded-full transition-all duration-500`}          
                style={{ width: `${generationProgress}%` }}          
              />          
            </div>          
            <p className="text-sm text-gray-600 mt-2">{generationProgress}% 완료</p>          
          </div>          
                    
          <p className="text-sm text-gray-500">          
            음악 생성에 약 30-40초가 소요됩니다.          
          </p>          
        </div>          
      </div>          
    </div>          
  );

  // 내 일기 화면 (LLM 일기 표시)        
  const renderMyDiary = () => (          
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>          
      <div className="max-w-4xl mx-auto">          
        <div className="text-center mb-8">          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📖 내 AI 음악 일기</h2>          
          <p className="text-gray-600">총 {diaryEntries.length}개의 기록이 있어요</p>          
        </div>          
                  
        {diaryEntries.length === 0 ? (          
          <div className="text-center bg-white rounded-xl shadow-lg p-8">          
            <div className="text-4xl mb-4">📝</div>          
            <p className="text-lg text-gray-600">아직 작성된 일기가 없어요</p>          
            <button           
              onClick={() => setCurrentStep('mood')}           
              className={`mt-4 px-6 py-3 bg-gradient-to-r ${APP_THEME.primary} text-white rounded-lg font-semibold hover:opacity-90 transition-all`}          
            >          
              첫 일기 작성하기          
            </button>          
          </div>          
        ) : (          
          <div className="space-y-6">          
            {diaryEntries.map((entry) => (          
              <div key={entry.id} className="bg-white rounded-xl shadow-lg p-6">          
                <div className="flex items-center justify-between mb-4">          
                  <div className="flex items-center space-x-3">          
                    <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>          
                    <div>          
                      <h3 className="font-bold text-gray-800">{entry.date} {entry.time}</h3>          
                      <p className="text-sm text-gray-600">기분: {getMoodText(entry.mood)}</p>          
                    </div>          
                  </div>          
                </div>          
                          
                <div className="space-y-4">          
                  <div>          
                    <h4 className="font-semibold text-gray-700 mb-2">요약</h4>          
                    <p className="text-gray-600">{entry.summary}</p>          
                  </div>      
                        
                  {/* LLM 일기 표시 */}      
                  {entry.llmDiary && (      
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-orange-200">      
                      <h4 className="font-semibold text-gray-700 mb-2">✨ AI가 써준 일기</h4>      
                      <p className="text-gray-700 whitespace-pre-wrap">{entry.llmDiary}</p>      
                    </div>      
                  )}      
                            
                  {entry.keywords?.length > 0 && (          
                    <div>          
                      <h4 className="font-semibold text-gray-700 mb-2">키워드</h4>          
                      <div className="flex flex-wrap gap-2">          
                        {entry.keywords.map((keyword, index) => (          
                          <span key={index} className={`px-2 py-1 bg-gradient-to-r ${APP_THEME.primary} text-white rounded-full text-xs`}>          
                            {keyword}          
                          </span>          
                        ))}          
                      </div>          
                    </div>          
                  )}          
                            
                  {entry.selectedEmotions?.length > 0 && (          
                    <div>          
                      <h4 className="font-semibold text-gray-700 mb-2">감정</h4>          
                      <div className="flex flex-wrap gap-2">          
                        {entry.selectedEmotions.map((emotion, index) => (          
                          <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">          
                            {emotion}          
                          </span>          
                        ))}          
                      </div>          
                    </div>          
                  )}          
                            
                  {entry.musicTasks?.length > 0 && (          
                    <div>          
                      <h4 className="font-semibold text-gray-700 mb-2">생성된 AI 음악</h4>          
                      <div className="space-y-2">          
                        {entry.musicTasks.map((task, index) => (          
                          <div key={index} className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">          
                            <div className="mb-2">          
                              <p className="font-medium text-purple-800">{task.title}</p>          
                              <p className="text-sm text-purple-600">{task.style}</p>          
                              {task.status === 'completed' && (          
                                <p className="text-xs text-purple-500 mt-1">✅ 생성 완료</p>          
                              )}          
                              {task.status === 'failed' && (          
                                <p className="text-xs text-red-500 mt-1">❌ 생성 실패</p>          
                              )}          
                              {task.status === 'processing' && (          
                                <p className="text-xs text-yellow-500 mt-1">⏳ 생성 중...</p>          
                              )}      
                              {task.isPublic && task.category && (      
                                <p className="text-xs text-green-600 mt-1">      
                                  🌍 공개됨: {EMOTION_CATEGORIES.find(c => c.id === task.category)?.name}      
                                </p>      
                              )}    
                              {task.lyrics && (    
                                <div className="mt-2 p-2 bg-white rounded text-xs">    
                                  <p className="font-semibold text-gray-700 mb-1">가사:</p>    
                                  <p className="text-gray-600 whitespace-pre-wrap">{task.lyrics}</p>    
                                </div>    
                              )}    
                            </div>          
                                    
                            {task.status === 'completed' && task.musicUrl && (          
                              <>          
                                {/* 음악 URL을 iframe으로 표시 */}      
                                {task.musicUrl && (      
                                  <div className="mb-2">    
                                    <iframe      
                                      src={task.musicUrl}      
                                      width="100%"      
                                      height="80"      
                                      frameBorder="0"      
                                      allow="autoplay"      
                                      className="rounded-lg"      
                                    ></iframe>      
                                  </div>      
                                )}    
                                    
                                {/* 오디오 플레이어 */}    
                                <audio           
                                  controls           
                                  className="w-full mb-2"          
                                  src={task.musicUrl || task.streamUrl}          
                                >          
                                  Your browser does not support the audio element.          
                                </audio>    
                                        
                                {/* 버튼들 */}          
                                <div className="flex space-x-2">          
                                  <a           
                                    href={task.musicUrl}           
                                    download          
                                    className="px-3 py-1 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600"          
                                  >          
                                    💾 다운로드          
                                  </a>          
                                  <a           
                                    href={task.musicUrl}           
                                    target="_blank"           
                                    rel="noopener noreferrer"          
                                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600"          
                                  >          
                                    🔗 새 창에서 열기          
                                  </a>    
                                </div>          
                              </>          
                            )}          
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

  // 음악 라이브러리 화면      
  const renderMusicLibrary = () => {      
    const filteredMusic = selectedCategoryFilter === 'all'       
      ? publicMusicLibrary       
      : publicMusicLibrary.filter(music => music.category === selectedCategoryFilter);      
          
    return (      
      <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4`}>      
        <div className="max-w-4xl mx-auto">      
          <div className="text-center mb-8">      
            <h2 className="text-3xl font-bold text-gray-800 mb-2">🎵 감정별 음악 라이브러리</h2>      
            <p className="text-gray-600">다른 사용자들이 공유한 AI 음악을 들어보세요</p>      
          </div>      
                
          {/* 카테고리 필터 */}      
          <div className="mb-6 bg-white rounded-xl shadow-lg p-4">      
            <div className="flex flex-wrap gap-2 items-center">      
              <span className="font-semibold text-gray-700">카테고리:</span>      
              <button      
                onClick={() => setSelectedCategoryFilter('all')}      
                className={`px-4 py-2 rounded-lg text-sm transition-all ${      
                  selectedCategoryFilter === 'all'      
                    ? 'bg-purple-500 text-white'      
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'      
                }`}      
              >      
                전체 ({publicMusicLibrary.length})      
              </button>      
              {EMOTION_CATEGORIES.map(category => {      
                const count = publicMusicLibrary.filter(m => m.category === category.id).length;      
                return (      
                  <button      
                    key={category.id}      
                    onClick={() => setSelectedCategoryFilter(category.id)}      
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${      
                      selectedCategoryFilter === category.id      
                        ? 'bg-purple-500 text-white'      
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'      
                    }`}      
                  >      
                    {category.emoji} {category.name} ({count})      
                  </button>      
                );      
              })}      
            </div>      
          </div>      
                
          {filteredMusic.length === 0 ? (      
            <div className="text-center bg-white rounded-xl shadow-lg p-8">      
              <div className="text-4xl mb-4">🎵</div>      
              <p className="text-lg text-gray-600">      
                {selectedCategoryFilter === 'all'       
                  ? '아직 공유된 음악이 없어요'      
                  : '이 카테고리에는 아직 음악이 없어요'}      
              </p>      
            </div>      
          ) : (      
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">      
              {filteredMusic.map((music, index) => (      
                <div key={index} className="bg-white rounded-xl shadow-lg p-6">      
                  <div className="mb-4">      
                    <div className="flex items-center justify-between mb-2">      
                      <h3 className="font-bold text-gray-800">{music.title}</h3>      
                      <span className="text-2xl">      
                        {EMOTION_CATEGORIES.find(c => c.id === music.category)?.emoji}      
                      </span>      
                    </div>      
                    <p className="text-sm text-gray-600">{music.style}</p>      
                    <p className="text-xs text-gray-500 mt-1">      
                      {EMOTION_CATEGORIES.find(c => c.id === music.category)?.name}      
                    </p>    
                    {music.lyrics && (    
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">    
                        <p className="font-semibold text-gray-700 mb-1">가사:</p>    
                        <p className="text-gray-600 whitespace-pre-wrap">{music.lyrics}</p>    
                      </div>    
                    )}    
                  </div>      
                        
                  {music.musicUrl && (      
                    <div className="mb-4">    
                      <iframe      
                        src={music.musicUrl}      
                        width="100%"      
                        height="300"      
                        frameBorder="0"      
                        allow="autoplay"      
                        className="rounded-lg"      
                      ></iframe>      
                    </div>      
                  )}      
                        
                  {music.musicUrl && (      
                    <audio controls className="w-full mb-2">      
                      <source src={music.musicUrl} type="audio/mpeg" />      
                      Your browser does not support the audio element.      
                    </audio>      
                  )}      
                        
                  <div className="flex space-x-2">      
                    {music.musicUrl && (      
                      <a      
                        href={music.musicUrl}      
                        download      
                        className="px-3 py-1 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600"      
                      >      
                        💾 다운로드      
                      </a>      
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
  };

  // 메인 렌더링          
  switch (currentStep) {          
    case 'mood':           
      return renderMoodSelection();          
    case 'chat':           
      return renderChat();          
    case 'summary':           
      return renderSummary();          
    case 'generating':          
      return renderGenerating();          
    case 'myDiary':           
      return renderMyDiary();      
    case 'musicLibrary':      
      return renderMusicLibrary();          
    default:           
      return renderMoodSelection();          
  }          
});

export default App;