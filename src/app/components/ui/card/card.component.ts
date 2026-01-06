import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card" [ngClass]="'card--' + variant" [class.card--hoverable]="hoverable">
      <div class="card__header" *ngIf="title || showHeader">
        <div class="card__header-left">
          <span class="card__icon" *ngIf="icon" [innerHTML]="icon"></span>
          <h3 class="card__title" *ngIf="title">{{ title }}</h3>
        </div>
        <div class="card__header-right">
          <ng-content select="[card-actions]"></ng-content>
        </div>
      </div>
      <div class="card__body">
        <ng-content></ng-content>
      </div>
      <div class="card__footer" *ngIf="showFooter">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: var(--white);
      border: 2px solid var(--gray-200);
      border-radius: var(--border-radius-xl);
      padding: var(--spacing-6);
      transition: all var(--transition-base);
    }

    .card--hoverable {
      cursor: pointer;
    }

    .card--hoverable:hover {
      border-color: var(--gray-300);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .card--primary {
      background: color-mix(in srgb, var(--primary-500) 3%, white);
      border-color: var(--primary-500);
    }

    .card--primary .card__icon {
      color: var(--primary-600);
    }

    .card--primary:hover {
      background: color-mix(in srgb, var(--primary-500) 6%, white);
    }

    .card--secondary {
      background: color-mix(in srgb, var(--secondary-500) 3%, white);
      border-color: var(--secondary-500);
    }

    .card--secondary .card__icon {
      color: var(--secondary-600);
    }

    .card--secondary:hover {
      background: color-mix(in srgb, var(--secondary-500) 6%, white);
    }

    .card--success {
      background: color-mix(in srgb, var(--success-500) 3%, white);
      border-color: var(--success-500);
    }

    .card--success .card__icon {
      color: var(--success-500);
    }

    .card--success:hover {
      background: color-mix(in srgb, var(--success-500) 6%, white);
    }

    .card--warning {
      background: color-mix(in srgb, var(--warning-500) 3%, white);
      border-color: var(--warning-500);
    }

    .card--warning .card__icon {
      color: var(--warning-500);
    }

    .card--warning:hover {
      background: color-mix(in srgb, var(--warning-500) 6%, white);
    }

    .card--danger {
      background: color-mix(in srgb, var(--error-500) 3%, white);
      border-color: var(--error-500);
    }

    .card--danger .card__icon {
      color: var(--error-500);
    }

    .card--danger:hover {
      background: color-mix(in srgb, var(--error-500) 6%, white);
    }

    .card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-4);
      padding-bottom: var(--spacing-4);
      border-bottom: 1px solid var(--gray-200);
    }

    .card__header-left {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
    }

    .card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: color-mix(in srgb, var(--primary-500) 10%, white);
      border: 2px solid var(--primary-500);
      border-radius: var(--border-radius-lg);
      color: var(--primary-600);
    }

    .card__icon ::ng-deep svg {
      width: 20px;
      height: 20px;
    }

    .card__title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--gray-800);
      margin: 0;
    }

    .card__body {
      color: var(--gray-700);
      line-height: 1.75;
    }

    .card__footer {
      margin-top: var(--spacing-4);
      padding-top: var(--spacing-4);
      border-top: 1px solid var(--gray-200);
    }
  `]
})
export class CardComponent {
  @Input() title?: string;
  @Input() icon?: string;
  @Input() variant: CardVariant = 'default';
  @Input() hoverable: boolean = false;
  @Input() showHeader: boolean = false;
  @Input() showFooter: boolean = false;
}
