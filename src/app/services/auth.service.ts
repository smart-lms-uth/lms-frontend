import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  role: string;
  authProvider: string;
  active: boolean;
  emailVerified: boolean;
  profileCompleted: boolean;
  bio: string;
  dateOfBirth: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    roles: string[];
  };
}

export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  phoneNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    const token = this.getToken();
    const user = this.getStoredUser();
    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setToken(response.data.accessToken);
            this.setUser(response.data.user as unknown as User);
            this.currentUserSubject.next(response.data.user as unknown as User);
            this.isAuthenticatedSubject.next(true);
          }
        })
      );
  }

  register(data: RegisterRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.API_URL}/auth/register`, data);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getStoredUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  // Get current user synchronously from BehaviorSubject
  getCurrentUserSync(): User | null {
    return this.currentUserSubject.value;
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getCurrentUser(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/auth/me`);
  }

  // Google OAuth2 Login
  loginWithGoogle(): void {
    // For production (Docker), use relative path; for dev, use gateway URL
    const baseUrl = this.API_URL.startsWith('http') 
      ? this.API_URL.replace('/api/v1', '') 
      : '';
    window.location.href = `${baseUrl}/oauth2/authorization/google`;
  }

  // Handle OAuth2 callback
  handleOAuth2Callback(token: string): Observable<ApiResponse<User>> {
    this.setToken(token);
    return this.getCurrentUser().pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setUser(response.data);
          this.currentUserSubject.next(response.data);
          this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }
}
