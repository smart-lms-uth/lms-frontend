import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Module, QuizSettings, Course } from '../../../../services/course.service';
import { Chapter, Question } from '../../../../services/question-bank.service';
import { ModuleFormData, DEFAULT_QUIZ_SETTINGS } from '../../models/section-detail.models';
import { QuizSettingsComponent } from '../quiz-settings/quiz-settings.component';

type QuizTabType = 'time' | 'attempt' | 'questions' | 'display' | 'review' | 'security';

@Component({
  selector: 'app-module-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, QuizSettingsComponent],
  templateUrl: './module-modal.component.html',
  styleUrls: ['./module-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleModalComponent {
  @Input() isVisible = false;
  @Input() editingModule: Module | null = null;
  @Input() course: Course | null = null;
  @Input() chapters: Chapter[] = [];
  @Input() questions: Question[] = [];
  @Input() questionsByChapter: Map<number, Question[]> = new Map();
  @Input() selectedChapterIds: number[] = [];
  @Input() selectedQuestionIds: number[] = [];
  @Input() isChaptersLoading = false;
  @Input() isQuestionsLoading = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ form: ModuleFormData; settings: QuizSettings }>();
  @Output() tabChange = new EventEmitter<QuizTabType>();
  @Output() chapterToggle = new EventEmitter<number>();
  @Output() questionToggle = new EventEmitter<number>();
  @Output() openAiModal = new EventEmitter<void>();

  title = '';
  description = '';
  type: ModuleFormData['type'] = 'VIDEO';
  resourceUrl = '';
  visible = true;
  maxScore: number | null = null;
  scoreWeight: number | null = null;
  gradeType: 'PROCESS' | 'FINAL' | null = null;
  isShowInGradeTable = true;

  quizSettings: QuizSettings = { ...DEFAULT_QUIZ_SETTINGS };
  activeQuizTab: QuizTabType = 'time';

  get isEditMode(): boolean {
    return this.editingModule !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Chỉnh sửa Module' : 'Thêm Module mới';
  }

  get isQuizType(): boolean {
    return this.type === 'QUIZ';
  }

  get isGradeableType(): boolean {
    return this.type === 'QUIZ' || this.type === 'ASSIGNMENT';
  }

  get isValid(): boolean {
    return this.title.trim().length > 0;
  }

  ngOnChanges(): void {
    if (this.isVisible) {
      if (this.editingModule) {
        this.loadFromModule(this.editingModule);
      } else {
        this.reset();
      }
    }
  }

  loadFromModule(module: Module): void {
    this.title = module.title;
    this.description = module.description || '';
    this.type = module.type;
    this.resourceUrl = module.resourceUrl || '';
    this.visible = module.visible;
    this.maxScore = module.maxScore ?? null;
    this.scoreWeight = module.scoreWeight ?? null;
    this.gradeType = module.gradeType ?? null;
    this.isShowInGradeTable = module.isShowInGradeTable ?? true;

    if (module.type === 'QUIZ' && module.settings) {
      this.quizSettings = { ...DEFAULT_QUIZ_SETTINGS, ...module.settings };
    } else {
      this.quizSettings = { ...DEFAULT_QUIZ_SETTINGS };
    }
    this.activeQuizTab = 'time';
  }

  reset(): void {
    this.title = '';
    this.description = '';
    this.type = 'VIDEO';
    this.resourceUrl = '';
    this.visible = true;
    this.maxScore = null;
    this.scoreWeight = null;
    this.gradeType = null;
    this.isShowInGradeTable = true;
    this.quizSettings = { ...DEFAULT_QUIZ_SETTINGS };
    this.activeQuizTab = 'time';
  }

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    if (!this.isValid) return;

    const formData: ModuleFormData = {
      title: this.title.trim(),
      description: this.description.trim(),
      type: this.type,
      resourceUrl: this.resourceUrl.trim(),
      visible: this.visible,
      maxScore: this.maxScore,
      scoreWeight: this.scoreWeight,
      gradeType: this.gradeType,
      isShowInGradeTable: this.isShowInGradeTable
    };

    this.save.emit({ form: formData, settings: this.quizSettings });
  }

  onTabChange(tab: QuizTabType): void {
    this.activeQuizTab = tab;
    this.tabChange.emit(tab);
  }

  onChapterToggle(chapterId: number): void {
    this.chapterToggle.emit(chapterId);
  }

  onQuestionToggle(questionId: number): void {
    this.questionToggle.emit(questionId);
  }

  onOpenAiModal(): void {
    this.openAiModal.emit();
  }

  onSettingsChange(settings: QuizSettings): void {
    this.quizSettings = settings;
  }
}
