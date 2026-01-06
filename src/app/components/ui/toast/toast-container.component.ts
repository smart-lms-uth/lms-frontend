import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts(); trackBy: trackByFn"
        class="toast"
        [ngClass]="['toast--' + toast.type]"
        (click)="toast.dismissible && dismiss(toast.id)">
        
        <div class="toast__icon">
          <!-- Success Icon -->
          <svg *ngIf="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          
          <!-- Error Icon -->
          <svg *ngIf="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          
          <!-- Warning Icon -->
          <svg *ngIf="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          
          <!-- Info Icon -->
          <svg *ngIf="toast.type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>

        <div class="toast__content">
          <p class="toast__title">{{ toast.title }}</p>
          <p class="toast__message" *ngIf="toast.message">{{ toast.message }}</p>
        </div>

        <button 
          *ngIf="toast.dismissible"
          class="toast__close" 
          (click)="dismiss(toast.id); $event.stopPropagation()"
          aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: var(--spacing-4);
      right: var(--spacing-4);
      z-index: var(--z-index-toast);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      max-width: 400px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-3);
      padding: var(--spacing-3) var(--spacing-4);
      background: var(--white);
      border: var(--border-width-md) solid var(--gray-200);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toast--success {
      border-color: var(--success-500);
      background: color-mix(in srgb, var(--success-500) 5%, transparent);
    }

    .toast--success .toast__icon {
      color: var(--success-500);
    }

    .toast--error {
      border-color: var(--error-500);
      background: color-mix(in srgb, var(--error-500) 5%, transparent);
    }

    .toast--error .toast__icon {
      color: var(--error-500);
    }

    .toast--warning {
      border-color: var(--warning-500);
      background: color-mix(in srgb, var(--warning-500) 5%, transparent);
    }

    .toast--warning .toast__icon {
      color: var(--warning-500);
    }

    .toast--info {
      border-color: var(--primary-500);
      background: color-mix(in srgb, var(--primary-500) 5%, transparent);
    }

    .toast--info .toast__icon {
      color: var(--primary-500);
    }

    .toast__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .toast__content {
      flex: 1;
      min-width: 0;
    }

    .toast__title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--gray-900);
      margin: 0;
    }

    .toast__message {
      font-size: var(--font-size-xs);
      color: var(--gray-600);
      margin: var(--spacing-1) 0 0 0;
    }

    .toast__close {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: transparent;
      border: none;
      border-radius: var(--border-radius-sm);
      color: var(--gray-400);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .toast__close:hover {
      background: var(--gray-100);
      color: var(--gray-600);
    }

    @media (max-width: 480px) {
      .toast-container {
        left: var(--spacing-4);
        right: var(--spacing-4);
        max-width: none;
      }
    }
  `]
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);

  toasts = this.toastService.toastList;

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  trackByFn(index: number, toast: Toast): string {
    return toast.id;
  }
}
