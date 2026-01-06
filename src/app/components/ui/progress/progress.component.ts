import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-wrapper">
      <div class="progress-header" *ngIf="label || showValue">
        <span class="progress-label" *ngIf="label">{{ label }}</span>
        <span class="progress-value" *ngIf="showValue">{{ value }}%</span>
      </div>
      
      <div 
        class="progress-bar"
        [ngClass]="['progress-bar--' + variant, 'progress-bar--' + size]"
        [class.progress-bar--striped]="striped"
        [class.progress-bar--animated]="animated"
        role="progressbar"
        [attr.aria-valuenow]="value"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="100">
        
        <div 
          class="progress-bar__fill"
          [style.width.%]="clampedValue">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progress-wrapper {
      width: 100%;
    }

    .progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-1);
    }

    .progress-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--gray-700);
    }

    .progress-value {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--gray-600);
    }

    .progress-bar {
      width: 100%;
      background: var(--gray-100);
      border: 1px solid var(--gray-200);
      border-radius: var(--border-radius-full);
      overflow: hidden;
    }

    .progress-bar--sm {
      height: 6px;
    }

    .progress-bar--md {
      height: 10px;
    }

    .progress-bar--lg {
      height: 16px;
    }

    .progress-bar__fill {
      height: 100%;
      border-radius: var(--border-radius-full);
      transition: width 0.3s ease;
    }

    .progress-bar--primary .progress-bar__fill {
      background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
    }

    .progress-bar--secondary .progress-bar__fill {
      background: linear-gradient(90deg, var(--secondary-400), var(--secondary-500));
    }

    .progress-bar--success .progress-bar__fill {
      background: linear-gradient(90deg, var(--success-400), var(--success-500));
    }

    .progress-bar--warning .progress-bar__fill {
      background: linear-gradient(90deg, var(--warning-400), var(--warning-500));
    }

    .progress-bar--danger .progress-bar__fill {
      background: linear-gradient(90deg, var(--error-400), var(--error-500));
    }

    .progress-bar--striped .progress-bar__fill {
      background-image: linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.15) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(255, 255, 255, 0.15) 75%,
        transparent 75%,
        transparent
      );
      background-size: 1rem 1rem;
    }

    .progress-bar--animated .progress-bar__fill {
      animation: progress-stripes 1s linear infinite;
    }

    @keyframes progress-stripes {
      0% {
        background-position: 1rem 0;
      }
      100% {
        background-position: 0 0;
      }
    }
  `]
})
export class ProgressComponent {
  @Input() value: number = 0;
  @Input() label: string = '';
  @Input() variant: ProgressVariant = 'primary';
  @Input() size: ProgressSize = 'md';
  @Input() showValue: boolean = false;
  @Input() striped: boolean = false;
  @Input() animated: boolean = false;

  get clampedValue(): number {
    return Math.max(0, Math.min(100, this.value));
  }
}
