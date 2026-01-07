import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

// Base API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// ==================== QUIZ SETTINGS ====================

/**
 * Cách tính điểm khi làm nhiều lần
 */
export type GradingMethod = 'HIGHEST' | 'LATEST' | 'AVERAGE' | 'FIRST';

/**
 * Cách chọn câu hỏi cho bài thi
 */
export type QuestionSelectionMode = 'MANUAL' | 'RANDOM' | 'MIXED';

/**
 * Cách phát đề cho sinh viên
 */
export type ExamDistributionMode = 'SAME_FOR_ALL' | 'UNIQUE_PER_STUDENT';

/**
 * Cấu hình lấy câu hỏi ngẫu nhiên
 */
export interface RandomQuestionConfig {
  fromChapterIds?: number[];
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  singleChoiceCount?: number;
  multiChoiceCount?: number;
  fillCount?: number;
}

/**
 * Cấu hình đầy đủ cho bài trắc nghiệm
 */
export interface QuizSettings {
  // === Cấu hình thời gian ===
  openDate?: string;
  closeDate?: string;
  durationMinutes?: number;

  // === Cấu hình làm bài ===
  maxAttempts?: number;
  gradingMethod?: GradingMethod;

  // === Cấu hình chọn câu hỏi ===
  questionSelectionMode?: QuestionSelectionMode;
  totalQuestions?: number;
  randomConfig?: RandomQuestionConfig;
  selectedQuestionIds?: number[];  // Danh sách ID câu hỏi được chọn thủ công (MANUAL/MIXED)
  distributionMode?: ExamDistributionMode;

  // === Cấu hình hiển thị ===
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  oneQuestionPerPage?: boolean;
  allowBackNavigation?: boolean;
  showQuestionNumber?: boolean;
  showPointsPerQuestion?: boolean;

  // === Cấu hình xem lại ===
  showCorrectAnswers?: boolean;
  reviewAvailableFrom?: string;
  allowReview?: boolean;
  showScoreImmediately?: boolean;

  // === Cấu hình bảo mật ===
  accessPassword?: string;
  allowedIpRanges?: string[];
  requireFullscreen?: boolean;
  detectTabSwitch?: boolean;
  maxTabSwitchCount?: number;
  requireWebcam?: boolean;
}

// Semester DTOs
export interface Semester {
  id: number;
  semesterCode: string;
  displayName: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSemesterRequest {
  semesterCode: string;
  displayName: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

// Subject DTOs
export interface Subject {
  id: number;
  subjectCode: string;
  name: string;
  credits: number;
  department: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectRequest {
  subjectCode: string;
  name: string;
  credits: number;
  department: string;
  description: string;
  active: boolean;
}

// Course DTOs
export type CourseStatus = 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'PLANNED';

export interface Course {
  id: number;
  courseCode: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  credits: number;
  semesterId: number;
  semesterCode: string;
  semesterName: string;
  instructorId: number;
  instructorName: string | null;
  room: string;
  maxStudents: number;
  currentEnrollment: number;
  status: CourseStatus;
  originalCourseId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  courseCode: string;
  subjectId: number;
  semesterId: number;
  instructorId: number;
  room: string;
  maxStudents: number;
  status: CourseStatus;
}

// Section DTOs
export interface Section {
  id: number;
  courseId: number;
  title: string;
  description: string;
  orderIndex: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  moduleCount: number;
  modules?: Module[];
}

export interface Module {
  id: number;
  sectionId: number;
  title: string;
  description: string;
  type: 'VIDEO' | 'RESOURCE' | 'QUIZ' | 'ASSIGNMENT' | 'LIVESTREAM' | 'FORUM';
  contentUrl?: string;
  duration?: number;
  orderIndex: number;
  visible: boolean;
  isCompleted?: boolean;
  // Grade fields
  maxScore?: number;
  scoreWeight?: number;
  gradeType?: 'PROCESS' | 'FINAL';
  isShowInGradeTable?: boolean;
  // Quiz/Assignment settings
  settings?: QuizSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSectionRequest {
  title: string;
  description: string;
  orderIndex?: number;
  visible?: boolean;
}

export interface CreateModuleRequest {
  title: string;
  description: string;
  type: 'VIDEO' | 'RESOURCE' | 'QUIZ' | 'ASSIGNMENT' | 'LIVESTREAM' | 'FORUM';
  contentUrl?: string;
  duration?: number;
  orderIndex?: number;
  visible?: boolean;
  // Grade fields
  maxScore?: number;
  scoreWeight?: number;
  gradeType?: 'PROCESS' | 'FINAL';
  isShowInGradeTable?: boolean;
  // Settings JSON for quiz/assignment config
  settings?: QuizSettings;
}

// ============ Copy Content DTOs ============

/**
 * Thông tin course có thể copy
 */
export interface CourseForCopy {
  id: number;
  courseCode: string;
  semesterName: string;
  status: string;
  sectionCount: number;
  moduleCount: number;
}

/**
 * Request copy nội dung
 */
export interface CopyContentRequest {
  sourceCourseId: number;
  sectionIds?: number[];  // Nếu null thì copy tất cả
  copyQuizQuestions?: boolean;  // Default: true
  keepVisibility?: boolean;  // Default: false
  clearExisting?: boolean;  // Default: false
}

/**
 * Response sau khi copy
 */
export interface CopyContentResponse {
  targetCourseId: number;
  sourceCourseId: number;
  sectionsCopied: number;
  modulesCopied: number;
  quizQuestionsCopied: number;
  sectionIdMapping: { [key: number]: number };
  moduleIdMapping: { [key: number]: number };
  copiedSections: CopiedSectionInfo[];
}

export interface CopiedSectionInfo {
  originalId: number;
  newId: number;
  title: string;
  moduleCount: number;
}

// Course base URL (no /v1 prefix)
const COURSE_API = environment.apiUrl.replace('/v1', '');

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  
  constructor(private http: HttpClient) {}

  // ============ Semester APIs ============
  
  getSemesters(): Observable<Semester[]> {
    return this.http.get<ApiResponse<Semester[]>>(`${COURSE_API}/semesters`)
      .pipe(map(res => res.data));
  }

  getSemesterById(id: number): Observable<Semester> {
    return this.http.get<ApiResponse<Semester>>(`${COURSE_API}/semesters/${id}`)
      .pipe(map(res => res.data));
  }

  getCurrentSemester(): Observable<Semester | null> {
    return this.getSemesters().pipe(
      map(semesters => semesters.find(s => s.isCurrent) || null)
    );
  }

  createSemester(request: CreateSemesterRequest): Observable<Semester> {
    return this.http.post<ApiResponse<Semester>>(`${COURSE_API}/semesters`, request)
      .pipe(map(res => res.data));
  }

  updateSemester(id: number, request: Partial<CreateSemesterRequest>): Observable<Semester> {
    return this.http.put<ApiResponse<Semester>>(`${COURSE_API}/semesters/${id}`, request)
      .pipe(map(res => res.data));
  }

  // ============ Subject APIs ============
  
  getSubjects(): Observable<Subject[]> {
    return this.http.get<ApiResponse<Subject[]>>(`${COURSE_API}/subjects`)
      .pipe(map(res => res.data));
  }

  getSubjectById(id: number): Observable<Subject> {
    return this.http.get<ApiResponse<Subject>>(`${COURSE_API}/subjects/${id}`)
      .pipe(map(res => res.data));
  }

  createSubject(request: CreateSubjectRequest): Observable<Subject> {
    return this.http.post<ApiResponse<Subject>>(`${COURSE_API}/subjects`, request)
      .pipe(map(res => res.data));
  }

  updateSubject(id: number, request: Partial<CreateSubjectRequest>): Observable<Subject> {
    return this.http.put<ApiResponse<Subject>>(`${COURSE_API}/subjects/${id}`, request)
      .pipe(map(res => res.data));
  }

  // ============ Course APIs ============
  
  getCourses(): Observable<Course[]> {
    return this.http.get<ApiResponse<Course[]>>(`${COURSE_API}/courses`)
      .pipe(map(res => res.data));
  }

  getCourseById(id: number): Observable<Course> {
    return this.http.get<ApiResponse<Course>>(`${COURSE_API}/courses/${id}`)
      .pipe(map(res => res.data));
  }

  getCoursesByInstructor(instructorId: number): Observable<Course[]> {
    return this.http.get<ApiResponse<Course[]>>(`${COURSE_API}/courses/instructor/${instructorId}`)
      .pipe(map(res => res.data));
  }

  getCoursesBySemester(semesterId: number): Observable<Course[]> {
    return this.getCourses().pipe(
      map(courses => courses.filter(c => c.semesterId === semesterId))
    );
  }

  createCourse(request: CreateCourseRequest): Observable<Course> {
    return this.http.post<ApiResponse<Course>>(`${COURSE_API}/courses`, request)
      .pipe(map(res => res.data));
  }

  updateCourse(id: number, request: Partial<CreateCourseRequest>): Observable<Course> {
    return this.http.put<ApiResponse<Course>>(`${COURSE_API}/courses/${id}`, request)
      .pipe(map(res => res.data));
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${COURSE_API}/courses/${id}`);
  }

  // ============ Section APIs ============

  getSectionsByCourse(courseId: number): Observable<Section[]> {
    return this.http.get<Section[]>(`${COURSE_API}/v1/courses/${courseId}/sections`);
  }

  getVisibleSections(courseId: number): Observable<Section[]> {
    return this.http.get<Section[]>(`${COURSE_API}/v1/courses/${courseId}/sections/visible`);
  }

  getSectionById(id: number): Observable<Section> {
    return this.http.get<Section>(`${COURSE_API}/v1/sections/${id}`);
  }

  getSectionWithModules(id: number): Observable<Section> {
    return this.http.get<Section>(`${COURSE_API}/v1/sections/${id}/with-modules`);
  }

  createSection(courseId: number, request: CreateSectionRequest): Observable<Section> {
    return this.http.post<Section>(`${COURSE_API}/v1/courses/${courseId}/sections`, request);
  }

  updateSection(id: number, request: Partial<CreateSectionRequest>): Observable<Section> {
    return this.http.put<Section>(`${COURSE_API}/v1/sections/${id}`, request);
  }

  deleteSection(id: number): Observable<void> {
    return this.http.delete<void>(`${COURSE_API}/v1/sections/${id}`);
  }

  toggleSectionVisibility(id: number): Observable<Section> {
    return this.http.patch<Section>(`${COURSE_API}/v1/sections/${id}/visibility`, {});
  }

  reorderSections(courseId: number, sectionIds: number[]): Observable<Section[]> {
    return this.http.post<Section[]>(`${COURSE_API}/v1/courses/${courseId}/sections/reorder`, sectionIds);
  }

  // ============ Module APIs ============

  getModulesBySection(sectionId: number): Observable<Module[]> {
    return this.http.get<Module[]>(`${COURSE_API}/v1/sections/${sectionId}/modules`);
  }

  getModuleById(moduleId: number): Observable<Module> {
    return this.http.get<Module>(`${COURSE_API}/v1/modules/${moduleId}`);
  }

  createModule(sectionId: number, request: CreateModuleRequest): Observable<Module> {
    return this.http.post<Module>(`${COURSE_API}/v1/sections/${sectionId}/modules`, request);
  }

  updateModule(moduleId: number, request: Partial<CreateModuleRequest>): Observable<Module> {
    return this.http.put<Module>(`${COURSE_API}/v1/modules/${moduleId}`, request);
  }

  deleteModule(moduleId: number): Observable<void> {
    return this.http.delete<void>(`${COURSE_API}/v1/modules/${moduleId}`);
  }

  toggleModuleVisibility(moduleId: number): Observable<Module> {
    return this.http.patch<Module>(`${COURSE_API}/v1/modules/${moduleId}/visibility`, {});
  }

  reorderModules(sectionId: number, moduleIds: number[]): Observable<Module[]> {
    return this.http.post<Module[]>(`${COURSE_API}/v1/sections/${sectionId}/modules/reorder`, moduleIds);
  }

  // ============ Copy Content APIs ============

  /**
   * Lấy danh sách các lớp có thể copy nội dung từ đó
   */
  getCopyableCourses(courseId: number, instructorId: number): Observable<CourseForCopy[]> {
    return this.http.get<ApiResponse<CourseForCopy[]>>(
      `${COURSE_API}/courses/${courseId}/copyable-courses?instructorId=${instructorId}`
    ).pipe(map(res => res.data));
  }

  /**
   * Copy sections và modules từ lớp nguồn sang lớp đích
   */
  copyContent(targetCourseId: number, request: CopyContentRequest): Observable<CopyContentResponse> {
    return this.http.post<ApiResponse<CopyContentResponse>>(
      `${COURSE_API}/courses/${targetCourseId}/copy-content`,
      request
    ).pipe(map(res => res.data));
  }

  // ============ Helper Methods ============

  getStatusLabel(status: CourseStatus): string {
    const labels: Record<CourseStatus, string> = {
      'OPEN': 'Đang mở đăng ký',
      'CLOSED': 'Đã đóng',
      'IN_PROGRESS': 'Đang diễn ra',
      'PLANNED': 'Đã lên kế hoạch'
    };
    return labels[status] || status;
  }

  getStatusVariant(status: CourseStatus): 'success' | 'secondary' | 'warning' | 'primary' {
    const variants: Record<CourseStatus, 'success' | 'secondary' | 'warning' | 'primary'> = {
      'OPEN': 'success',
      'CLOSED': 'secondary',
      'IN_PROGRESS': 'warning',
      'PLANNED': 'primary'
    };
    return variants[status] || 'secondary';
  }
}
