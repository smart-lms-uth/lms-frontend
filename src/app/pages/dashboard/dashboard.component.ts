import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { TrackClickDirective } from '../../directives/tracking.directive';
import { ActivityDropdownComponent } from '../../components/activity-dropdown/activity-dropdown.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TrackClickDirective, ActivityDropdownComponent],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <h1>LMS Smart System</h1>
        <div class="user-info" *ngIf="currentUser">
          <span>Xin chào, {{ currentUser.fullName || currentUser.username }}</span>
          <app-activity-dropdown></app-activity-dropdown>
          <a routerLink="/profile" class="btn-profile" trackClick="profile-link">Hồ sơ</a>
          <button class="btn-logout" (click)="logout()" trackClick="logout-button">Đăng xuất</button>
        </div>
      </header>

      <main class="main-content">
        <div class="welcome-card">
          <h2>Chào mừng đến với hệ thống LMS</h2>
          <p>Hệ thống quản lý học tập thông minh của UTH</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-info">
              <h3>Khóa học</h3>
              <p>0 khóa học</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-info">
              <h3>Bài tập</h3>
              <p>0 bài tập</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <h3>Điểm số</h3>
              <p>-- điểm</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔔</div>
            <div class="stat-info">
              <h3>Thông báo</h3>
              <p>0 mới</p>
            </div>
          </div>
        </div>

        <div class="user-profile" *ngIf="currentUser">
          <h3>Thông tin tài khoản</h3>
          <div class="profile-info">
            <p><strong>Tên đăng nhập:</strong> {{ currentUser.username }}</p>
            <p><strong>Email:</strong> {{ currentUser.email }}</p>
            <p><strong>Họ tên:</strong> {{ currentUser.fullName || 'Chưa cập nhật' }}</p>
            <p><strong>Vai trò:</strong> {{ currentUser.role }}</p>
          </div>
          <a routerLink="/profile" class="profile-link">Xem và chỉnh sửa hồ sơ →</a>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .btn-profile {
      padding: 8px 20px;
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 20px;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.3s;
    }

    .btn-profile:hover {
      background: rgba(255,255,255,0.3);
    }

    .btn-logout {
      padding: 8px 20px;
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-logout:hover {
      background: rgba(255,255,255,0.3);
    }

    .main-content {
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-card {
      background: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin-bottom: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }

    .welcome-card h2 {
      color: #333;
      margin-bottom: 10px;
    }

    .welcome-card p {
      color: #666;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
    }

    .stat-icon {
      font-size: 40px;
    }

    .stat-info h3 {
      margin: 0 0 4px 0;
      color: #333;
      font-size: 16px;
    }

    .stat-info p {
      margin: 0;
      color: #666;
    }

    .user-profile {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }

    .user-profile h3 {
      margin: 0 0 20px 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .profile-info p {
      margin: 10px 0;
      color: #555;
    }

    .profile-info strong {
      color: #333;
    }

    .profile-link {
      display: inline-block;
      margin-top: 20px;
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.3s;
    }

    .profile-link:hover {
      color: #764ba2;
    }
  `]
})
export class DashboardComponent {
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private activityService: ActivityService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout(): void {
    this.activityService.trackLogout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
