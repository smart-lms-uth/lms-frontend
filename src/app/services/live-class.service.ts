import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LiveClass {
  id: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  title: string;
  description: string;
  meetLink: string;
  scheduledAt: string;
  scheduledAtFormatted: string;
  duration: number;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  statusLabel: string;
  instructorId: number;
  instructorName: string;
  recordingEnabled: boolean;
  recordingUrl: string;
  maxParticipants: number;
  attendeeCount: number;
  createdAt: string;
  isUpcoming: boolean;
  isLive: boolean;
  canJoin: boolean;
  minutesUntilStart: number;
  timeUntilStart: string;
}

export interface CreateLiveClassRequest {
  courseId: number;
  title: string;
  description?: string;
  scheduledAt: string;
  duration?: number;
  recordingEnabled?: boolean;
  maxParticipants?: number;
}

export interface UpdateLiveClassRequest {
  title?: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  recordingEnabled?: boolean;
  maxParticipants?: number;
}

export interface LiveClassAttendance {
  id: number;
  liveClassId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  joinedAt: string;
  joinedAtFormatted: string;
  leftAt: string;
  leftAtFormatted: string;
  durationMinutes: number;
  status: 'JOINED' | 'LEFT' | 'ABSENT';
  statusLabel: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class LiveClassService {
  private readonly API_URL = `${environment.apiUrl}/live-classes`;

  constructor(private http: HttpClient) {}

  // ========== INSTRUCTOR METHODS ==========

  /**
   * Create a new live class
   */
  createLiveClass(request: CreateLiveClassRequest): Observable<ApiResponse<LiveClass>> {
    return this.http.post<ApiResponse<LiveClass>>(this.API_URL, request);
  }

  /**
   * Update a live class
   */
  updateLiveClass(id: number, request: UpdateLiveClassRequest): Observable<ApiResponse<LiveClass>> {
    return this.http.put<ApiResponse<LiveClass>>(`${this.API_URL}/${id}`, request);
  }

  /**
   * Start a live class
   */
  startLiveClass(id: number): Observable<ApiResponse<LiveClass>> {
    return this.http.post<ApiResponse<LiveClass>>(`${this.API_URL}/${id}/start`, {});
  }

  /**
   * End a live class
   */
  endLiveClass(id: number): Observable<ApiResponse<LiveClass>> {
    return this.http.post<ApiResponse<LiveClass>>(`${this.API_URL}/${id}/end`, {});
  }

  /**
   * Cancel a live class
   */
  cancelLiveClass(id: number): Observable<ApiResponse<LiveClass>> {
    return this.http.post<ApiResponse<LiveClass>>(`${this.API_URL}/${id}/cancel`, {});
  }

  /**
   * Delete a live class
   */
  deleteLiveClass(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`);
  }

  /**
   * Get upcoming live classes for instructor
   */
  getUpcomingForInstructor(): Observable<ApiResponse<LiveClass[]>> {
    return this.http.get<ApiResponse<LiveClass[]>>(`${this.API_URL}/upcoming/instructor`);
  }

  /**
   * Get attendance list for a live class
   */
  getAttendanceList(id: number): Observable<ApiResponse<LiveClassAttendance[]>> {
    return this.http.get<ApiResponse<LiveClassAttendance[]>>(`${this.API_URL}/${id}/attendance`);
  }

  // ========== STUDENT METHODS ==========

  /**
   * Get upcoming live classes for student
   */
  getUpcomingForStudent(): Observable<ApiResponse<LiveClass[]>> {
    return this.http.get<ApiResponse<LiveClass[]>>(`${this.API_URL}/upcoming/student`);
  }

  /**
   * Join a live class
   */
  joinLiveClass(id: number): Observable<ApiResponse<LiveClassAttendance>> {
    return this.http.post<ApiResponse<LiveClassAttendance>>(`${this.API_URL}/${id}/join`, {});
  }

  /**
   * Leave a live class
   */
  leaveLiveClass(id: number): Observable<ApiResponse<LiveClassAttendance>> {
    return this.http.post<ApiResponse<LiveClassAttendance>>(`${this.API_URL}/${id}/leave`, {});
  }

  /**
   * Check if current student has joined
   */
  hasJoined(id: number): Observable<ApiResponse<{ joined: boolean }>> {
    return this.http.get<ApiResponse<{ joined: boolean }>>(`${this.API_URL}/${id}/joined`);
  }

  // ========== COMMON METHODS ==========

  /**
   * Get a live class by ID
   */
  getLiveClass(id: number): Observable<ApiResponse<LiveClass>> {
    return this.http.get<ApiResponse<LiveClass>>(`${this.API_URL}/${id}`);
  }

  /**
   * Get all live classes for a course
   */
  getLiveClassesByCourse(courseId: number, page = 0, size = 20): Observable<ApiResponse<PagedResponse<LiveClass>>> {
    return this.http.get<ApiResponse<PagedResponse<LiveClass>>>(
      `${this.API_URL}/course/${courseId}?page=${page}&size=${size}`
    );
  }

  /**
   * Get today's live classes for a course
   */
  getTodayLiveClasses(courseId: number): Observable<ApiResponse<LiveClass[]>> {
    return this.http.get<ApiResponse<LiveClass[]>>(`${this.API_URL}/course/${courseId}/today`);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Open Google Meet link in new tab
   */
  openMeetLink(meetLink: string): void {
    window.open(meetLink, '_blank');
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'SCHEDULED':
        return 'badge-info';
      case 'LIVE':
        return 'badge-danger';
      case 'COMPLETED':
        return 'badge-success';
      case 'CANCELLED':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Format duration
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  }
}
