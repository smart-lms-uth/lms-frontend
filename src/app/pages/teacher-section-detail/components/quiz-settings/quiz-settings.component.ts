import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuizSettings, RandomQuestionConfig } from '../../../../services/course.service';
import { Chapter, Question } from '../../../../services/question-bank.service';
import { LEVEL_LABELS, LEVEL_BADGE_CLASSES } from '../../models/section-detail.models';

type QuizTabType = 'time' | 'attempt' | 'questions' | 'display' | 'review' | 'security';

@Component({
  selector: 'app-quiz-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-settings.component.html',
  styleUrls: ['./quiz-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizSettingsComponent {
  @Input() settings!: QuizSettings;
  @Input() chapters: Chapter[] = [];
  @Input() questions: Question[] = [];
  @Input() questionsByChapter: Map<number, Question[]> = new Map();
  @Input() selectedChapterIds: number[] = [];
  @Input() selectedQuestionIds: number[] = [];
  @Input() isChaptersLoading = false;
  @Input() isQuestionsLoading = false;
  @Input() activeTab: QuizTabType = 'time';

  @Output() settingsChange = new EventEmitter<QuizSettings>();
  @Output() tabChange = new EventEmitter<QuizTabType>();
  @Output() chapterToggle = new EventEmitter<number>();
  @Output() questionToggle = new EventEmitter<number>();
  @Output() openAiModal = new EventEmitter<void>();

  setTab(tab: QuizTabType): void {
    this.tabChange.emit(tab);
  }

  onSettingsChange(): void {
    this.settingsChange.emit(this.settings);
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

  isChapterSelected(chapterId: number): boolean {
    return this.selectedChapterIds.includes(chapterId);
  }

  isQuestionSelected(questionId: number): boolean {
    return this.selectedQuestionIds.includes(questionId);
  }

  getQuestionsForChapter(chapterId: number): Question[] {
    return this.questionsByChapter.get(chapterId) || [];
  }

  getRandomTotalCount(): number {
    const config = this.settings.randomConfig;
    if (!config) return 0;
    return (config.easyCount || 0) + (config.mediumCount || 0) + (config.hardCount || 0);
  }

  getLevelLabel(level: string): string {
    return LEVEL_LABELS[level] || level;
  }

  getLevelBadgeClass(level: string): string {
    return LEVEL_BADGE_CLASSES[level] || '';
  }
}
