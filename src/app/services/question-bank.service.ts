import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

// ==================== INTERFACES ====================

export type QuestionType = 'SINGLE' | 'MULTI' | 'FILL';
export type QuestionLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionOption {
  id?: number;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
  label?: string;
}

export interface Question {
  id: number;
  subjectId: number;
  subjectName?: string;
  chapterId?: number;
  chapterIndex?: number;
  chapterName?: string;
  content: string;
  type: QuestionType;
  level: QuestionLevel;
  explanation?: string;
  imageUrl?: string;
  isActive?: boolean;
  createdBy?: number;
  options: QuestionOption[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionRequest {
  chapterId?: number;
  content: string;
  type: QuestionType;
  level: QuestionLevel;
  explanation?: string;
  imageUrl?: string;
  options: Omit<QuestionOption, 'id' | 'label'>[];
}

export interface QuestionBankStats {
  subjectId: number;
  subjectName: string;
  total: number;
  easy: number;
  medium: number;
  hard: number;
  singleChoice: number;
  multiChoice: number;
  fill: number;
}

export interface BulkImportRequest {
  questions: QuestionRequest[];
}

export interface BulkImportResponse {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface XmlPreviewResponse {
  total: number;
  questions: QuestionRequest[];
  validationErrors: string[];
  valid: boolean;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  description?: string;
  credits: number;
  department?: string;
  isActive: boolean;
}

export interface Chapter {
  id: number;
  subjectId: number;
  subjectName?: string;
  chapterIndex: number;
  name: string;
  fullName?: string;
  description?: string;
  questionCount?: number;
  isActive?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const COURSE_API = environment.apiUrl.replace('/v1', '');

@Injectable({
  providedIn: 'root'
})
export class QuestionBankService {
  
  constructor(private http: HttpClient) {}

  // ============ Subject APIs ============
  
  getSubjects(): Observable<Subject[]> {
    return this.http.get<ApiResponse<Subject[]>>(`${COURSE_API}/subjects`)
      .pipe(map(res => res.data));
  }

  getActiveSubjects(): Observable<Subject[]> {
    return this.http.get<ApiResponse<Subject[]>>(`${COURSE_API}/subjects/active`)
      .pipe(map(res => res.data));
  }

  getSubjectById(id: number): Observable<Subject> {
    return this.http.get<ApiResponse<Subject>>(`${COURSE_API}/subjects/${id}`)
      .pipe(map(res => res.data));
  }

  // ============ Chapter APIs ============
  
  getChaptersBySubject(subjectId: number): Observable<Chapter[]> {
    return this.http.get<Chapter[]>(`${COURSE_API}/subjects/${subjectId}/chapters`);
  }

  // ============ Question APIs ============
  
  /**
   * Get all questions for a subject with optional filters
   */
  getQuestions(
    subjectId: number, 
    chapterId?: number,
    type?: QuestionType, 
    level?: QuestionLevel
  ): Observable<Question[]> {
    let params = new HttpParams();
    if (chapterId) params = params.set('chapterId', chapterId.toString());
    if (type) params = params.set('type', type);
    if (level) params = params.set('level', level);
    
    return this.http.get<Question[]>(`${COURSE_API}/subjects/${subjectId}/questions`, { params });
  }

  /**
   * Get paginated questions
   */
  getQuestionsPaged(subjectId: number, page: number = 0, size: number = 20): Observable<{
    content: Question[];
    totalElements: number;
    totalPages: number;
  }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any>(`${COURSE_API}/subjects/${subjectId}/questions/paged`, { params });
  }

  /**
   * Get single question
   */
  getQuestion(subjectId: number, questionId: number): Observable<Question> {
    return this.http.get<Question>(`${COURSE_API}/subjects/${subjectId}/questions/${questionId}`);
  }

  /**
   * Create a new question
   */
  createQuestion(subjectId: number, request: QuestionRequest): Observable<Question> {
    return this.http.post<Question>(`${COURSE_API}/subjects/${subjectId}/questions`, request);
  }

  /**
   * Update a question
   */
  updateQuestion(subjectId: number, questionId: number, request: QuestionRequest): Observable<Question> {
    return this.http.put<Question>(`${COURSE_API}/subjects/${subjectId}/questions/${questionId}`, request);
  }

  /**
   * Delete a question
   */
  deleteQuestion(subjectId: number, questionId: number): Observable<void> {
    return this.http.delete<void>(`${COURSE_API}/subjects/${subjectId}/questions/${questionId}`);
  }

  /**
   * Search questions
   */
  searchQuestions(subjectId: number, keyword: string): Observable<Question[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Question[]>(`${COURSE_API}/subjects/${subjectId}/questions/search`, { params });
  }

  /**
   * Get question bank stats
   */
  getStats(subjectId: number): Observable<QuestionBankStats> {
    return this.http.get<QuestionBankStats>(`${COURSE_API}/subjects/${subjectId}/questions/stats`);
  }

  /**
   * Bulk import questions
   */
  importQuestions(subjectId: number, request: BulkImportRequest): Observable<BulkImportResponse> {
    return this.http.post<BulkImportResponse>(`${COURSE_API}/subjects/${subjectId}/questions/import`, request);
  }

  /**
   * Preview XML import - parse file and return questions for preview
   */
  previewXmlImport(subjectId: number, file: File): Observable<XmlPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<XmlPreviewResponse>(
      `${COURSE_API}/subjects/${subjectId}/questions/import/xml/preview`,
      formData
    );
  }

  /**
   * Import questions from XML file
   */
  importXmlQuestions(subjectId: number, file: File): Observable<BulkImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<BulkImportResponse>(
      `${COURSE_API}/subjects/${subjectId}/questions/import/xml`,
      formData
    );
  }

  /**
   * Get XML template
   */
  getXmlTemplate(subjectId: number): Observable<string> {
    return this.http.get(`${COURSE_API}/subjects/${subjectId}/questions/import/xml/template`, {
      responseType: 'text'
    });
  }

  /**
   * Get random questions
   */
  getRandomQuestions(
    subjectId: number, 
    count: number = 10,
    chapterId?: number,
    level?: QuestionLevel
  ): Observable<Question[]> {
    let params = new HttpParams().set('count', count.toString());
    if (chapterId) params = params.set('chapterId', chapterId.toString());
    if (level) params = params.set('level', level);
    
    return this.http.get<Question[]>(`${COURSE_API}/subjects/${subjectId}/questions/random`, { params });
  }

  // ============ Helper Methods ============
  
  getTypeLabel(type: QuestionType): string {
    const labels: Record<QuestionType, string> = {
      'SINGLE': 'Một đáp án',
      'MULTI': 'Nhiều đáp án',
      'FILL': 'Điền vào chỗ trống'
    };
    return labels[type] || type;
  }

  getLevelLabel(level: QuestionLevel): string {
    const labels: Record<QuestionLevel, string> = {
      'EASY': 'Dễ',
      'MEDIUM': 'Trung bình',
      'HARD': 'Khó'
    };
    return labels[level] || level;
  }

  getLevelClass(level: QuestionLevel): string {
    const classes: Record<QuestionLevel, string> = {
      'EASY': 'level--easy',
      'MEDIUM': 'level--medium',
      'HARD': 'level--hard'
    };
    return classes[level] || '';
  }
}
