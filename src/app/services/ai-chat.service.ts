import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

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

export interface FunctionCallResult {
  functionName: string;
  success: boolean;
  message: string;
  data?: any;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  content: string;
  functionCalls?: FunctionCallResult[];
  suggestions?: string[];
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private apiUrl = `${environment.apiUrl}/ai/chat`;

  constructor(private http: HttpClient) {}

  /**
   * Gửi tin nhắn chat tới AI service
   */
  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request).pipe(
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
}
