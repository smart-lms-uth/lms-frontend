import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="btn"
      [ngClass]="[
        'btn--' + variant,
        'btn--' + size,
        outline ? 'btn--outline' : '',
        loading ? 'btn--loading' : '',
        fullWidth ? 'btn--full' : '',
        iconOnly ? 'btn--icon-only' : ''
      ]"
      [disabled]="disabled || loading"
      [type]="type"
      (click)="onClick.emit($event)">
      
      <svg *ngIf="loading" class="btn__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>

      <span *ngIf="iconLeft && !loading" class="btn__icon btn__icon--left" [innerHTML]="iconLeft"></span>
      <span class="btn__content" *ngIf="!iconOnly"><ng-content></ng-content></span>
      <span *ngIf="iconRight && !loading" class="btn__icon btn__icon--right" [innerHTML]="iconRight"></span>
      <span *ngIf="iconOnly" class="btn__icon" [innerHTML]="iconOnly"></span>
    </button>
  `,
  styles: [`
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-2);
      padding: var(--spacing-2) var(--spacing-4);
      background: var(--primary-500);
      border: 2px solid var(--primary-500);
      border-radius: var(--border-radius-md);
      color: #ffffff;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }

    .btn:hover:not(:disabled) { background: var(--primary-600); border-color: var(--primary-600); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn--sm { padding: var(--spacing-1) var(--spacing-3); font-size: var(--font-size-xs); }
    .btn--lg { padding: var(--spacing-3) var(--spacing-6); font-size: var(--font-size-base); }
    .btn--full { width: 100%; }
    .btn--icon-only { padding: var(--spacing-2); width: 40px; height: 40px; }

    .btn--secondary { background: var(--secondary-500); border-color: var(--secondary-500); }
    .btn--secondary:hover:not(:disabled) { background: var(--secondary-600); border-color: var(--secondary-600); }

    .btn--success { background: var(--success-500); border-color: var(--success-500); }
    .btn--warning { background: var(--warning-500); border-color: var(--warning-500); }
    .btn--danger { background: var(--error-500); border-color: var(--error-500); }

    .btn--ghost { background: transparent; border-color: transparent; color: var(--gray-600); }
    .btn--ghost:hover:not(:disabled) { background: var(--gray-100); color: var(--gray-800); }

    .btn--outline { background: transparent; }
    .btn--outline.btn--primary { color: var(--primary-600); border-color: var(--primary-500); }
    .btn--outline.btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--primary-500) 8%, white); }
    .btn--outline.btn--secondary { color: var(--secondary-600); border-color: var(--secondary-500); }
    .btn--outline.btn--secondary:hover:not(:disabled) { background: color-mix(in srgb, var(--secondary-500) 8%, white); }
    .btn--outline.btn--success { color: var(--success-500); border-color: var(--success-500); }
    .btn--outline.btn--danger { color: var(--error-500); border-color: var(--error-500); }

    .btn--loading { pointer-events: none; }

    .btn__spinner { width: 18px; height: 18px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .btn__icon { display: flex; align-items: center; justify-content: center; }
    .btn__icon ::ng-deep svg { width: 18px; height: 18px; }
    .btn__content { display: flex; align-items: center; }
  `]
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() outline: boolean = false;
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullWidth: boolean = false;
  @Input() iconLeft?: string;
  @Input() iconRight?: string;
  @Input() iconOnly?: string;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
