import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './auth.service';

export interface UserProfile {
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

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface ProfileStatus {
  profileComplete: boolean;
  hasPassword: boolean;
}

export interface SetPasswordRequest {
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.API_URL}/users/profile`);
  }

  updateProfile(request: UpdateProfileRequest): Observable<ApiResponse<UserProfile>> {
    return this.http.put<ApiResponse<UserProfile>>(`${this.API_URL}/users/profile`, request);
  }

  completeProfileSetup(request: UpdateProfileRequest): Observable<ApiResponse<UserProfile>> {
    return this.http.post<ApiResponse<UserProfile>>(`${this.API_URL}/users/profile/complete`, request);
  }

  getProfileStatus(): Observable<ApiResponse<ProfileStatus>> {
    return this.http.get<ApiResponse<ProfileStatus>>(`${this.API_URL}/users/profile/status`);
  }

  setPassword(request: SetPasswordRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/users/profile/set-password`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/users/profile/change-password`, request);
  }
}
