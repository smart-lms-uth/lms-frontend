import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./oauth-callback.component.scss']
})
export class OauthCallbackComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get token from URL query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        // Wait for OAuth2 callback to complete and get user data
        this.authService.handleOAuth2Callback(token).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              // Check profileCompleted from user data
              if (!response.data.profileCompleted) {
                this.router.navigate(['/profile-setup']);
              } else {
                // Redirect based on user role
                this.redirectByRole(response.data.role);
              }
            } else {
              this.router.navigate(['/dashboard']);
            }
          },
          error: () => {
            // If error, go to dashboard
            this.router.navigate(['/dashboard']);
          }
        });
      } else {
        // Handle error
        this.router.navigate(['/login'], { 
          queryParams: { error: 'oauth_failed' } 
        });
      }
    });
  }

  private redirectByRole(role?: string): void {
    if (role === 'TEACHER') {
      this.router.navigate(['/teacher/dashboard']);
    } else if (role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
