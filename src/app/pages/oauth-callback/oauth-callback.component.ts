import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';

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
    private authService: AuthService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.handleOAuthToken(token);
      } else {
        this.navigationService.navigateToLoginWithError('oauth_failed');
      }
    });
  }

  private handleOAuthToken(token: string): void {
    this.authService.handleOAuth2Callback(token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.navigationService.navigateAfterLogin(response.data);
        } else {
          this.fallbackNavigation();
        }
      },
      error: () => this.fallbackNavigation()
    });
  }

  private fallbackNavigation(): void {
    const user = this.authService.getCurrentUserSync();
    if (user) {
      this.navigationService.navigateByRole(user.role);
    } else {
      this.navigationService.navigateToLoginWithError('oauth_failed');
    }
  }
}
