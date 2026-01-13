import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

export interface CoursePreviewModule {
  id?: number; // ID nếu đang update module có sẵn
  title: string;
  type: 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  description?: string;
  isVisible?: boolean;
  videoUrl?: string;
  videoDuration?: number;
  documentUrl?: string;
  documentFile?: string;
  textContent?: string;
  quizQuestions?: any[];
  quizTimeLimit?: number;
  quizPassingScore?: number;
  quizOpenTime?: string;
  quizCloseTime?: string;
  quizMaxAttempts?: number;
  quizShuffleQuestions?: boolean;
  assignmentDeadlineDays?: number;
  assignmentMaxScore?: number;
  assignmentRequirements?: string[];
  assignmentInstructions?: string; // Markdown instructions
}

export interface CoursePreviewSection {
  id?: number; // ID nếu đang update section có sẵn
  title: string;
  description?: string;
  modules: CoursePreviewModule[];
  collapsed?: boolean;
}

export interface CoursePreview {
  name: string;
  description: string;
  objectives: string[];
  sections: CoursePreviewSection[];
}

@Component({
  selector: 'app-ai-course-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './ai-course-preview.component.html',
  styleUrl: './ai-course-preview.component.scss'
})
export class AiCoursePreviewComponent {
  @Input() coursePreview: CoursePreview | null = null;
  @Input() isSaving = false;
  @Input() isEditMode = false;
  
  @Output() resetPreview = new EventEmitter<void>();
  @Output() saveCourse = new EventEmitter<void>();
  @Output() createNewCourse = new EventEmitter<void>();
  @Output() openModuleConfig = new EventEmitter<{ sectionIndex: number; moduleIndex: number }>();

  // Drag & Drop for sections
  dropSection(event: CdkDragDrop<CoursePreviewSection[]>): void {
    if (!this.coursePreview) return;
    moveItemInArray(this.coursePreview.sections, event.previousIndex, event.currentIndex);
  }

  // Drag & Drop for modules within/between sections
  dropModule(event: CdkDragDrop<CoursePreviewModule[]>): void {
    if (event.previousContainer === event.container) {
      // Same section - reorder
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Different section - transfer
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  // Get connected drop lists for modules (allow cross-section drop)
  getConnectedLists(): string[] {
    if (!this.coursePreview) return [];
    return this.coursePreview.sections.map((_, i) => `module-list-${i}`);
  }

  addSection(): void {
    if (!this.coursePreview) return;
    
    this.coursePreview.sections.push({
      title: `Section ${this.coursePreview.sections.length + 1}`,
      description: '',
      modules: [],
      collapsed: false
    });
  }

  removeSection(index: number): void {
    if (!this.coursePreview) return;
    this.coursePreview.sections.splice(index, 1);
  }

  toggleSection(index: number): void {
    if (!this.coursePreview) return;
    this.coursePreview.sections[index].collapsed = !this.coursePreview.sections[index].collapsed;
  }

  addModule(sectionIndex: number): void {
    if (!this.coursePreview) return;
    
    this.coursePreview.sections[sectionIndex].modules.push({
      title: 'Module mới',
      type: 'TEXT',
      description: ''
    });
  }

  removeModule(sectionIndex: number, moduleIndex: number): void {
    if (!this.coursePreview) return;
    this.coursePreview.sections[sectionIndex].modules.splice(moduleIndex, 1);
  }

  addObjective(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    
    if (value && this.coursePreview) {
      this.coursePreview.objectives.push(value);
      input.value = '';
    }
  }

  removeObjective(index: number): void {
    if (!this.coursePreview) return;
    this.coursePreview.objectives.splice(index, 1);
  }

  onOpenModuleConfig(sectionIndex: number, moduleIndex: number): void {
    this.openModuleConfig.emit({ sectionIndex, moduleIndex });
  }

  onReset(): void {
    this.resetPreview.emit();
  }

  onSave(): void {
    this.saveCourse.emit();
  }

  onCreateNew(): void {
    this.createNewCourse.emit();
  }
}
