import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService, Course, Section, Module, AssignmentSettings } from '../../services/course.service';
import { GradeService } from '../../services/grade.service';
import { AuthService, User } from '../../services/auth.service';
import { ProgressService } from '../../services/progress.service';
import { ActivityService } from '../../services/activity.service';
import { SubmissionService, AssignmentSubmission, UploadProgress } from '../../services/submission.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { NavigationService } from '../../services/navigation.service';

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
    BreadcrumbComponent,
    MarkdownPipe
  ],
  templateUrl: './student-module-detail.component.html',
  styleUrls: ['./student-module-detail.component.scss']
})
export class StudentModuleDetailComponent implements OnInit, OnDestroy {
  private nav = inject(NavigationService);
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
  
  // New submission features
  uploadProgress = signal(0);
  isUploading = signal(false);
  latestSubmission = signal<AssignmentSubmission | null>(null);
  submissionHistory = signal<AssignmentSubmission[]>([]);
  attemptCount = signal(0);
  maxAttempts = signal(1);
  isDragging = signal(false);
  
  // Deadline info
  openDate = signal<Date | null>(null);
  dueDate = signal<Date | null>(null);
  allowLateSubmission = signal(false);
  timeRemaining = signal<string>('');
  isOverdue = signal(false);
  isNotYetOpen = signal(false);
  private deadlineInterval: any;
  
  // Current user
  currentUser: User | null = null;

  private submissionService = inject(SubmissionService);
  private activityService = inject(ActivityService);

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
    // Clear deadline interval
    if (this.deadlineInterval) {
      clearInterval(this.deadlineInterval);
    }
    
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
            
            // Track module/lesson view activity
            this.activityService.trackLessonView(
              this.moduleId()!.toString(),
              module.title,
              this.courseId()!.toString()
            );
            
            // Track specific content type
            if (module.type === 'VIDEO') {
              this.activityService.trackVideoPlay(
                this.moduleId()!.toString(),
                module.title,
                this.courseId()!.toString()
              );
            } else if (module.type === 'ASSIGNMENT') {
              this.activityService.trackAssignmentView(
                this.moduleId()!.toString(),
                module.title,
                this.courseId()!.toString()
              );
            }
            
            // Parse settings to get max attempts and deadline
            const settings = (module as any).settings;
            if (settings) {
              try {
                const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
                this.maxAttempts.set(parsed.maxAttempts || 1);
                
                // Parse open date
                if (parsed.openDate) {
                  this.openDate.set(new Date(parsed.openDate));
                  // Check if not yet open
                  const now = new Date();
                  if (now < new Date(parsed.openDate)) {
                    this.isNotYetOpen.set(true);
                  }
                }
                
                // Parse deadline
                if (parsed.dueDate) {
                  this.dueDate.set(new Date(parsed.dueDate));
                  this.allowLateSubmission.set(parsed.allowLateSubmission || false);
                  this.updateTimeRemaining();
                  // Update every minute
                  this.deadlineInterval = setInterval(() => this.updateTimeRemaining(), 60000);
                }
              } catch (e) {}
            }
            
            // Load my grade for this module
            await this.loadMyGrade();
            
            // Load submission info if ASSIGNMENT
            if (module.type === 'ASSIGNMENT') {
              await this.loadSubmissionInfo();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadSubmissionInfo() {
    try {
      // Check submission status
      const checkResult = await this.submissionService.checkSubmission(this.moduleId()!).toPromise();
      if (checkResult) {
        this.hasSubmitted.set(checkResult.hasSubmitted);
        this.attemptCount.set(checkResult.attemptCount);
      }
      
      // Load latest submission
      const latest = await this.submissionService.getLatestSubmission(this.moduleId()!).toPromise();
      this.latestSubmission.set(latest || null);
      
      // Load submission history
      const history = await this.submissionService.getSubmissionHistory(this.moduleId()!).toPromise();
      this.submissionHistory.set(history || []);
    } catch (error) {
      console.error('Error loading submission info:', error);
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

  getAssignmentInstructions(): string {
    const mod = this.module();
    if (!mod || !mod.settings) return '';
    
    // Instructions có thể có trong tất cả loại settings
    const settings = mod.settings as any;
    return settings.instructions || '';
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

  // Drag and drop handlers
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.submissionFile = event.dataTransfer.files[0];
    }
  }

  // Remove selected file
  removeFile() {
    this.submissionFile = null;
  }

  // Get submission status text
  getSubmissionStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      'SUBMITTED': 'Đã nộp',
      'GRADED': 'Đã chấm',
      'RETURNED': 'Yêu cầu nộp lại',
      'RESUBMITTED': 'Đã nộp lại'
    };
    return statusTexts[status] || status;
  }

  // Submit assignment
  async submitAssignment() {
    if (!this.module() || !this.moduleId() || !this.submissionFile) return;
    
    // Check if max attempts reached (skip if unlimited: -1)
    if (this.maxAttempts() !== -1 && this.attemptCount() >= this.maxAttempts()) {
      alert(`Bạn đã hết số lần nộp bài (${this.maxAttempts()} lần)`);
      return;
    }
    
    this.isUploading.set(true);
    this.uploadProgress.set(0);
    
    try {
      // Step 1: Upload file
      let fileUrl = '';
      let fileName = '';
      let fileType = '';
      let fileSize = 0;
      
      await new Promise<void>((resolve, reject) => {
        this.submissionService.uploadAssignmentFile(this.submissionFile!, this.moduleId()!)
          .subscribe({
            next: (progress: UploadProgress) => {
              if (progress.status === 'progress') {
                this.uploadProgress.set(progress.progress || 0);
              } else if (progress.status === 'complete' && progress.response) {
                fileUrl = progress.response.fileUrl;
                fileName = progress.response.originalFileName;
                fileType = progress.response.fileType;
                fileSize = progress.response.fileSize;
                resolve();
              }
            },
            error: (err) => {
              console.error('Upload error:', err);
              reject(err);
            }
          });
      });
      
      // Step 2: Create submission
      this.submitting.set(true);
      const submission = await this.submissionService.submitAssignment({
        moduleId: this.moduleId()!,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        studentNote: this.submissionText || undefined
      }).toPromise();
      
      if (submission) {
        this.latestSubmission.set(submission);
        this.hasSubmitted.set(true);
        this.attemptCount.update(c => c + 1);
        this.submissionFile = null;
        this.submissionText = '';
        
        // Track assignment submission activity
        this.activityService.trackAssignmentSubmit(
          this.moduleId()!.toString(),
          this.module()!.title,
          this.courseId()?.toString()
        );
        
        // Reload submission history
        await this.loadSubmissionInfo();
        
        alert('Nộp bài thành công!');
      }
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      alert('Có lỗi xảy ra: ' + (error.error?.message || error.message || 'Unknown error'));
    } finally {
      this.isUploading.set(false);
      this.submitting.set(false);
      this.uploadProgress.set(0);
    }
  }

  // Check if can submit
  canSubmit(): boolean {
    // Check if overdue and late submission not allowed
    if (this.isOverdue() && !this.allowLateSubmission()) {
      return false;
    }
    // -1 means unlimited attempts
    if (this.maxAttempts() === -1) return true;
    return this.attemptCount() < this.maxAttempts();
  }

  // Update time remaining until deadline
  updateTimeRemaining() {
    const due = this.dueDate();
    if (!due) {
      this.timeRemaining.set('');
      return;
    }

    const now = new Date();
    const diff = due.getTime() - now.getTime();

    if (diff <= 0) {
      this.isOverdue.set(true);
      this.timeRemaining.set('Đã hết hạn');
      return;
    }

    this.isOverdue.set(false);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let parts: string[] = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} phút`);

    this.timeRemaining.set(parts.join(' ') || 'Ít hơn 1 phút');
  }

  // Format file size
  formatFileSize(bytes: number): string {
    return this.submissionService.formatFileSize(bytes);
  }

  // Get file icon
  getFileIcon(fileName: string): string {
    return this.submissionService.getFileIcon(fileName);
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
      { label: 'Khóa học', link: this.nav.getDashboardUrl() }
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

  /**
   * Get normalized file URL for viewing
   */
  getFileViewUrl(submission: AssignmentSubmission): string {
    let url = this.submissionService.normalizeFileUrl(submission.fileUrl);
    if (submission.fileName) {
      url += (url.includes('?') ? '&' : '?') + 'name=' + encodeURIComponent(submission.fileName);
    }
    return url;
  }

  /**
   * View submission file
   */
  viewSubmissionFile(submission: AssignmentSubmission): void {
    this.submissionService.viewFile(submission.fileUrl, submission.fileName);
  }

  /**
   * Download submission file
   */
  downloadSubmissionFile(submission: AssignmentSubmission): void {
    this.submissionService.downloadSubmissionFile(submission.fileUrl, submission.fileName);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
