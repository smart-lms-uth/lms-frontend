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

// ============ System Monitoring Interfaces ============

export interface HealthComponent {
  type: string;
  status: 'UP' | 'DOWN';
}

export interface SystemHealth {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  components: {
    database: HealthComponent;
    cache: HealthComponent;
    storage: HealthComponent;
  };
  timestamp?: string;
}

export interface SystemMetrics {
  memory: {
    heapUsed: string;
    heapMax: string;
    heapUsedPercent: number;
    nonHeapUsed: string;
  };
  cpu: {
    availableProcessors: number;
    systemLoadAverage: number;
    arch: string;
    name: string;
  };
  disk: {
    totalSpace: string;
    freeSpace: string;
    usableSpace: string;
    usedPercent: number;
  };
  uptime: string;
  uptimeMs: number;
  threadCount: number;
}

export interface ServiceStatus {
  name: string;
  type: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  port: string;
  lastCheck: string;
}

export interface DatabaseStats {
  databaseSize: string;
  connections: {
    active_connections: number;
    commits: number;
    rollbacks: number;
    blocks_read: number;
    blocks_hit: number;
  };
  topTables: TableInfo[];
}

export interface TableInfo {
  table_name: string;
  total_size: string;
  data_size: string;
  row_count: number;
}

export interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  userId: number;
  userName: string;
  timestamp: string;
  details: string;
}

// ============ Backup Interfaces ============

export interface BackupInfo {
  id: string;
  type: 'FULL' | 'POSTGRES' | 'REDIS' | 'MONGODB';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  size: string;
  createdAt: string;
  filePath: string;
}

export interface BackupSchedule {
  enabled: boolean;
  cronExpression: string;
  nextRun: string;
  lastRun: string;
  retentionDays: number;
  types: string[];
}

export interface CreateBackupRequest {
  type: 'all' | 'postgres' | 'redis' | 'mongodb';
}

export interface UpdateScheduleRequest {
  enabled?: boolean;
  cronExpression?: string;
  retentionDays?: number;
  types?: string[];
}

// ============ Stats Interfaces ============

export interface OverviewStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalQuizSubmissions: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  coursesCreatedThisMonth: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: { [role: string]: number };
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  userGrowthTrend: TrendData[];
}

export interface CourseStats {
  totalCourses: number;
  activeCourses: number;
  draftCourses: number;
  coursesBySubject: { [subject: string]: number };
  averageEnrollmentsPerCourse: number;
  topCoursesByEnrollment: CourseEnrollmentInfo[];
  courseCreationTrend: TrendData[];
}

export interface EngagementStats {
  totalEnrollments: number;
  totalQuizAttempts: number;
  totalAssignmentSubmissions: number;
  averageQuizScore: number;
  completionRate: number;
  dailyActiveUsers: TrendData[];
  engagementByDayOfWeek: { [day: string]: number };
}

export interface TrendData {
  date: string;
  value: number;
}

export interface CourseEnrollmentInfo {
  courseId: number;
  courseName: string;
  enrollmentCount: number;
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

  // ============ System Monitoring ============

  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<ApiResponse<SystemHealth>>(`${API_URL}/admin/system/health`)
      .pipe(map(res => res.data));
  }

  getSystemMetrics(): Observable<SystemMetrics> {
    return this.http.get<ApiResponse<SystemMetrics>>(`${API_URL}/admin/system/metrics`)
      .pipe(map(res => res.data));
  }

  getServicesStatus(): Observable<ServiceStatus[]> {
    return this.http.get<ApiResponse<ServiceStatus[]>>(`${API_URL}/admin/system/services`)
      .pipe(map(res => res.data || []));
  }

  getDatabaseStats(): Observable<DatabaseStats> {
    return this.http.get<ApiResponse<DatabaseStats>>(`${API_URL}/admin/system/database`)
      .pipe(map(res => res.data));
  }

  getActivityLogs(limit: number = 50): Observable<ActivityLog[]> {
    return this.http.get<ApiResponse<ActivityLog[]>>(`${API_URL}/admin/system/activity-logs`, {
      params: { limit: limit.toString() }
    }).pipe(map(res => res.data || []));
  }

  // ============ Backup Management ============

  getBackups(): Observable<BackupInfo[]> {
    return this.http.get<ApiResponse<BackupInfo[]>>(`${API_URL}/admin/system/backups`)
      .pipe(map(res => res.data || []));
  }

  createBackup(request: CreateBackupRequest): Observable<BackupInfo> {
    return this.http.post<ApiResponse<BackupInfo>>(`${API_URL}/admin/system/backups`, request)
      .pipe(map(res => res.data));
  }

  restoreBackup(backupId: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${API_URL}/admin/system/backups/${backupId}/restore`, {})
      .pipe(map(res => res.data));
  }

  deleteBackup(backupId: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/admin/system/backups/${backupId}`);
  }

  getBackupSchedule(): Observable<BackupSchedule> {
    return this.http.get<ApiResponse<BackupSchedule>>(`${API_URL}/admin/system/backups/schedule`)
      .pipe(map(res => res.data));
  }

  updateBackupSchedule(request: UpdateScheduleRequest): Observable<BackupSchedule> {
    return this.http.put<ApiResponse<BackupSchedule>>(`${API_URL}/admin/system/backups/schedule`, request)
      .pipe(map(res => res.data));
  }

  // ============ Advanced Statistics ============

  getOverviewStats(): Observable<OverviewStats> {
    return this.http.get<ApiResponse<OverviewStats>>(`${API_URL}/admin/system/stats/overview`)
      .pipe(map(res => res.data));
  }

  getUserStats(): Observable<UserStats> {
    return this.http.get<ApiResponse<UserStats>>(`${API_URL}/admin/system/stats/users`)
      .pipe(map(res => res.data));
  }

  getCourseStats(): Observable<CourseStats> {
    return this.http.get<ApiResponse<CourseStats>>(`${API_URL}/admin/system/stats/courses`)
      .pipe(map(res => res.data));
  }

  getEngagementStats(): Observable<EngagementStats> {
    return this.http.get<ApiResponse<EngagementStats>>(`${API_URL}/admin/system/stats/engagement`)
      .pipe(map(res => res.data));
  }
}
