import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Section, Course } from '../../../../services/course.service';
import { CardComponent, BadgeComponent } from '../../../../components/ui';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [CommonModule, CardComponent, BadgeComponent],
  templateUrl: './section-header.component.html',
  styleUrls: ['./section-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionHeaderComponent {
  @Input({ required: true }) section!: Section;
  @Input() course: Course | null = null;
  @Input() sectionIndex = 1;
  @Input() isEditMode = false;

  @Output() edit = new EventEmitter<void>();
  @Output() toggleVisibility = new EventEmitter<void>();

  onEdit(): void {
    this.edit.emit();
  }

  onToggleVisibility(): void {
    this.toggleVisibility.emit();
  }
}
