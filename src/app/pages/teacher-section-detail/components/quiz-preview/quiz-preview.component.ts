import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Module } from '../../../../services/course.service';
import { QuizQuestion, AnswerRequest } from '../../../../services/quiz.service';
import { QuizPreviewScore } from '../../models/section-detail.models';

@Component({
  selector: 'app-quiz-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-preview.component.html',
  styleUrls: ['./quiz-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizPreviewComponent {
  @Input() module: Module | null = null;
  @Input() questions: QuizQuestion[] = [];
  @Input() answers: Map<number, AnswerRequest> = new Map();
  @Input() currentQuestionIndex = 0;
  @Input() showResult = false;
  @Input() isLoading = false;
  @Input() isVisible = false;

  @Output() close = new EventEmitter<void>();
  @Output() answerSelect = new EventEmitter<{ questionId: number; optionId: number; isMulti: boolean }>();
  @Output() fillAnswer = new EventEmitter<{ questionId: number; text: string }>();
  @Output() navigate = new EventEmitter<number>();
  @Output() submit = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);

  get currentQuestion(): QuizQuestion | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  onClose(): void {
    this.close.emit();
  }

  onSelectAnswer(questionId: number, optionId: number, isMulti: boolean): void {
    if (this.showResult) return;
    this.answerSelect.emit({ questionId, optionId, isMulti });
  }

  onFillAnswer(questionId: number, text: string): void {
    if (this.showResult) return;
    this.fillAnswer.emit({ questionId, text });
  }

  onNavigate(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.navigate.emit(index);
    }
  }

  onSubmit(): void {
    this.submit.emit();
  }

  onReset(): void {
    this.reset.emit();
  }

  isOptionSelected(questionId: number, optionId: number): boolean {
    const answer = this.answers.get(questionId);
    if (!answer) return false;
    if (answer.selectedOptionId === optionId) return true;
    if (answer.selectedOptionIds?.includes(optionId)) return true;
    return false;
  }

  getFillAnswer(questionId: number): string {
    return this.answers.get(questionId)?.textAnswer || '';
  }

  isAnswerCorrect(questionId: number, optionId: number): boolean | null {
    if (!this.showResult) return null;
    const qq = this.questions.find(q => q.question.id === questionId);
    if (!qq) return null;
    return qq.question.options.find(o => o.id === optionId)?.isCorrect || false;
  }

  calculateScore(): QuizPreviewScore {
    let correct = 0;
    let score = 0;
    let maxScore = 0;

    this.questions.forEach(qq => {
      const answer = this.answers.get(qq.question.id);
      maxScore += qq.point;

      if (qq.question.type === 'SINGLE') {
        const correctOption = qq.question.options.find(o => o.isCorrect);
        if (correctOption && answer?.selectedOptionId === correctOption.id) {
          correct++;
          score += qq.point;
        }
      } else if (qq.question.type === 'MULTI') {
        const correctIds = qq.question.options.filter(o => o.isCorrect).map(o => o.id);
        const selectedIds = answer?.selectedOptionIds || [];
        if (correctIds.length === selectedIds.length &&
            correctIds.every(id => selectedIds.includes(id))) {
          correct++;
          score += qq.point;
        }
      } else if (qq.question.type === 'FILL') {
        if (answer?.textAnswer) {
          correct++;
          score += qq.point;
        }
      }
    });

    return { correct, total: this.questions.length, score, maxScore };
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getQuestionTypeLabel(type: string): string {
    switch (type) {
      case 'SINGLE': return 'Một đáp án';
      case 'MULTI': return 'Nhiều đáp án';
      default: return 'Tự luận';
    }
  }
}
