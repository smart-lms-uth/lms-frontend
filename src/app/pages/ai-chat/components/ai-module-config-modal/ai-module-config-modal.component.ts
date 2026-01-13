import { Component, Input, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { CoursePreviewModule } from '../ai-course-preview/ai-course-preview.component';
import { AiChatService } from '../../../../services/ai-chat.service';

export interface ModuleConfigContext {
  sectionIndex: number;
  moduleIndex: number;
  module: CoursePreviewModule;
}

@Component({
  selector: 'app-ai-module-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule],
  templateUrl: './ai-module-config-modal.component.html',
  styleUrl: './ai-module-config-modal.component.scss'
})
export class AiModuleConfigModalComponent {
  @Input() show = false;
  @Input() moduleConfigContext: ModuleConfigContext | null = null;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ModuleConfigContext>();

  quizAiPrompt = '';
  isGeneratingQuizQuestions = false;

  // Assignment AI Chat + Markdown Editor
  assignmentAiPrompt = '';
  isGeneratingAssignmentInstructions = false;
  assignmentViewMode: 'edit' | 'preview' = 'edit';

  textAiPrompt = '';
  isGeneratingTextContent = false;
  textViewMode: 'edit' | 'preview' = 'edit';

  constructor(
    private aiChatService: AiChatService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    if (this.moduleConfigContext) {
      this.save.emit(this.moduleConfigContext);
    }
  }

  // Quiz question management
  addQuizQuestionToModule(): void {
    if (!this.moduleConfigContext) return;
    
    if (!this.moduleConfigContext.module.quizQuestions) {
      this.moduleConfigContext.module.quizQuestions = [];
    }
    
    this.moduleConfigContext.module.quizQuestions.push({
      content: '',
      type: 'SINGLE',
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false }
      ],
      explanation: ''
    });
  }

  removeQuizQuestionFromModule(questionIndex: number): void {
    if (!this.moduleConfigContext?.module.quizQuestions) return;
    this.moduleConfigContext.module.quizQuestions.splice(questionIndex, 1);
  }

  setCorrectOption(question: any, correctIndex: number): void {
    if (!question.options) return;
    question.options.forEach((opt: any, i: number) => {
      opt.isCorrect = i === correctIndex;
    });
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Assignment requirement management
  addAssignmentRequirement(): void {
    if (!this.moduleConfigContext) return;
    
    if (!this.moduleConfigContext.module.assignmentRequirements) {
      this.moduleConfigContext.module.assignmentRequirements = [];
    }
    
    this.moduleConfigContext.module.assignmentRequirements.push('');
  }

  removeAssignmentRequirement(index: number): void {
    if (!this.moduleConfigContext?.module.assignmentRequirements) return;
    this.moduleConfigContext.module.assignmentRequirements.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  // AI Quiz generation
  generateQuizQuestionsWithAI(): void {
    if (!this.quizAiPrompt?.trim() || this.isGeneratingQuizQuestions || !this.moduleConfigContext) return;
    
    this.isGeneratingQuizQuestions = true;
    const topic = this.moduleConfigContext.module.title || 'Chung';
    
    this.aiChatService.generateQuiz(this.quizAiPrompt, topic).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.isGeneratingQuizQuestions = false;
          
          if (response.success && response.data?.questions) {
            if (!this.moduleConfigContext!.module.quizQuestions) {
              this.moduleConfigContext!.module.quizQuestions = [];
            }
            
            const newQuestions = response.data.questions.map((q: any) => ({
              content: q.content || q.question || q.text || '',
              type: q.type || 'SINGLE',
              options: (q.options || q.answers || []).map((opt: any, idx: number) => ({
                content: opt.content || opt.text || opt || '',
                isCorrect: opt.isCorrect || opt.is_correct || (q.correctAnswer === idx) || (q.correct_answer === idx) || false
              })),
              explanation: q.explanation || ''
            }));
            
            this.moduleConfigContext!.module.quizQuestions.push(...newQuestions);
            this.quizAiPrompt = '';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error generating quiz questions:', error);
        this.ngZone.run(() => {
          this.isGeneratingQuizQuestions = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Assignment Markdown Editor methods
  toggleAssignmentViewMode(): void {
    this.assignmentViewMode = this.assignmentViewMode === 'edit' ? 'preview' : 'edit';
  }

  generateAssignmentInstructionsWithAI(): void {
    if (!this.assignmentAiPrompt?.trim() || this.isGeneratingAssignmentInstructions || !this.moduleConfigContext) return;
    
    this.isGeneratingAssignmentInstructions = true;
    const topic = this.moduleConfigContext.module.title || 'Bài tập';
    
    this.aiChatService.generateAssignmentInstructions(this.assignmentAiPrompt, topic).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.isGeneratingAssignmentInstructions = false;
          
          if (response.success && response.data?.instructions) {
            if (!this.moduleConfigContext!.module.assignmentInstructions) {
              this.moduleConfigContext!.module.assignmentInstructions = '';
            }
            
            if (this.moduleConfigContext!.module.assignmentInstructions.trim()) {
              this.moduleConfigContext!.module.assignmentInstructions += '\n\n' + response.data.instructions;
            } else {
              this.moduleConfigContext!.module.assignmentInstructions = response.data.instructions;
            }
            
            this.assignmentAiPrompt = '';
            this.assignmentViewMode = 'preview';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error generating assignment instructions:', error);
        this.ngZone.run(() => {
          this.isGeneratingAssignmentInstructions = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  toggleTextViewMode(): void {
    this.textViewMode = this.textViewMode === 'edit' ? 'preview' : 'edit';
  }

  generateTextContentWithAI(): void {
    if (!this.textAiPrompt?.trim() || this.isGeneratingTextContent || !this.moduleConfigContext) return;
    
    this.isGeneratingTextContent = true;
    const topic = this.moduleConfigContext.module.title || 'Bài học';
    
    this.aiChatService.generateLecture(this.textAiPrompt, topic).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.isGeneratingTextContent = false;
          
          if (response.success && response.data) {
            let content = '';
            
            if (response.data.sections && Array.isArray(response.data.sections)) {
              content = response.data.sections.map((section: any, idx: number) => {
                let sectionContent = `## ${idx + 1}. ${section.heading || section.title || ''}\n\n`;
                if (section.content) sectionContent += section.content + '\n\n';
                if (section.key_points?.length > 0) {
                  sectionContent += '**Điểm chính:**\n' + section.key_points.map((p: string) => `- ${p}`).join('\n') + '\n\n';
                }
                if (section.examples?.length > 0) {
                  sectionContent += '**Ví dụ:**\n```\n' + section.examples.join('\n') + '\n```\n\n';
                }
                return sectionContent;
              }).join('');
            } else if (response.data.content) {
              content = response.data.content;
            }
            
            if (!this.moduleConfigContext!.module.textContent) {
              this.moduleConfigContext!.module.textContent = '';
            }
            
            if (this.moduleConfigContext!.module.textContent.trim()) {
              this.moduleConfigContext!.module.textContent += '\n\n' + content;
            } else {
              this.moduleConfigContext!.module.textContent = content;
            }
            
            this.textAiPrompt = '';
            this.textViewMode = 'preview';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error generating text content:', error);
        this.ngZone.run(() => {
          this.isGeneratingTextContent = false;
          this.cdr.detectChanges();
        });
      }
    });
  }
}
