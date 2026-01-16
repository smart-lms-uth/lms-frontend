import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { Semester, CreateSemesterRequest } from '../../../services/course.service';
import { MainLayoutComponent } from '../../../components/layout/main-layout/main-layout.component';
import { NavigationService } from '../../../services/navigation.service';

@Component({
  selector: 'app-admin-semesters',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="admin-page">
        <div class="page-header">
          <div class="header-left">
            <a [routerLink]="nav.getDashboardUrl()" class="back-link">← Quay lại</a>
            <h1>📅 Quản lý Học kỳ</h1>
          </div>
          <button class="btn-primary" (click)="openModal()">+ Thêm học kỳ</button>
        </div>

        <!-- Semesters Table -->
        <div class="table-wrapper">
          <table class="data-table" *ngIf="semesters().length > 0; else empty">
            <thead>
              <tr>
                <th>Mã học kỳ</th>
                <th>Tên hiển thị</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let semester of semesters()">
                <td><strong>{{ semester.semesterCode }}</strong></td>
                <td>{{ semester.displayName }}</td>
                <td>{{ formatDate(semester.startDate) }}</td>
                <td>{{ formatDate(semester.endDate) }}</td>
                <td>
                  <span class="status-badge" [class.current]="semester.isCurrent">
                    {{ semester.isCurrent ? '✓ Hiện tại' : 'Không hoạt động' }}
                  </span>
                </td>
                <td class="actions">
                  <button class="btn-icon" title="Sửa" (click)="editSemester(semester)">✏️</button>
                  <button class="btn-icon" title="Đặt làm hiện tại" 
                          *ngIf="!semester.isCurrent"
                          (click)="setCurrent(semester)">🎯</button>
                  <button class="btn-icon danger" title="Xóa" (click)="deleteSemester(semester)">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #empty>
            <div class="empty-state">
              <p>Chưa có học kỳ nào. Hãy thêm học kỳ đầu tiên!</p>
            </div>
          </ng-template>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ isEditing() ? 'Sửa học kỳ' : 'Thêm học kỳ mới' }}</h2>
              <button class="close-btn" (click)="closeModal()">×</button>
            </div>
            <form (ngSubmit)="saveSemester()">
              <div class="form-group">
                <label>Mã học kỳ *</label>
                <input type="text" [(ngModel)]="formData.semesterCode" name="semesterCode" 
                       placeholder="VD: HK1-2025-2026" required>
              </div>
              <div class="form-group">
                <label>Tên hiển thị *</label>
                <input type="text" [(ngModel)]="formData.displayName" name="displayName" 
                       placeholder="VD: Học kỳ 1 năm học 2025-2026" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Ngày bắt đầu *</label>
                  <input type="date" [(ngModel)]="formData.startDate" name="startDate" required>
                </div>
                <div class="form-group">
                  <label>Ngày kết thúc *</label>
                  <input type="date" [(ngModel)]="formData.endDate" name="endDate" required>
                </div>
              </div>
              <div class="form-group checkbox">
                <label>
                  <input type="checkbox" [(ngModel)]="formData.isCurrent" name="isCurrent">
                  Đặt làm học kỳ hiện tại
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

    .btn-secondary:hover {
      background: #cbd5e1;
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

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      background: #f1f5f9;
      color: #64748b;
    }

    .status-badge.current {
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
      max-width: 500px;
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
    .form-group input[type="date"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .form-group input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
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
export class AdminSemestersComponent implements OnInit {
  nav = inject(NavigationService);
  semesters = signal<Semester[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  editingId: number | null = null;

  formData: CreateSemesterRequest = {
    semesterCode: '',
    displayName: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  };

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadSemesters();
  }

  loadSemesters() {
    this.loading.set(true);
    this.adminService.getSemesters().subscribe({
      next: (data) => {
        this.semesters.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openModal() {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = {
      semesterCode: '',
      displayName: '',
      startDate: '',
      endDate: '',
      isCurrent: false
    };
    this.showModal.set(true);
  }

  editSemester(semester: Semester) {
    this.isEditing.set(true);
    this.editingId = semester.id;
    this.formData = {
      semesterCode: semester.semesterCode,
      displayName: semester.displayName,
      startDate: semester.startDate.split('T')[0],
      endDate: semester.endDate.split('T')[0],
      isCurrent: semester.isCurrent
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveSemester() {
    this.saving.set(true);
    
    if (this.isEditing() && this.editingId) {
      this.adminService.updateSemester(this.editingId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadSemesters();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.adminService.createSemester(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadSemesters();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  setCurrent(semester: Semester) {
    if (confirm(`Đặt "${semester.displayName}" làm học kỳ hiện tại?`)) {
      this.adminService.setCurrentSemester(semester.id).subscribe({
        next: () => this.loadSemesters()
      });
    }
  }

  deleteSemester(semester: Semester) {
    if (confirm(`Xóa học kỳ "${semester.displayName}"? Thao tác này không thể hoàn tác!`)) {
      this.adminService.deleteSemester(semester.id).subscribe({
        next: () => this.loadSemesters()
      });
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }
}
