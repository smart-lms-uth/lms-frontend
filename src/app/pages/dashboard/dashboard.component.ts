import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { EnrollmentService, Enrollment } from '../../services/enrollment.service';
import { CourseService } from '../../services/course.service';
import { ProgressService } from '../../services/progress.service';
import { GradeService } from '../../services/grade.service';
import { TrackClickDirective } from '../../directives/tracking.directive';
import { ActivityDropdownComponent } from '../../components/activity-dropdown/activity-dropdown.component';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, ProgressComponent, BadgeComponent, AvatarComponent } from '../../components/ui';
import { UpcomingLiveClassesComponent } from '../../components/live-class';
import { Subscription } from 'rxjs';

interface StatCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning';
  trend?: { value: number; label: string };
}

interface CourseItem {
  id: number;
  courseId: number;
  name: string;
  instructor: string;
  progress: number;
  nextLesson: string;
  image?: string;
  status?: string;
}

interface ScheduleItem {
  id: number;
  title: string;
  type: 'class' | 'assignment' | 'exam';
  time: string;
  location?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    TrackClickDirective, 
    ActivityDropdownComponent,
    MainLayoutComponent,
    CardComponent,
    ProgressComponent,
    BadgeComponent,
    AvatarComponent,
    UpcomingLiveClassesComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  loading = signal(true);
  private subscriptions: Subscription[] = [];

  // Real data signals
  courses = signal<CourseItem[]>([]);
  totalStudyTime = signal(0);
  averageScore = signal<number | null>(null);

  // Stats data (computed from real data)
  stats = computed<StatCard[]>(() => {
    const courseList = this.courses();
    const completedCourses = courseList.filter(c => c.progress >= 100).length;
    const studyTime = this.progressService.formatStudyTime(this.totalStudyTime());
    const avgScore = this.averageScore();
    
    return [
      {
        id: 'courses',
        title: 'Khóa học',
        value: courseList.length.toString(),
        subtitle: `${completedCourses} đã hoàn thành`,
        variant: 'primary',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
      },
      {
        id: 'time',
        title: 'Thời gian học',
        value: studyTime,
        subtitle: 'Tổng thời gian',
        variant: 'secondary',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
      },
      {
        id: 'grades',
        title: 'Điểm trung bình',
        value: avgScore !== null ? avgScore.toFixed(1) : '-',
        subtitle: avgScore !== null ? this.getGradeLabel(avgScore) : 'Chưa có điểm',
        variant: 'success',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        trend: avgScore !== null && avgScore >= 8 ? { value: 1, label: 'Tốt' } : undefined
      },
      {
        id: 'progress',
        title: 'Tiến độ học',
        value: this.getAverageProgress().toString() + '%',
        subtitle: 'Trung bình các khóa',
        variant: 'warning',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>'
      }
    ];
  });

  // Schedule data (mock for now)
  schedule: ScheduleItem[] = [];

  displayName = computed(() => {
    if (!this.currentUser) return 'Bạn';
    return this.currentUser.fullName?.split(' ').pop() || this.currentUser.username;
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private activityService: ActivityService,
    private enrollmentService: EnrollmentService,
    private courseService: CourseService,
    private progressService: ProgressService,
    private gradeService: GradeService
  ) {}

  ngOnInit(): void {
    const userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadDashboardData(user.id);
      }
    });
    this.subscriptions.push(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadDashboardData(userId: number): Promise<void> {
    this.loading.set(true);
    
    try {
      // Load all enrollments (including ACTIVE, PASSED, FAILED - not just ACTIVE)
      const enrollments = await this.enrollmentService.getEnrollmentsByStudent(userId).toPromise();
      
      if (enrollments && enrollments.length > 0) {
        const coursesWithProgress: CourseItem[] = [];
        
        for (const enrollment of enrollments) {
          // Load course sections and modules to calculate progress
          let totalModules = 0;
          let completedModules = 0;
          let nextLesson = 'Chưa có bài học';
          
          try {
            const sections = await this.courseService.getVisibleSections(enrollment.courseId).toPromise();
            
            if (sections) {
              for (const section of sections) {
                const modules = await this.courseService.getModulesBySection(section.id).toPromise();
                const visibleModules = (modules || []).filter(m => m.visible);
                totalModules += visibleModules.length;
                
                // Check progress
                for (const module of visibleModules) {
                  if (this.progressService.isModuleCompleted(module.id, userId)) {
                    completedModules++;
                  } else if (nextLesson === 'Chưa có bài học') {
                    nextLesson = module.title;
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error loading course data:', e);
          }
          
          const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
          
          coursesWithProgress.push({
            id: enrollment.id,
            courseId: enrollment.courseId,
            name: enrollment.subjectName,
            instructor: enrollment.instructorName || 'Chưa xác định',
            progress,
            nextLesson,
            status: enrollment.status
          });
        }
        
        this.courses.set(coursesWithProgress);
      }
      
      // Load total study time
      this.totalStudyTime.set(this.progressService.getTotalStudyTime(userId));
      
      // Load average score
      await this.loadAverageScore(userId);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadAverageScore(userId: number): Promise<void> {
    const courseList = this.courses();
    if (courseList.length === 0) {
      this.averageScore.set(null);
      return;
    }
    
    let totalScore = 0;
    let scoreCount = 0;
    
    for (const course of courseList) {
      try {
        const gradesData = await this.gradeService.getCourseGrades(course.courseId).toPromise();
        if (gradesData) {
          const studentGrades = gradesData.students.find(s => s.studentId === userId);
          if (studentGrades && studentGrades.averageScore !== null) {
            totalScore += studentGrades.averageScore;
            scoreCount++;
          }
        }
      } catch (e) {
        // Ignore errors for individual courses
      }
    }
    
    this.averageScore.set(scoreCount > 0 ? totalScore / scoreCount : null);
  }

  getAverageProgress(): number {
    const courseList = this.courses();
    if (courseList.length === 0) return 0;
    const totalProgress = courseList.reduce((sum, c) => sum + c.progress, 0);
    return Math.round(totalProgress / courseList.length);
  }

  getGradeLabel(score: number): string {
    if (score >= 9) return 'Xuất sắc';
    if (score >= 8) return 'Giỏi';
    if (score >= 7) return 'Khá';
    if (score >= 5) return 'Trung bình';
    return 'Yếu';
  }

  goToCourse(course: CourseItem): void {
    // Check user role to determine route
    if (this.currentUser?.role === 'TEACHER' || this.currentUser?.role === 'ADMIN') {
      this.router.navigate(['/teacher/courses', course.courseId]);
    } else {
      this.router.navigate(['/student/courses', course.courseId]);
    }
  }

  getScheduleVariant(type: string): 'primary' | 'secondary' | 'warning' | 'danger' {
    const variants: Record<string, 'primary' | 'secondary' | 'warning' | 'danger'> = {
      'class': 'primary',
      'assignment': 'warning',
      'exam': 'danger'
    };
    return variants[type] || 'primary';
  }

  getScheduleLabel(type: string): string {
    const labels: Record<string, string> = {
      'class': 'Lớp học',
      'assignment': 'Bài tập',
      'exam': 'Kiểm tra'
    };
    return labels[type] || type;
  }

  logout(): void {
    this.activityService.trackLogout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
