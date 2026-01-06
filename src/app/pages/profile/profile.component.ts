import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService, UpdateProfileRequest, UserProfile } from '../../services/user.service';
import { ActivityService } from '../../services/activity.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, ButtonComponent, InputComponent, BadgeComponent, AvatarComponent } from '../../components/ui';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MainLayoutComponent,
    CardComponent,
    ButtonComponent,
    InputComponent,
    BadgeComponent,
    AvatarComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  
  // Signal-based state
  user = signal<UserProfile | null>(null);
  isEditing = signal(false);
  isLoading = signal(true);
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Password management state
  hasPassword = signal(false);
  isLoadingPasswordStatus = signal(true);
  isSubmittingPassword = signal(false);
  passwordSuccessMessage = signal('');
  passwordErrorMessage = signal('');
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

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
    this.loadPasswordStatus();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.userService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.user.set(response.data);
          const userData = response.data;
          this.profileForm.patchValue({
            fullName: userData.fullName || '',
            phoneNumber: userData.phoneNumber || '',
            dateOfBirth: userData.dateOfBirth || '',
            address: userData.address || '',
            bio: userData.bio || ''
          });
        }
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Profile error:', err);
        this.isLoading.set(false);
        this.cdr.detectChanges();
        this.router.navigate(['/login']);
      }
    });
  }

  loadPasswordStatus(): void {
    this.isLoadingPasswordStatus.set(true);
    this.userService.getProfileStatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.hasPassword.set(response.data.hasPassword);
        }
        this.isLoadingPasswordStatus.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Password status error:', err);
        this.isLoadingPasswordStatus.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  toggleEdit(): void {
    const newEditState = !this.isEditing();
    this.isEditing.set(newEditState);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.activityService.track('BUTTON_CLICK', { action: 'toggle-edit-profile', metadata: JSON.stringify({ isEditing: newEditState }) });
    
    if (!newEditState && this.user()) {
      const userData = this.user()!;
      this.profileForm.patchValue({
        fullName: userData.fullName || '',
        phoneNumber: userData.phoneNumber || '',
        dateOfBirth: userData.dateOfBirth || '',
        address: userData.address || '',
        bio: userData.bio || ''
      });
    }
  }

  getRoleBadgeVariant(role: string): 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'danger';
      case 'TEACHER': return 'success';
      case 'STUDENT': return 'primary';
      default: return 'neutral';
    }
  }

  getRoleLabel(role: string): string {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'Quản trị viên';
      case 'TEACHER': return 'Giảng viên';
      case 'STUDENT': return 'Sinh viên';
      default: return role || 'Người dùng';
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

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
            this.user.set(response.data);
            this.successMessage.set('Cập nhật hồ sơ thành công!');
            this.isEditing.set(false);
            this.activityService.track('PROFILE_UPDATE', { action: 'profile-update-success' });
          }
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
          this.activityService.track('ERROR', { action: 'profile-update-error', metadata: JSON.stringify({ error: this.errorMessage() }) });
        }
      });
    }
  }

  onSetPassword(): void {
    this.passwordSuccessMessage.set('');
    this.passwordErrorMessage.set('');

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorMessage.set('Mật khẩu xác nhận không khớp');
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordErrorMessage.set('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    this.isSubmittingPassword.set(true);

    this.userService.setPassword({
      password: this.newPassword
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.passwordSuccessMessage.set('Thiết lập mật khẩu thành công! Bạn có thể đăng nhập bằng email và mật khẩu.');
          this.hasPassword.set(true);
          this.newPassword = '';
          this.confirmPassword = '';
          this.activityService.track('PASSWORD_SET', { action: 'set-password-success' });
        }
        this.isSubmittingPassword.set(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSubmittingPassword.set(false);
        this.passwordErrorMessage.set(error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        this.cdr.detectChanges();
      }
    });
  }

  onChangePassword(): void {
    this.passwordSuccessMessage.set('');
    this.passwordErrorMessage.set('');

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorMessage.set('Mật khẩu xác nhận không khớp');
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordErrorMessage.set('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    this.isSubmittingPassword.set(true);

    this.userService.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.passwordSuccessMessage.set('Đổi mật khẩu thành công!');
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.activityService.track('PASSWORD_CHANGE', { action: 'change-password-success' });
        }
        this.isSubmittingPassword.set(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSubmittingPassword.set(false);
        this.passwordErrorMessage.set(error.error?.message || 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra.');
        this.cdr.detectChanges();
      }
    });
  }
}
