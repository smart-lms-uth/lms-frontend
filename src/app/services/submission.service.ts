import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FileUploadResponse {
  fileUrl: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  message: string;
}

export interface AssignmentSubmission {
  id: number;
  moduleId: number;
  moduleTitle: string;
  enrollmentId: number;
  studentId: number;
  studentName?: string;
  studentCode?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  studentNote?: string;
  attemptNumber: number;
  status: 'SUBMITTED' | 'GRADED' | 'RETURNED' | 'RESUBMITTED';
  isLate: boolean;
  submittedAt: string;
  score?: number;
  maxScore?: number;
  feedback?: string;
  gradedAt?: string;
}

export interface CreateSubmissionRequest {
  moduleId: number;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  studentNote?: string;
}

export interface SubmissionCheckResponse {
  hasSubmitted: boolean;
  attemptCount: number;
}

export interface UploadProgress {
  status: 'progress' | 'complete' | 'error';
  progress?: number;
  response?: FileUploadResponse;
  error?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private http = inject(HttpClient);

  /**
   * Upload file cho bài tập
   */
  uploadAssignmentFile(file: File, moduleId: number): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('moduleId', moduleId.toString());

    // Note: File API uses /api/files, not /api/v1/files
    const baseUrl = API_URL.replace('/api/v1', '/api');
    
    return this.http.post<ApiResponse<FileUploadResponse>>(
      `${baseUrl}/files/upload/assignment`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: HttpEvent<ApiResponse<FileUploadResponse>>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progressEvent = event as HttpProgressEvent;
            const progress = progressEvent.total
              ? Math.round((100 * progressEvent.loaded) / progressEvent.total)
              : 0;
            return { status: 'progress' as const, progress };
          
          case HttpEventType.Response:
            const response = event as HttpResponse<ApiResponse<FileUploadResponse>>;
            return { 
              status: 'complete' as const, 
              progress: 100,
              response: response.body?.data 
            };
          
          default:
            return { status: 'progress' as const, progress: 0 };
        }
      })
    );
  }

  /**
   * Nộp bài tập (sau khi đã upload file)
   */
  submitAssignment(request: CreateSubmissionRequest): Observable<AssignmentSubmission> {
    return this.http.post<ApiResponse<AssignmentSubmission>>(
      `${API_URL}/submissions`,
      request
    ).pipe(map(res => res.data));
  }

  /**
   * Lấy bài nộp mới nhất của sinh viên
   */
  getLatestSubmission(moduleId: number): Observable<AssignmentSubmission | null> {
    return this.http.get<ApiResponse<AssignmentSubmission>>(
      `${API_URL}/submissions/module/${moduleId}/latest`
    ).pipe(map(res => res.data));
  }

  /**
   * Lấy lịch sử nộp bài của sinh viên
   */
  getSubmissionHistory(moduleId: number): Observable<AssignmentSubmission[]> {
    return this.http.get<ApiResponse<AssignmentSubmission[]>>(
      `${API_URL}/submissions/module/${moduleId}/history`
    ).pipe(map(res => res.data));
  }

  /**
   * Lấy tất cả bài nộp cho một module (cho giảng viên)
   */
  getAllSubmissions(moduleId: number): Observable<AssignmentSubmission[]> {
    return this.http.get<ApiResponse<AssignmentSubmission[]>>(
      `${API_URL}/submissions/module/${moduleId}/all`
    ).pipe(map(res => res.data));
  }

  /**
   * Kiểm tra đã nộp bài chưa
   */
  checkSubmission(moduleId: number): Observable<SubmissionCheckResponse> {
    return this.http.get<ApiResponse<SubmissionCheckResponse>>(
      `${API_URL}/submissions/module/${moduleId}/check`
    ).pipe(map(res => res.data));
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on file type
   */
  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'ppt': '📽️',
      'pptx': '📽️',
      'zip': '📦',
      'rar': '📦',
      '7z': '📦',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'txt': '📃',
      'java': '☕',
      'py': '🐍',
      'js': '🟨',
      'ts': '🔷',
      'html': '🌐',
      'css': '🎨',
    };
    return icons[ext] || '📁';
  }
}
