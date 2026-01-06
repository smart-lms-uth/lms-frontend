import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { InputComponent, ButtonComponent, CheckboxComponent } from '../../components/ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputComponent, ButtonComponent, CheckboxComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials = {
    username: '',
    password: ''
  };
  rememberMe = false;
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
    private activityService: ActivityService
  ) {}

  onLogin(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        if (response.success) {
          this.activityService.trackLogin('form');
          // Redirect based on user role
          const user = this.authService.getCurrentUserSync();
          if (user?.role === 'TEACHER') {
            this.router.navigate(['/teacher/dashboard']);
          } else if (user?.role === 'ADMIN') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.activityService.track('LOGIN_FAILED', { action: 'login-failed', metadata: JSON.stringify({ reason: response.message }) });
          this.errorMessage.set(response.message || 'Đăng nhập thất bại');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.activityService.track('LOGIN_FAILED', { action: 'login-failed', metadata: JSON.stringify({ reason: error.error?.message }) });
        this.errorMessage.set(error.error?.message || 'Sai tên đăng nhập hoặc mật khẩu');
        this.loading.set(false);
      }
    });
  }

  loginWithGoogle(): void {
    this.activityService.track('BUTTON_CLICK', { action: 'google-login-click' });
    this.authService.loginWithGoogle();
  }
}
