import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Section, Module } from '../../../../services/course.service';

@Component({
  selector: 'app-course-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-sidebar.component.html',
  styleUrls: ['./course-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseSidebarComponent {
  @Input() sections: Section[] = [];
  @Input() currentSectionId: number | null = null;
  @Input() expandedSectionIds: number[] = [];
  @Input() isOpen = false;
  @Input() isLoading = false;

  @Output() close = new EventEmitter<void>();
  @Output() sectionClick = new EventEmitter<Section>();
  @Output() sectionToggle = new EventEmitter<number>();

  onClose(): void {
    this.close.emit();
  }

  onSectionClick(section: Section): void {
    this.sectionClick.emit(section);
  }

  onSectionToggle(sectionId: number, event: Event): void {
    event.stopPropagation();
    this.sectionToggle.emit(sectionId);
  }

  isExpanded(sectionId: number): boolean {
    return this.expandedSectionIds.includes(sectionId);
  }

  isActive(sectionId: number): boolean {
    return sectionId === this.currentSectionId;
  }

  trackBySection(index: number, section: Section): number {
    return section.id;
  }

  trackByModule(index: number, module: Module): number {
    return module.id;
  }

  /**
   * Handle drag start for module - sets data for chat widget drop zone
   */
  onModuleDragStart(event: DragEvent, module: Module, section: Section): void {
    if (event.dataTransfer) {
      const data = {
        type: 'module',
        id: module.id,
        title: module.title,
        sectionId: section.id,
        sectionTitle: section.title,
        moduleType: module.type
      };
      event.dataTransfer.setData('application/json', JSON.stringify(data));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
}
