import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivityHistoryComponent } from '../../activity-history/activity-history.component';
import { EditModeService } from '../../../services/edit-mode.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ActivityHistoryComponent],
  template: `
    <header class="header">
      <!-- Left Section - Logo -->
      <div class="header__left">
        <a [routerLink]="homeLink" class="header__logo">
          <img src="logo.png" alt="Grey UTH" class="header__logo-img">
        </a>
      </div>

      <!-- Center Section - Search -->
      <div class="header__center">
        <div class="header__search">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header__search-icon">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text" 
            class="header__search-input" 
            placeholder="Tìm kiếm khóa học, bài tập..."
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()">
          <kbd class="header__search-kbd">⌘K</kbd>
        </div>
      </div>

      <!-- Right Section -->
      <div class="header__right">
        <!-- Edit Mode Toggle (for teachers only) -->
        <div class="header__edit-mode" *ngIf="isTeacher">
          <label class="header__toggle-switch" [title]="editModeService.editMode() ? 'Tắt chế độ chỉnh sửa' : 'Bật chế độ chỉnh sửa'">
            <input 
              type="checkbox" 
              [checked]="editModeService.editMode()"
              (change)="toggleEditMode()">
            <span class="header__toggle-slider"></span>
            <span class="header__toggle-label">{{ editModeService.editMode() ? 'Đang sửa' : 'Chỉnh sửa' }}</span>
          </label>
        </div>

        <!-- Notifications -->
        <button class="header__icon-btn" title="Thông báo">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          <span class="header__icon-badge" *ngIf="notificationCount > 0">{{ notificationCount }}</span>
        </button>

        <!-- Messages -->
        <button class="header__icon-btn" title="Tin nhắn">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="header__icon-badge" *ngIf="messageCount > 0">{{ messageCount }}</span>
        </button>

        <!-- AI Chat -->
        <a routerLink="/ai-chat" class="header__icon-btn header__ai-btn" title="Chat với AI">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8V4H8"/>
            <rect width="16" height="12" x="4" y="8" rx="2"/>
            <path d="M2 14h2"/>
            <path d="M20 14h2"/>
            <path d="M15 13v2"/>
            <path d="M9 13v2"/>
          </svg>
        </a>

        <!-- Activity History Toggle -->
        <div class="header__activity-wrapper">
          <button 
            class="header__icon-btn" 
            [class.header__icon-btn--active]="activityPanelOpen"
            title="Lịch sử hoạt động"
            (click)="toggleActivityPanel($event)">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </button>
          
          <!-- Activity Panel Dropdown -->
          <div class="header__activity-panel" *ngIf="activityPanelOpen" (click)="$event.stopPropagation()">
            <div class="header__activity-panel-header">
              <h3>Lịch sử hoạt động</h3>
              <button class="header__activity-panel-close" (click)="activityPanelOpen = false">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <app-activity-history></app-activity-history>
          </div>
        </div>

        <!-- Divider -->
        <div class="header__divider"></div>

        <!-- User Menu -->
        <div class="header__user" (click)="toggleUserMenu()">
          <div class="header__user-avatar">
            {{ userInitials }}
          </div>
          <div class="header__user-info">
            <span class="header__user-name">{{ userName }}</span>
            <span class="header__user-role">{{ userRole }}</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header__user-chevron" [class.rotate]="userMenuOpen">
            <path d="m6 9 6 6 6-6"/>
          </svg>

          <!-- User Dropdown -->
          <div class="header__user-dropdown" *ngIf="userMenuOpen">
            <a routerLink="/profile" class="header__user-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Hồ sơ cá nhân</span>
            </a>
            <a *ngIf="isTeacher" routerLink="/teacher/question-bank" class="header__user-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Ngân hàng câu hỏi</span>
            </a>
            <a routerLink="/settings" class="header__user-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Cài đặt</span>
            </a>
            <div class="header__user-dropdown-divider"></div>
            <button class="header__user-dropdown-item header__user-dropdown-item--danger" (click)="onLogout()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      position: fixed;
      top: 0;
      right: 0;
      left: 0;
      height: var(--header-height);
      background: #ffffff;
      border-bottom: 1px solid var(--gray-200);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--spacing-4);
      z-index: var(--z-sticky);
      transition: left var(--transition-base);
    }

    .header__left {
      display: flex;
      align-items: center;
      gap: var(--spacing-4);
      flex-shrink: 0;
    }

    .header__logo {
      display: flex;
      align-items: center;
      text-decoration: none;
      margin-left: 40px;
    }

    .header__logo-img {
      height: 52px;
      width: auto;
      object-fit: contain;
    }

    @media (max-width: 768px) {
      .header__logo-img {
        height: 40px;
      }
    }

    .header__center {
      flex: 1;
      display: flex;
      justify-content: center;
      padding: 0 var(--spacing-4);
    }

    /* Search */
    .header__search {
      position: relative;
      display: flex;
      align-items: center;
    }

    .header__search-icon {
      position: absolute;
      left: var(--spacing-3);
      color: var(--gray-400);
      pointer-events: none;
    }

    .header__search-input {
      width: 400px;
      padding: var(--spacing-2) var(--spacing-10) var(--spacing-2) var(--spacing-10);
      background: var(--gray-50);
      border: 2px solid var(--gray-200);
      border-radius: var(--border-radius-lg);
      font-size: var(--font-size-sm);
      color: var(--gray-800);
      transition: all var(--transition-fast);
    }

    .header__search-input::placeholder {
      color: var(--gray-400);
    }

    .header__search-input:hover {
      border-color: var(--gray-300);
    }

    .header__search-input:focus {
      outline: none;
      background: #ffffff;
      border-color: var(--primary-500);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-500) 10%, transparent);
    }

    @media (max-width: 1024px) {
      .header__search-input {
        width: 300px;
      }
    }

    @media (max-width: 768px) {
      .header__search-input {
        width: 200px;
      }
      
      .header__center {
        justify-content: flex-start;
      }
    }

    @media (max-width: 480px) {
      .header__search-input {
        display: none;
      }
      
      .header__center {
        display: none;
      }
    }

    .header__search-kbd {
      position: absolute;
      right: var(--spacing-3);
      padding: var(--spacing-1) var(--spacing-2);
      background: var(--gray-100);
      border: 1px solid var(--gray-300);
      border-radius: var(--border-radius-sm);
      font-size: 11px;
      font-family: var(--font-family-mono);
      color: var(--gray-500);
    }

    @media (max-width: 768px) {
      .header__search-kbd {
        display: none;
      }
    }

    /* Right Section */
    .header__right {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
    }

    /* Edit Mode Toggle Switch */
    .header__edit-mode {
      margin-right: var(--spacing-2);
    }

    .header__toggle-switch {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      cursor: pointer;
      user-select: none;
    }

    .header__toggle-switch input {
      display: none;
    }

    .header__toggle-slider {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--gray-300);
      border-radius: 24px;
      transition: all 0.3s ease;
    }

    .header__toggle-slider::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }

    .header__toggle-switch input:checked + .header__toggle-slider {
      background: var(--success-500);
    }

    .header__toggle-switch input:checked + .header__toggle-slider::before {
      transform: translateX(20px);
    }

    .header__toggle-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--gray-600);
      transition: color 0.2s ease;
    }

    .header__toggle-switch input:checked ~ .header__toggle-label {
      color: var(--success-600);
    }

    @media (max-width: 768px) {
      .header__toggle-label {
        display: none;
      }
    }

    .header__icon-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: transparent;
      border: 2px solid transparent;
      border-radius: var(--border-radius-md);
      color: var(--gray-600);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .header__icon-btn:hover {
      background: color-mix(in srgb, var(--primary-500) 5%, transparent);
      border-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
      color: var(--primary-600);
    }

    .header__icon-btn--active {
      background: color-mix(in srgb, var(--primary-500) 10%, transparent);
      border-color: color-mix(in srgb, var(--primary-500) 30%, transparent);
      color: var(--primary-600);
    }

    /* AI Chat Button */
    .header__ai-btn {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.1));
      border-color: rgba(124, 58, 237, 0.2);
      color: #7c3aed;
      text-decoration: none;
    }

    .header__ai-btn:hover {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(79, 70, 229, 0.15));
      border-color: rgba(124, 58, 237, 0.4);
      color: #6d28d9;
      transform: scale(1.05);
    }

    .header__icon-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: var(--error-500);
      border-radius: var(--border-radius-full);
      font-size: 11px;
      font-weight: var(--font-weight-semibold);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header__divider {
      width: 1px;
      height: 32px;
      background: var(--gray-200);
      margin: 0 var(--spacing-2);
    }

    /* User Menu */
    .header__user {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      padding: var(--spacing-2) var(--spacing-3);
      background: transparent;
      border: 2px solid transparent;
      border-radius: var(--border-radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .header__user:hover {
      background: color-mix(in srgb, var(--primary-500) 5%, transparent);
      border-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
    }

    .header__user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: color-mix(in srgb, var(--primary-500) 10%, transparent);
      border: 2px solid var(--primary-500);
      border-radius: var(--border-radius-full);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--primary-600);
    }

    .header__user-info {
      display: flex;
      flex-direction: column;
    }

    @media (max-width: 640px) {
      .header__user-info {
        display: none;
      }
    }

    .header__user-name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--gray-800);
    }

    .header__user-role {
      font-size: var(--font-size-xs);
      color: var(--gray-500);
    }

    .header__user-chevron {
      color: var(--gray-400);
      transition: transform var(--transition-fast);
    }

    .header__user-chevron.rotate {
      transform: rotate(180deg);
    }

    @media (max-width: 640px) {
      .header__user-chevron {
        display: none;
      }
    }

    /* User Dropdown */
    .header__user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      background: #ffffff;
      border: 2px solid var(--gray-200);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      z-index: var(--z-dropdown);
    }

    .header__user-dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      padding: var(--spacing-3) var(--spacing-4);
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      font-size: var(--font-size-sm);
      color: var(--gray-700);
      cursor: pointer;
      transition: all var(--transition-fast);
      text-decoration: none;
    }

    .header__user-dropdown-item:hover {
      background: color-mix(in srgb, var(--primary-500) 5%, transparent);
      color: var(--primary-600);
    }

    .header__user-dropdown-item--danger {
      color: var(--error-500);
    }

    .header__user-dropdown-item--danger:hover {
      background: color-mix(in srgb, var(--error-500) 5%, transparent);
      color: var(--error-500);
    }

    .header__user-dropdown-divider {
      height: 1px;
      background: var(--gray-200);
      margin: var(--spacing-1) 0;
    }

    /* Activity Panel */
    .header__activity-wrapper {
      position: relative;
    }

    .header__icon-btn--active {
      background: color-mix(in srgb, var(--primary-500) 10%, transparent);
      border-color: var(--primary-500);
      color: var(--primary-600);
    }

    .header__activity-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 380px;
      max-height: 500px;
      background: #ffffff;
      border: 2px solid var(--gray-200);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      z-index: var(--z-dropdown);
    }

    .header__activity-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-3) var(--spacing-4);
      border-bottom: 1px solid var(--gray-200);
      background: var(--gray-50);
    }

    .header__activity-panel-header h3 {
      margin: 0;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--gray-800);
    }

    .header__activity-panel-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      border-radius: var(--border-radius-sm);
      color: var(--gray-500);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .header__activity-panel-close:hover {
      background: var(--gray-200);
      color: var(--gray-700);
    }

    .header__activity-panel ::ng-deep app-activity-history {
      display: block;
    }

    .header__activity-panel ::ng-deep .card {
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    .header__activity-panel ::ng-deep .card__header {
      display: none;
    }

    .header__activity-panel ::ng-deep .activity-list {
      max-height: 350px;
      padding: var(--spacing-3);
    }

    .header__activity-panel ::ng-deep .activity-item {
      padding: 8px 10px;
      gap: 8px;
    }

    .header__activity-panel ::ng-deep .activity-item__icon {
      width: 28px;
      height: 28px;
      min-width: 28px;
    }

    .header__activity-panel ::ng-deep .activity-item__icon svg {
      width: 14px;
      height: 14px;
    }

    .header__activity-panel ::ng-deep .activity-item__action {
      font-size: 12px;
    }

    .header__activity-panel ::ng-deep .activity-item__time,
    .header__activity-panel ::ng-deep .activity-item__page {
      font-size: 10px;
    }

    .header__activity-panel ::ng-deep .badge {
      font-size: 9px;
      padding: 2px 6px;
    }

    @media (max-width: 480px) {
      .header__activity-panel {
        width: 320px;
        right: -50px;
      }
    }
  `]
})
export class HeaderComponent {
  @Input() userName: string = 'User';
  @Input() userRole: string = 'Student';
  @Input() notificationCount: number = 0;
  @Input() messageCount: number = 0;
  @Output() logout = new EventEmitter<void>();

  editModeService = inject(EditModeService);
  
  searchQuery: string = '';
  userMenuOpen: boolean = false;
  activityPanelOpen: boolean = false;

  constructor(private elementRef: ElementRef) {}

  get isTeacher(): boolean {
    return this.userRole === 'Giảng viên' || this.userRole === 'TEACHER' || 
           this.userRole === 'Quản trị viên' || this.userRole === 'ADMIN';
  }

  get homeLink(): string {
    if (this.userRole === 'Giảng viên' || this.userRole === 'TEACHER') {
      return '/teacher/dashboard';
    } else if (this.userRole === 'Quản trị viên' || this.userRole === 'ADMIN') {
      return '/admin/dashboard';
    }
    return '/dashboard';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.userMenuOpen = false;
      this.activityPanelOpen = false;
    }
  }

  get userInitials(): string {
    return this.userName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) {
      this.activityPanelOpen = false;
    }
  }

  toggleActivityPanel(event: MouseEvent) {
    event.stopPropagation();
    this.activityPanelOpen = !this.activityPanelOpen;
    if (this.activityPanelOpen) {
      this.userMenuOpen = false;
    }
  }

  toggleEditMode() {
    this.editModeService.toggleEditMode();
  }

  onSearch() {
    console.log('Search:', this.searchQuery);
  }

  onLogout() {
    this.userMenuOpen = false;
    this.logout.emit();
  }
}
