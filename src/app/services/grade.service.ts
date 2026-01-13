import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './course.service';

// Grade DTOs
export interface GradeModuleInfo {
  id: number;
  title: string;
  sectionTitle: string;
  maxScore: number;
  scoreWeight?: number;
  gradeType?: 'PROCESS' | 'FINAL';
  isShowInGradeTable?: boolean;
}

export interface ModuleGradeConfigRequest {
  moduleId: number;
  scoreWeight?: number;
  gradeType?: 'PROCESS' | 'FINAL';
  isShowInGradeTable?: boolean;
}

export interface BulkModuleConfigRequest {
  modules: ModuleGradeConfigRequest[];
}

export interface StudentGradeResponse {
  studentId: number;
  enrollmentId: number;
  studentCode: string;
  fullName: string;
  email: string;
  grades: { [moduleId: string]: number | null };
  averageScore: number | null;
  attendanceScore?: number | null;
  bonusScore?: number | null;
  letterGrade?: string;
  isBanned?: boolean;
}

export interface CourseGradesResponse {
  courseId: number;
  courseCode: string;
  courseName: string;
  attendanceWeight?: number;  // % điểm CC trong QT
  bonusWeight?: number;       // % điểm cộng trong QT
  modules: GradeModuleInfo[];
  students: StudentGradeResponse[];
}

export interface GradeRequest {
  enrollmentId: number;
  moduleId: number;
  score: number;
  feedback?: string;
}

export interface StudentScore {
  studentId: number;
  score: number;
  feedback?: string;
}

export interface BulkGradeRequest {
  moduleId: number;
  scores: StudentScore[];
}

export interface GradeResponse {
  id: number;
  enrollmentId: number;
  moduleId: number;
  moduleTitle: string;
  studentId: number;
  score: number;
  maxScore: number;
  feedback: string;
  gradedBy: number;
  gradedAt: string;
  submittedAt: string;
}

// ==================== COURSE GRADE DTOs ====================

/**
 * Thông tin điểm 1 sinh viên để cập nhật khi lưu bảng điểm
 */
export interface StudentGradeUpdate {
  studentId: number;
  enrollmentId: number;
  processModuleIds: number[];   // Modules được tick QT
  finalModuleIds: number[];     // Modules được tick KT
  attendanceScore?: number;     // Điểm CC (0-10)
  bonusScore?: number;          // Điểm cộng (0-10)
  isBanned?: boolean;           // Đánh dấu cấm thi
}

/**
 * Request lưu toàn bộ bảng điểm
 */
export interface SaveGradeTableRequest {
  courseId: number;
  students: StudentGradeUpdate[];
  attendanceWeight?: number;    // % điểm CC trong QT
  bonusWeight?: number;         // % điểm cộng trong QT
}

/**
 * Response sau khi tính điểm
 */
export interface CalculatedGradeResponse {
  studentId: number;
  enrollmentId: number;
  processScore: number;         // Điểm QT từ bài tập
  attendanceScore: number;      // Điểm CC
  bonusScore: number;           // Điểm cộng
  processScoreFinal: number;    // Điểm QT tổng
  finalScore: number;           // Điểm KT
  totalScore: number;           // Điểm học phần
  letterGrade: string;          // Điểm chữ
  gpaScore: number;             // Điểm hệ 4
  isBanned?: boolean;           // Đánh dấu cấm thi
}

/**
 * Request cập nhật trọng số cấp lớp
 */
export interface UpdateCourseWeightsRequest {
  processWeight?: number;       // % điểm QT (40)
  finalWeight?: number;         // % điểm KT (60)
  attendanceWeight?: number;    // % điểm CC trong QT
  bonusWeight?: number;         // % điểm cộng trong QT
}

@Injectable({
  providedIn: 'root'
})
export class GradeService {
  // Use courseApiUrl since grades API is at /api/courses/...
  private apiUrl = environment.courseApiUrl;
  // Use v1 API for module endpoints
  private apiUrlV1 = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Lấy bảng điểm của một khóa học
   */
  getCourseGrades(courseId: number): Observable<CourseGradesResponse> {
    return this.http.get<ApiResponse<CourseGradesResponse>>(
      `${this.apiUrl}/courses/${courseId}/grades`
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Cập nhật điểm cho một sinh viên
   */
  updateGrade(courseId: number, request: GradeRequest): Observable<GradeResponse> {
    return this.http.put<ApiResponse<GradeResponse>>(
      `${this.apiUrl}/courses/${courseId}/grades`,
      request
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Cập nhật điểm hàng loạt
   */
  bulkUpdateGrades(courseId: number, request: BulkGradeRequest): Observable<GradeResponse[]> {
    return this.http.put<ApiResponse<GradeResponse[]>>(
      `${this.apiUrl}/courses/${courseId}/grades/bulk`,
      request
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Cập nhật cấu hình module (scoreWeight, gradeType, isShowInGradeTable)
   */
  updateModuleGradeConfig(courseId: number, request: BulkModuleConfigRequest): Observable<any> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrlV1}/courses/${courseId}/modules/grade-config`,
      request
    ).pipe(
      map(response => response.data)
    );
  }

  // ==================== COURSE GRADE APIs (Điểm học phần) ====================

  /**
   * Lưu toàn bộ bảng điểm - Tự động tính điểm học phần
   * Gọi khi user ấn nút "Lưu" trên bảng điểm
   */
  saveGradeTable(courseId: number, request: SaveGradeTableRequest): Observable<CalculatedGradeResponse[]> {
    return this.http.post<ApiResponse<CalculatedGradeResponse[]>>(
      `${this.apiUrl}/grades/course/${courseId}/save`,
      request
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Tính lại điểm cho tất cả sinh viên trong lớp
   */
  recalculateAllGrades(courseId: number): Observable<CalculatedGradeResponse[]> {
    return this.http.post<ApiResponse<CalculatedGradeResponse[]>>(
      `${this.apiUrl}/grades/course/${courseId}/recalculate`,
      {}
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Cập nhật cấu hình trọng số cho lớp
   */
  updateCourseWeights(courseId: number, request: UpdateCourseWeightsRequest): Observable<void> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/grades/course/${courseId}/weights`,
      request
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Lấy danh sách CourseGrade của lớp
   */
  getCourseGradesByCourse(courseId: number): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/grades/course/${courseId}`
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Xuất bảng điểm ra file Excel
   */
  exportGradesToExcel(courseId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/courses/${courseId}/grades/export`,
      { responseType: 'blob' }
    );
  }
}
