import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService, Course, Section, Module } from '../../services/course.service';
import { EditModeService } from '../../services/edit-mode.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-teacher-section-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    BreadcrumbComponent,
    CdkDrag,
    CdkDropList
  ],
  templateUrl: './teacher-section-detail.component.html',
  styleUrls: ['./teacher-section-detail.component.scss']
})
export class TeacherSectionDetailComponent implements OnInit {
  loading = signal(true);
  modulesLoading = signal(false);
  sectionsLoading = signal(false);
  section = signal<Section | null>(null);
  sections = signal<Section[]>([]);
  course = signal<Course | null>(null);
  courseId = signal<number | null>(null);
  sectionId = signal<number | null>(null);
  sectionIndex = signal<number>(1);
  originalModuleOrder = signal<number[]>([]);
  sidebarOpen = signal(true);
  expandedSections = signal<number[]>([]);

  // Module modal
  showModuleModal = signal(false);
  editingModule = signal<Module | null>(null);
  newModuleTitle: string = '';
  newModuleDescription: string = '';
  newModuleType: 'VIDEO' | 'RESOURCE' | 'QUIZ' | 'ASSIGNMENT' | 'LIVESTREAM' | 'FORUM' = 'VIDEO';
  newModuleContentUrl: string = '';
  newModuleVisible: boolean = true;
  // Grade fields
  newModuleMaxScore: number | null = null;
  newModuleScoreWeight: number | null = null;
  newModuleGradeType: 'PROCESS' | 'FINAL' | null = null;
  newModuleIsShowInGradeTable: boolean = true;

  editModeService = inject(EditModeService);

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Subscribe to route params to detect changes when navigating between sections
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
      // Load course info
      const course = await this.courseService.getCourseById(this.courseId()!).toPromise();
      this.course.set(course || null);

      // Load all sections to find the current one and its index
      const allSections = await this.courseService.getSectionsByCourse(this.courseId()!).toPromise();
      if (allSections) {
        // Load modules for all sections (for sidebar display)
        for (const sec of allSections) {
          try {
            const modules = await this.courseService.getModulesBySection(sec.id).toPromise();
            sec.modules = modules || [];
          } catch {
            sec.modules = [];
          }
        }
        
        this.sections.set(allSections);
        this.sectionsLoading.set(false);
        
        const index = allSections.findIndex(s => s.id === this.sectionId());
        if (index !== -1) {
          const currentSection = allSections[index];
          this.sectionIndex.set(index + 1);
          
          // Expand current section in sidebar
          this.expandedSections.set([currentSection.id]);
          
          // Store original module order for current section
          this.originalModuleOrder.set((currentSection.modules || []).map((m: any) => m.id));
          
          this.section.set(currentSection);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.section.set(null);
    } finally {
      this.loading.set(false);
      this.sectionsLoading.set(false);
      this.modulesLoading.set(false);
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
    this.router.navigate(['/teacher/courses', this.courseId(), 'sections', section.id]);
  }

  goToModule(module: Module) {
    this.router.navigate(['/teacher/courses', this.courseId(), 'sections', this.sectionId(), 'modules', module.id]);
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

  editSection() {
    // TODO: Implement edit section modal
    console.log('Edit section');
  }

  async toggleVisibility() {
    if (!this.section()) return;
    
    try {
      await this.courseService.toggleSectionVisibility(this.sectionId()!).toPromise();
      await this.loadData();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  }

  // ============ Module Methods ============

  addModule() {
    this.resetModuleForm();
    this.editingModule.set(null);
    this.showModuleModal.set(true);
  }

  editModule(module: Module) {
    this.editingModule.set(module);
    this.newModuleTitle = module.title;
    this.newModuleDescription = module.description || '';
    this.newModuleType = module.type;
    this.newModuleContentUrl = module.contentUrl || '';
    this.newModuleVisible = module.visible;
    // Grade fields
    this.newModuleMaxScore = module.maxScore ?? null;
    this.newModuleScoreWeight = module.scoreWeight ?? null;
    this.newModuleGradeType = module.gradeType ?? null;
    this.newModuleIsShowInGradeTable = module.isShowInGradeTable ?? true;
    this.showModuleModal.set(true);
  }

  closeModuleModal() {
    this.showModuleModal.set(false);
    this.resetModuleForm();
  }

  resetModuleForm() {
    this.newModuleTitle = '';
    this.newModuleDescription = '';
    this.newModuleType = 'VIDEO';
    this.newModuleContentUrl = '';
    this.newModuleVisible = true;
    // Grade fields
    this.newModuleMaxScore = null;
    this.newModuleScoreWeight = null;
    this.newModuleGradeType = null;
    this.newModuleIsShowInGradeTable = true;
    this.editingModule.set(null);
  }

  // Check if current module type can have grades
  isGradeableType(): boolean {
    return this.newModuleType === 'ASSIGNMENT' || this.newModuleType === 'QUIZ';
  }

  async saveModule() {
    if (!this.newModuleTitle.trim()) return;

    try {
      const moduleData: any = {
        title: this.newModuleTitle.trim(),
        description: this.newModuleDescription.trim(),
        type: this.newModuleType,
        contentUrl: this.newModuleContentUrl.trim() || undefined,
        visible: this.newModuleVisible
      };

      // Add grade fields if it's a gradeable type
      if (this.isGradeableType()) {
        if (this.newModuleMaxScore !== null) {
          moduleData.maxScore = this.newModuleMaxScore;
        }
        if (this.newModuleScoreWeight !== null) {
          moduleData.scoreWeight = this.newModuleScoreWeight;
        }
        if (this.newModuleGradeType !== null) {
          moduleData.gradeType = this.newModuleGradeType;
        }
        moduleData.isShowInGradeTable = this.newModuleIsShowInGradeTable;
      }

      if (this.editingModule()) {
        // Update existing module
        await this.courseService.updateModule(this.editingModule()!.id, moduleData).toPromise();
      } else {
        // Create new module
        await this.courseService.createModule(this.sectionId()!, moduleData).toPromise();
      }

      this.closeModuleModal();
      await this.loadData();
    } catch (error) {
      console.error('Error saving module:', error);
      alert('Có lỗi xảy ra khi lưu module!');
    }
  }

  async deleteModule(module: Module) {
    if (confirm(`Bạn có chắc chắn muốn xóa module "${module.title}"?`)) {
      try {
        await this.courseService.deleteModule(module.id).toPromise();
        await this.loadData();
      } catch (error) {
        console.error('Error deleting module:', error);
        alert('Có lỗi xảy ra khi xóa module!');
      }
    }
  }

  async toggleModuleVisibility(module: Module) {
    try {
      await this.courseService.toggleModuleVisibility(module.id).toPromise();
      await this.loadData();
    } catch (error) {
      console.error('Error toggling module visibility:', error);
    }
  }

  dropModule(event: CdkDragDrop<any[]>) {
    const currentSection = this.section();
    if (!currentSection || !currentSection.modules) return;
    
    const modules = [...currentSection.modules];
    moveItemInArray(modules, event.previousIndex, event.currentIndex);
    this.section.set({ ...currentSection, modules });
  }

  hasModuleOrderChanged(): boolean {
    const currentSection = this.section();
    if (!currentSection || !currentSection.modules) return false;
    
    const currentOrder = currentSection.modules.map((m: any) => m.id);
    const originalOrder = this.originalModuleOrder();
    if (currentOrder.length !== originalOrder.length) return true;
    return currentOrder.some((id: number, index: number) => id !== originalOrder[index]);
  }

  async saveModuleOrder() {
    try {
      const currentSection = this.section();
      if (!currentSection || !currentSection.modules) return;
      
      const moduleIds = currentSection.modules.map((m: any) => m.id);
      await this.courseService.reorderModules(this.sectionId()!, moduleIds).toPromise();
      
      // Update original order after successful save
      this.originalModuleOrder.set(moduleIds);
      
      // Show success message
      alert('Đã lưu thứ tự thành công!');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Có lỗi xảy ra khi lưu thứ tự!');
    }
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', link: '/teacher/dashboard' }
    ];
    
    if (this.course()) {
      items.push({ label: this.course()!.subjectName, link: `/teacher/courses/${this.courseId()}` });
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
