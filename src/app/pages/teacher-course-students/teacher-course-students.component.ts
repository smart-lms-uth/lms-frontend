import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentService, Enrollment, EnrollmentStatus } from '../../services/enrollment.service';
import { AuthService, RegisterRequest, ApiResponse } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { CardComponent, BadgeComponent } from '../../components/ui';
import { StudentActivityModalComponent } from '../../components/student-activity-modal/student-activity-modal.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface StudentSearchResult {
  id: number;
  code: string;
  fullName: string;
  email: string;
}

interface CreateStudentForm {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

@Component({
  selector: 'app-teacher-course-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    BadgeComponent,
    StudentActivityModalComponent
  ],
  templateUrl: './teacher-course-students.component.html',
  styleUrls: ['./teacher-course-students.component.scss']
})
export class TeacherCourseStudentsComponent implements OnInit {
  @Input() courseId!: number;

  // Tab state
  activeTab = signal<'list' | 'create' | 'all'>('list');

  // List tab state
  loading = signal(true);
  adding = signal(false);
  enrollments = signal<Enrollment[]>([]);
  filteredEnrollments = signal<Enrollment[]>([]);
  
  showAddModal = signal(false);
  newStudentId = '';
  searchQuery = '';
  
  addError = signal('');
  addSuccess = signal('');

  // Activity modal state
  showActivityModal = signal(false);
  selectedStudentId = signal<number>(0);
  selectedStudentName = signal<string>('');
  selectedStudentCode = signal<string>('');
  
  // Last access tracking
  studentLastAccess = signal<{ [studentId: number]: string }>({});

  // Create tab state
  creating = signal(false);
  createError = signal('');
  createSuccess = signal('');
  showPassword = signal(false);
  autoEnroll = true;
  
  createForm: CreateStudentForm = {
    username: '',
    email: '',
    password: '',
    fullName: '',
    phoneNumber: ''
  };

  createdStudents = signal<{username: string; email: string; fullName: string; id: number}[]>([]);

  // All students tab state
  allStudents = signal<any[]>([]);
  filteredAllStudents = signal<any[]>([]);
  loadingAllStudents = signal(false);
  allStudentsError = signal('');
  allStudentsSearchQuery = '';
  allStudentsFilter = signal<'all' | 'enrolled' | 'not-enrolled'>('all');
  enrollingStudentId = signal<number | null>(null);

  private readonly API_URL = environment.apiUrl;

  constructor(
    public enrollmentService: EnrollmentService,
    private activityService: ActivityService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    if (this.courseId) {
      this.loadEnrollments();
    }
  }

  // ============ Create Student Methods ============

  isCreateFormValid(): boolean {
    return !!(
      this.createForm.username?.trim() &&
      this.createForm.username.length >= 3 &&
      this.createForm.email?.trim() &&
      this.createForm.email.includes('@') &&
      this.createForm.password?.trim() &&
      this.createForm.password.length >= 6
    );
  }

  async createStudent() {
    if (!this.isCreateFormValid() || this.creating()) return;

    this.creating.set(true);
    this.createError.set('');
    this.createSuccess.set('');

    try {
      const registerRequest: RegisterRequest = {
        username: this.createForm.username.trim(),
        email: this.createForm.email.trim(),
        password: this.createForm.password,
        fullName: this.createForm.fullName?.trim() || undefined,
        phoneNumber: this.createForm.phoneNumber?.trim() || undefined
      };

      const response = await this.http.post<ApiResponse<any>>(
        `${this.API_URL}/auth/register`,
        registerRequest
      ).toPromise();

      if (response?.success && response.data) {
        const newUser = response.data;
        
        this.createdStudents.update(list => [...list, {
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName || this.createForm.fullName,
          id: newUser.id
        }]);

        if (this.autoEnroll && newUser.id) {
          try {
            await this.enrollmentService.teacherEnrollStudent(this.courseId, newUser.id).toPromise();
            this.createSuccess.set(`Đã tạo tài khoản "${newUser.username}" và ghi danh vào lớp thành công!`);
            await this.loadEnrollments();
          } catch (enrollError: any) {
            this.createSuccess.set(`Đã tạo tài khoản "${newUser.username}" thành công! Nhưng chưa thể ghi danh: ${enrollError?.error?.message || 'Lỗi không xác định'}`);
          }
        } else {
          this.createSuccess.set(`Đã tạo tài khoản "${newUser.username}" thành công!`);
        }

        this.resetCreateForm();
      }
    } catch (error: any) {
      console.error('Error creating student:', error);
      this.createError.set(error?.error?.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      this.creating.set(false);
    }
  }

  resetCreateForm() {
    this.createForm = {
      username: '',
      email: '',
      password: '',
      fullName: '',
      phoneNumber: ''
    };
    this.createError.set('');
  }

  // ============ List Tab Methods ============

  viewStudentActivity(enrollment: Enrollment): void {
    this.selectedStudentId.set(enrollment.studentId);
    this.selectedStudentName.set(enrollment.studentName);
    this.selectedStudentCode.set(enrollment.studentCode);
    this.showActivityModal.set(true);
  }

  closeActivityModal(): void {
    this.showActivityModal.set(false);
    this.selectedStudentId.set(0);
    this.selectedStudentName.set('');
    this.selectedStudentCode.set('');
  }

  async loadEnrollments() {
    this.loading.set(true);
    try {
      const enrollments = await this.enrollmentService.getEnrollmentsByCourse(this.courseId).toPromise();
      this.enrollments.set(enrollments || []);
      this.filterStudents();
      this.loadStudentsLastAccess();
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadStudentsLastAccess() {
    try {
      const response = await this.activityService.getCourseStudentsLastAccess(this.courseId).toPromise();
      if (response?.success && response.data) {
        this.studentLastAccess.set(response.data);
      }
    } catch (error) {
      console.error('Error loading last access data:', error);
    }
  }

  formatLastAccess(timestamp: string | undefined): string {
    if (!timestamp) return 'Chưa truy cập';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  filterStudents() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredEnrollments.set(this.enrollments());
    } else {
      this.filteredEnrollments.set(
        this.enrollments().filter(e =>
          e.studentName.toLowerCase().includes(query) ||
          e.studentCode.toLowerCase().includes(query)
        )
      );
    }
  }

  getCountByStatus(status: EnrollmentStatus): number {
    return this.enrollments().filter(e => e.status === status).length;
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.newStudentId = '';
    this.addError.set('');
    this.addSuccess.set('');
  }

  async addStudent() {
    if (!this.newStudentId || this.adding()) return;

    const studentId = parseInt(this.newStudentId);
    if (isNaN(studentId)) {
      this.addError.set('Mã sinh viên không hợp lệ');
      return;
    }

    if (this.enrollments().some(e => e.studentId === studentId && e.status !== 'CANCELLED')) {
      this.addError.set('Sinh viên đã có trong danh sách lớp');
      return;
    }

    this.adding.set(true);
    this.addError.set('');
    this.addSuccess.set('');

    try {
      const enrollment = await this.enrollmentService.teacherEnrollStudent(this.courseId, studentId).toPromise();
      
      if (enrollment) {
        this.enrollments.update(list => [...list, enrollment]);
        this.filterStudents();
        this.addSuccess.set(`Ghi danh thành công sinh viên ${enrollment.studentName}`);
        this.newStudentId = '';
        
        setTimeout(() => {
          this.closeAddModal();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error adding student:', error);
      this.addError.set(error?.error?.message || 'Có lỗi xảy ra khi ghi danh');
    } finally {
      this.adding.set(false);
    }
  }

  async approveEnrollment(enrollment: Enrollment) {
    try {
      await this.enrollmentService.updateEnrollmentStatus(enrollment.id, 'ACTIVE').toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'ACTIVE' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error approving enrollment:', error);
    }
  }

  async completeEnrollment(enrollment: Enrollment) {
    try {
      await this.enrollmentService.updateEnrollmentStatus(enrollment.id, 'PASSED').toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'PASSED' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error completing enrollment:', error);
    }
  }

  async dropEnrollment(enrollment: Enrollment) {
    if (!confirm(`Bạn có chắc muốn xóa sinh viên ${enrollment.studentName} khỏi lớp?`)) {
      return;
    }

    try {
      await this.enrollmentService.cancelEnrollment(enrollment.id).toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'CANCELLED' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error dropping enrollment:', error);
    }
  }

  async restoreEnrollment(enrollment: Enrollment) {
    try {
      await this.enrollmentService.updateEnrollmentStatus(enrollment.id, 'ACTIVE').toPromise();
      this.enrollments.update(list =>
        list.map(e => e.id === enrollment.id ? { ...e, status: 'ACTIVE' as EnrollmentStatus } : e)
      );
      this.filterStudents();
    } catch (error) {
      console.error('Error restoring enrollment:', error);
    }
  }

  // ============ All Students Tab Methods ============

  switchToAllTab() {
    this.activeTab.set('all');
    if (this.allStudents().length === 0) {
      this.loadAllStudents();
    }
  }

  async loadAllStudents() {
    this.loadingAllStudents.set(true);
    this.allStudentsError.set('');

    try {
      const response = await this.http.get<ApiResponse<any[]>>(
        `${this.API_URL}/internal/users/students`
      ).toPromise();

      if (response?.success && response.data) {
        this.allStudents.set(response.data);
        this.filterAllStudents();
      }
    } catch (error: any) {
      console.error('Error loading all students:', error);
      this.allStudentsError.set(error?.error?.message || 'Không thể tải danh sách sinh viên');
    } finally {
      this.loadingAllStudents.set(false);
    }
  }

  filterAllStudents() {
    let filtered = [...this.allStudents()];

    if (this.allStudentsSearchQuery) {
      const query = this.allStudentsSearchQuery.toLowerCase();
      filtered = filtered.filter(student =>
        student.username?.toLowerCase().includes(query) ||
        student.fullName?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      );
    }

    const filter = this.allStudentsFilter();
    if (filter === 'enrolled') {
      filtered = filtered.filter(student => this.isStudentEnrolled(student.id));
    } else if (filter === 'not-enrolled') {
      filtered = filtered.filter(student => !this.isStudentEnrolled(student.id));
    }

    this.filteredAllStudents.set(filtered);
  }

  setAllStudentsFilter(filter: 'all' | 'enrolled' | 'not-enrolled') {
    this.allStudentsFilter.set(filter);
    this.filterAllStudents();
  }

  isStudentEnrolled(studentId: number): boolean {
    return this.enrollments().some(
      e => e.studentId === studentId && e.status !== 'CANCELLED'
    );
  }

  getEnrolledCount(): number {
    return this.allStudents().filter(s => this.isStudentEnrolled(s.id)).length;
  }

  getNotEnrolledCount(): number {
    return this.allStudents().filter(s => !this.isStudentEnrolled(s.id)).length;
  }

  async enrollStudentFromList(student: any) {
    this.enrollingStudentId.set(student.id);

    try {
      const enrollment = await this.enrollmentService.teacherEnrollStudent(this.courseId, student.id).toPromise();
      
      if (enrollment) {
        this.enrollments.update(list => [...list, enrollment]);
        this.filterStudents();
        this.filterAllStudents();
      }
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      alert(error?.error?.message || 'Có lỗi xảy ra khi ghi danh');
    } finally {
      this.enrollingStudentId.set(null);
    }
  }
}
