import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="breadcrumb" [class.breadcrumb--light]="variant === 'light'">
      <a *ngFor="let item of items; let last = last; let first = first" 
         [routerLink]="item.link" 
         class="breadcrumb-item"
         [class.breadcrumb-item--current]="last"
         [class.breadcrumb-item--home]="first">
        <!-- Home icon for first item -->
        <svg *ngIf="first && showHomeIcon" class="breadcrumb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span class="breadcrumb-text">{{ item.label }}</span>
        <svg *ngIf="!last" class="breadcrumb-separator" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </a>
    </nav>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      font-size: 0.875rem;
      padding: 0.75rem 0;
    }

    .breadcrumb-item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--color-text-muted);
      text-decoration: none;
      transition: color 0.2s;
      white-space: nowrap;
    }

    .breadcrumb-item:hover:not(.breadcrumb-item--current) {
      color: var(--color-primary);
    }

    .breadcrumb-item--current {
      color: var(--color-text);
      font-weight: 500;
      pointer-events: none;
    }

    .breadcrumb-icon {
      flex-shrink: 0;
    }

    .breadcrumb-separator {
      color: var(--color-border);
      flex-shrink: 0;
      margin: 0 0.25rem;
    }

    .breadcrumb-text {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .breadcrumb--light {
      .breadcrumb-item {
        color: rgba(255, 255, 255, 0.7);
      }
      
      .breadcrumb-item:hover:not(.breadcrumb-item--current) {
        color: white;
      }
      
      .breadcrumb-item--current {
        color: white;
      }
      
      .breadcrumb-separator {
        color: rgba(255, 255, 255, 0.4);
      }
    }

    @media (max-width: 768px) {
      .breadcrumb {
        font-size: 0.8125rem;
      }
      
      .breadcrumb-text {
        max-width: 120px;
      }
    }
  `]
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
  @Input() variant: 'default' | 'light' = 'default';
  @Input() showHomeIcon: boolean = false;
}
