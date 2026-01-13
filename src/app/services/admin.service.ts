import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  ApiResponse, 
  Semester, 
  CreateSemesterRequest, 
  Subject, 
  CreateSubjectRequest,
  Course,
  CreateCourseRequest
} from './course.service';

// Course base URL - uses courseApiUrl from environment
const API_URL = environment.courseApiUrl;

export interface DashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  totalSubjects: number;
  totalSemesters: number;
  activeSemesters: number;
  openCourses: number;
}

export interface UserSummary {
  id: number;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private http: HttpClient) {}

  // ============ Semester Management ============
  
  getSemesters(): Observable<Semester[]> {
    return this.http.get<ApiResponse<Semester[]>>(`${API_URL}/semesters`)
      .pipe(map(res => res.data || []));
  }

  getSemesterById(id: number): Observable<Semester> {
    return this.http.get<ApiResponse<Semester>>(`${API_URL}/semesters/${id}`)
      .pipe(map(res => res.data));
  }

  getCurrentSemester(): Observable<Semester> {
    return this.http.get<ApiResponse<Semester>>(`${API_URL}/semesters/current`)
      .pipe(map(res => res.data));
  }

  createSemester(request: CreateSemesterRequest): Observable<Semester> {
    return this.http.post<ApiResponse<Semester>>(`${API_URL}/semesters`, request)
      .pipe(map(res => res.data));
  }

  updateSemester(id: number, request: Partial<CreateSemesterRequest>): Observable<Semester> {
    return this.http.put<ApiResponse<Semester>>(`${API_URL}/semesters/${id}`, request)
      .pipe(map(res => res.data));
  }

  deleteSemester(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/semesters/${id}`);
  }

  setCurrentSemester(id: number): Observable<Semester> {
    return this.http.put<ApiResponse<Semester>>(`${API_URL}/semesters/${id}/set-current`, {})
      .pipe(map(res => res.data));
  }

  // ============ Subject Management ============
  
  getSubjects(): Observable<Subject[]> {
    return this.http.get<ApiResponse<Subject[]>>(`${API_URL}/subjects`)
      .pipe(map(res => res.data || []));
  }

  getActiveSubjects(): Observable<Subject[]> {
    return this.http.get<ApiResponse<Subject[]>>(`${API_URL}/subjects/active`)
      .pipe(map(res => res.data || []));
  }

  getSubjectById(id: number): Observable<Subject> {
    return this.http.get<ApiResponse<Subject>>(`${API_URL}/subjects/${id}`)
      .pipe(map(res => res.data));
  }

  createSubject(request: CreateSubjectRequest): Observable<Subject> {
    return this.http.post<ApiResponse<Subject>>(`${API_URL}/subjects`, request)
      .pipe(map(res => res.data));
  }

  updateSubject(id: number, request: Partial<CreateSubjectRequest>): Observable<Subject> {
    return this.http.put<ApiResponse<Subject>>(`${API_URL}/subjects/${id}`, request)
      .pipe(map(res => res.data));
  }

  deleteSubject(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/subjects/${id}`);
  }

  toggleSubjectActive(id: number): Observable<Subject> {
    return this.http.patch<ApiResponse<Subject>>(`${API_URL}/subjects/${id}/toggle-active`, {})
      .pipe(map(res => res.data));
  }

  // ============ Course Management ============
  
  getAllCourses(): Observable<Course[]> {
    return this.http.get<ApiResponse<Course[]>>(`${API_URL}/courses`)
      .pipe(map(res => res.data || []));
  }

  getCoursesBySemester(semesterId: number): Observable<Course[]> {
    return this.http.get<ApiResponse<Course[]>>(`${API_URL}/courses/semester/${semesterId}`)
      .pipe(map(res => res.data || []));
  }

  getCoursesBySubject(subjectId: number): Observable<Course[]> {
    return this.http.get<ApiResponse<Course[]>>(`${API_URL}/courses/subject/${subjectId}`)
      .pipe(map(res => res.data || []));
  }

  createCourse(request: CreateCourseRequest): Observable<Course> {
    return this.http.post<ApiResponse<Course>>(`${API_URL}/courses`, request)
      .pipe(map(res => res.data));
  }

  updateCourse(id: number, request: Partial<CreateCourseRequest>): Observable<Course> {
    return this.http.put<ApiResponse<Course>>(`${API_URL}/courses/${id}`, request)
      .pipe(map(res => res.data));
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/courses/${id}`);
  }

  // ============ Dashboard Stats ============
  
  getDashboardStats(): Observable<DashboardStats> {
    // Aggregate stats from multiple endpoints
    return this.http.get<ApiResponse<DashboardStats>>(`${API_URL}/admin/stats`)
      .pipe(map(res => res.data));
  }

  // ============ User Management (via user-service) ============
  
  getUsers(): Observable<UserSummary[]> {
    return this.http.get<ApiResponse<UserSummary[]>>(`${environment.apiUrl}/admin/users`)
      .pipe(map(res => res.data || []));
  }

  getUsersByRole(role: string): Observable<UserSummary[]> {
    return this.http.get<ApiResponse<UserSummary[]>>(`${environment.apiUrl}/admin/users/role/${role}`)
      .pipe(map(res => res.data || []));
  }
}
