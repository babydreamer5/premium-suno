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
  const [attempts, setAttempts] = useState(0);
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

  // Kie.ai API로 음악 생성 (수정된 버전)  
  const generateMusicWithKie = async (prompt: string, style: string, title: string): Promise<SunoMusicTask> => {              
    try {              
      console.log('Kie.ai API 호출 시작:', { prompt, style, title });              
                    
      // API 키가 없으면 모의 데이터 반환          
      if (!process.env.REACT_APP_KIE_API_KEY) {            
        console.warn('Kie.ai API 키가 없어 모의 데이터를 사용합니다.');            
        return {            
          taskId: `mock-${Date.now()}`,            
          status: 'pending',            
          prompt,            
          style,            
          title,            
          createdAt: new Date()            
        };            
      }            
                  
      // Kie.ai API 호출 - 수정된 파라미터 (가사 제거, instrumental로 변경)
      const response = await fetch('https://api.kie.ai/api/v1/generate', {              
        method: 'POST',              
        headers: {              
          'Authorization': `Bearer ${process.env.REACT_APP_KIE_API_KEY}`,  
          'Content-Type': 'application/json'            
        },              
        body: JSON.stringify({              
          prompt: prompt,  // 음악 프롬프트만 사용
          customMode: true,  
          instrumental: true,  // 가사 없는 음악으로 변경
          style: style || 'Ambient',  
          model: "V3_5",  
          callBackUrl: process.env.NODE_ENV === 'production' 
            ? window.location.origin + "/api/callback"
            : "http://localhost:3000/api/callback",
          negativeTags: "Heavy Metal, Death Metal, Screamo, Vocals, Singing"  // 보컬 제외
        })              
      });

      if (!response.ok) {          
        const errorData = await response.json();          
        console.error('Kie.ai API 에러:', errorData);          
        throw new Error(`API 오류: ${response.status} ${response.statusText}`);          
      }

      const data = await response.json();              
      console.log('Kie.ai API 응답:', data);  
                    
      if (data.code === 200 && data.data) {  
        const taskId = data.data.task_id || data.data.taskId;  
          
        if (taskId) {              
          return {              
            taskId: taskId,  
            status: 'pending',              
            prompt,              
            style,              
            title,              
            createdAt: new Date()              
          };  
        }  
      }  
        
      throw new Error(`API 응답 오류: ${data.msg || '알 수 없는 오류'}`);  
        
    } catch (error) {              
      console.error('Kie 음악 생성 오류:', error);              
                  
      // 오류 시 모의 데이터 반환            
      return {            
        taskId: `mock-${Date.now()}`,            
        status: 'pending',            
        prompt,            
        style,            
        title,            
        createdAt: new Date()            
      };            
    }              
  };

  // Kie.ai 작업 상태 체크 (수정된 버전)  
  const checkKieTaskStatus = async (taskId: string): Promise<SunoMusicTask> => {              
    // 모의 taskId인 경우 모의 응답 반환              
    if (taskId.startsWith('mock-')) {              
      console.log('모의 작업 상태 반환');              
      return {              
        taskId,              
        status: 'completed',              
        prompt: currentMusicTask?.prompt || '',              
        style: currentMusicTask?.style || '',              
        title: currentMusicTask?.title || '',              
        createdAt: currentMusicTask?.createdAt || new Date(),              
        musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',              
        streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',          
        category: selectedCategory,          
        isPublic: shareToYoutube          
      };              
    }

    try {              
      console.log('상태 확인 시작, taskId:', taskId);  
        
      // Kie.ai 상태 확인 API 호출
      const response = await fetch(`https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`, {              
        method: 'GET',              
        headers: {              
          'Authorization': `Bearer ${process.env.REACT_APP_KIE_API_KEY}`            
        }              
      });

      if (!response.ok) {          
        throw new Error(`API 오류: ${response.status} ${response.statusText}`);  
      }

      const data = await response.json();              
      console.log('Kie.ai 상태 확인 응답:', data);  
                  
      if (data.code === 200) {              
        let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';              
        let musicUrl: string | undefined;              
        let streamUrl: string | undefined;              
                    
        // 응답 구조에 따른 처리
        if (data.data?.status === 'SUCCESS' && data.data?.data?.length > 0) {              
          status = 'completed';              
          const musicData = data.data.data[0];  
          musicUrl = musicData.audio_url;              
          streamUrl = musicData.stream_audio_url || musicData.audio_url;  
        } else if (data.data?.status === 'FAILED') {              
          status = 'failed';              
        } else if (data.data?.status === 'PROCESSING' || data.data?.status === 'PENDING') {              
          status = 'processing';              
        }              
                    
        return {              
          taskId,              
          status,              
          prompt: currentMusicTask?.prompt || '',              
          style: currentMusicTask?.style || '',              
          title: currentMusicTask?.title || '',              
          createdAt: currentMusicTask?.createdAt || new Date(),              
          musicUrl,              
          streamUrl,              
          error: data.data?.error,          
          category: selectedCategory,          
          isPublic: shareToYoutube          
        };              
      } else {              
        throw new Error(`API 응답 오류: ${data.msg || '작업을 찾을 수 없습니다'}`);              
      }              
    } catch (error) {              
      console.error('Kie.ai 작업 상태 확인 오류:', error);              
                  
      // 개발 모드 fallback          
      return {            
        taskId,            
        status: 'completed',            
        prompt: currentMusicTask?.prompt || '',            
        style: currentMusicTask?.style || '',            
        title: currentMusicTask?.title || '',            
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

      return {              
        summary: summary,              
        keywords: keywords.slice(0, 5),              
        recommendedEmotions: recommendedEmotions.slice(0, 5),              
        actionItems: actionItems.slice(0, 2),              
        musicPrompt: musicPrompt || 'A calming and peaceful ambient music',              
        musicStyle: musicStyle || 'Ambient',              
        musicTitle: musicTitle || 'Emotional Journey'        
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
        musicTitle: 'Calm Moments'        
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

  // 음악 생성 및 일기 저장 핸들러 (대기시간 5분으로 단축)              
  const handleGenerateMusicAndSave = async () => {              
    if (!currentMood || !summaryData) {              
      alert('저장에 필요한 정보가 부족합니다.');              
      return;              
    }              
                  
    setCurrentStep('generating');              
    setGenerationProgress(0);              
    setAttempts(0);
                  
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

      // Kie.ai API로 음악 생성 (가사 제거)              
      const musicTask = await generateMusicWithKie(              
        summaryData.musicPrompt || 'A calming ambient music',              
        summaryData.musicStyle || 'Ambient',              
        summaryData.musicTitle || 'Emotional Journey'        
      );              
                    
      setCurrentMusicTask(musicTask);              
                    
      // 작업 상태 확인 (5분으로 단축)            
      completedTask = musicTask;              
      let currentAttempts = 0;
      const maxAttempts = 60; // 최대 5분 대기 (5초 * 60 = 300초)              
                    
      while (currentAttempts < maxAttempts) {              
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기              
                      
        try {              
          completedTask = await checkKieTaskStatus(musicTask.taskId);              
          setCurrentMusicTask(completedTask);              
            
          console.log(`상태 확인 ${currentAttempts + 1}/${maxAttempts}:`, completedTask.status);              
          setAttempts(currentAttempts + 1);              
                        
          if (completedTask.status === 'completed') {              
            console.log('음악 생성 완료!');              
            break;              
          } else if (completedTask.status === 'failed') {              
            throw new Error(completedTask.error || '음악 생성에 실패했습니다.');              
          }              
        } catch (statusError) {              
          console.error('상태 확인 오류:', statusError);              
        }              
                      
        currentAttempts++;              
      }              
                    
      if (currentAttempts >= maxAttempts && completedTask.status !== 'completed') {              
        console.warn('음악 생성 시간 초과, 모의 데이터 사용');              
        completedTask = {              
          ...completedTask,              
          status: 'completed',              
          musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',              
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'              
        };              
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
        setAttempts(0);
                      
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

  // 요약 화면 (제목/아티스트 표시 제거)          
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
              <h3 className="text-xl font-bold mb-4 text-gray-800">💭 추천 감정</h3>              
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
              <h3 className="text-xl font-bold mb-4 text-gray-800">🎵 음악 정보</h3>              
              <div className="space-y-3">              
                <div>              
                  <span className="font-semibold text-gray-600">프롬프트:</span>              
                  <p className="text-gray-700 mt-1">{summaryData.musicPrompt}</p>              
                </div>              
                <div>              
                  <span className="font-semibold text-gray-600">스타일:</span>              
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">              
                    {summaryData.musicStyle}              
                  </span>              
                </div>              
              </div>              
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
              
            {/* 공유 설정 섹션 */}          
            <div className="bg-white rounded-xl shadow-lg p-6">          
              <h3 className="text-xl font-bold mb-4 text-gray-800">🌐 공유 설정</h3>          
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
                    음악 라이브러리에 공개하기          
                  </label>          
                </div>          
                          
                {shareToYoutube && (          
                  <div>          
                    <label className="block text-sm font-medium text-gray-700 mb-2">          
                      카테고리 선택          
                    </label>          
                    <select          
                      value={selectedCategory}          
                      onChange={(e) => setSelectedCategory(e.target.value)}          
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"          
                    >          
                      <option value="">카테고리를 선택하세요</option>          
                      {EMOTION_CATEGORIES.map(category => (          
                        <option key={category.id} value={category.id}>          
                          {category.emoji} {category.name}          
                        </option>          
                      ))}          
                    </select>          
                  </div>          
                )}          
              </div>          
            </div>

            <div className="flex space-x-4">              
              <button               
                onClick={handleGenerateMusicAndSave}               
                className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold text-lg hover:opacity-90"              
              >              
                🎵 음악 생성하고 일기 저장하기              
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

  // 음악 생성 중 화면 (5분 대기시간 표시)              
  const renderGenerating = () => (              
    <div className={`min-h-screen bg-gradient-to-br ${APP_THEME.bgClass} p-4 flex items-center justify-center`}>              
      <div className="max-w-md mx-auto text-center">              
        <div className="bg-white rounded-xl shadow-lg p-8">              
          <div className="mb-6">              
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">              
              <div className="text-3xl text-white">🎵</div>              
            </div>              
            <h2 className="text-2xl font-bold text-gray-800 mb-2">AI 음악 생성 중</h2>              
            <p className="text-gray-600">당신만을 위한 특별한 음악을 만들고 있어요</p>              
          </div>              
                        
          <div className="mb-6">              
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">              
              <div               
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"               
                style={{ width: `${generationProgress}%` }}              
              ></div>              
            </div>              
            <p className="text-sm text-gray-500">{generationProgress}% 완료</p>              
          </div>              
                        
          <div className="text-sm text-gray-600 space-y-1">              
            <p>⏱️ 최대 5분 소요 (기존 10분에서 단축)</p>              
            <p>🔄 시도 횟수: {attempts}/60</p>              
            {currentMusicTask && (              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">              
                <p className="font-semibold">생성 중인 음악:</p>              
                <p className="text-xs text-gray-500 mt-1">{currentMusicTask.prompt}</p>              
                <p className="text-xs text-purple-600 mt-1">스타일: {currentMusicTask.style}</p>              
              </div>              
            )}              
          </div>              
        </div>              
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

                {entry.musicTasks.length > 0 && (              
                  <div>              
                    <h4 className="font-semibold text-gray-700 mb-2">🎵 생성된 음악</h4>              
                    {entry.musicTasks.map((task, index) => (              
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">              
                        <div className="flex items-center justify-between mb-2">              
                          <span className="font-medium text-gray-800">감정 음악</span>              
                          <span className={`px-2 py-1 rounded text-xs ${              
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :              
                            task.status === 'failed' ? 'bg-red-100 text-red-800' :              
                            'bg-yellow-100 text-yellow-800'              
                          }`}>              
                            {task.status === 'completed' ? '완료' :              
                             task.status === 'failed' ? '실패' : '진행중'}              
                          </span>              
                        </div>              
                        <p className="text-sm text-gray-600 mb-2">{task.prompt}</p>              
                        <p className="text-xs text-gray-500">스타일: {task.style}</p>              
                        {task.musicUrl && (              
                          <audio controls className="w-full mt-2">              
                            <source src={task.musicUrl} type="audio/mpeg" />              
                            브라우저가 오디오를 지원하지 않습니다.              
                          </audio>              
                        )}              
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
      {currentStep === 'generating' && renderGenerating()}              
      {currentStep === 'myDiary' && renderMyDiary()}          
      {currentStep === 'musicLibrary' && renderMusicLibrary()}              
    </div>              
  );              
});

export default App;