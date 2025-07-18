import Dexie, { Table } from 'dexie';

export interface DiaryEntry {
  id?: number;
  date: string;
  time: string;
  mood: string;
  summary: string;
  keywords: string[];
  musicAdvice: string[];
  musicPlayed: any[];
  musicRating: number;
  chatMessages: any[];
  experienceGained: number;
  isPremium: boolean;
  createdAt: Date;
}

export interface MusicSession {
  id?: number;
  date: string;
  mood: string;
  genre: string;
  videoId: string;
  videoTitle: string;
  effectivenessRating: number;
  durationMinutes: number;
  notes: string;
  experienceGained: number;
  createdAt: Date;
}

export interface PersonalMusic {
  id?: number;
  videoId: string;
  videoTitle: string;
  mood: string;
  genre: string;
  rating: number;
  playCount: number;
  lastPlayed: string;
  averageRating: number;
  createdAt: Date;
}

export interface UserProgress {
  id?: number;
  userId: string;
  level: number;
  experience: number;
  totalMusicSessions: number;
  consecutiveDays: number;
  achievements: string[];
  isPremium: boolean;
  premiumStartDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeletedEntry {
  id?: number;
  originalId: number;
  date: string;
  time: string;
  mood: string;
  summary: string;
  keywords: string[];
  musicAdvice: string[];
  musicPlayed: any[];
  musicRating: number;
  chatMessages: any[];
  deletedDate: string;
  autoDeleteDate: string;
  createdAt: Date;
}

export interface AppSetting {
  id?: number;
  settingKey: string;
  settingValue: string;
  updatedAt: Date;
}

class MusicDiaryDB extends Dexie {
  diaryEntries!: Table<DiaryEntry>;
  musicSessions!: Table<MusicSession>;
  personalMusic!: Table<PersonalMusic>;
  userProgress!: Table<UserProgress>;
  deletedEntries!: Table<DeletedEntry>;
  appSettings!: Table<AppSetting>;

  constructor() {
    super('MusicDiaryDB');
    
    this.version(1).stores({
      diaryEntries: '++id, date, time, mood, createdAt',
      musicSessions: '++id, date, mood, genre, createdAt',
      personalMusic: '++id, videoId, mood, genre, lastPlayed',
      userProgress: '++id, userId, level, experience, updatedAt',
      deletedEntries: '++id, originalId, deletedDate, autoDeleteDate',
      appSettings: '++id, settingKey, updatedAt'
    });
  }
}

export const db = new MusicDiaryDB();

// 초기화 함수
export const initializeDB = async () => {
  try {
    // 기본 사용자 진행상황 초기화
    const existingProgress = await db.userProgress.where('userId').equals('default').first();
    if (!existingProgress) {
      await db.userProgress.add({
        userId: 'default',
        level: 1,
        experience: 0,
        totalMusicSessions: 0,
        consecutiveDays: 0,
        achievements: [],
        isPremium: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
    return false;
  }
};