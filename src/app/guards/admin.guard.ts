import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NavigationService } from '../services/navigation.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private navigationService: NavigationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    const token = this.authService.getToken();
    
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user?.role === 'ADMIN') {
          return true;
        }
        
        // Redirect non-admin users to their role-based dashboard
        this.router.navigate([this.navigationService.getRouteByRole(user?.role)]);
        return false;
      })
    );
  }
}
