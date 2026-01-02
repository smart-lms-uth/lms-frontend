import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="loading-card">
        <div class="spinner"></div>
        <p>Đang xử lý đăng nhập...</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .loading-card {
      background: white;
      padding: 40px 60px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #e1e1e1;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    p {
      color: #666;
      font-size: 16px;
    }
  `]
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
              if (response.data.profileCompleted) {
                this.router.navigate(['/dashboard']);
              } else {
                this.router.navigate(['/profile-setup']);
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
}
