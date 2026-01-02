import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, UpdateProfileRequest } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="setup-container">
      <div class="setup-card">
        <div class="setup-header">
          <div class="avatar-section">
            <img [src]="avatarUrl || defaultAvatar" alt="Avatar" class="avatar">
            <h2>Chào mừng, {{ fullName }}!</h2>
          </div>
          <p class="subtitle">Hoàn thiện hồ sơ của bạn để bắt đầu</p>
        </div>

        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label for="fullName">Họ và tên *</label>
              <input 
                type="text" 
                id="fullName" 
                formControlName="fullName"
                placeholder="Nhập họ và tên đầy đủ">
              <span class="error" *ngIf="profileForm.get('fullName')?.touched && profileForm.get('fullName')?.errors?.['required']">
                Họ và tên là bắt buộc
              </span>
            </div>

            <div class="form-group">
              <label for="phoneNumber">Số điện thoại</label>
              <input 
                type="tel" 
                id="phoneNumber" 
                formControlName="phoneNumber"
                placeholder="Ví dụ: 0901234567">
              <span class="error" *ngIf="profileForm.get('phoneNumber')?.touched && profileForm.get('phoneNumber')?.errors?.['pattern']">
                Số điện thoại không hợp lệ
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="dateOfBirth">Ngày sinh</label>
              <input 
                type="date" 
                id="dateOfBirth" 
                formControlName="dateOfBirth">
            </div>

            <div class="form-group">
              <label for="address">Địa chỉ</label>
              <input 
                type="text" 
                id="address" 
                formControlName="address"
                placeholder="Nhập địa chỉ">
            </div>
          </div>

          <div class="form-group full-width">
            <label for="bio">Giới thiệu bản thân</label>
            <textarea 
              id="bio" 
              formControlName="bio"
              rows="4"
              placeholder="Viết một vài dòng giới thiệu về bản thân..."></textarea>
          </div>

          <div class="actions">
            <button type="button" class="btn-logout" (click)="logout()">Đăng xuất</button>
            <button type="button" class="btn-skip" (click)="skipSetup()">Bỏ qua</button>
            <button type="submit" class="btn-submit" [disabled]="!profileForm.valid || isSubmitting">
              <span *ngIf="!isSubmitting">Hoàn thành</span>
              <span *ngIf="isSubmitting">Đang lưu...</span>
            </button>
          </div>
        </form>

        <div class="error-message" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .setup-card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .setup-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .avatar-section {
      margin-bottom: 15px;
    }

    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #667eea;
      margin-bottom: 15px;
    }

    h2 {
      color: #333;
      margin: 0;
      font-size: 24px;
    }

    .subtitle {
      color: #666;
      margin-top: 8px;
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
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
      margin-bottom: 20px;
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
      transition: border-color 0.3s, box-shadow 0.3s;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    textarea {
      resize: vertical;
      min-height: 100px;
    }

    .error {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
    }

    .actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 30px;
    }

    .btn-skip {
      padding: 14px 30px;
      border: 2px solid #e1e1e1;
      background: white;
      color: #666;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-skip:hover {
      border-color: #667eea;
      color: #667eea;
    }

    .btn-submit {
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

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-logout {
      padding: 14px 30px;
      border: 2px solid #dc3545;
      background: transparent;
      color: #dc3545;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-logout:hover {
      background: #dc3545;
      color: white;
    }

    .error-message {
      background: #fff5f5;
      color: #dc3545;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 20px;
      text-align: center;
    }
  `]
})
export class ProfileSetupComponent implements OnInit {
  profileForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  fullName = '';
  avatarUrl = '';
  defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff&size=200';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
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
    // Load current user data
    this.authService.getCurrentUser().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const user = response.data;
          this.fullName = user.fullName || user.username;
          this.avatarUrl = user.avatarUrl || '';
          
          this.profileForm.patchValue({
            fullName: user.fullName || '',
            phoneNumber: user.phoneNumber || ''
          });
        }
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';

      const request: UpdateProfileRequest = {
        fullName: this.profileForm.value.fullName,
        phoneNumber: this.profileForm.value.phoneNumber || undefined,
        dateOfBirth: this.profileForm.value.dateOfBirth || undefined,
        address: this.profileForm.value.address || undefined,
        bio: this.profileForm.value.bio || undefined
      };

      this.userService.completeProfileSetup(request).subscribe({
        next: (response) => {
          if (response.success) {
            this.activityService.track('PROFILE_UPDATE', { action: 'profile-setup-complete' });
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
          this.activityService.track('ERROR', { action: 'profile-setup-error', metadata: JSON.stringify({ error: this.errorMessage }) });
        }
      });
    }
  }

  skipSetup(): void {
    this.activityService.track('BUTTON_CLICK', { action: 'skip-profile-setup' });
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.activityService.trackLogout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
