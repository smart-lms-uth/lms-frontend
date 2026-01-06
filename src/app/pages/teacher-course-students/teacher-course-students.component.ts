import { Component, Input, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentService, Enrollment, EnrollmentStatus } from '../../services/enrollment.service';
import { CardComponent, BadgeComponent } from '../../components/ui';

interface StudentSearchResult {
  id: number;
  code: string;
  fullName: string;
  email: string;
}

@Component({
  selector: 'app-teacher-course-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    BadgeComponent
  ],
  template: `
    <div class="students-container">
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
              <td>
                <app-badge [variant]="enrollmentService.getStatusVariant(enrollment.status)">
                  {{ enrollmentService.getStatusLabel(enrollment.status) }}
                </app-badge>
              </td>
              <td class="td-actions">
                <div class="action-buttons">
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

      <!-- Add Student Modal -->
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
              <label class="form-label">Mã sinh viên (MSSV)</label>
              <input 
                type="text" 
                class="form-input"
                placeholder="Nhập mã sinh viên..."
                [(ngModel)]="newStudentId">
              <span class="form-hint">Nhập ID hoặc mã số sinh viên để ghi danh</span>
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
    </div>
  `,
  styles: [`
    .students-container {
      padding: 0;
    }

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
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 10px;

      svg {
        color: var(--color-text-muted);
      }
    }

    .search-input {
      flex: 1;
      border: none;
      background: none;
      color: var(--color-text);
      font-size: 0.875rem;
      outline: none;

      &::placeholder {
        color: var(--color-text-muted);
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
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 10px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
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
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
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
        color: var(--color-text-muted);
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      p {
        color: var(--color-text-muted);
        margin: 0;
      }
    }

    .students-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-surface);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--color-border);
    }

    th, td {
      padding: 0.875rem 1rem;
      text-align: left;
    }

    th {
      background: var(--color-background);
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      border-top: 1px solid var(--color-border);
      font-size: 0.875rem;
    }

    .th-index { width: 50px; text-align: center; }
    .th-code { width: 120px; }
    .th-name { min-width: 180px; }
    .th-status { width: 120px; }
    .th-scores { width: 80px; text-align: center; }
    .th-actions { width: 120px; text-align: center; }

    .td-code {
      font-family: monospace;
      font-weight: 500;
      color: var(--color-primary);
    }

    .td-name {
      font-weight: 500;
      color: var(--color-text);
    }

    .td-score {
      text-align: center;
      font-family: monospace;

      &--total {
        font-weight: 600;
        color: var(--color-primary);
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
      background: var(--color-surface);
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
      border-bottom: 1px solid var(--color-border);

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
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
      color: var(--color-text-muted);
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background: var(--color-background);
        color: var(--color-text);
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
      border-top: 1px solid var(--color-border);
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: var(--color-text);
      font-size: 0.9375rem;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
    }

    .form-hint {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

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
    }

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
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: #2563eb;
        }
      }

      &--secondary {
        background: var(--color-background);
        border: 1px solid var(--color-border);
        color: var(--color-text);

        &:hover:not(:disabled) {
          background: var(--color-surface);
        }
      }
    }

    @media (max-width: 768px) {
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
    }
  `]
})
export class TeacherCourseStudentsComponent implements OnInit {
  @Input() courseId!: number;

  loading = signal(true);
  adding = signal(false);
  enrollments = signal<Enrollment[]>([]);
  filteredEnrollments = signal<Enrollment[]>([]);
  
  showAddModal = signal(false);
  newStudentId = '';
  searchQuery = '';
  
  addError = signal('');
  addSuccess = signal('');

  constructor(public enrollmentService: EnrollmentService) {}

  ngOnInit() {
    if (this.courseId) {
      this.loadEnrollments();
    }
  }

  async loadEnrollments() {
    this.loading.set(true);
    try {
      const enrollments = await this.enrollmentService.getEnrollmentsByCourse(this.courseId).toPromise();
      this.enrollments.set(enrollments || []);
      this.filterStudents();
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      this.loading.set(false);
    }
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
      const enrollment = await this.enrollmentService.enrollStudent(this.courseId, studentId).toPromise();
      
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
}
