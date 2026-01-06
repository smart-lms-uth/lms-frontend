import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="modal-overlay" 
      *ngIf="isOpen()"
      [class.modal-overlay--open]="isOpen()"
      (click)="onOverlayClick($event)">
      
      <div 
        class="modal" 
        [ngClass]="['modal--' + size]"
        (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="modal__header" *ngIf="title || showClose">
          <h3 class="modal__title" *ngIf="title">{{ title }}</h3>
          <button 
            *ngIf="showClose"
            class="modal__close" 
            (click)="close()"
            aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal__body">
          <ng-content></ng-content>
        </div>

        <!-- Footer -->
        <div class="modal__footer" *ngIf="showFooter">
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-4);
      z-index: var(--z-index-modal);
      opacity: 0;
      visibility: hidden;
      transition: opacity var(--transition-normal), visibility var(--transition-normal);
    }

    .modal-overlay--open {
      opacity: 1;
      visibility: visible;
    }

    .modal {
      background: var(--white);
      border: var(--border-width-md) solid var(--gray-200);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-xl);
      max-height: calc(100vh - var(--spacing-8));
      display: flex;
      flex-direction: column;
      transform: scale(0.95) translateY(10px);
      transition: transform var(--transition-normal);
    }

    .modal-overlay--open .modal {
      transform: scale(1) translateY(0);
    }

    .modal--sm {
      width: 100%;
      max-width: 400px;
    }

    .modal--md {
      width: 100%;
      max-width: 560px;
    }

    .modal--lg {
      width: 100%;
      max-width: 720px;
    }

    .modal--xl {
      width: 100%;
      max-width: 960px;
    }

    .modal--full {
      width: calc(100vw - var(--spacing-8));
      height: calc(100vh - var(--spacing-8));
      max-width: none;
      max-height: none;
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-4) var(--spacing-5);
      border-bottom: 1px solid var(--gray-100);
      flex-shrink: 0;
    }

    .modal__title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--gray-900);
      margin: 0;
    }

    .modal__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      border: var(--border-width-md) solid transparent;
      border-radius: var(--border-radius-md);
      color: var(--gray-400);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .modal__close:hover {
      background: var(--gray-100);
      color: var(--gray-600);
      border-color: var(--gray-200);
    }

    .modal__close:active {
      background: var(--gray-200);
    }

    .modal__body {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-5);
    }

    .modal__body::-webkit-scrollbar {
      width: 6px;
    }

    .modal__body::-webkit-scrollbar-track {
      background: var(--gray-50);
    }

    .modal__body::-webkit-scrollbar-thumb {
      background: var(--gray-300);
      border-radius: 3px;
    }

    .modal__body::-webkit-scrollbar-thumb:hover {
      background: var(--gray-400);
    }

    .modal__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--spacing-3);
      padding: var(--spacing-4) var(--spacing-5);
      border-top: 1px solid var(--gray-100);
      flex-shrink: 0;
    }
  `]
})
export class ModalComponent {
  @Input() title: string = '';
  @Input() size: ModalSize = 'md';
  @Input() showClose: boolean = true;
  @Input() showFooter: boolean = true;
  @Input() closeOnOverlay: boolean = true;
  
  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    this.closed.emit();
  }

  onOverlayClick(event: Event): void {
    if (this.closeOnOverlay) {
      this.close();
    }
  }
}
