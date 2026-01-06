import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService, Course, Section, Module } from '../../services/course.service';
import { GradeService } from '../../services/grade.service';
import { AuthService, User } from '../../services/auth.service';
import { ProgressService } from '../../services/progress.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';

@Component({
  selector: 'app-student-module-detail',
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
  templateUrl: './student-module-detail.component.html',
  styleUrls: ['./student-module-detail.component.scss']
})
export class StudentModuleDetailComponent implements OnInit, OnDestroy {
  loading = signal(true);
  submitting = signal(false);
  
  course = signal<Course | null>(null);
  section = signal<Section | null>(null);
  module = signal<Module | null>(null);
  
  courseId = signal<number | null>(null);
  sectionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  
  // My grade for this module
  myScore = signal<number | null>(null);
  myFeedback = signal<string | null>(null);
  maxScore = signal<number>(100);
  
  // Progress tracking
  isCompleted = signal(false);
  startTime: Date | null = null;
  
  // Submission
  submissionText = '';
  submissionFile: File | null = null;
  hasSubmitted = signal(false);
  
  // Current user
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private gradeService: GradeService,
    private progressService: ProgressService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Start tracking time
    this.startTime = new Date();
    
    // Subscribe to current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    this.route.paramMap.subscribe(params => {
      const courseId = params.get('courseId');
      const sectionId = params.get('sectionId');
      const moduleId = params.get('moduleId');
      
      if (courseId && sectionId && moduleId) {
        this.courseId.set(parseInt(courseId));
        this.sectionId.set(parseInt(sectionId));
        this.moduleId.set(parseInt(moduleId));
        this.loadData();
        
        // Check if module is completed
        if (this.currentUser) {
          this.isCompleted.set(
            this.progressService.isModuleCompleted(parseInt(moduleId), this.currentUser.id)
          );
        }
      } else {
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy() {
    // Track time spent on module when leaving
    if (this.startTime && this.currentUser && this.moduleId()) {
      const endTime = new Date();
      const timeSpentSeconds = Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);
      
      if (timeSpentSeconds > 5) { // Only track if spent more than 5 seconds
        this.progressService.updateTimeSpent(
          this.moduleId()!,
          this.courseId()!,
          this.currentUser.id,
          timeSpentSeconds
        );
      }
    }
  }

  async loadData() {
    this.loading.set(true);
    
    try {
      // Load course info
      const course = await this.courseService.getCourseById(this.courseId()!).toPromise();
      this.course.set(course || null);

      // Load section info
      const sections = await this.courseService.getSectionsByCourse(this.courseId()!).toPromise();
      if (sections) {
        const section = sections.find(s => s.id === this.sectionId());
        if (section) {
          const modules = await this.courseService.getModulesBySection(section.id).toPromise();
          section.modules = (modules || []).filter(m => m.visible);
          this.section.set(section);
          
          // Find the current module
          const module = section.modules?.find(m => m.id === this.moduleId());
          if (module) {
            this.module.set(module);
            this.maxScore.set((module as any).maxScore || 100);
            
            // Load my grade for this module
            await this.loadMyGrade();
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMyGrade() {
    try {
      const gradesData = await this.gradeService.getCourseGrades(this.courseId()!).toPromise();
      if (gradesData) {
        if (this.currentUser) {
          const studentGrades = gradesData.students.find(s => s.studentId === this.currentUser!.id);
          if (studentGrades) {
            const moduleIdStr = this.moduleId()!.toString();
            this.myScore.set(studentGrades.grades[moduleIdStr] ?? null);
          }
        }
        
        // Get max score from module info
        const moduleInfo = gradesData.modules.find(m => m.id === this.moduleId());
        if (moduleInfo) {
          this.maxScore.set(moduleInfo.maxScore);
        }
      }
    } catch (error) {
      console.error('Error loading grade:', error);
    }
  }

  getModuleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'VIDEO': 'Video',
      'RESOURCE': 'Tài liệu',
      'QUIZ': 'Trắc nghiệm',
      'ASSIGNMENT': 'Bài tập',
      'LIVESTREAM': 'Livestream',
      'FORUM': 'Thảo luận'
    };
    return labels[type] || type;
  }

  isGradableModule(): boolean {
    const type = this.module()?.type;
    return type === 'QUIZ' || type === 'ASSIGNMENT';
  }

  isContentModule(): boolean {
    const type = this.module()?.type;
    return type === 'VIDEO' || type === 'RESOURCE';
  }

  // Mark as completed (for VIDEO/RESOURCE)
  async markAsCompleted() {
    if (!this.module() || !this.currentUser) return;
    
    try {
      // Mark module as completed using ProgressService
      this.progressService.markModuleCompleted(
        this.moduleId()!,
        this.courseId()!,
        this.currentUser.id
      );
      
      this.isCompleted.set(true);
      this.module.update(m => m ? { ...m, isCompleted: true } : m);
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  }

  // Handle file selection
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.submissionFile = input.files[0];
    }
  }

  // Submit assignment
  async submitAssignment() {
    if (!this.module() || !this.courseId()) return;
    
    this.submitting.set(true);
    
    try {
      // TODO: Call API to submit assignment
      // For now, just mark as submitted
      this.hasSubmitted.set(true);
    } catch (error) {
      console.error('Error submitting assignment:', error);
    } finally {
      this.submitting.set(false);
    }
  }

  // Navigation
  goBack() {
    this.router.navigate(['/student/courses', this.courseId(), 'sections', this.sectionId()]);
  }

  goToCourse() {
    this.router.navigate(['/student/courses', this.courseId()]);
  }

  goToNextModule() {
    const modules = this.section()?.modules || [];
    const currentIndex = modules.findIndex(m => m.id === this.moduleId());
    
    if (currentIndex < modules.length - 1) {
      const nextModule = modules[currentIndex + 1];
      this.router.navigate(['/student/courses', this.courseId(), 'sections', this.sectionId(), 'modules', nextModule.id]);
    }
  }

  goToPrevModule() {
    const modules = this.section()?.modules || [];
    const currentIndex = modules.findIndex(m => m.id === this.moduleId());
    
    if (currentIndex > 0) {
      const prevModule = modules[currentIndex - 1];
      this.router.navigate(['/student/courses', this.courseId(), 'sections', this.sectionId(), 'modules', prevModule.id]);
    }
  }

  hasNextModule(): boolean {
    const modules = this.section()?.modules || [];
    const currentIndex = modules.findIndex(m => m.id === this.moduleId());
    return currentIndex < modules.length - 1;
  }

  hasPrevModule(): boolean {
    const modules = this.section()?.modules || [];
    const currentIndex = modules.findIndex(m => m.id === this.moduleId());
    return currentIndex > 0;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Khóa học', link: '/dashboard' }
    ];
    
    if (this.course()) {
      items.push({ label: this.course()!.subjectName, link: `/student/courses/${this.courseId()}` });
    }
    
    if (this.section()) {
      items.push({ label: this.section()!.title, link: `/student/courses/${this.courseId()}/sections/${this.sectionId()}` });
    }
    
    if (this.module()) {
      items.push({ label: this.module()!.title });
    }
    
    return items;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
