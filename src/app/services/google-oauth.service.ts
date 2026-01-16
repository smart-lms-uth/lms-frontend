import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

declare const google: any;

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleOAuthService {
  private tokenClient: any;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  
  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  public isInitialized$ = this.isInitializedSubject.asObservable();

  // Scopes needed for Google Calendar/Meet
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');

  constructor(private ngZone: NgZone) {
    this.loadGoogleScript();
  }

  /**
   * Load Google Identity Services script
   */
  private loadGoogleScript(): void {
    if (typeof google !== 'undefined' && google.accounts) {
      this.initializeTokenClient();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initializeTokenClient();
    };
    document.head.appendChild(script);
  }

  /**
   * Initialize Google OAuth Token Client
   */
  private initializeTokenClient(): void {
    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleClientId,
        scope: this.SCOPES,
        callback: (response: GoogleTokenResponse) => {
          this.ngZone.run(() => {
            if (response.access_token) {
              this.accessToken = response.access_token;
              this.tokenExpiry = Date.now() + (response.expires_in * 1000);
              console.log('Google Calendar token obtained successfully');
            }
          });
        },
        error_callback: (error: any) => {
          console.error('Google OAuth error:', error);
        }
      });
      
      this.isInitializedSubject.next(true);
      console.log('Google OAuth Token Client initialized');
    } catch (error) {
      console.error('Failed to initialize Google OAuth:', error);
    }
  }

  /**
   * Request Google Calendar access token
   * Returns a Promise that resolves with the access token
   */
  requestCalendarAccess(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Google OAuth not initialized'));
        return;
      }

      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        resolve(this.accessToken);
        return;
      }

      // Override callback for this request
      this.tokenClient.callback = (response: GoogleTokenResponse) => {
        this.ngZone.run(() => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.tokenExpiry = Date.now() + (response.expires_in * 1000);
            resolve(response.access_token);
          } else {
            reject(new Error('Failed to get access token'));
          }
        });
      };

      // Request token - this will show Google consent popup
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Get current access token if valid
   */
  getAccessToken(): string | null {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    return null;
  }

  /**
   * Check if user has granted calendar access
   */
  hasCalendarAccess(): boolean {
    return this.accessToken !== null && this.tokenExpiry !== null && Date.now() < this.tokenExpiry;
  }

  /**
   * Revoke access token
   */
  revokeAccess(): void {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Google access revoked');
        this.accessToken = null;
        this.tokenExpiry = null;
      });
    }
  }
}
