import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="badge" 
      [ngClass]="['badge--' + variant, 'badge--' + size]"
      [class.badge--dot]="dot">
      <span class="badge__dot" *ngIf="dot"></span>
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-1);
      padding: var(--spacing-1) var(--spacing-2);
      background: color-mix(in srgb, var(--primary-500) 10%, white);
      border: 1px solid var(--primary-500);
      border-radius: var(--border-radius-full);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--primary-600);
      white-space: nowrap;
    }

    .badge--sm { padding: 2px var(--spacing-2); font-size: 10px; }
    .badge--lg { padding: var(--spacing-1) var(--spacing-3); font-size: var(--font-size-sm); }

    .badge--primary { background: color-mix(in srgb, var(--primary-500) 10%, white); border-color: var(--primary-500); color: var(--primary-600); }
    .badge--secondary { background: color-mix(in srgb, var(--secondary-500) 10%, white); border-color: var(--secondary-500); color: var(--secondary-600); }
    .badge--success { background: color-mix(in srgb, var(--success-500) 10%, white); border-color: var(--success-500); color: #16a34a; }
    .badge--warning { background: color-mix(in srgb, var(--warning-500) 10%, white); border-color: var(--warning-500); color: #d97706; }
    .badge--danger { background: color-mix(in srgb, var(--error-500) 10%, white); border-color: var(--error-500); color: var(--error-500); }
    .badge--neutral { background: var(--gray-100); border-color: var(--gray-300); color: var(--gray-600); }

    .badge--dot { padding-left: var(--spacing-2); }
    .badge__dot { width: 6px; height: 6px; border-radius: var(--border-radius-full); background: currentColor; }
  `]
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'primary';
  @Input() size: BadgeSize = 'md';
  @Input() dot: boolean = false;
}
