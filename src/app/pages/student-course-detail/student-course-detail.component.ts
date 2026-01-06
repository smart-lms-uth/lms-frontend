import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CourseService, Course, Section, Module } from '../../services/course.service';
import { GradeService, CourseGradesResponse } from '../../services/grade.service';
import { ProgressService } from '../../services/progress.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, ProgressComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';

@Component({
  selector: 'app-student-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    ProgressComponent,
    BreadcrumbComponent
  ],
  templateUrl: './student-course-detail.component.html',
  styleUrls: ['./student-course-detail.component.scss']
})
export class StudentCourseDetailComponent implements OnInit {
  loading = signal(true);
  sectionsLoading = signal(false);
  course = signal<Course | null>(null);
  sections = signal<Section[]>([]);
  courseId = signal<number | null>(null);
  sidebarOpen = signal(false);
  expandedSections = signal<number[]>([]);
  
  // Tab management
  activeTab = signal<'course' | 'grades'>('course');
  
  // Grades
  gradesData = signal<CourseGradesResponse | null>(null);
  myGrades = signal<{ moduleId: number; score: number | null; maxScore: number; moduleName: string }[]>([]);
  
  // Current user
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    public courseService: CourseService,
    private gradeService: GradeService,
    private progressService: ProgressService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Subscribe to current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.courseId.set(parseInt(id));
      this.loadCourse();
      this.loadSections();
      
      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab === 'grades') {
        this.activeTab.set('grades');
      }
    } else {
      this.loading.set(false);
    }
  }

  async loadCourse() {
    this.loading.set(true);
    
    try {
      const course = await this.courseService.getCourseById(this.courseId()!).toPromise();
      this.course.set(course || null);
    } catch (error) {
      console.error('Error loading course:', error);
      this.course.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async loadSections() {
    this.sectionsLoading.set(true);
    
    try {
      const sections = await this.courseService.getSectionsByCourse(this.courseId()!).toPromise();
      // Filter only visible sections for students
      const visibleSections = (sections || []).filter(s => s.visible);
      this.sections.set(visibleSections);
    } catch (error) {
      console.error('Error loading sections:', error);
      this.sections.set([]);
    } finally {
      this.sectionsLoading.set(false);
    }
  }

  async loadMyGrades() {
    try {
      const data = await this.gradeService.getCourseGrades(this.courseId()!).toPromise();
      if (data) {
        this.gradesData.set(data);
        
        // Get current student's grades
        if (this.currentUser) {
          const studentGrades = data.students.find(s => s.studentId === this.currentUser!.id);
          if (studentGrades) {
            const grades = data.modules.map(m => ({
              moduleId: m.id,
              moduleName: m.title,
              maxScore: m.maxScore,
              score: studentGrades.grades[m.id.toString()] ?? null
            }));
            this.myGrades.set(grades);
          }
        }
      }
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  toggleSection(sectionId: number) {
    const isExpanded = this.expandedSections().includes(sectionId);
    
    this.expandedSections.update(ids => {
      if (ids.includes(sectionId)) {
        return ids.filter(id => id !== sectionId);
      } else {
        return [...ids, sectionId];
      }
    });
    
    if (!isExpanded) {
      this.loadModulesForSection(sectionId);
    }
  }
  
  async loadModulesForSection(sectionId: number) {
    try {
      const modules = await this.courseService.getModulesBySection(sectionId).toPromise();
      // Filter only visible modules
      const visibleModules = (modules || []).filter(m => m.visible);
      this.sections.update(sections => 
        sections.map(s => s.id === sectionId ? { ...s, modules: visibleModules } : s)
      );
    } catch (error) {
      console.error('Error loading modules for section:', sectionId, error);
    }
  }
  
  getModuleIcon(type: string): string {
    const icons: Record<string, string> = {
      'VIDEO': 'play',
      'RESOURCE': 'file',
      'QUIZ': 'help-circle',
      'ASSIGNMENT': 'clipboard',
      'LIVESTREAM': 'video',
      'FORUM': 'message-circle'
    };
    return icons[type] || 'file';
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

  getSubjectColor(subjectCode: string): string {
    if (subjectCode.startsWith('CS')) return 'cs';
    if (subjectCode.startsWith('IT')) return 'it';
    if (subjectCode.startsWith('SE')) return 'se';
    return 'cs';
  }

  setActiveTab(tab: 'course' | 'grades') {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'course' ? null : tab },
      queryParamsHandling: 'merge'
    });
    
    if (tab === 'grades' && this.myGrades().length === 0) {
      this.loadMyGrades();
    }
  }

  getTotalModules(): number {
    return this.sections().reduce((total, section) => {
      return total + (section.modules?.length || 0);
    }, 0);
  }

  getProgressPercent(): number {
    if (!this.currentUser) return 0;
    const total = this.getTotalModules();
    if (total === 0) return 0;
    
    let completed = 0;
    for (const section of this.sections()) {
      if (section.modules) {
        for (const module of section.modules) {
          if (this.progressService.isModuleCompleted(module.id, this.currentUser.id)) {
            completed++;
          }
        }
      }
    }
    return Math.round((completed / total) * 100);
  }

  isModuleCompleted(moduleId: number): boolean {
    if (!this.currentUser) return false;
    return this.progressService.isModuleCompleted(moduleId, this.currentUser.id);
  }

  goToSectionDetail(section: Section) {
    this.router.navigate(['/student/courses', this.courseId(), 'sections', section.id]);
  }

  goToModuleDetail(sectionId: number, module: Module) {
    this.router.navigate(['/student/courses', this.courseId(), 'sections', sectionId, 'modules', module.id]);
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Khóa học', link: '/dashboard' }
    ];
    
    if (this.course()) {
      items.push({ label: this.course()!.subjectName });
    }
    
    return items;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
