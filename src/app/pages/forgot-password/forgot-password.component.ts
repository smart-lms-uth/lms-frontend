import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { InputComponent, ButtonComponent } from '../../components/ui';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputComponent, ButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  emailSent = signal(false);

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    if (!this.email.trim()) {
      this.errorMessage.set('Vui lòng nhập email');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: (response) => {
        if (response.success) {
          this.emailSent.set(true);
          this.successMessage.set('Chúng tôi đã gửi email hướng dẫn khôi phục mật khẩu đến địa chỉ email của bạn.');
        } else {
          this.errorMessage.set(response.message || 'Không thể gửi email khôi phục');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  resendEmail(): void {
    this.emailSent.set(false);
    this.successMessage.set('');
    this.onSubmit();
  }
}
