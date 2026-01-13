import { Component, EventEmitter, Input, Output, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService, CourseActivityItem, PagedResponse } from '../../services/activity.service';
import { BadgeComponent } from '../ui/badge/badge.component';

/**
 * Modal component to display student activities for a specific course
 * Shows activities with Vietnamese formatted titles for instructors
 */
@Component({
  selector: 'app-student-activity-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent],
  template: `
    <div class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-info">
            <h3>Hoạt động của sinh viên</h3>
            <p class="student-info">{{ studentName }} - {{ studentCode }}</p>
          </div>
          <button class="modal-close" (click)="closeModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-filters">
          <div class="filter-group">
            <label>Loại hoạt động:</label>
            <select [(ngModel)]="selectedActivityType" (change)="loadActivities()">
              <option value="">Tất cả hoạt động khóa học</option>
              <option value="COURSE_VIEW">Truy cập khóa học</option>
              <option value="SECTION_VIEW">Xem chương</option>
              <option value="MODULE_VIEW">Xem bài học</option>
              <option value="QUIZ_START">Bắt đầu kiểm tra</option>
              <option value="QUIZ_SUBMIT">Nộp bài kiểm tra</option>
              <option value="ASSIGNMENT_VIEW">Xem bài tập</option>
              <option value="ASSIGNMENT_SUBMIT">Nộp bài tập</option>
              <option value="VIDEO_PLAY">Xem video</option>
              <option value="DOCUMENT_VIEW">Xem tài liệu</option>
            </select>
          </div>
        </div>

        <div class="modal-body">
          <!-- Loading state -->
          <div class="loading-container" *ngIf="loading()">
            <div class="spinner"></div>
            <span>Đang tải hoạt động...</span>
          </div>

          <!-- Empty state -->
          <div class="empty-state" *ngIf="!loading() && activities().length === 0">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <p>Chưa có hoạt động nào được ghi nhận</p>
          </div>

          <!-- Activities list -->
          <div class="activities-list" *ngIf="!loading() && activities().length > 0">
            <div class="activity-item" *ngFor="let activity of activities()">
              <div class="activity-icon" [ngClass]="'icon-' + activity.resourceType.toLowerCase()">
                <ng-container [ngSwitch]="activity.resourceType">
                  <svg *ngSwitchCase="'COURSE'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <svg *ngSwitchCase="'SECTION'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                  <svg *ngSwitchCase="'MODULE'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <svg *ngSwitchCase="'QUIZ'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <svg *ngSwitchCase="'ASSIGNMENT'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <svg *ngSwitchCase="'VIDEO'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <svg *ngSwitchCase="'DOCUMENT'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <svg *ngSwitchDefault width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </ng-container>
              </div>
              <div class="activity-content">
                <p class="activity-title">{{ activity.formattedTitle }}</p>
                <div class="activity-meta">
                  <app-badge [variant]="getResourceBadgeVariant(activity.resourceType)" size="sm">
                    {{ getResourceTypeLabel(activity.resourceType) }}
                  </app-badge>
                  <span class="activity-time">
                    {{ activity.timestampFormatted }}
                  </span>
                  <span class="activity-time" *ngIf="activity.durationMs">
                    • {{ formatDuration(activity.durationMs) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="pagination" *ngIf="totalPages() > 1">
            <button 
              class="page-btn" 
              [disabled]="currentPage() === 0"
              (click)="goToPage(currentPage() - 1)">
              ← Trước
            </button>
            <span class="page-info">Trang {{ currentPage() + 1 }} / {{ totalPages() }}</span>
            <button 
              class="page-btn" 
              [disabled]="currentPage() >= totalPages() - 1"
              (click)="goToPage(currentPage() + 1)">
              Sau →
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-info">
            <span class="total-count">Tổng: {{ totalElements() }} hoạt động</span>
          </div>
          <button class="btn btn--secondary" (click)="closeModal()">Đóng</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .modal-content {
      background: var(--white, #fff);
      border-radius: 12px;
      width: 95%;
      max-width: 700px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--gray-200, #e5e7eb);

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gray-800, #111827);
      }

      .student-info {
        margin: 0.25rem 0 0 0;
        font-size: 0.875rem;
        color: var(--gray-500, #6b7280);
      }
    }

    .modal-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.375rem;
      border-radius: 6px;
      color: var(--gray-500, #6b7280);
      transition: all 0.2s;

      &:hover {
        background: var(--gray-100, #f3f4f6);
        color: var(--gray-800, #111827);
      }
    }

    .modal-filters {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-200, #e5e7eb);
      background: var(--gray-50, #f9fafb);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--gray-800, #111827);
      }

      select {
        flex: 1;
        max-width: 300px;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--gray-200, #e5e7eb);
        border-radius: 8px;
        background: var(--white, #fff);
        color: var(--gray-800, #111827);
        font-size: 0.875rem;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: var(--primary-500, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      }
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.5rem;
      min-height: 300px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;

      span {
        font-size: 0.875rem;
        color: var(--gray-500, #6b7280);
      }
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--gray-200, #e5e7eb);
      border-top-color: var(--primary-500, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;

      svg {
        color: var(--gray-500, #6b7280);
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      p {
        color: var(--gray-500, #6b7280);
        margin: 0;
      }
    }

    .activities-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .activity-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--gray-50, #f9fafb);
      border-radius: 10px;
      border: 1px solid var(--gray-200, #e5e7eb);
      transition: all 0.2s;

      &:hover {
        border-color: var(--primary-500, #3b82f6);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
    }

    .activity-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-50, #eff6ff);
      color: var(--primary-500, #3b82f6);

      &.icon-course { background: #eff6ff; color: #3b82f6; }
      &.icon-section { background: #f5f3ff; color: #8b5cf6; }
      &.icon-module { background: #ecfdf5; color: #10b981; }
      &.icon-quiz { background: #fef3c7; color: #f59e0b; }
      &.icon-assignment { background: #fee2e2; color: #ef4444; }
      &.icon-video { background: #fce7f3; color: #ec4899; }
      &.icon-document { background: #e0e7ff; color: #6366f1; }
      &.icon-other { background: #f3f4f6; color: #6b7280; }
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-title {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gray-800, #111827);
      line-height: 1.4;
    }

    .activity-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .activity-time {
      font-size: 0.75rem;
      color: var(--gray-500, #6b7280);
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--gray-200, #e5e7eb);
    }

    .page-btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--gray-200, #e5e7eb);
      border-radius: 6px;
      background: var(--white, #fff);
      color: var(--gray-800, #111827);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        border-color: var(--primary-500, #3b82f6);
        color: var(--primary-500, #3b82f6);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .page-info {
      font-size: 0.875rem;
      color: var(--gray-500, #6b7280);
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--gray-200, #e5e7eb);
      background: var(--gray-50, #f9fafb);
    }

    .total-count {
      font-size: 0.875rem;
      color: var(--gray-500, #6b7280);
    }

    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn--secondary {
      background: var(--white, #fff);
      border: 1px solid var(--gray-200, #e5e7eb);
      color: var(--gray-800, #111827);

      &:hover {
        background: var(--gray-100, #f3f4f6);
      }
    }
  `]
})
export class StudentActivityModalComponent implements OnInit, OnChanges {
  @Input() courseId!: number;
  @Input() studentId!: number;
  @Input() studentName: string = '';
  @Input() studentCode: string = '';
  @Output() close = new EventEmitter<void>();

  private activityService = inject(ActivityService);

  activities = signal<CourseActivityItem[]>([]);
  loading = signal(false);
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  selectedActivityType = '';

  ngOnInit(): void {
    this.loadActivities();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['courseId'] || changes['studentId']) && this.courseId && this.studentId) {
      this.loadActivities();
    }
  }

  loadActivities(): void {
    if (!this.courseId || !this.studentId) return;

    this.loading.set(true);

    this.activityService.getCourseStudentActivities(
      this.courseId,
      this.studentId,
      this.currentPage(),
      20,
      this.selectedActivityType || undefined
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activities.set(response.data.content || []);
          this.totalPages.set(response.data.totalPages || 0);
          this.totalElements.set(response.data.totalElements || 0);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load activities:', err);
        this.activities.set([]);
        this.loading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.loadActivities();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  getResourceTypeLabel(resourceType: string): string {
    const labels: { [key: string]: string } = {
      'COURSE': 'Khóa học',
      'SECTION': 'Chương',
      'MODULE': 'Bài học',
      'QUIZ': 'Kiểm tra',
      'ASSIGNMENT': 'Bài tập',
      'VIDEO': 'Video',
      'DOCUMENT': 'Tài liệu',
      'DISCUSSION': 'Thảo luận',
      'OTHER': 'Khác'
    };
    return labels[resourceType] || resourceType;
  }

  getResourceBadgeVariant(resourceType: string): 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' {
    const variants: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' } = {
      'COURSE': 'primary',
      'SECTION': 'secondary',
      'MODULE': 'success',
      'QUIZ': 'warning',
      'ASSIGNMENT': 'danger',
      'VIDEO': 'secondary',
      'DOCUMENT': 'neutral',
      'DISCUSSION': 'secondary',
      'OTHER': 'neutral'
    };
    return variants[resourceType] || 'neutral';
  }

  formatDuration(durationMs: number): string {
    if (!durationMs) return '';
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
