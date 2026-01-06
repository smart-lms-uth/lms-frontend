import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { InputComponent, ButtonComponent, CheckboxComponent } from '../../components/ui';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputComponent, ButtonComponent, CheckboxComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerData: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    fullName: ''
  };
  confirmPassword = '';
  agreeTerms = false;
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onRegister(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.registerData.password !== this.confirmPassword) {
      this.errorMessage.set('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!this.agreeTerms) {
      this.errorMessage.set('Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }

    this.loading.set(true);

    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.errorMessage.set(response.message || 'Đăng ký thất bại');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }
}
