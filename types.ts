export type Language = 'om' | 'am' | 'en' | 'mixed';

export type Mode =
  | 'casual'
  | 'friends'
  | 'family'
  | 'business'
  | 'school'
  | 'interview'
  | 'customer_service'
  | 'debate'
  | 'storytelling'
  | 'travel'
  | 'healthcare'
  | 'daily_life'
  | 'language_learning'
  | 'roleplay';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type Tone =
  | 'formal'
  | 'informal'
  | 'funny'
  | 'serious'
  | 'friendly'
  | 'professional';

export type Length = 'short' | 'medium' | 'long';

export interface Speaker {
  id: string;
  name: string;
  role: string;
  gender: 'male' | 'female';
  avatarColor: string;
  voiceName: string;
}

export interface VocabularyItem {
  word: string;
  pronunciation: string;
  translation_en: string;
  translation_om: string;
  translation_am: string;
  partOfSpeech: string;
  usageNote: string;
}

export interface DialogueTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  transliteration: string;
  translation_en: string;
  translation_om: string;
  translation_am: string;
  vocabulary: VocabularyItem[];
  grammarNote?: string;
  culturalNote?: string;
  audioBase64?: string;
}

export interface Conversation {
  id: string;
  title: string;
  topic: string;
  mode: Mode;
  language: Language;
  difficulty: Difficulty;
  tone: Tone;
  speakers: [Speaker, Speaker];
  turns: DialogueTurn[];
  culturalOverview: string;
  learningSummary: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PresetTopic {
  id: string;
  title: string;
  titleOm: string;
  titleAm: string;
  category: Mode;
  icon: string;
  description: string;
  defaultLanguage: Language;
}
