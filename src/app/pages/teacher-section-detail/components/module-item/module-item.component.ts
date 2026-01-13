import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Module } from '../../../../services/course.service';
import { MODULE_TYPE_LABELS } from '../../models/section-detail.models';

@Component({
  selector: 'app-module-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './module-item.component.html',
  styleUrls: ['./module-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleItemComponent {
  @Input({ required: true }) module!: Module;
  @Input() index = 0;
  @Input() isEditMode = false;
  @Input() isDragging = false;

  @Output() view = new EventEmitter<Module>();
  @Output() edit = new EventEmitter<Module>();
  @Output() toggleVisibility = new EventEmitter<Module>();
  @Output() delete = new EventEmitter<Module>();

  get typeLabel(): string {
    return MODULE_TYPE_LABELS[this.module.type] || this.module.type;
  }

  get iconClass(): string {
    return `module-item__icon--${this.module.type.toLowerCase()}`;
  }

  onView(): void {
    this.view.emit(this.module);
  }

  onEdit(): void {
    this.edit.emit(this.module);
  }

  onToggleVisibility(): void {
    this.toggleVisibility.emit(this.module);
  }

  onDelete(): void {
    this.delete.emit(this.module);
  }
}
