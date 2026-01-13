import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from './auth.service';

/**
 * NavigationService - Xử lý điều hướng theo role
 * Centralize navigation logic để tránh duplicate code
 */
@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private readonly ROLE_ROUTES: Record<string, string> = {
    'ADMIN': '/admin/dashboard',
    'TEACHER': '/teacher/dashboard',
    'STUDENT': '/dashboard'
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  /**
   * Điều hướng theo role của user hiện tại
   */
  navigateByCurrentUserRole(): void {
    const user = this.authService.getCurrentUserSync();
    this.navigateByRole(user?.role);
  }

  /**
   * Điều hướng theo role được chỉ định
   */
  navigateByRole(role?: string): void {
    const route = this.getRouteByRole(role);
    this.router.navigate([route]);
  }

  /**
   * Lấy route dựa theo role
   */
  getRouteByRole(role?: string): string {
    if (!role) return this.ROLE_ROUTES['STUDENT'];
    return this.ROLE_ROUTES[role] || this.ROLE_ROUTES['STUDENT'];
  }

  /**
   * Kiểm tra user có role ADMIN không
   */
  isAdmin(user?: User | null): boolean {
    return user?.role === 'ADMIN';
  }

  /**
   * Kiểm tra user có role TEACHER không
   */
  isTeacher(user?: User | null): boolean {
    return user?.role === 'TEACHER';
  }

  /**
   * Kiểm tra user có role STUDENT không
   */
  isStudent(user?: User | null): boolean {
    return user?.role === 'STUDENT' || !user?.role;
  }

  /**
   * Điều hướng đến trang phù hợp sau khi login
   * Xử lý cả trường hợp profile chưa hoàn thành
   */
  navigateAfterLogin(user?: User | null): void {
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    if (!user.profileCompleted) {
      this.router.navigate(['/profile-setup']);
      return;
    }

    this.navigateByRole(user.role);
  }

  /**
   * Điều hướng về trang login với lỗi
   */
  navigateToLoginWithError(error: string): void {
    this.router.navigate(['/login'], { 
      queryParams: { error } 
    });
  }
}
