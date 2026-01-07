import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CourseService, Course, Section, Module } from '../../services/course.service';
import { ProgressService } from '../../services/progress.service';
import { ActivityService } from '../../services/activity.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';

@Component({
  selector: 'app-student-section-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    BreadcrumbComponent
  ],
  templateUrl: './student-section-detail.component.html',
  styleUrls: ['./student-section-detail.component.scss']
})
export class StudentSectionDetailComponent implements OnInit {
  loading = signal(true);
  sectionsLoading = signal(false);
  section = signal<Section | null>(null);
  sections = signal<Section[]>([]);
  course = signal<Course | null>(null);
  courseId = signal<number | null>(null);
  sectionId = signal<number | null>(null);
  sectionIndex = signal<number>(1);
  sidebarOpen = signal(true);
  expandedSections = signal<number[]>([]);
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private progressService: ProgressService,
    private activityService: ActivityService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const courseId = params.get('courseId');
      const sectionId = params.get('sectionId');
      
      if (courseId && sectionId) {
        this.courseId.set(parseInt(courseId));
        this.sectionId.set(parseInt(sectionId));
        this.loadData();
      } else {
        this.loading.set(false);
      }
    });
  }

  async loadData() {
    this.loading.set(true);
    this.sectionsLoading.set(true);
    
    try {
      const course = await this.courseService.getCourseById(this.courseId()!).toPromise();
      this.course.set(course || null);

      const allSections = await this.courseService.getSectionsByCourse(this.courseId()!).toPromise();
      if (allSections) {
        // Filter only visible sections for students
        const visibleSections = allSections.filter(s => s.visible);
        
        for (const sec of visibleSections) {
          try {
            const modules = await this.courseService.getModulesBySection(sec.id).toPromise();
            // Filter only visible modules
            sec.modules = (modules || []).filter(m => m.visible);
          } catch {
            sec.modules = [];
          }
        }
        
        this.sections.set(visibleSections);
        this.sectionsLoading.set(false);
        
        const index = visibleSections.findIndex(s => s.id === this.sectionId());
        if (index !== -1) {
          const currentSection = visibleSections[index];
          this.sectionIndex.set(index + 1);
          this.expandedSections.set([currentSection.id]);
          this.section.set(currentSection);
          
          // Track section view activity
          this.activityService.trackSectionView(
            this.sectionId()!.toString(),
            currentSection.title,
            this.courseId()!.toString()
          );
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.section.set(null);
    } finally {
      this.loading.set(false);
      this.sectionsLoading.set(false);
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  toggleSectionExpand(sectionId: number) {
    this.expandedSections.update(expanded => {
      if (expanded.includes(sectionId)) {
        return expanded.filter(id => id !== sectionId);
      } else {
        return [...expanded, sectionId];
      }
    });
  }

  goToSection(section: Section) {
    this.router.navigate(['/student/courses', this.courseId(), 'sections', section.id]);
  }

  goToModule(module: Module) {
    this.router.navigate(['/student/courses', this.courseId(), 'sections', this.sectionId(), 'modules', module.id]);
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

  getCompletedCount(): number {
    if (!this.currentUser) return 0;
    const modules = this.section()?.modules || [];
    return modules.filter(m => this.progressService.isModuleCompleted(m.id, this.currentUser!.id)).length;
  }

  isModuleCompleted(moduleId: number): boolean {
    if (!this.currentUser) return false;
    return this.progressService.isModuleCompleted(moduleId, this.currentUser.id);
  }

  getTotalModules(): number {
    return this.section()?.modules?.length || 0;
  }

  getProgressPercent(): number {
    const total = this.getTotalModules();
    if (total === 0) return 0;
    return Math.round((this.getCompletedCount() / total) * 100);
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Khóa học', link: '/dashboard' }
    ];
    
    if (this.course()) {
      items.push({ label: this.course()!.subjectName, link: `/student/courses/${this.courseId()}` });
    }
    
    if (this.section()) {
      items.push({ label: this.section()!.title });
    }
    
    return items;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
