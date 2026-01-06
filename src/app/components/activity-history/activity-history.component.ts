import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService, ActivityResponseItem } from '../../services/activity.service';
import { CardComponent, BadgeComponent } from '../ui';

@Component({
  selector: 'app-activity-history',
  standalone: true,
  imports: [CommonModule, CardComponent, BadgeComponent],
  template: `
    <app-card variant="default">
      <div card-header>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        <span>Hoạt động gần đây</span>
      </div>

      <div class="activity-list">
        @if (isLoading()) {
          <div class="activity-loading">
            <div class="activity-loading__spinner"></div>
            <span>Đang tải...</span>
          </div>
        } @else if (activities().length === 0) {
          <div class="activity-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <p>Chưa có hoạt động nào</p>
          </div>
        } @else {
          @for (activity of activities(); track activity.id) {
            <div class="activity-item">
              <div class="activity-item__icon" [class]="'activity-item__icon--' + getActivityColor(activity.activityType)">
                <span [innerHTML]="getActivityIcon(activity.activityType)"></span>
              </div>
              <div class="activity-item__content">
                <div class="activity-item__header">
                  <span class="activity-item__action">{{ getActivityLabel(activity) }}</span>
                  <app-badge 
                    [variant]="getActivityColor(activity.activityType)"
                    size="sm">
                    {{ getActivityTypeLabel(activity.activityType) }}
                  </app-badge>
                </div>
                <div class="activity-item__meta">
                  <span class="activity-item__time">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {{ formatTime(activity.timestamp) }}
                  </span>
                  @if (activity.pageTitle) {
                    <span class="activity-item__page">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      {{ activity.pageTitle }}
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>

      @if (totalPages() > 1) {
        <div card-footer>
          <div class="activity-pagination">
            <button 
              class="pagination-btn" 
              [disabled]="currentPage() === 0"
              (click)="loadPage(currentPage() - 1)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span class="pagination-info">Trang {{ currentPage() + 1 }} / {{ totalPages() }}</span>
            <button 
              class="pagination-btn" 
              [disabled]="currentPage() >= totalPages() - 1"
              (click)="loadPage(currentPage() + 1)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      }
    </app-card>
  `,
  styles: [`
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .activity-list::-webkit-scrollbar {
      width: 4px;
    }

    .activity-list::-webkit-scrollbar-thumb {
      background: var(--gray-300);
      border-radius: var(--border-radius-full);
    }

    .activity-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: var(--border-radius-md);
      transition: all var(--transition-fast);
    }

    .activity-item:hover {
      border-color: var(--primary-300);
      background: color-mix(in srgb, var(--primary-500) 3%, white);
    }

    .activity-item__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      min-width: 36px;
      border-radius: var(--border-radius-md);
      border: 2px solid;
    }

    .activity-item__icon--primary {
      background: color-mix(in srgb, var(--primary-500) 10%, white);
      border-color: var(--primary-400);
      color: var(--primary-600);
    }

    .activity-item__icon--success {
      background: color-mix(in srgb, var(--success-500) 10%, white);
      border-color: var(--success-400);
      color: var(--success-600);
    }

    .activity-item__icon--warning {
      background: color-mix(in srgb, var(--warning-500) 10%, white);
      border-color: var(--warning-400);
      color: var(--warning-600);
    }

    .activity-item__icon--danger {
      background: color-mix(in srgb, var(--danger-500) 10%, white);
      border-color: var(--danger-400);
      color: var(--danger-600);
    }

    .activity-item__icon--secondary {
      background: color-mix(in srgb, var(--gray-500) 10%, white);
      border-color: var(--gray-400);
      color: var(--gray-600);
    }

    .activity-item__content {
      flex: 1;
      min-width: 0;
    }

    .activity-item__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }

    .activity-item__action {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--gray-800);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-item__meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .activity-item__time,
    .activity-item__page {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--gray-500);
    }

    .activity-item__page {
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Loading & Empty states */
    .activity-loading,
    .activity-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: var(--gray-500);
      gap: 12px;
    }

    .activity-loading__spinner {
      width: 24px;
      height: 24px;
      border: 3px solid var(--gray-200);
      border-top-color: var(--primary-500);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .activity-empty p {
      margin: 0;
      font-size: var(--font-size-sm);
    }

    /* Pagination */
    .activity-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .pagination-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: 2px solid var(--gray-300);
      border-radius: var(--border-radius-md);
      color: var(--gray-600);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .pagination-btn:hover:not(:disabled) {
      border-color: var(--primary-500);
      color: var(--primary-600);
    }

    .pagination-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pagination-info {
      font-size: var(--font-size-sm);
      color: var(--gray-600);
    }
  `]
})
export class ActivityHistoryComponent implements OnInit {
  activities = signal<ActivityResponseItem[]>([]);
  isLoading = signal(true);
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);

  private readonly PAGE_SIZE = 10;

  constructor(private activityService: ActivityService) {}

  ngOnInit() {
    this.loadActivities();
  }

  loadActivities() {
    this.isLoading.set(true);
    this.activityService.getMyActivities(this.currentPage(), this.PAGE_SIZE).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activities.set(response.data.content || []);
          this.totalPages.set(response.data.totalPages || 0);
          this.totalElements.set(response.data.totalElements || 0);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load activities:', error);
        this.activities.set([]);
        this.isLoading.set(false);
      }
    });
  }

  loadPage(page: number) {
    this.currentPage.set(page);
    this.loadActivities();
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'LOGIN': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
      'LOGOUT': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      'PAGE_VIEW': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      'BUTTON_CLICK': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>',
      'PROFILE_UPDATE': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      'COURSE_VIEW': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>',
      'COURSE_ENROLL': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      'QUIZ_START': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      'QUIZ_SUBMIT': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
      'ASSIGNMENT_SUBMIT': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
      'ERROR': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    return icons[type] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  getActivityColor(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'secondary' {
    const colors: { [key: string]: 'primary' | 'success' | 'warning' | 'danger' | 'secondary' } = {
      'LOGIN': 'success',
      'LOGOUT': 'secondary',
      'PAGE_VIEW': 'primary',
      'BUTTON_CLICK': 'primary',
      'PROFILE_UPDATE': 'success',
      'COURSE_VIEW': 'primary',
      'COURSE_ENROLL': 'success',
      'QUIZ_START': 'warning',
      'QUIZ_SUBMIT': 'success',
      'ASSIGNMENT_SUBMIT': 'success',
      'ERROR': 'danger',
      'LOGIN_FAILED': 'danger',
      'API_ERROR': 'danger',
    };
    return colors[type] || 'secondary';
  }

  getActivityTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'LOGIN': 'Đăng nhập',
      'LOGOUT': 'Đăng xuất',
      'PAGE_VIEW': 'Xem trang',
      'BUTTON_CLICK': 'Click',
      'PROFILE_UPDATE': 'Cập nhật',
      'COURSE_VIEW': 'Xem khóa học',
      'COURSE_ENROLL': 'Đăng ký',
      'QUIZ_START': 'Bắt đầu quiz',
      'QUIZ_SUBMIT': 'Nộp quiz',
      'ASSIGNMENT_SUBMIT': 'Nộp bài',
      'ERROR': 'Lỗi',
      'LOGIN_FAILED': 'Đăng nhập thất bại',
      'API_ERROR': 'Lỗi API',
    };
    return labels[type] || type;
  }

  getActivityLabel(activity: ActivityResponseItem): string {
    if (activity.action) {
      return activity.action;
    }
    return this.getActivityTypeLabel(activity.activityType);
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
