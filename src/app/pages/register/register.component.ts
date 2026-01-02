import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterRequest } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="register-container">
      <div class="register-card">
        <h1>LMS Smart System</h1>
        <h2>Đăng ký tài khoản</h2>
        
        <form (ngSubmit)="onRegister()" #registerForm="ngForm">
          <div class="form-group">
            <label for="fullName">Họ và tên</label>
            <input 
              type="text" 
              id="fullName" 
              name="fullName"
              [(ngModel)]="registerData.fullName" 
              placeholder="Nhập họ và tên">
          </div>

          <div class="form-group">
            <label for="username">Tên đăng nhập *</label>
            <input 
              type="text" 
              id="username" 
              name="username"
              [(ngModel)]="registerData.username" 
              required
              placeholder="Nhập tên đăng nhập">
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              [(ngModel)]="registerData.email" 
              required
              placeholder="Nhập email">
          </div>
          
          <div class="form-group">
            <label for="password">Mật khẩu *</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              [(ngModel)]="registerData.password" 
              required
              minlength="6"
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)">
          </div>

          <div class="form-group">
            <label for="confirmPassword">Xác nhận mật khẩu *</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword"
              [(ngModel)]="confirmPassword" 
              required
              placeholder="Nhập lại mật khẩu">
          </div>

          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div *ngIf="successMessage" class="success-message">
            {{ successMessage }}
          </div>
          
          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'Đang đăng ký...' : 'Đăng ký' }}
          </button>
        </form>

        <p class="login-link">
          Đã có tài khoản? <a routerLink="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .register-card {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 450px;
    }

    h1 {
      text-align: center;
      color: #667eea;
      margin-bottom: 8px;
      font-size: 24px;
    }

    h2 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
      font-weight: 400;
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e1e1;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-primary {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 8px;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .login-link {
      text-align: center;
      margin-top: 24px;
      color: #666;
    }

    .login-link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .error-message {
      background: #fee;
      color: #c00;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .success-message {
      background: #efe;
      color: #060;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
  `]
})
export class RegisterComponent {
  registerData: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    fullName: ''
  };
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onRegister(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerData.password !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp';
      return;
    }

    this.loading = true;

    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Đăng ký thất bại';
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
        this.loading = false;
      }
    });
  }
}
