import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Module } from '../../../../services/course.service';
import { CardComponent } from '../../../../components/ui';
import { ModuleItemComponent } from '../module-item/module-item.component';

@Component({
  selector: 'app-module-list',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList, CardComponent, ModuleItemComponent],
  templateUrl: './module-list.component.html',
  styleUrls: ['./module-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleListComponent {
  @Input() modules: Module[] = [];
  @Input() isEditMode = false;
  @Input() isLoading = false;
  @Input() hasOrderChanged = false;

  @Output() addModule = new EventEmitter<void>();
  @Output() viewModule = new EventEmitter<Module>();
  @Output() editModule = new EventEmitter<Module>();
  @Output() deleteModule = new EventEmitter<Module>();
  @Output() toggleModuleVisibility = new EventEmitter<Module>();
  @Output() reorder = new EventEmitter<CdkDragDrop<Module[]>>();
  @Output() saveOrder = new EventEmitter<void>();

  onAddModule(): void {
    this.addModule.emit();
  }

  onViewModule(module: Module): void {
    this.viewModule.emit(module);
  }

  onEditModule(module: Module): void {
    this.editModule.emit(module);
  }

  onDeleteModule(module: Module): void {
    this.deleteModule.emit(module);
  }

  onToggleVisibility(module: Module): void {
    this.toggleModuleVisibility.emit(module);
  }

  onDrop(event: CdkDragDrop<Module[]>): void {
    this.reorder.emit(event);
  }

  onSaveOrder(): void {
    this.saveOrder.emit();
  }

  trackByModule(index: number, module: Module): number {
    return module.id;
  }
}
