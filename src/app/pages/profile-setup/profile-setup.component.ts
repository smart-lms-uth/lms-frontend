import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, UpdateProfileRequest } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';
import { ActivityService } from '../../services/activity.service';
import { AvatarComponent, ButtonComponent } from '../../components/ui';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvatarComponent, ButtonComponent],
  templateUrl: './profile-setup.component.html',
  styleUrls: ['./profile-setup.component.scss']
})
export class ProfileSetupComponent implements OnInit {
  profileForm: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');
  fullName = signal('');
  avatarUrl = signal('');

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private navigationService: NavigationService,
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
          this.fullName.set(user.fullName || user.username);
          this.avatarUrl.set(user.avatarUrl || '');
          
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
      this.isSubmitting.set(true);
      this.errorMessage.set('');

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
            this.navigationService.navigateByCurrentUserRole();
          }
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
          this.activityService.track('ERROR', { action: 'profile-setup-error', metadata: JSON.stringify({ error: this.errorMessage() }) });
        }
      });
    }
  }

  skipSetup(): void {
    this.activityService.track('BUTTON_CLICK', { action: 'skip-profile-setup' });
    this.navigationService.navigateByCurrentUserRole();
  }

  logout(): void {
    this.activityService.trackLogout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
