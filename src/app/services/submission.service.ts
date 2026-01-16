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
  fileSize: number;  // Long in BE
  studentNote?: string;
  attemptNumber: number;
  status: 'SUBMITTED' | 'GRADED' | 'RETURNED' | 'RESUBMITTED';
  isLate: boolean;
  submittedAt: string;
  score?: number;   // Double in BE
  maxScore?: number; // Double in BE
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

    // Note: File API uses courseApiUrl (/api prefix)

    return this.http.post<ApiResponse<FileUploadResponse>>(
      `${environment.courseApiUrl}/files/upload/assignment`,
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

  /**
   * Normalize file URL - chuyển đổi URL cũ (port 8081) sang gateway (port 8888)
   * Đảm bảo tất cả URL đều đi qua API gateway
   */
  normalizeFileUrl(fileUrl: string): string {
    if (!fileUrl) return '';

    // Nếu là relative path, thêm gateway base URL
    if (!fileUrl.startsWith('http')) {
      return `${environment.courseApiUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    }

    // Chuyển đổi URL trực tiếp đến course-service (8081) sang gateway (8888)
    // Xử lý cả localhost và 127.0.0.1
    const oldPatterns = [
      /http:\/\/localhost:8081\/api\/files/g,
      /http:\/\/127\.0\.0\.1:8081\/api\/files/g,
      /http:\/\/lms-course-service:8081\/api\/files/g
    ];

    let normalizedUrl = fileUrl;
    for (const pattern of oldPatterns) {
      normalizedUrl = normalizedUrl.replace(pattern, `${environment.courseApiUrl}/files`);
    }

    return normalizedUrl;
  }

  /**
   * Mở file trong tab mới để xem (inline viewing)
   * Sử dụng cho PDF, images, text files
   * @param fileUrl URL của file
   * @param originalFileName Tên file gốc để hiển thị
   */
  viewFile(fileUrl: string, originalFileName?: string): void {
    let normalizedUrl = this.normalizeFileUrl(fileUrl);
    // Thêm tên file gốc vào query string nếu có
    if (originalFileName) {
      normalizedUrl += (normalizedUrl.includes('?') ? '&' : '?') + 'name=' + encodeURIComponent(originalFileName);
    }
    window.open(normalizedUrl, '_blank');
  }

  /**
   * Download file bài nộp của sinh viên (bắt buộc tải xuống)
   * @param fileUrl URL của file
   * @param fileName Tên file để lưu
   */
  downloadSubmissionFile(fileUrl: string, fileName?: string): void {
    let normalizedUrl = this.normalizeFileUrl(fileUrl);
    // Thêm ?download=true để bắt buộc download
    normalizedUrl += (normalizedUrl.includes('?') ? '&' : '?') + 'download=true';
    // Thêm tên file gốc nếu có
    if (fileName) {
      normalizedUrl += '&name=' + encodeURIComponent(fileName);
    }

    // Mở trong tab mới - browser sẽ tự động download do Content-Disposition: attachment
    window.open(normalizedUrl, '_blank');
  }

  /**
   * Download file với blob (hỗ trợ authentication)
   * Sử dụng khi cần download file có yêu cầu token
   */
  downloadSubmissionFileBlob(fileUrl: string, fileName?: string): Observable<void> {
    const normalizedUrl = this.normalizeFileUrl(fileUrl);
    const downloadUrl = normalizedUrl + (normalizedUrl.includes('?') ? '&' : '?') + 'download=true';

    return this.http.get(downloadUrl, { responseType: 'blob' }).pipe(
      map(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || this.extractFileName(fileUrl);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
    );
  }

  /**
   * Xem file với blob (hỗ trợ authentication) - mở trong tab mới
   * Sử dụng khi cần xem file có yêu cầu token
   */
  viewFileBlob(fileUrl: string): Observable<void> {
    const normalizedUrl = this.normalizeFileUrl(fileUrl);

    return this.http.get(normalizedUrl, { responseType: 'blob' }).pipe(
      map(blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Note: URL sẽ bị revoke sau 1 phút để tránh memory leak
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      })
    );
  }

  /**
   * Trích xuất tên file từ URL
   */
  private extractFileName(fileUrl: string): string {
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || 'download';
  }
}
