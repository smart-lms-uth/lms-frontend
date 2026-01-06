import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService, Course, Section, Module } from '../../services/course.service';
import { GradeService, GradeResponse } from '../../services/grade.service';
import { EditModeService } from '../../services/edit-mode.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';

// Interface cho submission của sinh viên
export interface StudentSubmission {
  studentId: number;
  studentCode: string;
  fullName: string;
  email: string;
  enrollmentId: number;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  feedback: string | null;
  gradedAt: string | null;
  gradedBy: number | null;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' | 'LATE';
  // Inline editing
  isEditing?: boolean;
  editScore?: number | null;
  editFeedback?: string;
}

@Component({
  selector: 'app-teacher-module-detail',
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
  templateUrl: './teacher-module-detail.component.html',
  styleUrls: ['./teacher-module-detail.component.scss']
})
export class TeacherModuleDetailComponent implements OnInit {
  loading = signal(true);
  submissionsLoading = signal(false);
  savingGrade = signal(false);
  
  course = signal<Course | null>(null);
  section = signal<Section | null>(null);
  module = signal<Module | null>(null);
  submissions = signal<StudentSubmission[]>([]);
  
  courseId = signal<number | null>(null);
  sectionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  
  // Edit mode for module settings
  isEditingSettings = signal(false);
  
  // Module settings form (extended)
  editTitle = '';
  editDescription = '';
  editContentUrl = '';
  editMaxScore = 100;
  editScoreWeight = 10;
  editGradeType: 'PROCESS' | 'FINAL' | '' = '';
  editDueDate = '';
  editVisible = true;
  editIsShowInGradeTable = true;
  
  // Selected submission for detail view
  selectedSubmission = signal<StudentSubmission | null>(null);
  
  // Grading form
  gradeScore = 0;
  gradeFeedback = '';
  
  // Filter & Sort
  filterStatus = signal<string>('all');
  sortBy = signal<'name' | 'score' | 'date'>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');
  
  editModeService = inject(EditModeService);

  constructor(
    private courseService: CourseService,
    private gradeService: GradeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const courseId = params.get('courseId');
      const sectionId = params.get('sectionId');
      const moduleId = params.get('moduleId');
      
      if (courseId && sectionId && moduleId) {
        this.courseId.set(parseInt(courseId));
        this.sectionId.set(parseInt(sectionId));
        this.moduleId.set(parseInt(moduleId));
        this.loadData();
      } else {
        this.loading.set(false);
      }
    });
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
          // Load modules for this section
          const modules = await this.courseService.getModulesBySection(section.id).toPromise();
          section.modules = modules || [];
          this.section.set(section);
          
          // Find the current module
          const module = section.modules?.find(m => m.id === this.moduleId());
          if (module) {
            this.module.set(module);
            this.initEditForm(module);
            
            // Load submissions for this module
            await this.loadSubmissions();
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  initEditForm(module: Module) {
    this.editTitle = module.title;
    this.editDescription = module.description || '';
    this.editContentUrl = module.contentUrl || '';
    this.editMaxScore = (module as any).maxScore || 100;
    this.editScoreWeight = (module as any).scoreWeight || 10;
    this.editGradeType = (module as any).gradeType || '';
    this.editVisible = module.visible;
    this.editIsShowInGradeTable = (module as any).isShowInGradeTable ?? true;
    this.editDueDate = (module as any).dueDate || '';
  }

  async loadSubmissions() {
    if (!this.courseId() || !this.moduleId()) return;
    
    this.submissionsLoading.set(true);
    
    try {
      // Get grades data from course
      const gradesData = await this.gradeService.getCourseGrades(this.courseId()!).toPromise();
      
      if (gradesData) {
        const moduleIdStr = this.moduleId()!.toString();
        const moduleInfo = gradesData.modules.find(m => m.id === this.moduleId());
        
        // Transform students data to submissions
        const submissions: StudentSubmission[] = gradesData.students.map(student => {
          const score = student.grades[moduleIdStr];
          const hasScore = score !== null && score !== undefined;
          
          return {
            studentId: student.studentId,
            studentCode: student.studentCode,
            fullName: student.fullName,
            email: student.email,
            enrollmentId: 0, // Will need to get from API
            submittedAt: hasScore ? new Date().toISOString() : null, // Placeholder
            score: score,
            maxScore: moduleInfo?.maxScore || 100,
            feedback: null,
            gradedAt: hasScore ? new Date().toISOString() : null,
            gradedBy: null,
            status: hasScore ? 'GRADED' : 'NOT_SUBMITTED'
          };
        });
        
        this.submissions.set(submissions);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      this.submissionsLoading.set(false);
    }
  }

  // Computed values
  get filteredSubmissions(): StudentSubmission[] {
    let result = [...this.submissions()];
    
    // Filter by status
    if (this.filterStatus() !== 'all') {
      result = result.filter(s => s.status === this.filterStatus());
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy()) {
        case 'name':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'date':
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return this.sortDirection() === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }

  get submissionStats() {
    const all = this.submissions();
    return {
      total: all.length,
      submitted: all.filter(s => s.status !== 'NOT_SUBMITTED').length,
      graded: all.filter(s => s.status === 'GRADED').length,
      pending: all.filter(s => s.status === 'SUBMITTED').length,
      notSubmitted: all.filter(s => s.status === 'NOT_SUBMITTED').length,
      averageScore: this.calculateAverageScore(all)
    };
  }

  calculateAverageScore(submissions: StudentSubmission[]): number | null {
    const graded = submissions.filter(s => s.score !== null);
    if (graded.length === 0) return null;
    
    const total = graded.reduce((sum, s) => sum + (s.score || 0), 0);
    return Math.round((total / graded.length) * 100) / 100;
  }

  // Module type helpers
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

  getModuleTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'VIDEO': 'play-circle',
      'RESOURCE': 'file-text',
      'QUIZ': 'help-circle',
      'ASSIGNMENT': 'clipboard',
      'LIVESTREAM': 'video',
      'FORUM': 'message-circle'
    };
    return icons[type] || 'file';
  }

  isGradableModule(): boolean {
    const type = this.module()?.type;
    return type === 'QUIZ' || type === 'ASSIGNMENT';
  }

  // Edit mode actions
  toggleEditSettings() {
    this.isEditingSettings.update(v => !v);
    if (this.isEditingSettings() && this.module()) {
      this.initEditForm(this.module()!);
    }
  }

  async saveModuleSettings() {
    if (!this.module() || !this.courseId()) return;
    
    try {
      // Update module basic info
      const updated = await this.courseService.updateModule(
        this.module()!.id,
        {
          title: this.editTitle,
          description: this.editDescription,
          contentUrl: this.editContentUrl,
          visible: this.editVisible
        }
      ).toPromise();    
      
      // Update grade config if gradable module
      if (this.isGradableModule()) {
        await this.gradeService.updateModuleGradeConfig(this.courseId()!, {
          modules: [{
            moduleId: this.module()!.id,
            scoreWeight: this.editScoreWeight,
            gradeType: this.editGradeType || undefined,
            isShowInGradeTable: this.editIsShowInGradeTable
          }]
        }).toPromise();
      }
      
      if (updated) {
        // Update local module with new values
        this.module.set({
          ...updated,
          scoreWeight: this.editScoreWeight,
          gradeType: this.editGradeType,
          isShowInGradeTable: this.editIsShowInGradeTable
        } as any);
        this.isEditingSettings.set(false);
      }
    } catch (error) {
      console.error('Error updating module:', error);
    }
  }

  cancelEditSettings() {
    this.isEditingSettings.set(false);
    if (this.module()) {
      this.initEditForm(this.module()!);
    }
  }

  // Submission actions
  selectSubmission(submission: StudentSubmission) {
    this.selectedSubmission.set(submission);
    this.gradeScore = submission.score || 0;
    this.gradeFeedback = submission.feedback || '';
  }

  closeSubmissionDetail() {
    this.selectedSubmission.set(null);
  }

  // Inline grading methods
  startInlineEdit(submission: StudentSubmission) {
    // Reset all other edits first
    this.submissions.update(subs => 
      subs.map(s => ({ ...s, isEditing: false }))
    );
    
    // Set this one to editing
    this.submissions.update(subs => 
      subs.map(s => 
        s.studentId === submission.studentId 
          ? { ...s, isEditing: true, editScore: s.score, editFeedback: s.feedback || '' }
          : s
      )
    );
  }

  cancelInlineEdit(submission: StudentSubmission) {
    this.submissions.update(subs => 
      subs.map(s => 
        s.studentId === submission.studentId 
          ? { ...s, isEditing: false }
          : s
      )
    );
  }

  async saveInlineGrade(submission: StudentSubmission) {
    if (!this.courseId() || !this.moduleId()) return;
    
    this.savingGrade.set(true);
    
    try {
      const score = submission.editScore;
      
      // Call API to save grade
      await this.gradeService.bulkUpdateGrades(this.courseId()!, {
        moduleId: this.moduleId()!,
        scores: [{
          studentId: submission.studentId,
          score: score ?? 0,
          feedback: submission.editFeedback || ''
        }]
      }).toPromise();
      
      // Update local state
      this.submissions.update(subs => 
        subs.map(s => 
          s.studentId === submission.studentId 
            ? { 
                ...s, 
                score: score ?? null, 
                feedback: submission.editFeedback || null, 
                status: score !== null ? 'GRADED' as const : 'NOT_SUBMITTED' as const, 
                gradedAt: new Date().toISOString(),
                isEditing: false 
              }
            : s
        )
      );
      
    } catch (error) {
      console.error('Error saving grade:', error);
    } finally {
      this.savingGrade.set(false);
    }
  }

  onGradeInputKeydown(event: KeyboardEvent, submission: StudentSubmission) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveInlineGrade(submission);
    } else if (event.key === 'Escape') {
      this.cancelInlineEdit(submission);
    }
  }

  async saveGrade() {
    const submission = this.selectedSubmission();
    if (!submission || !this.courseId() || !this.moduleId()) return;
    
    try {
      // Find enrollment ID from course grades
      const gradesData = await this.gradeService.getCourseGrades(this.courseId()!).toPromise();
      if (!gradesData) return;
      
      // For now, we'll use bulk update with student ID
      await this.gradeService.bulkUpdateGrades(this.courseId()!, {
        moduleId: this.moduleId()!,
        scores: [{
          studentId: submission.studentId,
          score: this.gradeScore,
          feedback: this.gradeFeedback
        }]
      }).toPromise();
      
      // Update local state
      this.submissions.update(subs => 
        subs.map(s => 
          s.studentId === submission.studentId 
            ? { ...s, score: this.gradeScore, feedback: this.gradeFeedback, status: 'GRADED' as const, gradedAt: new Date().toISOString() }
            : s
        )
      );
      
      this.selectedSubmission.update(s => 
        s ? { ...s, score: this.gradeScore, feedback: this.gradeFeedback, status: 'GRADED' as const } : s
      );
      
    } catch (error) {
      console.error('Error saving grade:', error);
    }
  }

  // Navigation
  goBack() {
    this.router.navigate(['/teacher/courses', this.courseId(), 'sections', this.sectionId()]);
  }

  goToCourse() {
    this.router.navigate(['/teacher/courses', this.courseId()]);
  }

  // Filter & Sort
  setFilter(status: string) {
    this.filterStatus.set(status);
  }

  toggleSort(column: 'name' | 'score' | 'date') {
    if (this.sortBy() === column) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortDirection.set('asc');
    }
  }

  // Toggle visibility
  async toggleVisibility() {
    if (!this.module()) return;
    
    try {
      const updated = await this.courseService.toggleModuleVisibility(
        this.module()!.id
      ).toPromise();
      
      if (updated) {
        this.module.set(updated);
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  }

  // Format date
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

  // Get status badge variant
  getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'GRADED': return 'success';
      case 'SUBMITTED': return 'warning';
      case 'LATE': return 'danger';
      default: return 'neutral';
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'NOT_SUBMITTED': 'Chưa nộp',
      'SUBMITTED': 'Đã nộp',
      'GRADED': 'Đã chấm',
      'LATE': 'Nộp trễ'
    };
    return labels[status] || status;
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', link: '/teacher/dashboard' }
    ];
    
    if (this.course()) {
      items.push({ label: this.course()!.subjectName, link: `/teacher/courses/${this.courseId()}` });
    }
    
    if (this.section()) {
      items.push({ label: this.section()!.title, link: `/teacher/courses/${this.courseId()}/sections/${this.sectionId()}` });
    }
    
    if (this.module()) {
      items.push({ label: this.module()!.title });
    }
    
    return items;
  }

  logout() {
    this.router.navigate(['/login']);
  }
}
