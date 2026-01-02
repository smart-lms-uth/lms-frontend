import { Component, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Activity {
  id: number;
  activityType: string;
  action: string;
  pageUrl: string;
  pageTitle: string;
  timestamp: string;
  metadata: string;
}

interface PageData {
  content: Activity[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface ActivityResponse {
  success: boolean;
  data: PageData;
}

@Component({
  selector: 'app-activity-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="activity-dropdown">
      <button class="activity-btn" (click)="toggleDropdown()" [class.has-new]="hasNewActivity">
        <span class="icon">🕐</span>
        <span class="label">Hoạt động</span>
        <span class="badge" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>

      <div class="dropdown-menu" *ngIf="isOpen">
        <div class="dropdown-header">
          <h3>Hoạt động gần đây</h3>
          <button class="refresh-btn" (click)="loadActivities()" [disabled]="isLoading">
            {{ isLoading ? '...' : '↻' }}
          </button>
        </div>

        <div class="activity-list" *ngIf="!isLoading && activities.length > 0">
          <div class="activity-item" *ngFor="let activity of activities">
            <div class="activity-icon">{{ getActivityIcon(activity.activityType) }}</div>
            <div class="activity-content">
              <p class="activity-text">{{ getActivityText(activity) }}</p>
              <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!isLoading && activities.length === 0">
          <p>Chưa có hoạt động nào</p>
        </div>

        <div class="loading-state" *ngIf="isLoading">
          <p>Đang tải...</p>
        </div>

        <div class="dropdown-footer">
          <button class="view-all-btn" (click)="viewAllActivities()">
            Xem tất cả hoạt động
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activity-dropdown {
      position: relative;
    }

    .activity-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }

    .activity-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .activity-btn.has-new {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0); }
    }

    .icon {
      font-size: 16px;
    }

    .label {
      font-weight: 500;
    }

    .badge {
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 360px;
      max-height: 480px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      overflow: hidden;
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .dropdown-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }

    .refresh-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: #e5e7eb;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
    }

    .refresh-btn:hover:not(:disabled) {
      background: #d1d5db;
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .activity-list {
      max-height: 320px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
      transition: background 0.2s;
    }

    .activity-item:hover {
      background: #f9fafb;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      font-size: 16px;
      flex-shrink: 0;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-text {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #374151;
      line-height: 1.4;
    }

    .activity-time {
      font-size: 12px;
      color: #9ca3af;
    }

    .empty-state, .loading-state {
      padding: 40px 16px;
      text-align: center;
      color: #9ca3af;
    }

    .dropdown-footer {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .view-all-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .view-all-btn:hover {
      opacity: 0.9;
    }

    @media (max-width: 480px) {
      .dropdown-menu {
        width: calc(100vw - 32px);
        right: -16px;
      }

      .label {
        display: none;
      }
    }
  `]
})
export class ActivityDropdownComponent implements OnInit, OnDestroy {
  isOpen = false;
  isLoading = false;
  activities: Activity[] = [];
  unreadCount = 0;
  hasNewActivity = false;
  private refreshInterval: any;

  constructor(
    private http: HttpClient, 
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Auto refresh mỗi 60 giây
    this.refreshInterval = setInterval(() => {
      if (!this.isOpen) {
        this.checkNewActivities();
      }
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Chỉ đóng dropdown nếu click ra ngoài component
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.cdr.detectChanges();
    }
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    this.cdr.detectChanges();
    if (this.isOpen) {
      this.loadActivities();
      this.unreadCount = 0;
      this.hasNewActivity = false;
    }
  }

  loadActivities(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.http.get<ActivityResponse>(`${environment.apiUrl}/activities/me?page=0&size=10`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.activities = response.data.content || [];
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  checkNewActivities(): void {
    this.http.get<ActivityResponse>(`${environment.apiUrl}/activities/me?page=0&size=1`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data?.content?.length > 0) {
            const latestId = response.data.content[0].id;
            if (this.activities.length > 0 && latestId > this.activities[0].id) {
              this.hasNewActivity = true;
              this.unreadCount++;
            }
          }
        }
      });
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'LOGIN': '🔐',
      'LOGOUT': '🚪',
      'LOGIN_FAILED': '❌',
      'PAGE_VIEW': '👁️',
      'PAGE_LEAVE': '📤',
      'BUTTON_CLICK': '👆',
      'LINK_CLICK': '🔗',
      'FORM_SUBMIT': '📝',
      'API_REQUEST': '🌐',
      'API_ERROR': '⚠️',
      'PROFILE_VIEW': '👤',
      'PROFILE_UPDATE': '✏️',
      'AVATAR_UPLOAD': '📷',
      'SEARCH': '🔍',
      'CONTENT_VIEW': '📖',
      'CONTENT_DOWNLOAD': '⬇️',
      'SESSION_START': '▶️',
      'SESSION_END': '⏹️',
      'ERROR': '🐛',
      'CRASH': '💥',
      'COURSE_VIEW': '📚',
      'COURSE_ENROLL': '✅',
      'ASSIGNMENT_VIEW': '📋',
      'ASSIGNMENT_SUBMIT': '📤',
      'QUIZ_START': '🎯',
      'QUIZ_SUBMIT': '✔️'
    };
    return icons[type] || '📌';
  }

  getActivityText(activity: Activity): string {
    const texts: { [key: string]: string } = {
      'LOGIN': 'Đăng nhập thành công',
      'LOGOUT': 'Đã đăng xuất',
      'LOGIN_FAILED': 'Đăng nhập thất bại',
      'PAGE_VIEW': `Truy cập trang ${this.getPageName(activity.pageUrl)}`,
      'PAGE_LEAVE': `Rời khỏi trang ${this.getPageName(activity.pageUrl)}`,
      'BUTTON_CLICK': `Nhấn nút ${activity.action || ''}`,
      'LINK_CLICK': 'Nhấn vào liên kết',
      'FORM_SUBMIT': 'Gửi biểu mẫu',
      'API_REQUEST': 'Gọi API thành công',
      'API_ERROR': 'Lỗi khi gọi API',
      'PROFILE_VIEW': 'Xem hồ sơ cá nhân',
      'PROFILE_UPDATE': 'Cập nhật thông tin cá nhân',
      'AVATAR_UPLOAD': 'Tải lên ảnh đại diện',
      'SEARCH': `Tìm kiếm "${activity.action || ''}"`,
      'CONTENT_VIEW': 'Xem nội dung',
      'CONTENT_DOWNLOAD': 'Tải xuống tài liệu',
      'SESSION_START': 'Bắt đầu phiên làm việc',
      'SESSION_END': 'Kết thúc phiên làm việc',
      'ERROR': 'Đã xảy ra lỗi',
      'CRASH': 'Ứng dụng gặp sự cố',
      'COURSE_VIEW': 'Truy cập khóa học',
      'COURSE_ENROLL': 'Đăng ký khóa học',
      'ASSIGNMENT_VIEW': 'Xem bài tập',
      'ASSIGNMENT_SUBMIT': 'Nộp bài tập',
      'QUIZ_START': 'Bắt đầu làm quiz',
      'QUIZ_SUBMIT': 'Nộp bài quiz'
    };
    return texts[activity.activityType] || activity.action || activity.activityType;
  }

  getPageName(url: string): string {
    if (!url) return '';
    const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    const names: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'profile': 'Hồ sơ',
      'profile-setup': 'Thiết lập hồ sơ',
      'courses': 'Khóa học',
      'assignments': 'Bài tập',
      'settings': 'Cài đặt'
    };
    return names[path] || path || 'trang chính';
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  viewAllActivities(): void {
    // TODO: Navigate to activities page
    console.log('View all activities');
    this.isOpen = false;
  }
}
