import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="avatar" 
      [ngClass]="['avatar--' + size]"
      [style.--avatar-color]="backgroundColor">
      
      <img 
        *ngIf="src && !imageError"
        class="avatar__image"
        [src]="src"
        [alt]="alt"
        (error)="onImageError()">
      
      <span *ngIf="!src || imageError" class="avatar__initials">
        {{ initials }}
      </span>

      <span 
        *ngIf="status"
        class="avatar__status"
        [ngClass]="['avatar__status--' + status]">
      </span>
    </div>
  `,
  styles: [`
    .avatar {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--avatar-color, var(--primary-500));
      border: var(--border-width-md) solid var(--white);
      border-radius: var(--border-radius-full);
      overflow: hidden;
      flex-shrink: 0;
    }

    .avatar--xs {
      width: 24px;
      height: 24px;
      font-size: 10px;
    }

    .avatar--sm {
      width: 32px;
      height: 32px;
      font-size: var(--font-size-xs);
    }

    .avatar--md {
      width: 40px;
      height: 40px;
      font-size: var(--font-size-sm);
    }

    .avatar--lg {
      width: 48px;
      height: 48px;
      font-size: var(--font-size-base);
    }

    .avatar--xl {
      width: 64px;
      height: 64px;
      font-size: var(--font-size-lg);
    }

    .avatar__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar__initials {
      font-weight: var(--font-weight-semibold);
      color: var(--white);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .avatar__status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 25%;
      height: 25%;
      min-width: 8px;
      min-height: 8px;
      border: 2px solid var(--white);
      border-radius: var(--border-radius-full);
    }

    .avatar__status--online {
      background: var(--success-500);
    }

    .avatar__status--offline {
      background: var(--gray-400);
    }

    .avatar__status--busy {
      background: var(--error-500);
    }

    .avatar__status--away {
      background: var(--warning-500);
    }
  `]
})
export class AvatarComponent {
  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() name: string = '';
  @Input() size: AvatarSize = 'md';
  @Input() status?: AvatarStatus;

  imageError: boolean = false;

  get initials(): string {
    if (!this.name) return '?';
    const parts = this.name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return parts[0].substring(0, 2);
  }

  get backgroundColor(): string {
    if (!this.name) return '#6366f1';
    
    // Generate consistent color from name
    let hash = 0;
    for (let i = 0; i < this.name.length; i++) {
      hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#ef4444', // red
      '#f97316', // orange
      '#eab308', // yellow
      '#22c55e', // green
      '#14b8a6', // teal
      '#06b6d4', // cyan
      '#3b82f6', // blue
    ];

    return colors[Math.abs(hash) % colors.length];
  }

  onImageError(): void {
    this.imageError = true;
  }
}
