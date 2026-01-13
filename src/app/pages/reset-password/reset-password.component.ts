import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { InputComponent, ButtonComponent } from '../../components/ui';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputComponent, ButtonComponent],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  validating = signal(true);
  tokenValid = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  resetSuccess = signal(false);

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    
    if (!this.token) {
      this.validating.set(false);
      this.errorMessage.set('Liên kết không hợp lệ hoặc đã hết hạn.');
      return;
    }

    this.validateToken();
  }

  validateToken(): void {
    this.authService.validateResetToken(this.token).subscribe({
      next: (response) => {
        this.validating.set(false);
        if (response.success && response.data?.valid) {
          this.tokenValid.set(true);
        } else {
          this.errorMessage.set('Liên kết không hợp lệ hoặc đã hết hạn.');
        }
      },
      error: () => {
        this.validating.set(false);
        this.errorMessage.set('Liên kết không hợp lệ hoặc đã hết hạn.');
      }
    });
  }

  onSubmit(): void {
    this.errorMessage.set('');

    if (!this.newPassword.trim()) {
      this.errorMessage.set('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage.set('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Mật khẩu xác nhận không khớp');
      return;
    }

    this.loading.set(true);

    this.authService.resetPassword(this.token, this.newPassword, this.confirmPassword).subscribe({
      next: (response) => {
        if (response.success) {
          this.resetSuccess.set(true);
          this.successMessage.set('Mật khẩu đã được đặt lại thành công!');
        } else {
          this.errorMessage.set(response.message || 'Không thể đặt lại mật khẩu');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
