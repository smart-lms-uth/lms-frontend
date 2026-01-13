import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService, DashboardStats } from '../../../services/admin.service';
import { Semester, Subject, Course } from '../../../services/course.service';
import { MainLayoutComponent } from '../../../components/layout/main-layout/main-layout.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="admin-dashboard">
        <div class="page-header">
          <h1>🏠 Bảng điều khiển Quản trị</h1>
          <p class="subtitle">Tổng quan hệ thống quản lý học tập</p>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-icon">📚</div>
            <div class="stat-content">
              <span class="stat-value">{{ subjects().length }}</span>
              <span class="stat-label">Môn học</span>
            </div>
          </div>

          <div class="stat-card success">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
              <span class="stat-value">{{ semesters().length }}</span>
              <span class="stat-label">Học kỳ</span>
            </div>
          </div>

          <div class="stat-card info">
            <div class="stat-icon">🎓</div>
            <div class="stat-content">
              <span class="stat-value">{{ courses().length }}</span>
              <span class="stat-label">Khóa học</span>
            </div>
          </div>

          <div class="stat-card warning">
            <div class="stat-icon">📖</div>
            <div class="stat-content">
              <span class="stat-value">{{ openCourses() }}</span>
              <span class="stat-label">Đang mở</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="section">
          <h2>⚡ Thao tác nhanh</h2>
          <div class="quick-actions">
            <a routerLink="/admin/semesters" class="action-btn">
              <span class="icon">📅</span>
              <span>Quản lý Học kỳ</span>
            </a>
            <a routerLink="/admin/subjects" class="action-btn">
              <span class="icon">📚</span>
              <span>Quản lý Môn học</span>
            </a>
            <a routerLink="/admin/courses" class="action-btn">
              <span class="icon">🎓</span>
              <span>Quản lý Khóa học</span>
            </a>
            <a routerLink="/admin/users" class="action-btn">
              <span class="icon">👥</span>
              <span>Quản lý Người dùng</span>
            </a>
          </div>
        </div>

        <!-- Current Semester -->
        <div class="section" *ngIf="currentSemester()">
          <h2>📅 Học kỳ hiện tại</h2>
          <div class="current-semester-card">
            <div class="semester-info">
              <h3>{{ currentSemester()?.displayName }}</h3>
              <p class="semester-code">{{ currentSemester()?.semesterCode }}</p>
              <p class="semester-dates">
                {{ formatDate(currentSemester()?.startDate) }} - {{ formatDate(currentSemester()?.endDate) }}
              </p>
            </div>
            <div class="semester-stats">
              <div class="mini-stat">
                <span class="value">{{ getCoursesInSemester(currentSemester()?.id).length }}</span>
                <span class="label">Khóa học</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Courses -->
        <div class="section">
          <h2>🎓 Khóa học gần đây</h2>
          <div class="courses-table-wrapper" *ngIf="courses().length > 0; else noCourses">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã khóa học</th>
                  <th>Môn học</th>
                  <th>Học kỳ</th>
                  <th>Trạng thái</th>
                  <th>Số SV</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let course of courses().slice(0, 5)">
                  <td><strong>{{ course.courseCode }}</strong></td>
                  <td>{{ course.subjectName }}</td>
                  <td>{{ course.semesterCode }}</td>
                  <td>
                    <span class="status-badge" [class]="getStatusClass(course.status)">
                      {{ getStatusLabel(course.status) }}
                    </span>
                  </td>
                  <td>{{ course.currentEnrollment }}/{{ course.maxStudents }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noCourses>
            <div class="empty-state">
              <p>Chưa có khóa học nào</p>
            </div>
          </ng-template>
        </div>

        <!-- Loading State -->
        <div class="loading-overlay" *ngIf="loading()">
          <div class="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    </app-main-layout>
  `,
  styles: [`
    .admin-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #64748b;
      margin: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .stat-card.primary { border-left: 4px solid #3b82f6; }
    .stat-card.success { border-left: 4px solid #22c55e; }
    .stat-card.info { border-left: 4px solid #06b6d4; }
    .stat-card.warning { border-left: 4px solid #f59e0b; }

    .stat-icon {
      font-size: 32px;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }

    .stat-label {
      font-size: 14px;
      color: #64748b;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .section h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 16px 0;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      text-decoration: none;
      color: #1e293b;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #e2e8f0;
      transform: translateY(-2px);
    }

    .action-btn .icon {
      font-size: 28px;
    }

    .current-semester-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 12px;
      color: white;
    }

    .semester-info h3 {
      margin: 0 0 4px 0;
      font-size: 20px;
    }

    .semester-code {
      opacity: 0.8;
      margin: 0 0 8px 0;
    }

    .semester-dates {
      font-size: 14px;
      opacity: 0.9;
      margin: 0;
    }

    .mini-stat {
      text-align: center;
    }

    .mini-stat .value {
      display: block;
      font-size: 32px;
      font-weight: 700;
    }

    .mini-stat .label {
      font-size: 12px;
      opacity: 0.8;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #64748b;
      font-size: 13px;
      text-transform: uppercase;
    }

    .data-table tbody tr:hover {
      background: #f8fafc;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.open { background: #dcfce7; color: #16a34a; }
    .status-badge.closed { background: #fee2e2; color: #dc2626; }
    .status-badge.in-progress { background: #dbeafe; color: #2563eb; }
    .status-badge.planned { background: #fef3c7; color: #d97706; }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  loading = signal(true);
  semesters = signal<Semester[]>([]);
  subjects = signal<Subject[]>([]);
  courses = signal<Course[]>([]);
  currentSemester = signal<Semester | null>(null);

  openCourses = signal(0);

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    // Load semesters
    this.adminService.getSemesters().subscribe({
      next: (data) => {
        this.semesters.set(data);
        const current = data.find(s => s.isCurrent);
        if (current) {
          this.currentSemester.set(current);
        }
      }
    });

    // Load subjects
    this.adminService.getSubjects().subscribe({
      next: (data) => this.subjects.set(data)
    });

    // Load courses
    this.adminService.getAllCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.openCourses.set(data.filter(c => c.status === 'OPEN').length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getCoursesInSemester(semesterId?: number): Course[] {
    if (!semesterId) return [];
    return this.courses().filter(c => c.semesterId === semesterId);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'OPEN': 'open',
      'CLOSED': 'closed',
      'IN_PROGRESS': 'in-progress',
      'PLANNED': 'planned'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'OPEN': 'Đang mở',
      'CLOSED': 'Đã đóng',
      'IN_PROGRESS': 'Đang học',
      'PLANNED': 'Sắp mở'
    };
    return map[status] || status;
  }
}
