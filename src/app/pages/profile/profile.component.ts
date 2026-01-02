import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService, UpdateProfileRequest, UserProfile } from '../../services/user.service';
import { ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="profile-container">
      <div class="profile-header">
        <button class="back-btn" routerLink="/dashboard">
          <i class="icon">←</i> Quay lại
        </button>
        <h1>Hồ sơ cá nhân</h1>
      </div>

      <div class="profile-content" *ngIf="user">
        <div class="profile-card">
          <div class="avatar-section">
            <img [src]="user.avatarUrl || defaultAvatar" alt="Avatar" class="avatar">
            <div class="user-info">
              <h2>{{ user.fullName || user.username }}</h2>
              <p class="email">{{ user.email }}</p>
              <span class="role-badge" [class]="user.role.toLowerCase()">{{ user.role }}</span>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">Tham gia</span>
              <span class="stat-value">{{ user.createdAt | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Đăng nhập qua</span>
              <span class="stat-value">{{ user.authProvider }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Trạng thái</span>
              <span class="stat-value status" [class.verified]="user.emailVerified">
                {{ user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực' }}
              </span>
            </div>
          </div>
        </div>

        <div class="edit-card">
          <div class="card-header">
            <h3>Chỉnh sửa thông tin</h3>
            <button class="edit-toggle" (click)="toggleEdit()">
              {{ isEditing ? 'Hủy' : 'Chỉnh sửa' }}
            </button>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group">
                <label for="fullName">Họ và tên</label>
                <input 
                  type="text" 
                  id="fullName" 
                  formControlName="fullName"
                  [readonly]="!isEditing">
              </div>

              <div class="form-group">
                <label for="phoneNumber">Số điện thoại</label>
                <input 
                  type="tel" 
                  id="phoneNumber" 
                  formControlName="phoneNumber"
                  [readonly]="!isEditing"
                  placeholder="Chưa cập nhật">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="dateOfBirth">Ngày sinh</label>
                <input 
                  type="date" 
                  id="dateOfBirth" 
                  formControlName="dateOfBirth"
                  [readonly]="!isEditing">
              </div>

              <div class="form-group">
                <label for="address">Địa chỉ</label>
                <input 
                  type="text" 
                  id="address" 
                  formControlName="address"
                  [readonly]="!isEditing"
                  placeholder="Chưa cập nhật">
              </div>
            </div>

            <div class="form-group full-width">
              <label for="bio">Giới thiệu</label>
              <textarea 
                id="bio" 
                formControlName="bio"
                rows="4"
                [readonly]="!isEditing"
                placeholder="Chưa có thông tin giới thiệu"></textarea>
            </div>

            <div class="actions" *ngIf="isEditing">
              <button type="submit" class="btn-save" [disabled]="!profileForm.valid || isSubmitting">
                <span *ngIf="!isSubmitting">Lưu thay đổi</span>
                <span *ngIf="isSubmitting">Đang lưu...</span>
              </button>
            </div>
          </form>

          <div class="success-message" *ngIf="successMessage">
            {{ successMessage }}
          </div>
          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="isLoading && !user">
        <div class="spinner"></div>
        <p>Đang tải...</p>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      min-height: 100vh;
      background: #f5f7fa;
      padding: 30px;
    }

    .profile-header {
      max-width: 800px;
      margin: 0 auto 30px;
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .back-btn {
      background: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      transition: all 0.3s;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }

    .back-btn:hover {
      background: #667eea;
      color: white;
    }

    h1 {
      color: #333;
      margin: 0;
      font-size: 28px;
    }

    .profile-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .profile-card {
      background: white;
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.05);
    }

    .avatar-section {
      display: flex;
      align-items: center;
      gap: 25px;
      margin-bottom: 25px;
    }

    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #667eea;
    }

    .user-info h2 {
      margin: 0 0 5px;
      color: #333;
      font-size: 24px;
    }

    .email {
      color: #666;
      margin: 0 0 10px;
    }

    .role-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-badge.user {
      background: #e3f2fd;
      color: #1976d2;
    }

    .role-badge.admin {
      background: #fce4ec;
      color: #c2185b;
    }

    .role-badge.teacher {
      background: #e8f5e9;
      color: #388e3c;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    .stat-item {
      text-align: center;
    }

    .stat-label {
      display: block;
      font-size: 12px;
      color: #999;
      margin-bottom: 5px;
    }

    .stat-value {
      font-weight: 600;
      color: #333;
    }

    .stat-value.status.verified {
      color: #4caf50;
    }

    .edit-card {
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.05);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }

    .card-header h3 {
      margin: 0;
      color: #333;
    }

    .edit-toggle {
      background: none;
      border: 2px solid #667eea;
      color: #667eea;
      padding: 8px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }

    .edit-toggle:hover {
      background: #667eea;
      color: white;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      .stats-row {
        grid-template-columns: 1fr;
      }
      .avatar-section {
        flex-direction: column;
        text-align: center;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    label {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      font-size: 14px;
    }

    input, textarea {
      padding: 12px 16px;
      border: 2px solid #e1e1e1;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.3s;
      background: #f9f9f9;
    }

    input:not([readonly]):focus, textarea:not([readonly]):focus {
      outline: none;
      border-color: #667eea;
      background: white;
    }

    input[readonly], textarea[readonly] {
      cursor: default;
      color: #666;
    }

    textarea {
      resize: vertical;
      min-height: 100px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .btn-save {
      padding: 14px 40px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .success-message {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 20px;
      text-align: center;
    }

    .error-message {
      background: #fff5f5;
      color: #dc3545;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 20px;
      text-align: center;
    }

    .loading {
      text-align: center;
      padding: 60px;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #e1e1e1;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  user: UserProfile | null = null;
  isEditing = false;
  isLoading = true;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff&size=200';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private activityService: ActivityService
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10,15}$/)]],
      dateOfBirth: [''],
      address: [''],
      bio: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.userService.getProfile().subscribe({
      next: (response) => {
        console.log('Profile response:', response);
        if (response.success && response.data) {
          this.user = response.data;
          console.log('User set:', this.user);
          this.profileForm.patchValue({
            fullName: this.user.fullName || '',
            phoneNumber: this.user.phoneNumber || '',
            dateOfBirth: this.user.dateOfBirth || '',
            address: this.user.address || '',
            bio: this.user.bio || ''
          });
        }
        this.isLoading = false;
        this.cdr.detectChanges(); // Force Angular to re-render
      },
      error: (err) => {
        console.error('Profile error:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/login']);
      }
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.successMessage = '';
    this.errorMessage = '';
    this.activityService.track('BUTTON_CLICK', { action: 'toggle-edit-profile', metadata: JSON.stringify({ isEditing: this.isEditing }) });
    
    if (!this.isEditing && this.user) {
      // Reset form to original values
      this.profileForm.patchValue({
        fullName: this.user.fullName || '',
        phoneNumber: this.user.phoneNumber || '',
        dateOfBirth: this.user.dateOfBirth || '',
        address: this.user.address || '',
        bio: this.user.bio || ''
      });
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';
      this.successMessage = '';

      const request: UpdateProfileRequest = {
        fullName: this.profileForm.value.fullName,
        phoneNumber: this.profileForm.value.phoneNumber || undefined,
        dateOfBirth: this.profileForm.value.dateOfBirth || undefined,
        address: this.profileForm.value.address || undefined,
        bio: this.profileForm.value.bio || undefined
      };

      this.userService.updateProfile(request).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.user = response.data;
            this.successMessage = 'Cập nhật hồ sơ thành công!';
            this.isEditing = false;
            this.activityService.track('PROFILE_UPDATE', { action: 'profile-update-success' });
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
          this.activityService.track('ERROR', { action: 'profile-update-error', metadata: JSON.stringify({ error: this.errorMessage }) });
        }
      });
    }
  }
}
