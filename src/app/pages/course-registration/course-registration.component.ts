import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CourseService, Course, Subject, Semester } from '../../services/course.service';
import { EnrollmentService, Enrollment } from '../../services/enrollment.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';

@Component({
  selector: 'app-course-registration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    BreadcrumbComponent
  ],
  templateUrl: './course-registration.component.html',
  styleUrls: ['./course-registration.component.scss']
})
export class CourseRegistrationComponent implements OnInit {
  loading = signal(true);
  enrolling = signal(false);
  
  // Data
  semesters = signal<Semester[]>([]);
  subjects = signal<Subject[]>([]);
  courses = signal<Course[]>([]);
  myEnrollments = signal<Enrollment[]>([]);
  
  // Selected values
  selectedSemesterId = signal<number | null>(null);
  selectedSubjectId = signal<number | null>(null);
  
  // UI state
  currentUser: User | null = null;
  showSuccessMessage = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Computed: filtered courses by selected semester
  filteredCourses = computed(() => {
    const semId = this.selectedSemesterId();
    const subId = this.selectedSubjectId();
    
    if (!semId || !subId) return [];
    
    return this.courses().filter(c => 
      c.semesterId === semId && c.subjectId === subId
    );
  });

  // Computed: subjects with courses in selected semester
  availableSubjects = computed(() => {
    const semId = this.selectedSemesterId();
    if (!semId) return [];
    
    const coursesInSemester = this.courses().filter(c => c.semesterId === semId);
    const subjectIds = [...new Set(coursesInSemester.map(c => c.subjectId))];
    
    return this.subjects().filter(s => subjectIds.includes(s.id));
  });

  // Computed: check if already enrolled in a course
  isEnrolled(courseId: number): boolean {
    return this.myEnrollments().some(e => 
      e.courseId === courseId && (e.status === 'ENROLLED' || e.status === 'PENDING')
    );
  }

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private enrollmentService: EnrollmentService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadData();
      }
    });
  }

  async loadData() {
    this.loading.set(true);
    try {
      // Load semesters, subjects, courses in parallel
      const [semesters, subjects, courses] = await Promise.all([
        this.courseService.getSemesters().toPromise(),
        this.courseService.getSubjects().toPromise(),
        this.courseService.getCourses().toPromise()
      ]);

      this.semesters.set(semesters || []);
      this.subjects.set((subjects || []).filter(s => s.active));
      // Only show OPEN courses
      this.courses.set((courses || []).filter(c => c.status === 'OPEN'));

      // Set current semester as default
      const currentSem = (semesters || []).find(s => s.isCurrent);
      if (currentSem) {
        this.selectedSemesterId.set(currentSem.id);
      }

      // Load my enrollments
      if (this.currentUser) {
        const enrollments = await this.enrollmentService.getEnrollmentsByStudent(this.currentUser.id).toPromise();
        this.myEnrollments.set(enrollments || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  selectSemester(semesterId: number) {
    this.selectedSemesterId.set(semesterId);
    this.selectedSubjectId.set(null); // Reset subject selection
  }

  selectSubject(subjectId: number) {
    this.selectedSubjectId.set(subjectId);
  }

  backToSubjects() {
    this.selectedSubjectId.set(null);
  }

  async enrollCourse(course: Course) {
    if (!this.currentUser || this.enrolling()) return;

    // Check if already enrolled
    if (this.isEnrolled(course.id)) {
      this.errorMessage.set('Bạn đã đăng ký lớp học phần này rồi!');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    // Check if course is full
    if (course.currentEnrollment >= course.maxStudents) {
      this.errorMessage.set('Lớp học phần đã đầy!');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    this.enrolling.set(true);
    this.errorMessage.set('');

    try {
      const enrollment = await this.enrollmentService.enrollStudent(course.id, this.currentUser.id).toPromise();
      
      if (enrollment) {
        // Add to my enrollments
        this.myEnrollments.update(list => [...list, enrollment]);
        
        // Update course enrollment count
        this.courses.update(list => 
          list.map(c => c.id === course.id 
            ? { ...c, currentEnrollment: c.currentEnrollment + 1 } 
            : c
          )
        );

        this.successMessage.set(`Đăng ký thành công lớp ${course.courseCode}!`);
        this.showSuccessMessage.set(true);
        setTimeout(() => {
          this.showSuccessMessage.set(false);
          this.successMessage.set('');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error enrolling:', error);
      this.errorMessage.set(error?.error?.message || 'Có lỗi xảy ra khi đăng ký!');
      setTimeout(() => this.errorMessage.set(''), 3000);
    } finally {
      this.enrolling.set(false);
    }
  }

  async cancelEnrollment(courseId: number) {
    const enrollment = this.myEnrollments().find(e => e.courseId === courseId);
    if (!enrollment) return;

    try {
      await this.enrollmentService.cancelEnrollment(enrollment.id).toPromise();
      
      // Remove from my enrollments
      this.myEnrollments.update(list => list.filter(e => e.id !== enrollment.id));
      
      // Update course enrollment count
      this.courses.update(list => 
        list.map(c => c.id === courseId 
          ? { ...c, currentEnrollment: Math.max(0, c.currentEnrollment - 1) } 
          : c
        )
      );

      this.successMessage.set('Đã hủy đăng ký!');
      this.showSuccessMessage.set(true);
      setTimeout(() => {
        this.showSuccessMessage.set(false);
        this.successMessage.set('');
      }, 3000);
    } catch (error: any) {
      console.error('Error canceling:', error);
      this.errorMessage.set(error?.error?.message || 'Có lỗi khi hủy đăng ký!');
      setTimeout(() => this.errorMessage.set(''), 3000);
    }
  }

  getEnrollmentStatus(courseId: number): string {
    const enrollment = this.myEnrollments().find(e => e.courseId === courseId);
    return enrollment ? enrollment.status : '';
  }

  getEnrollmentCount(): number {
    return this.myEnrollments().filter(e => e.status === 'ENROLLED' || e.status === 'PENDING').length;
  }

  getTotalCredits(): number {
    const enrolledCourseIds = this.myEnrollments()
      .filter(e => e.status === 'ENROLLED' || e.status === 'PENDING')
      .map(e => e.courseId);
    
    return this.courses()
      .filter(c => enrolledCourseIds.includes(c.id))
      .reduce((sum, c) => sum + c.credits, 0);
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Trang chủ', link: '/dashboard' },
      { label: 'Đăng ký môn học' }
    ];
    return items;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
