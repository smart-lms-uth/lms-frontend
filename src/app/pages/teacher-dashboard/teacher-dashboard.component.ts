import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CourseService, Course, Semester, Subject } from '../../services/course.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    BreadcrumbComponent
  ],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  loading = signal(true);
  currentUser = signal<User | null>(null);
  myCourses = signal<Course[]>([]);
  semesters = signal<Semester[]>([]);
  subjects = signal<Subject[]>([]);

  displayName = computed(() => {
    const user = this.currentUser();
    if (user?.fullName) return user.fullName;
    return user?.username || 'Giảng viên';
  });

  currentSemester = computed(() => {
    return this.semesters().find(s => s.isCurrent) || null;
  });

  currentSemesterName = computed(() => {
    const semester = this.currentSemester();
    return semester ? semester.displayName : 'học kỳ hiện tại';
  });

  totalStudents = computed(() => {
    return this.myCourses().reduce((sum, c) => sum + c.currentEnrollment, 0);
  });

  constructor(
    private authService: AuthService,
    public courseService: CourseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    
    try {
      const user = this.authService.getCurrentUserSync();
      this.currentUser.set(user);

      const [semesters, subjects, courses] = await Promise.all([
        this.courseService.getSemesters().toPromise(),
        this.courseService.getSubjects().toPromise(),
        this.courseService.getCourses().toPromise()
      ]);

      this.semesters.set(semesters || []);
      this.subjects.set(subjects || []);
      
      const instructorId = user?.id;
      if (instructorId) {
        const myCourses = (courses || []).filter(c => c.instructorId === instructorId);
        this.myCourses.set(myCourses);
      } else {
        this.myCourses.set(courses || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getSubjectColor(subjectCode: string): string {
    if (subjectCode.startsWith('CS')) return 'cs';
    if (subjectCode.startsWith('IT')) return 'it';
    if (subjectCode.startsWith('SE')) return 'se';
    return 'default';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  viewCourse(course: Course) {
    this.router.navigate(['/teacher/courses', course.id]);
  }

  openCourseMenu(event: MouseEvent, course: Course) {
    event.stopPropagation();
    // TODO: Implement course menu dropdown
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
