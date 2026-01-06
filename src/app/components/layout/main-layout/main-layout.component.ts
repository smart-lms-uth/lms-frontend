import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  template: `
    <div class="layout">
      <!-- Main Container -->
      <div class="layout__container">
        <!-- Header -->
        <app-header
          [userName]="userName"
          [userRole]="userRole"
          [notificationCount]="3"
          [messageCount]="2"
          (logout)="onLogout()">
        </app-header>

        <!-- Main Content -->
        <main class="layout__main">
          <div class="layout__content">
            <ng-content></ng-content>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--gray-50);
    }

    .layout__container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .layout__main {
      flex: 1;
      padding-top: var(--header-height);
    }

    .layout__content {
      padding: var(--spacing-6);
      max-width: var(--content-max-width);
      margin: 0 auto;
      width: 100%;
    }

    @media (max-width: 768px) {
      .layout__content {
        padding: var(--spacing-4);
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  userName: string = 'Nguyễn Văn A';
  userRole: string = 'Sinh viên';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.fullName || user.username;
        this.userRole = this.getRoleDisplay(user.role);
      }
    });
  }

  private getRoleDisplay(role: string): string {
    const roles: Record<string, string> = {
      'STUDENT': 'Sinh viên',
      'TEACHER': 'Giảng viên',
      'ADMIN': 'Quản trị viên'
    };
    return roles[role] || role;
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
