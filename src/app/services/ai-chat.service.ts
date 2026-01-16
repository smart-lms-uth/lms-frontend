import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Compact section info for context
export interface SectionInfo {
  id: number;
  title: string;
  modules?: ModuleInfo[];
}

// Compact module info for context
export interface ModuleInfo {
  id: number;
  title: string;
  type: string;
}

export interface ChatContext {
  courseId?: number;
  courseName?: string;
  sectionId?: number;
  moduleId?: number;
  currentPage?: string;
  // Full course structure for AI to lookup IDs
  sections?: SectionInfo[];
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  context?: ChatContext;
}

// Backend API request format
interface BackendChatRequest {
  question: string;
  user_id?: string;
  session_id?: string;
  course_id?: string;
  subject_name?: string;
  current_chapter?: string;
  history?: { role: string; content: string }[];
  load_history?: boolean;
  // Agentic mode fields
  agentic_mode?: boolean;
  user_role?: string;
  section_id?: number;
  section_name?: string;
  // Google OAuth token for creating real Google Meet
  google_access_token?: string;
}

export interface AgenticChatResponse {
  success: boolean;
  message: string;
  data?: {
    answer: string;
    action: 'create_livestream' | 'create_lecture' | 'create_quiz' | 'create_assignment' | 'chat';
    intent_detected: string;
    action_data?: any;
    action_result?: {
      success: boolean;
      message?: string;
      data?: any;
    };
    suggestions?: string[];
  };
}

export interface FunctionCallResult {
  functionName: string;
  success: boolean;
  message: string;
  data?: any;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  content?: string;
  data?: {
    answer: string;
    suggestions?: string[];
  };
  functionCalls?: FunctionCallResult[];
  suggestions?: string[];
  timestamp?: string;
  error?: any;
}

// Course Generation Response
export interface CourseGenerationModule {
  title: string;
  type: 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  description?: string;
}

export interface CourseGenerationSection {
  title: string;
  description?: string;
  modules: CourseGenerationModule[];
}

export interface GeneratedCourse {
  name: string;
  description?: string;
  objectives?: string[];
  sections: CourseGenerationSection[];
}

export interface CourseGenerationResponse {
  success: boolean;
  message: string;
  course?: GeneratedCourse;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private apiUrl = `${environment.aiApiUrl}/chat`;
  private aiServiceUrl = environment.aiApiUrl;
  private authService = inject(AuthService);

  constructor(private http: HttpClient) { }

  /**
   * Gửi tin nhắn chat tới AI service
   */
  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    // Transform to backend format
    const user = this.authService.getCurrentUserSync();
    const backendRequest: BackendChatRequest = {
      question: request.message,
      user_id: user?.id?.toString() || 'anonymous',
      course_id: request.context?.courseId?.toString(),
      subject_name: request.context?.courseName || '',
      history: request.history?.map(m => ({ role: m.role, content: m.content })),
      load_history: false
    };

    return this.http.post<ChatResponse>(this.apiUrl, backendRequest).pipe(
      catchError(error => {
        console.error('AI Chat Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể kết nối với AI service',
          content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
          timestamp: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Gửi tin nhắn đơn giản (không cần history)
   */
  sendSimpleMessage(message: string, courseId?: number): Observable<ChatResponse> {
    const request: ChatRequest = {
      message,
      context: courseId ? { courseId } : undefined
    };
    return this.sendMessage(request);
  }

  /**
   * Agentic Chat - AI tự detect intent và thực hiện action
   * Dùng cho teacher khi muốn AI tự động tạo nội dung
   */
  sendAgenticMessage(
    message: string,
    userRole: string,
    courseName: string,
    courseId?: number,
    sectionId?: number,
    sectionName?: string,
    history?: ChatMessage[],
    googleAccessToken?: string
  ): Observable<AgenticChatResponse> {
    const user = this.authService.getCurrentUserSync();
    const backendRequest: BackendChatRequest = {
      question: message,
      user_id: user?.id?.toString() || 'anonymous',
      course_id: courseId?.toString(),
      subject_name: courseName,
      section_id: sectionId,
      section_name: sectionName || '',
      history: history?.map(m => ({ role: m.role, content: m.content })),
      load_history: false,
      agentic_mode: true,
      user_role: userRole,
      google_access_token: googleAccessToken
    };

    console.log('🤖 Agentic Chat Request:', {
      ...backendRequest,
      question: message.substring(0, 50) + '...',
      has_google_token: !!googleAccessToken
    });

    return this.http.post<AgenticChatResponse>(this.apiUrl, backendRequest).pipe(
      catchError(error => {
        console.error('AI Agentic Chat Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể kết nối với AI service',
          data: {
            answer: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
            action: 'chat' as const,
            intent_detected: 'error',
            suggestions: []
          }
        });
      })
    );
  }

  /**
   * Gọi Python AI service để generate cấu trúc khóa học
   */
  generateCourse(subjectName: string, description?: string, numSections?: number): Observable<any> {
    const generateUrl = `${this.aiServiceUrl}/generate-course`;
    const body = {
      subject_name: subjectName,
      description: description || '',
      num_sections: numSections || 5
    };

    console.log('📚 Generate Course Request:', body);

    return this.http.post<any>(generateUrl, body).pipe(
      catchError(error => {
        console.error('AI Generate Course Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể tạo khóa học',
          data: null
        });
      })
    );
  }

  /**
   * Gọi Python AI service để generate câu hỏi quiz
   */
  generateQuiz(topic: string, subjectName?: string, numQuestions?: number, difficulty?: string): Observable<any> {
    const generateUrl = `${this.aiServiceUrl}/generate-quiz`;
    const body = {
      topic: topic,
      subject_name: subjectName || topic,
      num_questions: numQuestions || 10,
      difficulty: difficulty || 'MEDIUM'
    };

    console.log('🎯 Generate Quiz Request:', body);

    return this.http.post<any>(generateUrl, body).pipe(
      catchError(error => {
        console.error('AI Generate Quiz Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể tạo câu hỏi quiz',
          data: null
        });
      })
    );
  }

  /**
   * Gọi Python AI service để generate bài giảng
   */
  generateLecture(lectureTitle: string, subjectName?: string, duration?: number): Observable<any> {
    const generateUrl = `${this.aiServiceUrl}/generate-lecture`;
    const body = {
      lecture_title: lectureTitle,
      subject_name: subjectName || lectureTitle,
      duration: duration || 45
    };

    return this.http.post<any>(generateUrl, body).pipe(
      catchError(error => {
        console.error('AI Generate Lecture Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể tạo bài giảng',
          data: null
        });
      })
    );
  }

  /**
   * Gọi Python AI service để generate bài tập
   */
  generateAssignment(assignmentTitle: string, subjectName?: string): Observable<any> {
    const generateUrl = `${this.aiServiceUrl}/generate-assignment`;
    const body = {
      assignment_title: assignmentTitle,
      subject_name: subjectName || assignmentTitle
    };

    return this.http.post<any>(generateUrl, body).pipe(
      catchError(error => {
        console.error('AI Generate Assignment Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể tạo bài tập',
          data: null
        });
      })
    );
  }

  /**
   * Gọi Python AI service để generate hướng dẫn bài tập (markdown)
   */
  generateAssignmentInstructions(prompt: string, topic?: string): Observable<any> {
    const generateUrl = `${this.aiServiceUrl}/generate-assignment-instructions`;
    const body = {
      prompt: prompt,
      topic: topic || 'Bài tập'
    };

    console.log('📝 Generate Assignment Instructions Request:', body);

    return this.http.post<any>(generateUrl, body).pipe(
      catchError(error => {
        console.error('AI Generate Assignment Instructions Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể tạo hướng dẫn bài tập',
          data: null
        });
      })
    );
  }

  /**
   * Gọi Python AI service để generate thông tin buổi học online
   */
  generateLivestream(courseName: string, sectionName?: string, topic?: string, scheduledDate?: string, scheduledTime?: string, duration?: number, platform?: string): Observable<any> {
    const generateUrl = `${this.aiServiceUrl}/generate-livestream`;
    const body = {
      course_name: courseName,
      section_name: sectionName || '',
      topic: topic || '',
      scheduled_date: scheduledDate || '',
      scheduled_time: scheduledTime || '',
      duration: duration || 60,
      platform: platform || 'google_meet'
    };

    console.log('🎥 Generate Livestream Request:', body);

    return this.http.post<any>(generateUrl, body).pipe(
      catchError(error => {
        console.error('AI Generate Livestream Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể tạo buổi học online',
          data: null
        });
      })
    );
  }

  /**
   * Chat tự do với AI (có lưu lịch sử vào Redis)
   */
  chat(question: string, courseId?: string, sessionId?: string): Observable<any> {
    const chatUrl = `${this.aiServiceUrl}/chat`;
    const user = this.authService.getCurrentUserSync();
    const userId = user?.id?.toString() || 'anonymous';

    const body = {
      question: question,
      user_id: userId,
      course_id: courseId || null,
      session_id: sessionId || null,
      load_history: true  // Auto-load history from Redis
    };

    console.log('💬 Chat Request:', { ...body, question: question.substring(0, 50) + '...' });

    return this.http.post<any>(chatUrl, body).pipe(
      catchError(error => {
        console.error('AI Chat Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể chat với AI',
          data: null
        });
      })
    );
  }

  /**
   * Lấy lịch sử chat từ Redis
   */
  getChatHistory(courseId?: string, sessionId?: string, limit: number = 50): Observable<any> {
    const historyUrl = `${this.aiServiceUrl}/chat/history`;
    const user = this.authService.getCurrentUserSync();
    const userId = user?.id?.toString() || 'anonymous';

    const body = {
      user_id: userId,
      course_id: courseId || null,
      session_id: sessionId || null,
      limit: limit
    };

    return this.http.post<any>(historyUrl, body).pipe(
      catchError(error => {
        console.error('Get Chat History Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể lấy lịch sử chat',
          data: { messages: [], count: 0 }
        });
      })
    );
  }

  /**
   * Xóa lịch sử chat
   */
  clearChatHistory(userId?: string, sessionId?: string, courseId?: string): Observable<any> {
    const clearUrl = `${this.aiServiceUrl}/chat/history`;
    const user = this.authService.getCurrentUserSync();
    const effectiveUserId = userId || user?.id?.toString() || 'anonymous';

    const body = {
      user_id: effectiveUserId,
      course_id: courseId || null,
      session_id: sessionId || null
    };

    // Using HTTP DELETE with body requires special handling
    return this.http.request<any>('DELETE', clearUrl, { body }).pipe(
      catchError(error => {
        console.error('Clear Chat History Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể xóa lịch sử chat'
        });
      })
    );
  }

  /**
   * Lấy danh sách sessions của user
   */
  getChatSessions(userId?: string): Observable<any> {
    const user = this.authService.getCurrentUserSync();
    const effectiveUserId = userId || user?.id?.toString() || 'anonymous';
    const sessionsUrl = `${this.aiServiceUrl}/chat/sessions/${effectiveUserId}`;

    return this.http.get<any>(sessionsUrl).pipe(
      catchError(error => {
        console.error('Get Chat Sessions Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể lấy danh sách sessions',
          data: { sessions: [], count: 0 }
        });
      })
    );
  }

  /**
   * Chỉnh sửa khóa học đã tạo bằng AI
   */
  modifyCourse(request: string, currentCourse: any): Observable<any> {
    const modifyUrl = `${this.aiServiceUrl}/modify-course`;
    const body = {
      request: request,
      current_course: currentCourse
    };

    return this.http.post<any>(modifyUrl, body).pipe(
      catchError(error => {
        console.error('AI Modify Course Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể chỉnh sửa khóa học',
          data: null
        });
      })
    );
  }

  /**
   * Chỉnh sửa quiz đã tạo bằng AI
   */
  modifyQuiz(request: string, currentQuiz: any): Observable<any> {
    const modifyUrl = `${this.aiServiceUrl}/modify-quiz`;
    const body = {
      request: request,
      current_quiz: currentQuiz
    };

    return this.http.post<any>(modifyUrl, body).pipe(
      catchError(error => {
        console.error('AI Modify Quiz Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể chỉnh sửa quiz',
          data: null
        });
      })
    );
  }

  /**
   * Chỉnh sửa bài giảng đã tạo bằng AI
   */
  modifyLecture(request: string, currentLecture: any): Observable<any> {
    const modifyUrl = `${this.aiServiceUrl}/modify-lecture`;
    const body = {
      request: request,
      current_lecture: currentLecture
    };

    return this.http.post<any>(modifyUrl, body).pipe(
      catchError(error => {
        console.error('AI Modify Lecture Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể chỉnh sửa bài giảng',
          data: null
        });
      })
    );
  }

  /**
   * Chỉnh sửa bài tập đã tạo bằng AI
   */
  modifyAssignment(request: string, currentAssignment: any): Observable<any> {
    const modifyUrl = `${this.aiServiceUrl}/modify-assignment`;
    const body = {
      request: request,
      current_assignment: currentAssignment
    };

    return this.http.post<any>(modifyUrl, body).pipe(
      catchError(error => {
        console.error('AI Modify Assignment Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể chỉnh sửa bài tập',
          data: null
        });
      })
    );
  }

  /**
   * Chat với file đính kèm (PDF, images, audio, video)
   */
  chatWithFile(file: File, question: string, sessionId?: string): Observable<any> {
    const chatUrl = `${this.aiServiceUrl}/chat-with-file`;
    const user = this.authService.getCurrentUserSync();
    const userId = user?.id?.toString() || 'anonymous';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('question', question);
    formData.append('user_id', userId);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    return this.http.post<any>(chatUrl, formData).pipe(
      catchError(error => {
        console.error('AI Chat With File Error:', error);
        return of({
          success: false,
          message: error.message || 'Không thể gửi file',
          data: null
        });
      })
    );
  }
}
