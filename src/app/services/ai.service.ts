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

// ============ AI Quiz Generation Interfaces ============

export interface GeneratedQuizOption {
  content: string;
  isCorrect: boolean;
}

export interface GeneratedQuizQuestion {
  content: string;
  type: 'SINGLE' | 'MULTI' | 'FILL';
  level: 'EASY' | 'MEDIUM' | 'HARD';
  options: GeneratedQuizOption[];
  explanation?: string;
}

export interface GeneratedQuizResponse {
  questions: GeneratedQuizQuestion[];
}

// ============ AI Lecture Interfaces ============

export interface GenerateLectureRequest {
  lecture_title: string;
  subject_name: string;
  duration?: number;
  learning_objectives?: string;
}

export interface LectureSectionResponse {
  heading: string;
  content: string;
  examples: string[];
  keyPoints: string[];
}

export interface GeneratedLectureResponse {
  title: string;
  objectives: string[];
  sections: LectureSectionResponse[];
  summary: string;
  reviewQuestions: string[];
}

// ============ AI Assignment Interfaces ============

export interface GenerateAssignmentRequest {
  assignment_title: string;
  subject_name: string;
  related_topics?: string;
  deadline_days?: number;
}

export interface RubricItemResponse {
  criteria: string;
  maxScore: number;
  description: string;
}

export interface GeneratedAssignmentResponse {
  title: string;
  description: string;
  objectives: string[];
  requirements: string[];
  rubric: RubricItemResponse[];
  hints: string[];
  resources: string[];
}

// ============ AI Course Generation Interfaces ============

export interface GenerateCourseRequest {
  subject_name: string;
  credits?: number;
  description?: string;
  target_audience?: string;
  num_sections?: number;
}

export interface GeneratedModule {
  title: string;
  type: string;
  description: string;
  estimatedDuration: number;
  orderIndex: number;
}

export interface GeneratedSection {
  title: string;
  description: string;
  orderIndex: number;
  modules: GeneratedModule[];
}

export interface GeneratedCourseResponse {
  courseName: string;
  description: string;
  sections: GeneratedSection[];
}

// ============ AI Modify Interfaces ============

export interface ModifyCourseRequest {
  request: string;
  current_course: any;
}

export interface ModifyQuizRequest {
  request: string;
  current_quiz: any;
}

// ============ AI Assignment Instructions ============

export interface GenerateAssignmentInstructionsRequest {
  prompt: string;
  topic?: string;
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
  private baseUrl = environment.aiApiUrl; // Use aiApiUrl from environment

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

  // ============ AI Chat/Assistant Methods ============

  /**
   * Gửi câu hỏi đến AI Assistant (có lưu lịch sử vào Redis)
   * @param question Câu hỏi của user
   * @param options Tùy chọn chat
   */
  askQuestion(question: string, options?: { 
    userId?: string;
    courseId?: string;
    sessionId?: string;
    subjectName?: string;
    currentChapter?: string;
    loadHistory?: boolean;
  }): Observable<ApiResponse<{ answer: string; suggestions: string[] }>> {
    return this.http.post<ApiResponse<{ answer: string; suggestions: string[] }>>(`${this.baseUrl}/chat`, {
      question,
      user_id: options?.userId || 'anonymous',
      course_id: options?.courseId || null,
      session_id: options?.sessionId || null,
      subject_name: options?.subjectName || '',
      current_chapter: options?.currentChapter || '',
      load_history: options?.loadHistory ?? true
    });
  }

  /**
   * Tạo câu hỏi Quiz từ AI dựa trên chủ đề
   * @param request Yêu cầu tạo quiz
   */
  generateQuizQuestions(request: {
    topic: string;
    subjectName: string;
    chapterName?: string;
    numQuestions?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  }): Observable<ApiResponse<GeneratedQuizResponse>> {
    return this.http.post<ApiResponse<GeneratedQuizResponse>>(`${this.baseUrl}/generate-quiz`, {
      topic: request.topic,
      subject_name: request.subjectName,
      chapter_name: request.chapterName || '',
      num_questions: request.numQuestions || 10,
      difficulty: request.difficulty || 'MEDIUM'
    });
  }

  /**
   * Tạo cấu trúc khóa học từ AI
   * @param request Yêu cầu tạo khóa học
   */
  generateCourse(request: GenerateCourseRequest): Observable<ApiResponse<GeneratedCourseResponse>> {
    return this.http.post<ApiResponse<GeneratedCourseResponse>>(`${this.baseUrl}/generate-course`, {
      subject_name: request.subject_name,
      credits: request.credits || 3,
      description: request.description || '',
      target_audience: request.target_audience || 'Sinh viên đại học',
      num_sections: request.num_sections || 8
    });
  }

  /**
   * Tạo nội dung bài giảng từ AI
   * @param request Yêu cầu tạo bài giảng
   */
  generateLecture(request: GenerateLectureRequest): Observable<ApiResponse<GeneratedLectureResponse>> {
    return this.http.post<ApiResponse<GeneratedLectureResponse>>(`${this.baseUrl}/generate-lecture`, {
      lecture_title: request.lecture_title,
      subject_name: request.subject_name,
      duration: request.duration || 45,
      learning_objectives: request.learning_objectives || ''
    });
  }

  /**
   * Tạo đề bài tập từ AI
   * @param request Yêu cầu tạo bài tập
   */
  generateAssignment(request: GenerateAssignmentRequest): Observable<ApiResponse<GeneratedAssignmentResponse>> {
    return this.http.post<ApiResponse<GeneratedAssignmentResponse>>(`${this.baseUrl}/generate-assignment`, {
      assignment_title: request.assignment_title,
      subject_name: request.subject_name,
      related_topics: request.related_topics || '',
      deadline_days: request.deadline_days || 7
    });
  }

  /**
   * Tạo hướng dẫn bài tập (markdown) từ AI
   * @param request Yêu cầu tạo hướng dẫn
   */
  generateAssignmentInstructions(request: GenerateAssignmentInstructionsRequest): Observable<ApiResponse<{ instructions: string }>> {
    return this.http.post<ApiResponse<{ instructions: string }>>(`${this.baseUrl}/generate-assignment-instructions`, {
      prompt: request.prompt,
      topic: request.topic || 'Bài tập'
    });
  }

  /**
   * Tóm tắt nội dung văn bản
   * @param content Nội dung cần tóm tắt
   * @param maxWords Số từ tối đa
   */
  summarize(content: string, maxWords: number = 200): Observable<ApiResponse<{ summary: string; keyPoints: string[]; keywords: string[] }>> {
    return this.http.post<ApiResponse<{ summary: string; keyPoints: string[]; keywords: string[] }>>(`${this.baseUrl}/summarize`, {
      content,
      max_words: maxWords
    });
  }

  /**
   * Chỉnh sửa khóa học đã tạo
   * @param request Yêu cầu chỉnh sửa
   */
  modifyCourse(request: ModifyCourseRequest): Observable<ApiResponse<GeneratedCourseResponse>> {
    return this.http.post<ApiResponse<GeneratedCourseResponse>>(`${this.baseUrl}/modify-course`, {
      request: request.request,
      current_course: request.current_course
    });
  }

  /**
   * Chỉnh sửa quiz đã tạo
   * @param request Yêu cầu chỉnh sửa
   */
  modifyQuiz(request: ModifyQuizRequest): Observable<ApiResponse<GeneratedQuizResponse>> {
    return this.http.post<ApiResponse<GeneratedQuizResponse>>(`${this.baseUrl}/modify-quiz`, {
      request: request.request,
      current_quiz: request.current_quiz
    });
  }

  /**
   * Lấy lịch sử chat
   * @param userId ID người dùng
   * @param options Tùy chọn
   */
  getChatHistory(userId: string, options?: {
    sessionId?: string;
    courseId?: string;
    limit?: number;
  }): Observable<ApiResponse<{ messages: any[]; count: number }>> {
    return this.http.post<ApiResponse<{ messages: any[]; count: number }>>(`${this.baseUrl}/chat/history`, {
      user_id: userId,
      session_id: options?.sessionId || null,
      course_id: options?.courseId || null,
      limit: options?.limit || 50
    });
  }

  /**
   * Xóa lịch sử chat
   * @param userId ID người dùng
   * @param options Tùy chọn
   */
  clearChatHistory(userId: string, options?: {
    sessionId?: string;
    courseId?: string;
  }): Observable<ApiResponse<null>> {
    return this.http.request<ApiResponse<null>>('DELETE', `${this.baseUrl}/chat/history`, {
      body: {
        user_id: userId,
        session_id: options?.sessionId || null,
        course_id: options?.courseId || null
      }
    });
  }

  /**
   * Lấy danh sách file types được hỗ trợ
   */
  getSupportedFileTypes(): Observable<ApiResponse<{ supported_types: any; categories: any }>> {
    return this.http.get<ApiResponse<{ supported_types: any; categories: any }>>(`${this.baseUrl}/supported-files`);
  }
}
