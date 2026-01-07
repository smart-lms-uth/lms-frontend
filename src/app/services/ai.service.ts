import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface UserInfo {
  userId: number;
  username: string;
  role: string;
  authorities: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
}

export interface CheckActiveResponse {
  success: boolean;
  message: string;
  username: string;
  userId: number;
  role: string;
  timestamp: string;
}

/**
 * AI Service - giao tiếp với lms-ai-service backend
 * Sử dụng JWT authentication thông qua gateway
 */
@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/ai`;

  /**
   * Public endpoint - Kiểm tra health của AI service
   */
  getHealth(): Observable<ApiResponse<HealthStatus>> {
    return this.http.get<ApiResponse<HealthStatus>>(`${this.baseUrl}/health`);
  }

  /**
   * Public endpoint - Kiểm tra status công khai
   */
  getPublicStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/public/status`);
  }

  /**
   * Protected endpoint - Kiểm tra user đã đăng nhập và active
   * Yêu cầu JWT token trong header
   */
  checkActive(): Observable<CheckActiveResponse> {
    return this.http.get<CheckActiveResponse>(`${this.baseUrl}/check-active`);
  }

  /**
   * Protected endpoint - Lấy thông tin user hiện tại từ JWT
   */
  getCurrentUser(): Observable<ApiResponse<UserInfo>> {
    return this.http.get<ApiResponse<UserInfo>>(`${this.baseUrl}/me`);
  }

  /**
   * Protected endpoint - Kiểm tra status với authentication
   */
  getStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/status`);
  }

  // ============ AI Chat/Assistant Methods (placeholder) ============

  /**
   * Gửi câu hỏi đến AI Assistant
   * @param question Câu hỏi của user
   * @param context Context bổ sung (course, module, etc.)
   */
  askQuestion(question: string, context?: { courseId?: number; moduleId?: number }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chat`, {
      question,
      context
    });
  }

  /**
   * Tạo quiz tự động từ nội dung
   * @param content Nội dung để tạo quiz
   * @param options Tùy chọn tạo quiz
   */
  generateQuiz(content: string, options?: { 
    numberOfQuestions?: number; 
    difficulty?: 'easy' | 'medium' | 'hard';
    questionTypes?: string[];
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/generate/quiz`, {
      content,
      options
    });
  }

  /**
   * Tóm tắt nội dung bài học
   * @param moduleId ID của module cần tóm tắt
   */
  summarizeModule(moduleId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/summarize/module/${moduleId}`);
  }

  /**
   * Gợi ý nội dung học tập cho sinh viên
   * @param courseId ID của khóa học
   */
  getStudyRecommendations(courseId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/recommendations/course/${courseId}`);
  }
}
