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
}

interface DiaryEntry {  
 id: string;  
 date: string;  
 time: string;  
 mood: 'good' | 'normal' | 'bad';  
 summary: string;  
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

const App: React.FC = memo(() => {  
 // 상태 관리  
 const [currentStep, setCurrentStep] = useState<'mood' | 'chat' | 'summary' | 'myDiary' | 'generating'>('mood');  
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
         max_tokens: 300,  
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
     console.error('API 키 확인:', process.env.REACT_APP_OPENAI_API_KEY ? '설정됨' : '없음');
     // 개발 모드에서는 기본 응답 반환
     if (!process.env.REACT_APP_OPENAI_API_KEY) {
       return '안녕하세요! AI 기능을 사용하려면 OpenAI API 키가 필요해요. 💜';
     }
     throw error;  
   }  
 };

 // Suno API로 음악 생성 (직접 호출)
 const generateMusicWithSuno = async (prompt: string, style: string, title: string): Promise<SunoMusicTask> => {  
   try {  
     console.log('Suno API 호출 시작:', { prompt, style, title });  
       
     // 로컬 개발 모드에서는 항상 모의 데이터 사용
     console.warn('로컬 개발 모드: 모의 데이터를 사용합니다.');
     return {
       taskId: `mock-${Date.now()}`,
       status: 'pending',
       prompt,
       style,
       title,
       createdAt: new Date()
     };
     
     const response = await fetch('https://api.suno.ai/api/generate/v2', {  
       method: 'POST',  
       headers: {  
         'Content-Type': 'application/json',  
         'Authorization': `Bearer ${process.env.REACT_APP_SUNO_API_KEY}`
       },  
       body: JSON.stringify({  
         prompt,  
         make_instrumental: true,  
         wait_audio: false  
       })  
     });

     const data = await response.json();  
     console.log('Suno API 응답:', data);  
       
     if (data && data[0] && data[0].id) {  
       return {  
         taskId: data[0].id,  
         status: 'pending',  
         prompt,  
         style,  
         title,  
         createdAt: new Date()  
       };  
     } else {  
       throw new Error('Suno API 응답 형식 오류');  
     }  
   } catch (error) {  
     console.error('Suno 음악 생성 오류:', error);  
     
     // 오류 시에도 모의 데이터 반환
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

 // Suno 작업 상태 체크 (직접 호출)
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
       createdAt: currentMusicTask?.createdAt || new Date(),  
       musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',  
       streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'  
     };  
   }

   try {  
     const response = await fetch(`https://api.suno.ai/api/feed/?ids=${taskId}`, {  
       method: 'GET',  
       headers: {  
         'Authorization': `Bearer ${process.env.REACT_APP_SUNO_API_KEY}`
       }  
     });

     const data = await response.json();  
     
     if (data && data[0]) {  
       const songData = data[0];  
       
       let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';  
       let musicUrl: string | undefined;  
       let streamUrl: string | undefined;  
       
       if (songData.status === 'complete' && songData.audio_url) {  
         status = 'completed';  
         musicUrl = songData.audio_url;  
         streamUrl = songData.audio_url;  
       } else if (songData.status === 'error') {  
         status = 'failed';  
       } else if (songData.status === 'submitted' || songData.status === 'queued') {  
         status = 'processing';  
       }  
       
       return {  
         taskId,  
         status,  
         prompt: currentMusicTask?.prompt || songData.prompt || '',  
         style: currentMusicTask?.style || '',  
         title: currentMusicTask?.title || songData.title || '',  
         createdAt: currentMusicTask?.createdAt || new Date(),  
         musicUrl,  
         streamUrl,  
         error: songData.error_message  
       };  
     } else {  
       throw new Error('작업을 찾을 수 없습니다.');  
     }  
   } catch (error) {  
     console.error('Suno 작업 상태 확인 오류:', error);  
     
     // 개발 모드에서는 모의 완료 상태 반환
     return {
       taskId,
       status: 'completed',
       prompt: currentMusicTask?.prompt || '',
       style: currentMusicTask?.style || '',
       title: currentMusicTask?.title || '',
       createdAt: currentMusicTask?.createdAt || new Date(),
       musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
       streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
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

 // 대화 요약 및 음악 프롬프트 생성  
 const generateConversationSummary = async (messages: ChatMessage[]): Promise<SummaryData> => {  
   const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content).join('\n');

   if (!userMessages.trim()) {  
     return {  
       summary: '오늘도 감정을 나누며 이야기를 해봤어요.',  
       keywords: ['#감정나눔'],  
       recommendedEmotions: ['평온', '만족', '편안'],  
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

     return {  
       summary: summary || '오늘의 감정과 상황을 나누었어요.',  
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
       keywords: ['#감정나눔'],  
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

 // 요약 생성 핸들러  
 const handleGenerateSummary = async () => {  
   if (!currentMood || chatMessages.length === 0) return;  
   setIsLoading(true);  
     
   try {  
     const summary = await generateConversationSummary(chatMessages);  
     setSummaryData(summary);  
     setSelectedEmotions([]);  
     setCurrentStep('summary');  
   } catch (error) {  
     console.error('요약 생성 오류:', error);  
     alert('요약 생성 중 문제가 발생했습니다.');  
   } finally {  
     setIsLoading(false);  
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

     // Suno API로 음악 생성  
     const musicTask = await generateMusicWithSuno(  
       summaryData.musicPrompt || 'A calming ambient music',  
       summaryData.musicStyle || 'Ambient',  
       summaryData.musicTitle || 'Emotional Journey'  
     );  
       
     setCurrentMusicTask(musicTask);  
       
     // 작업 상태 확인
     let completedTask: SunoMusicTask = musicTask;  
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
       
     clearInterval(progressInterval);  
     setGenerationProgress(100);  
       
     if (completedTask.status !== 'completed') {  
       throw new Error('음악 생성이 시간 초과되었습니다.');  
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
           disabled={chatMessages.length <= 1}  
         >  
           📝 AI 음악 생성하기  
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

 // 요약 화면  
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
             </div>  
           </div>  
             
           <div className="text-center">  
             <button   
               onClick={handleGenerateMusicAndSave}   
               disabled={isLoading}   
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
           잠시만 기다려주세요. 곧 완성됩니다!  
         </p>  
       </div>  
     </div>  
   </div>  
 );

 // 내 일기 화면  
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
                           </div>  
                           
                           {task.status === 'completed' && task.musicUrl && (  
                             <>  
                               {/* 오디오 플레이어 추가 */}  
                               <audio   
                                 controls   
                                 className="w-full mb-2"  
                                 src={task.musicUrl || task.streamUrl}  
                               >  
                                 Your browser does not support the audio element.  
                               </audio>  
                               
                               {/* 다운로드 및 새 창에서 열기 버튼 */}  
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
   default:   
     return renderMoodSelection();  
 }  
});

export default App;