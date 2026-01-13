import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { Subject, CreateSubjectRequest } from '../../../services/course.service';
import { MainLayoutComponent } from '../../../components/layout/main-layout/main-layout.component';

@Component({
  selector: 'app-admin-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="admin-page">
        <div class="page-header">
          <div class="header-left">
            <a routerLink="/admin/dashboard" class="back-link">← Quay lại</a>
            <h1>📚 Quản lý Môn học</h1>
          </div>
          <button class="btn-primary" (click)="openModal()">+ Thêm môn học</button>
        </div>

        <!-- Filter -->
        <div class="filter-bar">
          <input type="text" [(ngModel)]="searchTerm" placeholder="Tìm kiếm môn học..." 
                 class="search-input" (input)="filterSubjects()">
          <select [(ngModel)]="filterActive" (change)="filterSubjects()" class="filter-select">
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>

        <!-- Subjects Table -->
        <div class="table-wrapper">
          <table class="data-table" *ngIf="filteredSubjects().length > 0; else empty">
            <thead>
              <tr>
                <th>Mã môn</th>
                <th>Tên môn học</th>
                <th>Số tín chỉ</th>
                <th>Khoa/Bộ môn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let subject of filteredSubjects()">
                <td><strong>{{ subject.subjectCode }}</strong></td>
                <td>{{ subject.name }}</td>
                <td class="center">{{ subject.credits }}</td>
                <td>{{ subject.department || '-' }}</td>
                <td>
                  <span class="status-badge" [class.active]="subject.active">
                    {{ subject.active ? '✓ Hoạt động' : 'Tạm dừng' }}
                  </span>
                </td>
                <td class="actions">
                  <button class="btn-icon" title="Sửa" (click)="editSubject(subject)">✏️</button>
                  <button class="btn-icon" title="Đổi trạng thái" (click)="toggleActive(subject)">
                    {{ subject.active ? '🔒' : '🔓' }}
                  </button>
                  <button class="btn-icon danger" title="Xóa" (click)="deleteSubject(subject)">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #empty>
            <div class="empty-state">
              <p>{{ searchTerm || filterActive !== 'all' ? 'Không tìm thấy môn học phù hợp' : 'Chưa có môn học nào' }}</p>
            </div>
          </ng-template>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ isEditing() ? 'Sửa môn học' : 'Thêm môn học mới' }}</h2>
              <button class="close-btn" (click)="closeModal()">×</button>
            </div>
            <form (ngSubmit)="saveSubject()">
              <div class="form-row">
                <div class="form-group">
                  <label>Mã môn học *</label>
                  <input type="text" [(ngModel)]="formData.subjectCode" name="subjectCode" 
                         placeholder="VD: IT101" required>
                </div>
                <div class="form-group">
                  <label>Số tín chỉ *</label>
                  <input type="number" [(ngModel)]="formData.credits" name="credits" 
                         min="1" max="10" required>
                </div>
              </div>
              <div class="form-group">
                <label>Tên môn học *</label>
                <input type="text" [(ngModel)]="formData.name" name="name" 
                       placeholder="VD: Lập trình cơ bản" required>
              </div>
              <div class="form-group">
                <label>Khoa/Bộ môn</label>
                <input type="text" [(ngModel)]="formData.department" name="department" 
                       placeholder="VD: Công nghệ thông tin">
              </div>
              <div class="form-group">
                <label>Mô tả</label>
                <textarea [(ngModel)]="formData.description" name="description" rows="3"
                          placeholder="Mô tả ngắn về môn học..."></textarea>
              </div>
              <div class="form-group checkbox">
                <label>
                  <input type="checkbox" [(ngModel)]="formData.active" name="active">
                  Cho phép mở lớp
                </label>
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
      max-width: 1200px;
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

    .back-link:hover {
      color: #3b82f6;
    }

    .page-header h1 {
      font-size: 24px;
      margin: 0;
      color: #1e293b;
    }

    .filter-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .search-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-select {
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
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
      transition: background 0.2s;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-primary:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #475569;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
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

    .data-table th,
    .data-table td {
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

    .data-table tbody tr:hover {
      background: #f8fafc;
    }

    .data-table td.center {
      text-align: center;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      background: #fee2e2;
      color: #dc2626;
    }

    .status-badge.active {
      background: #dcfce7;
      color: #16a34a;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      background: transparent;
      border: none;
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .btn-icon:hover {
      background: #e2e8f0;
    }

    .btn-icon.danger:hover {
      background: #fee2e2;
    }

    .empty-state {
      text-align: center;
      padding: 60px;
      color: #64748b;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
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
      max-width: 540px;
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

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #64748b;
    }

    form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #374151;
    }

    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }

    .form-group textarea {
      resize: vertical;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }

    .form-group.checkbox label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AdminSubjectsComponent implements OnInit {
  subjects = signal<Subject[]>([]);
  filteredSubjects = signal<Subject[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  editingId: number | null = null;

  searchTerm = '';
  filterActive = 'all';

  formData: CreateSubjectRequest = {
    subjectCode: '',
    name: '',
    credits: 3,
    department: '',
    description: '',
    active: true
  };

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadSubjects();
  }

  loadSubjects() {
    this.loading.set(true);
    this.adminService.getSubjects().subscribe({
      next: (data) => {
        this.subjects.set(data);
        this.filterSubjects();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  filterSubjects() {
    let result = this.subjects();
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(s => 
        s.subjectCode.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term) ||
        s.department?.toLowerCase().includes(term)
      );
    }

    if (this.filterActive === 'active') {
      result = result.filter(s => s.active);
    } else if (this.filterActive === 'inactive') {
      result = result.filter(s => !s.active);
    }

    this.filteredSubjects.set(result);
  }

  openModal() {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = {
      subjectCode: '',
      name: '',
      credits: 3,
      department: '',
      description: '',
      active: true
    };
    this.showModal.set(true);
  }

  editSubject(subject: Subject) {
    this.isEditing.set(true);
    this.editingId = subject.id;
    this.formData = {
      subjectCode: subject.subjectCode,
      name: subject.name,
      credits: subject.credits,
      department: subject.department || '',
      description: subject.description || '',
      active: subject.active
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveSubject() {
    this.saving.set(true);
    
    if (this.isEditing() && this.editingId) {
      this.adminService.updateSubject(this.editingId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadSubjects();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.adminService.createSubject(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadSubjects();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  toggleActive(subject: Subject) {
    const action = subject.active ? 'tạm dừng' : 'kích hoạt lại';
    if (confirm(`Bạn muốn ${action} môn học "${subject.name}"?`)) {
      this.adminService.toggleSubjectActive(subject.id).subscribe({
        next: () => this.loadSubjects(),
        error: () => {
          // Fallback: update with opposite active value
          this.adminService.updateSubject(subject.id, { active: !subject.active }).subscribe({
            next: () => this.loadSubjects()
          });
        }
      });
    }
  }

  deleteSubject(subject: Subject) {
    if (confirm(`Xóa môn học "${subject.name}"? Thao tác này không thể hoàn tác!`)) {
      this.adminService.deleteSubject(subject.id).subscribe({
        next: () => this.loadSubjects()
      });
    }
  }
}
