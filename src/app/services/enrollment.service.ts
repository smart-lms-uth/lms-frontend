import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './course.service';

export type EnrollmentStatus = 'ENROLLED' | 'COMPLETED' | 'DROPPED' | 'PENDING';

export interface Enrollment {
  id: number;
  courseId: number;
  courseCode: string;
  subjectName: string;
  instructorName: string;
  room: string;
  studentId: number;
  studentName: string;
  studentCode: string;
  status: EnrollmentStatus;
  midtermScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentWithProgress extends Enrollment {
  // Thêm thông tin tiến độ
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  // Thêm thông tin học kỳ
  semesterCode?: string;
  semesterName?: string;
  credits?: number;
}

// Course base URL (no /v1 prefix)
const COURSE_API = environment.apiUrl.replace('/v1', '');

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {

  constructor(private http: HttpClient) {}

  /**
   * Lấy tất cả enrollments của sinh viên
   */
  getEnrollmentsByStudent(studentId: number): Observable<Enrollment[]> {
    return this.http.get<ApiResponse<Enrollment[]>>(`${COURSE_API}/enrollments/student/${studentId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Lấy enrollments đang active của sinh viên
   */
  getActiveEnrollmentsByStudent(studentId: number): Observable<Enrollment[]> {
    return this.http.get<ApiResponse<Enrollment[]>>(`${COURSE_API}/enrollments/student/${studentId}/active`)
      .pipe(map(res => res.data));
  }

  /**
   * Lấy enrollments của sinh viên trong học kỳ
   */
  getEnrollmentsByStudentAndSemester(studentId: number, semesterId: number): Observable<Enrollment[]> {
    return this.http.get<ApiResponse<Enrollment[]>>(`${COURSE_API}/enrollments/student/${studentId}/semester/${semesterId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Lấy danh sách sinh viên trong lớp
   */
  getEnrollmentsByCourse(courseId: number): Observable<Enrollment[]> {
    return this.http.get<ApiResponse<Enrollment[]>>(`${COURSE_API}/enrollments/course/${courseId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Đăng ký sinh viên vào lớp
   */
  enrollStudent(courseId: number, studentId: number): Observable<Enrollment> {
    return this.http.post<ApiResponse<Enrollment>>(`${COURSE_API}/enrollments/enroll?courseId=${courseId}&studentId=${studentId}`, {})
      .pipe(map(res => res.data));
  }

  /**
   * Hủy đăng ký
   */
  cancelEnrollment(enrollmentId: number): Observable<Enrollment> {
    return this.http.post<ApiResponse<Enrollment>>(`${COURSE_API}/enrollments/${enrollmentId}/cancel`, {})
      .pipe(map(res => res.data));
  }

  /**
   * Cập nhật trạng thái
   */
  updateEnrollmentStatus(enrollmentId: number, status: EnrollmentStatus): Observable<Enrollment> {
    return this.http.patch<ApiResponse<Enrollment>>(`${COURSE_API}/enrollments/${enrollmentId}/status?status=${status}`, {})
      .pipe(map(res => res.data));
  }

  /**
   * Đếm số sinh viên đang học trong lớp
   */
  countActiveEnrollments(courseId: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${COURSE_API}/enrollments/course/${courseId}/count`)
      .pipe(map(res => res.data));
  }

  // ============ Helper Methods ============

  getStatusLabel(status: EnrollmentStatus): string {
    const labels: Record<EnrollmentStatus, string> = {
      'ENROLLED': 'Đang học',
      'COMPLETED': 'Hoàn thành',
      'DROPPED': 'Đã hủy',
      'PENDING': 'Chờ duyệt'
    };
    return labels[status] || status;
  }

  getStatusVariant(status: EnrollmentStatus): 'success' | 'secondary' | 'warning' | 'danger' {
    const variants: Record<EnrollmentStatus, 'success' | 'secondary' | 'warning' | 'danger'> = {
      'ENROLLED': 'success',
      'COMPLETED': 'secondary',
      'DROPPED': 'danger',
      'PENDING': 'warning'
    };
    return variants[status] || 'secondary';
  }
}
