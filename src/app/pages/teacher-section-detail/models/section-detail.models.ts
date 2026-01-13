import { Section, Module, Course, QuizSettings, GradingMethod, QuestionSelectionMode, ExamDistributionMode, RandomQuestionConfig } from '../../../services/course.service';
import { Chapter, Question } from '../../../services/question-bank.service';
import { QuizQuestion, AnswerRequest } from '../../../services/quiz.service';
import { GeneratedQuizQuestion } from '../../../services/ai.service';

export interface SidebarSection extends Section {
  modules?: Module[];
}

export interface SectionHeaderProps {
  section: Section;
  course: Course | null;
  sectionIndex: number;
  isEditMode: boolean;
}

export interface ModuleListProps {
  modules: Module[];
  isEditMode: boolean;
  isLoading: boolean;
}

export interface ModuleItemProps {
  module: Module;
  index: number;
  isEditMode: boolean;
}

export interface ModuleFormData {
  title: string;
  description: string;
  type: 'VIDEO' | 'RESOURCE' | 'QUIZ' | 'ASSIGNMENT' | 'LIVESTREAM' | 'FORUM';
  resourceUrl: string;
  visible: boolean;
  maxScore: number | null;
  scoreWeight: number | null;
  gradeType: 'PROCESS' | 'FINAL' | null;
  isShowInGradeTable: boolean;
  settings?: QuizSettings;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  estimatedDuration?: number;
  gradeCompositionId?: number;
  isAiGenerated?: boolean;
  aiPrompt?: string;
}

export interface QuizSettingsTabType {
  id: 'time' | 'attempt' | 'questions' | 'display' | 'review' | 'security';
  label: string;
  icon: string;
}

export interface QuizPreviewState {
  module: Module | null;
  questions: QuizQuestion[];
  answers: Map<number, AnswerRequest>;
  currentQuestionIndex: number;
  showResult: boolean;
  isLoading: boolean;
}

export interface QuizPreviewScore {
  correct: number;
  total: number;
  score: number;
  maxScore: number;
}

export interface AiQuizGenerationState {
  topic: string;
  numQuestions: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  generatedQuestions: GeneratedQuizQuestion[];
  selectedQuestions: Set<number>;
  isLoading: boolean;
  isSaving: boolean;
}

export interface QuestionSelectionState {
  chapters: Chapter[];
  questions: Question[];
  selectedChapterIds: number[];
  selectedQuestionIds: number[];
  questionsByChapter: Map<number, Question[]>;
  isChaptersLoading: boolean;
  isQuestionsLoading: boolean;
}

export const MODULE_TYPE_LABELS: Record<string, string> = {
  'VIDEO': 'Video',
  'RESOURCE': 'Tài liệu',
  'QUIZ': 'Trắc nghiệm',
  'ASSIGNMENT': 'Bài tập',
  'LIVESTREAM': 'Livestream',
  'FORUM': 'Thảo luận'
};

export const LEVEL_LABELS: Record<string, string> = {
  'EASY': 'Dễ',
  'MEDIUM': 'TB',
  'HARD': 'Khó'
};

export const LEVEL_BADGE_CLASSES: Record<string, string> = {
  'EASY': 'badge--easy',
  'MEDIUM': 'badge--medium',
  'HARD': 'badge--hard'
};

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  durationMinutes: 60,
  maxAttempts: 1,
  gradingMethod: 'HIGHEST',
  questionSelectionMode: 'MANUAL',
  distributionMode: 'SAME_FOR_ALL',
  selectedQuestionIds: [],
  randomConfig: {
    fromChapterIds: [],
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0
  },
  shuffleQuestions: true,
  shuffleAnswers: true,
  oneQuestionPerPage: false,
  allowBackNavigation: true,
  showQuestionNumber: true,
  showPointsPerQuestion: false,
  showCorrectAnswers: false,
  allowReview: true,
  showScoreImmediately: true,
  requireFullscreen: false,
  detectTabSwitch: false,
  maxTabSwitchCount: 3,
  requireWebcam: false
};
