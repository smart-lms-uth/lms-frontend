import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeneratedQuizQuestion } from '../../../../services/ai.service';
import { LEVEL_LABELS, LEVEL_BADGE_CLASSES } from '../../models/section-detail.models';

@Component({
  selector: 'app-ai-quiz-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-quiz-modal.component.html',
  styleUrls: ['./ai-quiz-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiQuizModalComponent {
  @Input() isVisible = false;
  @Input() subjectName = '';
  @Input() generatedQuestions: GeneratedQuizQuestion[] = [];
  @Input() selectedQuestions: Set<number> = new Set();
  @Input() isLoading = false;
  @Input() isSaving = false;

  @Output() close = new EventEmitter<void>();
  @Output() generate = new EventEmitter<{ topic: string; numQuestions: number; difficulty: string }>();
  @Output() toggleQuestion = new EventEmitter<number>();
  @Output() selectAll = new EventEmitter<void>();
  @Output() deselectAll = new EventEmitter<void>();
  @Output() saveToBank = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();

  topic = '';
  numQuestions = 10;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';

  get hasQuestions(): boolean {
    return this.generatedQuestions.length > 0;
  }

  get selectedCount(): number {
    return this.selectedQuestions.size;
  }

  get canGenerate(): boolean {
    return this.topic.trim().length > 0 && !this.isLoading;
  }

  get canSave(): boolean {
    return this.selectedCount > 0 && !this.isSaving;
  }

  onClose(): void {
    this.close.emit();
  }

  onGenerate(): void {
    if (!this.canGenerate) return;
    this.generate.emit({
      topic: this.topic.trim(),
      numQuestions: this.numQuestions,
      difficulty: this.difficulty
    });
  }

  onToggleQuestion(index: number): void {
    this.toggleQuestion.emit(index);
  }

  onSelectAll(): void {
    this.selectAll.emit();
  }

  onDeselectAll(): void {
    this.deselectAll.emit();
  }

  onSaveToBank(): void {
    if (this.canSave) {
      this.saveToBank.emit();
    }
  }

  onRegenerate(): void {
    this.regenerate.emit();
  }

  onClearForm(): void {
    this.topic = '';
    this.numQuestions = 10;
    this.difficulty = 'MEDIUM';
  }

  isQuestionSelected(index: number): boolean {
    return this.selectedQuestions.has(index);
  }

  getLevelLabel(level: string): string {
    return LEVEL_LABELS[level] || level;
  }

  getLevelBadgeClass(level: string): string {
    return LEVEL_BADGE_CLASSES[level] || '';
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'SINGLE': return 'Một đáp án';
      case 'MULTI': return 'Nhiều đáp án';
      default: return 'Tự luận';
    }
  }
}
