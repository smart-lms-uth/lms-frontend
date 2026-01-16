import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { Course, CreateCourseRequest, Semester, Subject, CourseStatus } from '../../../services/course.service';
import { MainLayoutComponent } from '../../../components/layout/main-layout/main-layout.component';
import { NavigationService } from '../../../services/navigation.service';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="admin-page">
        <div class="page-header">
          <div class="header-left">
            <a [routerLink]="nav.getDashboardUrl()" class="back-link">← Quay lại</a>
            <h1>🎓 Quản lý Khóa học</h1>
          </div>
          <button class="btn-primary" (click)="openModal()">+ Thêm khóa học</button>
        </div>

        <!-- Filter -->
        <div class="filter-bar">
          <input type="text" [(ngModel)]="searchTerm" placeholder="Tìm kiếm..." 
                 class="search-input" (input)="filterCourses()">
          <select [(ngModel)]="filterSemester" (change)="filterCourses()" class="filter-select">
            <option value="">Tất cả học kỳ</option>
            <option *ngFor="let s of semesters()" [value]="s.id">{{ s.displayName }}</option>
          </select>
          <select [(ngModel)]="filterStatus" (change)="filterCourses()" class="filter-select">
            <option value="">Tất cả trạng thái</option>
            <option value="OPEN">Đang mở</option>
            <option value="CLOSED">Đã đóng</option>
            <option value="IN_PROGRESS">Đang học</option>
            <option value="PLANNED">Sắp mở</option>
          </select>
        </div>

        <!-- Courses Table -->
        <div class="table-wrapper">
          <table class="data-table" *ngIf="filteredCourses().length > 0; else empty">
            <thead>
              <tr>
                <th>Mã khóa học</th>
                <th>Môn học</th>
                <th>Học kỳ</th>
                <th>Phòng</th>
                <th>SV đăng ký</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let course of filteredCourses()">
                <td><strong>{{ course.courseCode }}</strong></td>
                <td>
                  <div class="subject-info">
                    <span class="subject-code">{{ course.subjectCode }}</span>
                    <span class="subject-name">{{ course.subjectName }}</span>
                  </div>
                </td>
                <td>{{ course.semesterCode }}</td>
                <td>{{ course.room || '-' }}</td>
                <td class="center">{{ course.currentEnrollment }}/{{ course.maxStudents }}</td>
                <td>
                  <span class="status-badge" [class]="getStatusClass(course.status)">
                    {{ getStatusLabel(course.status) }}
                  </span>
                </td>
                <td class="actions">
                  <button class="btn-icon" title="Sửa" (click)="editCourse(course)">✏️</button>
                  <button class="btn-icon" title="Chi tiết" routerLink="/teacher/courses/{{course.id}}">👁️</button>
                  <button class="btn-icon danger" title="Xóa" (click)="deleteCourse(course)">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #empty>
            <div class="empty-state">
              <p>{{ searchTerm || filterSemester || filterStatus ? 'Không tìm thấy khóa học phù hợp' : 'Chưa có khóa học nào' }}</p>
            </div>
          </ng-template>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ isEditing() ? 'Sửa khóa học' : 'Thêm khóa học mới' }}</h2>
              <button class="close-btn" (click)="closeModal()">×</button>
            </div>
            <form (ngSubmit)="saveCourse()">
              <div class="form-group">
                <label>Mã khóa học *</label>
                <input type="text" [(ngModel)]="formData.courseCode" name="courseCode" 
                       placeholder="VD: IT101-HK1-2025" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Môn học *</label>
                  <select [(ngModel)]="formData.subjectId" name="subjectId" required>
                    <option [ngValue]="0" disabled>-- Chọn môn học --</option>
                    <option *ngFor="let s of subjects()" [ngValue]="s.id">{{ s.subjectCode }} - {{ s.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Học kỳ *</label>
                  <select [(ngModel)]="formData.semesterId" name="semesterId" required>
                    <option [ngValue]="0" disabled>-- Chọn học kỳ --</option>
                    <option *ngFor="let s of semesters()" [ngValue]="s.id">{{ s.displayName }}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Phòng học</label>
                  <input type="text" [(ngModel)]="formData.room" name="room" placeholder="VD: A301">
                </div>
                <div class="form-group">
                  <label>Số SV tối đa *</label>
                  <input type="number" [(ngModel)]="formData.maxStudents" name="maxStudents" 
                         min="1" max="200" required>
                </div>
              </div>
              <div class="form-group">
                <label>Trạng thái *</label>
                <select [(ngModel)]="formData.status" name="status" required>
                  <option value="PLANNED">Sắp mở</option>
                  <option value="OPEN">Đang mở đăng ký</option>
                  <option value="IN_PROGRESS">Đang học</option>
                  <option value="CLOSED">Đã đóng</option>
                </select>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="closeModal()">Hủy</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  {{ saving() ? 'Đang lưu...' : (isEditing() ? 'Cập nhật' : 'Thêm mới') }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Loading -->
        <div class="loading-overlay" *ngIf="loading()">
          <div class="spinner"></div>
        </div>
      </div>
    </app-main-layout>
  `,
  styles: [`
    .admin-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 14px;
    }

    .page-header h1 {
      font-size: 24px;
      margin: 0;
    }

    .filter-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
    }

    .filter-select {
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      min-width: 160px;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-primary:hover { background: #2563eb; }
    .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }

    .btn-secondary {
      background: #e2e8f0;
      color: #475569;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
    }

    .table-wrapper {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th, .data-table td {
      padding: 14px 16px;
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

    .data-table tbody tr:hover { background: #f8fafc; }
    .data-table td.center { text-align: center; }

    .subject-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .subject-code {
      font-size: 12px;
      color: #64748b;
    }

    .subject-name {
      font-weight: 500;
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

    .actions { display: flex; gap: 8px; }

    .btn-icon {
      background: transparent;
      border: none;
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .btn-icon:hover { background: #e2e8f0; }
    .btn-icon.danger:hover { background: #fee2e2; }

    .empty-state {
      text-align: center;
      padding: 60px;
      color: #64748b;
    }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h2 { margin: 0; font-size: 18px; }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #64748b;
    }

    form { padding: 24px; }

    .form-group { margin-bottom: 16px; }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #374151;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    .loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AdminCoursesComponent implements OnInit {
  nav = inject(NavigationService);
  courses = signal<Course[]>([]);
  filteredCourses = signal<Course[]>([]);
  semesters = signal<Semester[]>([]);
  subjects = signal<Subject[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  editingId: number | null = null;

  searchTerm = '';
  filterSemester = '';
  filterStatus = '';

  formData: CreateCourseRequest & { room: string } = {
    courseCode: '',
    subjectId: 0,
    semesterId: 0,
    instructorId: 0,
    room: '',
    maxStudents: 40,
    status: 'PLANNED' as CourseStatus
  };

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    this.adminService.getSemesters().subscribe(data => this.semesters.set(data));
    this.adminService.getSubjects().subscribe(data => this.subjects.set(data));
    
    this.adminService.getAllCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.filterCourses();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  filterCourses() {
    let result = this.courses();
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        c.courseCode.toLowerCase().includes(term) ||
        c.subjectName?.toLowerCase().includes(term) ||
        c.subjectCode?.toLowerCase().includes(term)
      );
    }

    if (this.filterSemester) {
      result = result.filter(c => c.semesterId === +this.filterSemester);
    }

    if (this.filterStatus) {
      result = result.filter(c => c.status === this.filterStatus);
    }

    this.filteredCourses.set(result);
  }

  openModal() {
    this.isEditing.set(false);
    this.editingId = null;
    
    // Get current user id for instructor (assuming stored in localStorage)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    this.formData = {
      courseCode: '',
      subjectId: 0,
      semesterId: 0,
      instructorId: user.id || 1,
      room: '',
      maxStudents: 40,
      status: 'PLANNED'
    };
    this.showModal.set(true);
  }

  editCourse(course: Course) {
    this.isEditing.set(true);
    this.editingId = course.id;
    this.formData = {
      courseCode: course.courseCode,
      subjectId: course.subjectId,
      semesterId: course.semesterId,
      instructorId: course.instructorId,
      room: course.room || '',
      maxStudents: course.maxStudents,
      status: course.status
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveCourse() {
    this.saving.set(true);
    
    if (this.isEditing() && this.editingId) {
      this.adminService.updateCourse(this.editingId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.adminService.createCourse(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  deleteCourse(course: Course) {
    if (confirm(`Xóa khóa học "${course.courseCode}"? Thao tác này không thể hoàn tác!`)) {
      this.adminService.deleteCourse(course.id).subscribe({
        next: () => this.loadData()
      });
    }
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
