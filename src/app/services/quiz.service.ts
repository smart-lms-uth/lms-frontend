import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ==================== INTERFACES ====================

export type QuestionType = 'SINGLE' | 'MULTI' | 'FILL';

export interface QuestionOption {
  id: number;
  content: string;
  orderIndex: number;
  label: string;
  isCorrect?: boolean; // Only for teacher view
}

export interface Question {
  id: number;
  content: string;
  type: QuestionType;
  imageUrl?: string;
  options: QuestionOption[];
}

export interface QuizQuestion {
  id: number;
  questionId: number;
  question: Question;
  point: number;
  orderIndex: number;
}

// Start Quiz Response
export interface StartQuizResponse {
  submissionId: number;
  startedAt: string;
  timeLimit: number; // minutes
  attemptNumber: number;
  questions: QuizQuestion[];
}

// Answer Request
export interface AnswerRequest {
  questionId: number;
  selectedOptionId?: number;      // For SINGLE
  selectedOptionIds?: number[];   // For MULTI
  textAnswer?: string;            // For FILL
}

// Save Answer Request
export interface SaveAnswerRequest {
  questionId: number;
  selectedOptionId?: number;
  selectedOptionIds?: number[];
  textAnswer?: string;
}

// Submit Quiz Request
export interface SubmitQuizRequest {
  answers: AnswerRequest[];
}

// Answer Result Response
export interface AnswerResult {
  questionId: number;
  questionContent: string;
  selectedAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer?: string;  // Only if settings allow
  explanation?: string;    // Only if settings allow
}

// Submission Result Response
export interface SubmissionResult {
  id: number;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string;
  timeSpent: number; // seconds
  attemptNumber: number;
  answers?: AnswerResult[];
}

// Submission Summary
export interface SubmissionSummary {
  id: number;
  studentId: number;
  studentName: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  timeSpent: number;
  attemptNumber: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
}

// Add Question Request
export interface AddQuestionRequest {
  questionId: number;
  point?: number;
  orderIndex?: number;
}

// Add Questions Request (bulk)
export interface AddQuestionsRequest {
  questions: AddQuestionRequest[];
}

// Random Questions Request
export interface RandomQuestionsRequest {
  subjectId?: number;           // Dùng khi lấy random từ toàn bộ subject
  fromChapterIds?: number[];    // Dùng khi lấy random từ các chapters cụ thể
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  pointPerQuestion?: number;
}

// ==================== SERVICE ====================

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  // Quiz API endpoints don't use /v1 prefix
  private baseUrl = environment.apiUrl.replace('/api/v1', '');
  private apiUrl = `${this.baseUrl}/api/quiz`;
  private questionsUrl = `${this.baseUrl}/api/modules`;

  constructor(private http: HttpClient) {}

  // ============ SINH VIÊN LÀM BÀI ============

  /**
   * Bắt đầu làm bài quiz
   */
  startQuiz(moduleId: number): Observable<StartQuizResponse> {
    return this.http.post<StartQuizResponse>(
      `${this.apiUrl}/modules/${moduleId}/start`,
      {}
    );
  }

  /**
   * Lưu tạm câu trả lời (auto-save)
   */
  saveAnswer(submissionId: number, request: SaveAnswerRequest): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/submissions/${submissionId}/save-answer`,
      request
    );
  }

  /**
   * Nộp bài quiz
   */
  submitQuiz(submissionId: number, request: SubmitQuizRequest): Observable<SubmissionResult> {
    return this.http.post<SubmissionResult>(
      `${this.apiUrl}/submissions/${submissionId}/submit`,
      request
    );
  }

  /**
   * Xem kết quả bài làm
   */
  getSubmissionResult(submissionId: number): Observable<SubmissionResult> {
    return this.http.get<SubmissionResult>(
      `${this.apiUrl}/submissions/${submissionId}/result`
    );
  }

  /**
   * Lấy lịch sử làm bài của sinh viên cho một quiz
   */
  getMySubmissions(moduleId: number): Observable<SubmissionSummary[]> {
    return this.http.get<SubmissionSummary[]>(
      `${this.apiUrl}/modules/${moduleId}/my-submissions`
    );
  }

  // ============ LẤY CÂU HỎI ============

  /**
   * Lấy câu hỏi đề thi cho sinh viên (không có đáp án đúng)
   */
  getQuizQuestionsForStudent(moduleId: number): Observable<QuizQuestion[]> {
    return this.http.get<QuizQuestion[]>(
      `${this.questionsUrl}/${moduleId}/quiz-questions/student`
    );
  }

  /**
   * Lấy tất cả câu hỏi của đề thi (cho giáo viên)
   */
  getQuizQuestions(moduleId: number): Observable<QuizQuestion[]> {
    return this.http.get<QuizQuestion[]>(
      `${this.questionsUrl}/${moduleId}/quiz-questions`
    );
  }

  // ============ GIÁO VIÊN XEM BÀI ============

  /**
   * Lấy tất cả bài nộp của một quiz (cho giáo viên)
   */
  getAllSubmissions(moduleId: number): Observable<SubmissionSummary[]> {
    return this.http.get<SubmissionSummary[]>(
      `${this.apiUrl}/modules/${moduleId}/submissions`
    );
  }

  /**
   * Lấy chi tiết bài làm (cho giáo viên)
   */
  getSubmissionDetail(submissionId: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/submissions/${submissionId}`
    );
  }

  // ============ QUẢN LÝ CÂU HỎI ĐỀ THI ============

  /**
   * Thêm câu hỏi vào đề thi
   */
  addQuestionToQuiz(moduleId: number, request: AddQuestionRequest): Observable<QuizQuestion> {
    return this.http.post<QuizQuestion>(
      `${this.questionsUrl}/${moduleId}/quiz-questions`,
      request
    );
  }

  /**
   * Thêm nhiều câu hỏi vào đề thi
   */
  addQuestionsToQuiz(moduleId: number, request: AddQuestionsRequest): Observable<QuizQuestion[]> {
    return this.http.post<QuizQuestion[]>(
      `${this.questionsUrl}/${moduleId}/quiz-questions/bulk`,
      request
    );
  }

  /**
   * Thêm câu hỏi ngẫu nhiên vào đề thi
   */
  addRandomQuestionsToQuiz(moduleId: number, request: RandomQuestionsRequest): Observable<QuizQuestion[]> {
    return this.http.post<QuizQuestion[]>(
      `${this.questionsUrl}/${moduleId}/quiz-questions/random`,
      request
    );
  }

  /**
   * Xóa câu hỏi khỏi đề thi
   */
  removeQuestionFromQuiz(moduleId: number, questionId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.questionsUrl}/${moduleId}/quiz-questions/${questionId}`
    );
  }

  /**
   * Xóa tất cả câu hỏi khỏi đề thi
   */
  clearQuizQuestions(moduleId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.questionsUrl}/${moduleId}/quiz-questions`
    );
  }

  // ============ HELPER METHODS ============

  /**
   * Format time from seconds to mm:ss
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format time from seconds to human readable
   */
  formatTimeSpent(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} giây`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) {
      return secs > 0 ? `${mins} phút ${secs} giây` : `${mins} phút`;
    }
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours} giờ ${remainMins} phút`;
  }
}
