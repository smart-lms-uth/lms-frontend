import { Component, Input, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentService, Enrollment, EnrollmentStatus } from '../../services/enrollment.service';
import { AuthService, RegisterRequest, ApiResponse } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { CardComponent, BadgeComponent } from '../../components/ui';
import { StudentActivityModalComponent } from '../../components/student-activity-modal/student-activity-modal.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface StudentSearchResult {
  id: number;
  code: string;
  fullName: string;
  email: string;
}

interface CreateStudentForm {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

@Component({
  selector: 'app-teacher-course-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    BadgeComponent,
    StudentActivityModalComponent
  ],
  template: `
    <div class="students-container">
      <!-- Tabs -->
      <div class="tabs-header">
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'list'"
          (click)="activeTab.set('list')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Sinh viên lớp học
          <span class="tab-badge">{{ enrollments().length }}</span>
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'all'"
          (click)="switchToAllTab()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-4-4h-2"></path>
            <circle cx="17" cy="7" r="4"></circle>
          </svg>
          Tất cả sinh viên
          <span class="tab-badge" *ngIf="allStudents().length > 0">{{ allStudents().length }}</span>
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'create'"
          (click)="activeTab.set('create')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          Tạo sinh viên mới
        </button>
      </div>

      <!-- Tab: Student List -->
      <div *ngIf="activeTab() === 'list'" class="tab-content">
        <!-- Header Actions -->
        <div class="students-header">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input 
              type="text" 
              class="search-input"
              placeholder="Tìm kiếm sinh viên..."
              [(ngModel)]="searchQuery"
              (input)="filterStudents()">
          </div>
          
          <button class="btn btn--primary" (click)="showAddModal.set(true)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Ghi danh sinh viên
          </button>
        </div>

        <!-- Stats -->
        <div class="students-stats">
          <div class="stat-card">
            <span class="stat-value">{{ enrollments().length }}</span>
            <span class="stat-label">Tổng sinh viên</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ getCountByStatus('ENROLLED') }}</span>
            <span class="stat-label">Đang học</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ getCountByStatus('COMPLETED') }}</span>
            <span class="stat-label">Hoàn thành</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ getCountByStatus('DROPPED') }}</span>
            <span class="stat-label">Đã hủy</span>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading()" class="loading-container">
          <div class="spinner"></div>
          <p>Đang tải danh sách sinh viên...</p>
        </div>

        <!-- Student List -->
        <div *ngIf="!loading()" class="students-list">
          <div *ngIf="filteredEnrollments().length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p *ngIf="searchQuery">Không tìm thấy sinh viên nào phù hợp</p>
            <p *ngIf="!searchQuery">Chưa có sinh viên nào trong lớp</p>
          </div>

          <table class="students-table" *ngIf="filteredEnrollments().length > 0">
            <thead>
              <tr>
                <th class="th-index">#</th>
                <th class="th-code">MSSV</th>
                <th class="th-name">Họ và tên</th>
                <th class="th-last-access">Truy cập cuối</th>
                <th class="th-status">Trạng thái</th>
                <th class="th-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let enrollment of filteredEnrollments(); let i = index"
                  [class.row--dropped]="enrollment.status === 'DROPPED'">
                <td>{{ i + 1 }}</td>
                <td class="td-code">{{ enrollment.studentCode }}</td>
                <td class="td-name">{{ enrollment.studentName }}</td>
                <td class="td-last-access">
                  <button 
                    class="last-access-btn"
                    [class.has-access]="studentLastAccess()[enrollment.studentId]"
                    (click)="viewStudentActivity(enrollment)"
                    [title]="studentLastAccess()[enrollment.studentId] ? 'Click để xem chi tiết hoạt động' : 'Chưa truy cập'">
                    <svg *ngIf="studentLastAccess()[enrollment.studentId]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <svg *ngIf="!studentLastAccess()[enrollment.studentId]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    <span>{{ formatLastAccess(studentLastAccess()[enrollment.studentId]) }}</span>
                  </button>
                </td>
                <td>
                  <app-badge [variant]="enrollmentService.getStatusVariant(enrollment.status)">
                    {{ enrollmentService.getStatusLabel(enrollment.status) }}
                  </app-badge>
                </td>
                <td class="td-actions">
                  <div class="action-buttons">
                    <button 
                      class="action-btn action-btn--activity"
                      title="Xem hoạt động"
                      (click)="viewStudentActivity(enrollment)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </button>
                    <button 
                      *ngIf="enrollment.status === 'PENDING'"
                      class="action-btn action-btn--approve"
                      title="Duyệt đăng ký"
                      (click)="approveEnrollment(enrollment)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                    <button 
                      *ngIf="enrollment.status === 'ENROLLED'"
                      class="action-btn action-btn--complete"
                      title="Đánh dấu hoàn thành"
                      (click)="completeEnrollment(enrollment)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </button>
                    <button 
                      *ngIf="enrollment.status !== 'DROPPED'"
                      class="action-btn action-btn--drop"
                      title="Xóa khỏi lớp"
                      (click)="dropEnrollment(enrollment)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                    <button 
                      *ngIf="enrollment.status === 'DROPPED'"
                      class="action-btn action-btn--restore"
                      title="Khôi phục"
                      (click)="restoreEnrollment(enrollment)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Create Student -->
      <div *ngIf="activeTab() === 'create'" class="tab-content">
        <div class="create-student-container">
          <div class="create-student-header">
            <h3>Tạo tài khoản sinh viên mới</h3>
            <p class="create-student-desc">
              Tạo tài khoản cho sinh viên mới. Sau khi tạo, sinh viên có thể đăng nhập và cập nhật thông tin cá nhân.
            </p>
          </div>

          <form class="create-form" (ngSubmit)="createStudent()">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">
                  <span class="required">*</span> Username
                </label>
                <input 
                  type="text" 
                  class="form-input"
                  placeholder="vd: sv001, nguyenvana..."
                  [(ngModel)]="createForm.username"
                  name="username"
                  required
                  minlength="3">
                <span class="form-hint">Tên đăng nhập, tối thiểu 3 ký tự</span>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span class="required">*</span> Email
                </label>
                <input 
                  type="email" 
                  class="form-input"
                  placeholder="vd: sv001@uth.edu.vn"
                  [(ngModel)]="createForm.email"
                  name="email"
                  required>
                <span class="form-hint">Email của sinh viên</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">
                  <span class="required">*</span> Mật khẩu
                </label>
                <div class="password-input-wrapper">
                  <input 
                    [type]="showPassword() ? 'text' : 'password'" 
                    class="form-input"
                    placeholder="Nhập mật khẩu..."
                    [(ngModel)]="createForm.password"
                    name="password"
                    required
                    minlength="6">
                  <button 
                    type="button" 
                    class="toggle-password"
                    (click)="showPassword.set(!showPassword())">
                    <svg *ngIf="!showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg *ngIf="showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>
                <span class="form-hint">Mật khẩu tối thiểu 6 ký tự</span>
              </div>

              <div class="form-group">
                <label class="form-label">Họ và tên</label>
                <input 
                  type="text" 
                  class="form-input"
                  placeholder="vd: Nguyễn Văn A"
                  [(ngModel)]="createForm.fullName"
                  name="fullName">
                <span class="form-hint">Sinh viên có thể cập nhật sau</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Số điện thoại</label>
                <input 
                  type="tel" 
                  class="form-input"
                  placeholder="vd: 0901234567"
                  [(ngModel)]="createForm.phoneNumber"
                  name="phoneNumber">
                <span class="form-hint">Không bắt buộc</span>
              </div>

              <div class="form-group">
                <label class="form-label">Vai trò</label>
                <div class="role-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                  Sinh viên (STUDENT)
                </div>
                <span class="form-hint">Tài khoản được tạo sẽ có role Sinh viên</span>
              </div>
            </div>

            <!-- Auto enroll option -->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="autoEnroll"
                  name="autoEnroll">
                <span class="checkmark"></span>
                Tự động ghi danh vào khóa học này sau khi tạo
              </label>
            </div>

            <!-- Alert messages -->
            <div class="alert alert--error" *ngIf="createError()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              {{ createError() }}
            </div>

            <div class="alert alert--success" *ngIf="createSuccess()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              {{ createSuccess() }}
            </div>

            <!-- Created students list -->
            <div class="created-students" *ngIf="createdStudents().length > 0">
              <h4>Sinh viên đã tạo trong phiên này:</h4>
              <div class="created-list">
                <div class="created-item" *ngFor="let student of createdStudents()">
                  <div class="created-info">
                    <span class="created-name">{{ student.fullName || student.username }}</span>
                    <span class="created-email">{{ student.email }}</span>
                  </div>
                  <app-badge variant="success">Đã tạo</app-badge>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <button 
                type="button" 
                class="btn btn--secondary" 
                (click)="resetCreateForm()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                Đặt lại
              </button>
              <button 
                type="submit" 
                class="btn btn--primary"
                [disabled]="creating() || !isCreateFormValid()">
                <div *ngIf="creating()" class="spinner-small"></div>
                <svg *ngIf="!creating()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                {{ creating() ? 'Đang tạo...' : 'Tạo sinh viên' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Tab: All Students -->
      <div *ngIf="activeTab() === 'all'" class="tab-content">
        <!-- Header with Filter -->
        <div class="all-students-header">
          <div class="search-filter-row">
            <div class="search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input 
                type="text" 
                class="search-input"
                placeholder="Tìm kiếm theo tên, username, email..."
                [(ngModel)]="allStudentsSearchQuery"
                (input)="filterAllStudents()">
            </div>
            
            <div class="filter-buttons">
              <button 
                class="filter-btn" 
                [class.active]="allStudentsFilter() === 'all'"
                (click)="setAllStudentsFilter('all')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-4-4h-2"></path>
                  <circle cx="17" cy="7" r="4"></circle>
                </svg>
                Tất cả ({{ allStudents().length }})
              </button>
              <button 
                class="filter-btn" 
                [class.active]="allStudentsFilter() === 'enrolled'"
                (click)="setAllStudentsFilter('enrolled')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Trong lớp ({{ getEnrolledCount() }})
              </button>
              <button 
                class="filter-btn" 
                [class.active]="allStudentsFilter() === 'not-enrolled'"
                (click)="setAllStudentsFilter('not-enrolled')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Ngoài lớp ({{ getNotEnrolledCount() }})
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loadingAllStudents()" class="loading-container">
          <div class="spinner"></div>
          <p>Đang tải danh sách sinh viên...</p>
        </div>

        <!-- Error -->
        <div *ngIf="allStudentsError()" class="alert alert--error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {{ allStudentsError() }}
          <button class="btn btn--link" (click)="loadAllStudents()">Thử lại</button>
        </div>

        <!-- Students Table -->
        <div class="table-wrapper" *ngIf="!loadingAllStudents() && !allStudentsError()">
          <div *ngIf="filteredAllStudents().length === 0" class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-4-4h-2"></path>
              <circle cx="17" cy="7" r="4"></circle>
            </svg>
            <p *ngIf="allStudentsSearchQuery">Không tìm thấy sinh viên phù hợp</p>
            <p *ngIf="!allStudentsSearchQuery && allStudentsFilter() === 'enrolled'">Chưa có sinh viên nào trong lớp</p>
            <p *ngIf="!allStudentsSearchQuery && allStudentsFilter() === 'not-enrolled'">Tất cả sinh viên đã trong lớp</p>
            <p *ngIf="!allStudentsSearchQuery && allStudentsFilter() === 'all'">Chưa có sinh viên nào trong hệ thống</p>
          </div>

          <table class="students-table all-students-table" *ngIf="filteredAllStudents().length > 0">
            <thead>
              <tr>
                <th class="th-stt">STT</th>
                <th class="th-code">Username</th>
                <th class="th-name">Họ và tên</th>
                <th class="th-email">Email</th>
                <th class="th-status">Trạng thái</th>
                <th class="th-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let student of filteredAllStudents(); let i = index"
                  [class.row--enrolled]="isStudentEnrolled(student.id)">
                <td class="td-stt">{{ i + 1 }}</td>
                <td class="td-code">{{ student.username }}</td>
                <td class="td-name">{{ student.fullName || '(Chưa cập nhật)' }}</td>
                <td class="td-email">{{ student.email }}</td>
                <td class="td-status">
                  <app-badge 
                    *ngIf="isStudentEnrolled(student.id)"
                    variant="success">
                    Trong lớp
                  </app-badge>
                  <app-badge 
                    *ngIf="!isStudentEnrolled(student.id)"
                    variant="secondary">
                    Ngoài lớp
                  </app-badge>
                </td>
                <td class="td-actions">
                  <button 
                    *ngIf="!isStudentEnrolled(student.id)"
                    class="action-btn action-btn--success" 
                    title="Ghi danh vào lớp"
                    [disabled]="enrollingStudentId() === student.id"
                    (click)="enrollStudentFromList(student)">
                    <div *ngIf="enrollingStudentId() === student.id" class="spinner-tiny"></div>
                    <svg *ngIf="enrollingStudentId() !== student.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                  </button>
                  <span 
                    *ngIf="isStudentEnrolled(student.id)" 
                    class="enrolled-text">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Đã ghi danh
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Student Modal (for enrolling existing students) -->
      <div class="modal-overlay" *ngIf="showAddModal()" (click)="closeAddModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Ghi danh sinh viên</h3>
            <button class="modal-close" (click)="closeAddModal()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Mã sinh viên (ID)</label>
              <input 
                type="text" 
                class="form-input"
                placeholder="Nhập ID sinh viên..."
                [(ngModel)]="newStudentId">
              <span class="form-hint">Nhập ID của sinh viên đã có tài khoản để ghi danh vào lớp</span>
            </div>

            <div class="alert alert--info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Để tạo tài khoản sinh viên mới, vui lòng sử dụng tab "Tạo sinh viên mới"
            </div>

            <div class="alert alert--error" *ngIf="addError()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              {{ addError() }}
            </div>

            <div class="alert alert--success" *ngIf="addSuccess()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              {{ addSuccess() }}
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn--secondary" (click)="closeAddModal()">Hủy</button>
            <button 
              class="btn btn--primary" 
              [disabled]="!newStudentId || adding()"
              (click)="addStudent()">
              <div *ngIf="adding()" class="spinner-small"></div>
              {{ adding() ? 'Đang xử lý...' : 'Ghi danh' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Student Activity Modal -->
      <app-student-activity-modal
        *ngIf="showActivityModal()"
        [courseId]="courseId"
        [studentId]="selectedStudentId()"
        [studentName]="selectedStudentName()"
        [studentCode]="selectedStudentCode()"
        (close)="closeActivityModal()">
      </app-student-activity-modal>
    </div>
  `,
  styles: [`
    .students-container {
      padding: 0;
    }

    /* Tabs */
    .tabs-header {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--gray-200);
      padding-bottom: 0;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1.25rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--gray-500);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: -1px;

      svg {
        opacity: 0.7;
      }

      &:hover {
        color: var(--gray-800);
        background: var(--gray-50);
      }

      &.active {
        color: var(--primary-500);
        border-bottom-color: var(--primary-500);
        
        svg {
          opacity: 1;
        }
      }
    }

    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 10px;
      background: var(--gray-200);
      color: var(--gray-500);
    }

    .tab-btn.active .tab-badge {
      background: var(--primary-500);
      color: white;
    }

    .tab-content {
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Student List Tab */
    .students-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      max-width: 400px;
      padding: 0.625rem 1rem;
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: 10px;

      svg {
        color: var(--gray-400);
      }
    }

    .search-input {
      flex: 1;
      border: none;
      background: none;
      color: var(--gray-800);
      font-size: 0.875rem;
      outline: none;

      &::placeholder {
        color: var(--gray-400);
      }
    }

    .students-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: 10px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-500);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--gray-500);
      margin-top: 0.25rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--gray-200);
      border-top-color: var(--primary-500);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
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
      padding: 3rem;
      text-align: center;

      svg {
        color: var(--gray-400);
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      p {
        color: var(--gray-500);
        margin: 0;
      }
    }

    .students-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--white);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--gray-200);
    }

    th, td {
      padding: 0.875rem 1rem;
      text-align: left;
    }

    th {
      background: var(--gray-50);
      color: var(--gray-500);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      border-top: 1px solid var(--gray-200);
      font-size: 0.875rem;
    }

    .th-index { width: 50px; text-align: center; }
    .th-code { width: 120px; }
    .th-name { min-width: 180px; }
    .th-last-access { width: 160px; }
    .th-status { width: 120px; }
    .th-actions { width: 120px; text-align: center; }

    .td-code {
      font-family: monospace;
      font-weight: 500;
      color: var(--primary-500);
    }

    .td-name {
      font-weight: 500;
      color: var(--gray-800);
    }

    .td-last-access {
      font-size: 0.8125rem;
    }

    .last-access-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      background: var(--gray-100);
      border: 1px solid var(--gray-200);
      border-radius: 6px;
      color: var(--gray-500);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;

      svg {
        flex-shrink: 0;
      }

      &:hover {
        background: var(--gray-200);
        color: var(--gray-700);
      }

      &.has-access {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.2);
        color: #059669;

        &:hover {
          background: rgba(16, 185, 129, 0.2);
        }
      }
    }

    .td-actions {
      text-align: center;
    }

    .row--dropped {
      opacity: 0.6;
      background: rgba(239, 68, 68, 0.05);
    }

    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;

      &--activity {
        background: rgba(139, 92, 246, 0.1);
        color: #7c3aed;
        &:hover { background: rgba(139, 92, 246, 0.2); }
      }

      &--approve {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
        &:hover { background: rgba(16, 185, 129, 0.2); }
      }

      &--complete {
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
        &:hover { background: rgba(59, 130, 246, 0.2); }
      }

      &--drop {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        &:hover { background: rgba(239, 68, 68, 0.2); }
      }

      &--restore {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
        &:hover { background: rgba(245, 158, 11, 0.2); }
      }
    }

    /* Create Student Tab */
    .create-student-container {
      max-width: 800px;
    }

    .create-student-header {
      margin-bottom: 1.5rem;

      h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gray-800);
      }
    }

    .create-student-desc {
      margin: 0;
      color: var(--gray-500);
      font-size: 0.875rem;
    }

    .create-form {
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gray-700);

      .required {
        color: #dc2626;
      }
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      color: var(--gray-800);
      font-size: 0.9375rem;

      &:focus {
        outline: none;
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
    }

    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;

      .form-input {
        padding-right: 3rem;
      }
    }

    .toggle-password {
      position: absolute;
      right: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      color: var(--gray-400);
      cursor: pointer;
      border-radius: 4px;

      &:hover {
        color: var(--gray-700);
        background: var(--gray-100);
      }
    }

    .form-hint {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 8px;
      color: var(--primary-500);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .checkbox-group {
      margin-bottom: 1.25rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--gray-700);

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--primary-500);
        cursor: pointer;
      }
    }

    .created-students {
      margin: 1.5rem 0;
      padding: 1rem;
      background: var(--gray-50);
      border-radius: 8px;

      h4 {
        margin: 0 0 0.75rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--gray-800);
      }
    }

    .created-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .created-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: 6px;
    }

    .created-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .created-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--gray-800);
    }

    .created-email {
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--gray-200);
    }

    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-top: 1rem;

      &--error {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }

      &--success {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }

      &--info {
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
        border: 1px solid rgba(59, 130, 246, 0.2);
      }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &--primary {
        background: var(--primary-500);
        color: white;

        &:hover:not(:disabled) {
          background: var(--primary-600);
        }
      }

      &--secondary {
        background: var(--gray-50);
        border: 1px solid var(--gray-200);
        color: var(--gray-700);

        &:hover:not(:disabled) {
          background: var(--gray-100);
        }
      }
    }

    /* All Students Tab */
    .all-students-header {
      margin-bottom: 1.5rem;
    }

    .search-filter-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .filter-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--gray-500);
      cursor: pointer;
      transition: all 0.2s;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--gray-50);
        color: var(--gray-700);
      }

      &.active {
        background: var(--primary-500);
        border-color: var(--primary-500);
        color: white;
      }
    }

    .all-students-table {
      tr.row--enrolled {
        background: rgba(34, 197, 94, 0.05);
      }
    }

    .enrolled-text {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--success-500);
      font-size: 0.8125rem;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .spinner-tiny {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    .action-btn--success {
      background: var(--success-500);
      color: white;

      &:hover:not(:disabled) {
        background: #16a34a;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    /* Modal */
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
    }

    .modal-content {
      background: var(--white);
      border-radius: 12px;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid var(--gray-200);

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gray-800);
      }
    }

    .modal-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--gray-400);
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background: var(--gray-100);
        color: var(--gray-700);
      }
    }

    .modal-body {
      padding: 1.25rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.25rem;
      border-top: 1px solid var(--gray-200);
    }

    @media (max-width: 768px) {
      .tabs-header {
        flex-wrap: wrap;
      }

      .tab-btn {
        flex: 1;
        justify-content: center;
      }

      .students-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .students-header {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        max-width: none;
      }

      .students-table {
        display: block;
        overflow-x: auto;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TeacherCourseStudentsComponent implements OnInit {
  @Input() courseId!: number;

  // Tab state
  activeTab = signal<'list' | 'create' | 'all'>('list');

  // List tab state
  loading = signal(true);
  adding = signal(false);
  enrollments = signal<Enrollment[]>([]);
  filteredEnrollments = signal<Enrollment[]>([]);
  
  showAddModal = signal(false);
  newStudentId = '';
  searchQuery = '';
  
  addError = signal('');
  addSuccess = signal('');

  // Activity modal state
  showActivityModal = signal(false);
  selectedStudentId = signal<number>(0);
  selectedStudentName = signal<string>('');
  selectedStudentCode = signal<string>('');
  
  // Last access tracking
  studentLastAccess = signal<{ [studentId: number]: string }>({});

  // Create tab state
  creating = signal(false);
  createError = signal('');
  createSuccess = signal('');
  showPassword = signal(false);
  autoEnroll = true;
  
  createForm: CreateStudentForm = {
    username: '',
    email: '',
    password: '',
    fullName: '',
    phoneNumber: ''
  };

  createdStudents = signal<{username: string; email: string; fullName: string; id: number}[]>([]);

  // All students tab state
  allStudents = signal<any[]>([]);
  filteredAllStudents = signal<any[]>([]);
  loadingAllStudents = signal(false);
  allStudentsError = signal('');
  allStudentsSearchQuery = '';
  allStudentsFilter = signal<'all' | 'enrolled' | 'not-enrolled'>('all');
  enrollingStudentId = signal<number | null>(null);

  private readonly API_URL = environment.apiUrl;

  constructor(
    public enrollmentService: EnrollmentService,
    private activityService: ActivityService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    if (this.courseId) {
      this.loadEnrollments();
    }
  }

  // ============ Create Student Methods ============

  isCreateFormValid(): boolean {
    return !!(
      this.createForm.username?.trim() &&
      this.createForm.username.length >= 3 &&
      this.createForm.email?.trim() &&
      this.createForm.email.includes('@') &&
      this.createForm.password?.trim() &&
      this.createForm.password.length >= 6
    );
  }

  async createStudent() {
    if (!this.isCreateFormValid() || this.creating()) return;

    this.creating.set(true);
    this.createError.set('');
    this.createSuccess.set('');

    try {
      // Register new student
      const registerRequest: RegisterRequest = {
        username: this.createForm.username.trim(),
        email: this.createForm.email.trim(),
        password: this.createForm.password,
        fullName: this.createForm.fullName?.trim() || undefined,
        phoneNumber: this.createForm.phoneNumber?.trim() || undefined
      };

      const response = await this.http.post<ApiResponse<any>>(
        `${this.API_URL}/auth/register`,
        registerRequest
      ).toPromise();

      if (response?.success && response.data) {
        const newUser = response.data;
        
        // Add to created list
        this.createdStudents.update(list => [...list, {
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName || this.createForm.fullName,
          id: newUser.id
        }]);

        // Auto enroll if checked
        if (this.autoEnroll && newUser.id) {
          try {
            // Sử dụng teacherEnrollStudent để bỏ qua kiểm tra trạng thái lớp
            await this.enrollmentService.teacherEnrollStudent(this.courseId, newUser.id).toPromise();
            this.createSuccess.set(`Đã tạo tài khoản "${newUser.username}" và ghi danh vào lớp thành công!`);
            // Reload enrollments
            await this.loadEnrollments();
          } catch (enrollError: any) {
            this.createSuccess.set(`Đã tạo tài khoản "${newUser.username}" thành công! Nhưng chưa thể ghi danh: ${enrollError?.error?.message || 'Lỗi không xác định'}`);
          }
        } else {
          this.createSuccess.set(`Đã tạo tài khoản "${newUser.username}" thành công!`);
        }

        // Reset form
        this.resetCreateForm();
      }
    } catch (error: any) {
      console.error('Error creating student:', error);
      this.createError.set(error?.error?.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      this.creating.set(false);
    }
  }

  resetCreateForm() {
    this.createForm = {
      username: '',
      email: '',
      password: '',
      fullName: '',
      phoneNumber: ''
    };
    this.createError.set('');
  }

  // ============ List Tab Methods ============

  viewStudentActivity(enrollment: Enrollment): void {
    this.selectedStudentId.set(enrollment.studentId);
    this.selectedStudentName.set(enrollment.studentName);
    this.selectedStudentCode.set(enrollment.studentCode);
    this.showActivityModal.set(true);
  }

  closeActivityModal(): void {
    this.showActivityModal.set(false);
    this.selectedStudentId.set(0);
    this.selectedStudentName.set('');
    this.selectedStudentCode.set('');
  }

  async loadEnrollments() {
    this.loading.set(true);
    try {
      const enrollments = await this.enrollmentService.getEnrollmentsByCourse(this.courseId).toPromise();
      this.enrollments.set(enrollments || []);
      this.filterStudents();
      
      // Load last access data
      this.loadStudentsLastAccess();
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadStudentsLastAccess() {
    try {
      const response = await this.activityService.getCourseStudentsLastAccess(this.courseId).toPromise();
      if (response?.success && response.data) {
        this.studentLastAccess.set(response.data);
      }
    } catch (error) {
      console.error('Error loading last access data:', error);
      // Don't show error to user, just leave lastAccess empty
    }
  }

  formatLastAccess(timestamp: string | undefined): string {
    if (!timestamp) return 'Chưa truy cập';
    
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

  filterStudents() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredEnrollments.set(this.enrollments());
    } else {
      this.filteredEnrollments.set(
        this.enrollments().filter(e =>
          e.studentName.toLowerCase().includes(query) ||
          e.studentCode.toLowerCase().includes(query)
        )
      );
    }
  }

  getCountByStatus(status: EnrollmentStatus): number {
    return this.enrollments().filter(e => e.status === status).length;
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.newStudentId = '';
    this.addError.set('');
    this.addSuccess.set('');
  }

  async addStudent() {
    if (!this.newStudentId || this.adding()) return;

    const studentId = parseInt(this.newStudentId);
    if (isNaN(studentId)) {
      this.addError.set('Mã sinh viên không hợp lệ');
      return;
    }

    // Check if already enrolled
    if (this.enrollments().some(e => e.studentId === studentId && e.status !== 'DROPPED')) {
      this.addError.set('Sinh viên đã có trong danh sách lớp');
      return;
    }

    this.adding.set(true);
    this.addError.set('');
    this.addSuccess.set('');

    try {
      // Sử dụng teacherEnrollStudent để bỏ qua kiểm tra trạng thái lớp
      const enrollment = await this.enrollmentService.teacherEnrollStudent(this.courseId, studentId).toPromise();
      
      if (enrollment) {
        this.enrollments.update(list => [...list, enrollment]);
        this.filterStudents();
        this.addSuccess.set(`Ghi danh thành công sinh viên ${enrollment.studentName}`);
        this.newStudentId = '';
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.closeAddModal();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error adding student:', error);
      this.addError.set(error?.error?.message || 'Có lỗi xảy ra khi ghi danh');
    } finally {
      this.adding.set(false);
    }
  }

  async approveEnrollment(enrollment: Enrollment) {
    try {
      await this.enrollmentService.updateEnrollmentStatus(enrollment.id, 'ENROLLED').toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'ENROLLED' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error approving enrollment:', error);
    }
  }

  async completeEnrollment(enrollment: Enrollment) {
    try {
      await this.enrollmentService.updateEnrollmentStatus(enrollment.id, 'COMPLETED').toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'COMPLETED' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error completing enrollment:', error);
    }
  }

  async dropEnrollment(enrollment: Enrollment) {
    if (!confirm(`Bạn có chắc muốn xóa sinh viên ${enrollment.studentName} khỏi lớp?`)) {
      return;
    }

    try {
      await this.enrollmentService.cancelEnrollment(enrollment.id).toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'DROPPED' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error dropping enrollment:', error);
    }
  }

  async restoreEnrollment(enrollment: Enrollment) {
    try {
      await this.enrollmentService.updateEnrollmentStatus(enrollment.id, 'ENROLLED').toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'ENROLLED' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error restoring enrollment:', error);
    }
  }

  // ============ All Students Tab Methods ============

  switchToAllTab() {
    this.activeTab.set('all');
    if (this.allStudents().length === 0) {
      this.loadAllStudents();
    }
  }

  async loadAllStudents() {
    this.loadingAllStudents.set(true);
    this.allStudentsError.set('');

    try {
      const response = await this.http.get<ApiResponse<any[]>>(
        `${this.API_URL}/internal/users/students`
      ).toPromise();

      if (response?.success && response.data) {
        this.allStudents.set(response.data);
        this.filterAllStudents();
      }
    } catch (error: any) {
      console.error('Error loading all students:', error);
      this.allStudentsError.set(error?.error?.message || 'Không thể tải danh sách sinh viên');
    } finally {
      this.loadingAllStudents.set(false);
    }
  }

  filterAllStudents() {
    let filtered = [...this.allStudents()];

    // Apply search filter
    if (this.allStudentsSearchQuery) {
      const query = this.allStudentsSearchQuery.toLowerCase();
      filtered = filtered.filter(student =>
        student.username?.toLowerCase().includes(query) ||
        student.fullName?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      );
    }

    // Apply enrollment filter
    const filter = this.allStudentsFilter();
    if (filter === 'enrolled') {
      filtered = filtered.filter(student => this.isStudentEnrolled(student.id));
    } else if (filter === 'not-enrolled') {
      filtered = filtered.filter(student => !this.isStudentEnrolled(student.id));
    }

    this.filteredAllStudents.set(filtered);
  }

  setAllStudentsFilter(filter: 'all' | 'enrolled' | 'not-enrolled') {
    this.allStudentsFilter.set(filter);
    this.filterAllStudents();
  }

  isStudentEnrolled(studentId: number): boolean {
    return this.enrollments().some(
      e => e.studentId === studentId && e.status !== 'DROPPED'
    );
  }

  getEnrolledCount(): number {
    return this.allStudents().filter(s => this.isStudentEnrolled(s.id)).length;
  }

  getNotEnrolledCount(): number {
    return this.allStudents().filter(s => !this.isStudentEnrolled(s.id)).length;
  }

  async enrollStudentFromList(student: any) {
    this.enrollingStudentId.set(student.id);

    try {
      const enrollment = await this.enrollmentService.teacherEnrollStudent(this.courseId, student.id).toPromise();
      
      if (enrollment) {
        this.enrollments.update(list => [...list, enrollment]);
        this.filterStudents();
        this.filterAllStudents();
      }
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      alert(error?.error?.message || 'Có lỗi xảy ra khi ghi danh');
    } finally {
      this.enrollingStudentId.set(null);
    }
  }
}
