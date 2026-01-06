import { Component, OnInit, OnDestroy, signal, inject, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService, Course, Section, Module } from '../../services/course.service';
import { EditModeService } from '../../services/edit-mode.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, ProgressComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { TeacherCourseGradesComponent } from '../teacher-course-grades/teacher-course-grades.component';
import { TeacherCourseStudentsComponent } from '../teacher-course-students/teacher-course-students.component';

@Component({
  selector: 'app-teacher-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    ProgressComponent,
    BreadcrumbComponent,
    CdkDrag,
    CdkDropList,
    TeacherCourseGradesComponent,
    TeacherCourseStudentsComponent
  ],
  templateUrl: './teacher-course-detail.component.html',
  styleUrls: ['./teacher-course-detail.component.scss']
})
export class TeacherCourseDetailComponent implements OnInit, OnDestroy {
  loading = signal(true);
  sectionsLoading = signal(false);
  course = signal<Course | null>(null);
  sections = signal<Section[]>([]);
  courseId = signal<number | null>(null);
  sidebarOpen = signal(false);
  expandedSections = signal<number[]>([]);
  originalSectionOrder = signal<number[]>([]);
  
  // Tab management
  activeTab = signal<'course' | 'students' | 'grades'>('course');
  
  // Inline editing
  editingSectionId = signal<number | null>(null);
  editingTitle: string = '';
  editingDescription: string = '';
  hasUnsavedChanges = signal(false);
  
  // Add section modal
  showAddSectionModal = signal(false);
  newSectionTitle: string = '';
  newSectionDescription: string = '';
  newSectionVisible: boolean = true;
  
  editModeService = inject(EditModeService);
  
  private editModeEffect = effect(() => {
    // When edit mode is turned off, check for unsaved changes
    if (!this.editModeService.editMode() && this.hasUnsavedChanges()) {
      this.promptSaveChanges();
    }
  });

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges() || this.editingSectionId()) {
      event.preventDefault();
      event.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang?';
      return event.returnValue;
    }
    return;
  }

  constructor(
    private authService: AuthService,
    public courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.courseId.set(parseInt(id));
      this.loadCourse();
      this.loadSections();
      
      // Read tab from query param
      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab === 'grades') {
        this.activeTab.set('grades');
      } else if (tab === 'students') {
        this.activeTab.set('students');
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
      this.sections.set(sections || []);
      // Store original order for comparison
      this.originalSectionOrder.set((sections || []).map(s => s.id));
    } catch (error) {
      console.error('Error loading sections:', error);
      this.sections.set([]);
    } finally {
      this.sectionsLoading.set(false);
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
    
    // Load modules when expanding
    if (!isExpanded) {
      this.loadModulesForSection(sectionId);
    }
  }
  
  async loadModulesForSection(sectionId: number) {
    try {
      const modules = await this.courseService.getModulesBySection(sectionId).toPromise();
      // Update section with modules
      this.sections.update(sections => 
        sections.map(s => s.id === sectionId ? { ...s, modules: modules || [] } : s)
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

  // Tab management
  setActiveTab(tab: 'course' | 'students' | 'grades') {
    this.activeTab.set(tab);
    // Update URL with query param
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'course' ? null : tab },
      queryParamsHandling: 'merge'
    });
  }

  getEnrollmentPercent(): number {
    const c = this.course();
    if (!c || c.maxStudents === 0) return 0;
    return Math.round((c.currentEnrollment / c.maxStudents) * 100);
  }

  getTotalModules(): number {
    return this.sections().reduce((sum, s) => sum + s.moduleCount, 0);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  editCourse() {
    this.router.navigate(['/teacher/courses', this.courseId(), 'edit']);
  }

  addSection() {
    this.newSectionTitle = '';
    this.newSectionDescription = '';
    this.newSectionVisible = true;
    this.showAddSectionModal.set(true);
  }

  cancelAddSection() {
    this.showAddSectionModal.set(false);
    this.newSectionTitle = '';
    this.newSectionDescription = '';
    this.newSectionVisible = true;
  }

  confirmAddSection() {
    if (!this.newSectionTitle.trim()) {
      alert('Vui lòng nhập tiêu đề chương!');
      return;
    }

    const request = {
      title: this.newSectionTitle.trim(),
      description: this.newSectionDescription.trim(),
      visible: this.newSectionVisible
    };

    this.courseService.createSection(this.courseId()!, request).subscribe({
      next: (newSection) => {
        // Add new section to the list
        this.sections.update(sections => [...sections, newSection]);
        // Update original order
        this.originalSectionOrder.update(order => [...order, newSection.id]);
        this.showAddSectionModal.set(false);
        this.newSectionTitle = '';
        this.newSectionDescription = '';
        this.newSectionVisible = true;
      },
      error: (error) => {
        console.error('Error creating section:', error);
        alert('Có lỗi xảy ra khi tạo chương mới!');
      }
    });
  }

  goToSectionDetail(section: Section) {
    this.router.navigate(['/teacher/courses', this.courseId(), 'sections', section.id]);
  }

  onSectionClick(section: Section, event: MouseEvent) {
    // Only navigate if not in edit mode
    if (!this.editModeService.editMode()) {
      this.goToSectionDetail(section);
    }
  }

  dropSection(event: CdkDragDrop<Section[]>) {
    const currentSections = [...this.sections()];
    moveItemInArray(currentSections, event.previousIndex, event.currentIndex);
    this.sections.set(currentSections);
  }

  hasOrderChanged(): boolean {
    const currentOrder = this.sections().map(s => s.id);
    const originalOrder = this.originalSectionOrder();
    if (currentOrder.length !== originalOrder.length) return true;
    return currentOrder.some((id, index) => id !== originalOrder[index]);
  }

  saveOrder() {
    const sectionIds = this.sections().map(s => s.id);
    
    this.courseService.reorderSections(this.courseId()!, sectionIds).subscribe({
      next: (updatedSections) => {
        // Update original order after successful save
        this.originalSectionOrder.set(sectionIds);
        // Update sections with new order from server
        this.sections.set(updatedSections);
        alert('Đã lưu thứ tự thành công!');
      },
      error: (error) => {
        console.error('Error saving order:', error);
        alert('Có lỗi xảy ra khi lưu thứ tự!');
      }
    });
  }

  editSection(section: Section) {
    // Start inline editing instead of modal
    this.startInlineEdit(section);
  }

  startInlineEdit(section: Section, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    
    // If already editing another section, save it first
    const currentEditingId = this.editingSectionId();
    if (currentEditingId && currentEditingId !== section.id) {
      const currentSection = this.sections().find(s => s.id === currentEditingId);
      if (currentSection) {
        this.finishInlineEdit(currentSection);
      }
    }
    
    this.editingSectionId.set(section.id);
    this.editingTitle = section.title;
    this.editingDescription = section.description || '';
    
    // Focus on title input after a short delay
    setTimeout(() => {
      const input = document.querySelector('.inline-edit-title') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }

  cancelInlineEdit() {
    this.editingSectionId.set(null);
    this.editingTitle = '';
    this.editingDescription = '';
  }

  async finishInlineEdit(section: Section) {
    // Don't save if already cancelled
    if (this.editingSectionId() !== section.id) return;
    
    // Check if there are changes
    const hasChanges = 
      this.editingTitle !== section.title || 
      this.editingDescription !== (section.description || '');
    
    if (hasChanges && this.editingTitle.trim()) {
      try {
        // Call API to save section
        await this.courseService.updateSection(section.id, {
          title: this.editingTitle.trim(),
          description: this.editingDescription.trim()
        }).toPromise();
        
        // Update local state after successful API call
        this.sections.update(sections => 
          sections.map(s => 
            s.id === section.id 
              ? { ...s, title: this.editingTitle.trim(), description: this.editingDescription.trim() }
              : s
          )
        );
        
        console.log('Section saved successfully:', section.id);
      } catch (error) {
        console.error('Error saving section:', error);
        alert('Có lỗi xảy ra khi lưu!');
        // Reload to restore original data on error
        await this.loadSections();
      }
    }
    
    // Clear editing state
    this.editingSectionId.set(null);
    this.editingTitle = '';
    this.editingDescription = '';
  }

  async toggleVisibility(section: Section) {
    try {
      await this.courseService.toggleSectionVisibility(section.id).toPromise();
      await this.loadSections();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  }

  async deleteSection(section: Section) {
    if (confirm(`Bạn có chắc chắn muốn xóa chương "${section.title}"?`)) {
      try {
        await this.courseService.deleteSection(section.id).toPromise();
        await this.loadSections();
      } catch (error) {
        console.error('Error deleting section:', error);
      }
    }
  }

  toggleModuleComplete(module: any) {
    // Toggle the local state (frontend only for now)
    module.isCompleted = !module.isCompleted;
    // Update section's completed count
    this.sections.update(sections => [...sections]);
  }

  ngOnDestroy() {
    // Clean up effect
    this.editModeEffect.destroy();
  }

  promptSaveChanges() {
    if (this.editingSectionId()) {
      const currentSection = this.sections().find(s => s.id === this.editingSectionId());
      if (currentSection) {
        const save = confirm('Bạn có thay đổi chưa được lưu. Bạn có muốn lưu không?');
        if (save) {
          this.finishInlineEdit(currentSection);
        } else {
          this.cancelInlineEdit();
        }
      }
    }
    if (this.hasOrderChanged()) {
      const save = confirm('Thứ tự section đã thay đổi. Bạn có muốn lưu không?');
      if (save) {
        this.saveOrder();
      } else {
        // Restore original order
        this.loadSections();
      }
    }
    this.hasUnsavedChanges.set(false);
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', link: '/teacher/dashboard' }
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
