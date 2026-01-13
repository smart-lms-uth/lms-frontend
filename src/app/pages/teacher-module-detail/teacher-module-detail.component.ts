import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService, Course, Section, Module, QuizSettings, RandomQuestionConfig, AssignmentSettings } from '../../services/course.service';
import { GradeService, GradeResponse } from '../../services/grade.service';
import { SubmissionService, AssignmentSubmission } from '../../services/submission.service';
import { QuizService } from '../../services/quiz.service';
import { QuestionBankService, Chapter, Question } from '../../services/question-bank.service';
import { EditModeService } from '../../services/edit-mode.service';
import { ActivityService } from '../../services/activity.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

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
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' | 'LATE' | 'RETURNED' | 'RESUBMITTED';
  // Assignment specific
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  studentNote?: string;
  attemptNumber?: number;
  isLate?: boolean;
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
    BreadcrumbComponent,
    MarkdownPipe
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
  editResourceUrl = '';
  editMaxScore = 100;
  editScoreWeight = 10;
  editGradeType: 'PROCESS' | 'FINAL' | '' = '';
  editDueDate = '';
  editVisible = true;
  editIsShowInGradeTable = true;

  // Assignment/Quiz specific settings
  editAllowLateSubmission = false;
  editMaxAttempts = 1;
  editTimeLimit = 0; // for quiz in minutes
  editShuffleQuestions = false;
  editShowCorrectAnswers = false;

  // Assignment instructions (markdown)
  editInstructions = '';
  instructionsPreviewMode = signal(false); // false = code, true = preview

  // Full Quiz Settings (editable in edit mode)
  quizSettings = signal<QuizSettings | null>(null);
  quizQuestionsCount = signal<number>(0);

  // Editable Quiz Settings - copy of quizSettings for editing
  editQuizSettings: QuizSettings = this.getDefaultQuizSettings();

  // Question configuration for quiz
  availableChapters = signal<Chapter[]>([]);
  chaptersLoading = signal(false);
  selectedChapterIds: number[] = [];

  // Active tab: 'config' or 'submissions'
  activeTab = signal<'config' | 'submissions'>('config');

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
    private submissionService: SubmissionService,
    private quizService: QuizService,
    private questionBankService: QuestionBankService,
    private activityService: ActivityService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

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

            // Track module view activity
            this.activityService.trackLessonView(
              this.moduleId()!.toString(),
              module.title || 'Module',
              this.courseId()!.toString()
            );

            // Load quiz questions count if QUIZ type
            if (module.type === 'QUIZ') {
              this.loadQuizInfo(module);
            }

            // Don't auto-load submissions, let user click on "Bài nộp" tab
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
    this.editResourceUrl = module.resourceUrl || '';
    this.editMaxScore = (module as any).maxScore || 100;
    this.editScoreWeight = (module as any).scoreWeight || 10;
    this.editGradeType = (module as any).gradeType || '';
    this.editVisible = module.visible;
    this.editIsShowInGradeTable = (module as any).isShowInGradeTable ?? true;

    // Parse settings JSON for assignment/quiz specific settings
    const settings = this.parseModuleSettings(module);
    this.editDueDate = settings.dueDate || '';
    this.editAllowLateSubmission = settings.allowLateSubmission || false;
    this.editMaxAttempts = settings.maxAttempts || 1;
    this.editTimeLimit = settings.timeLimit || 0;
    this.editShuffleQuestions = settings.shuffleQuestions || false;
    this.editShowCorrectAnswers = settings.showCorrectAnswers || false;
    this.editInstructions = settings.instructions || '';
  }

  parseModuleSettings(module: Module): any {
    try {
      if ((module as any).settings) {
        return typeof (module as any).settings === 'string'
          ? JSON.parse((module as any).settings)
          : (module as any).settings;
      }
    } catch (e) {
      console.error('Error parsing module settings:', e);
    }
    return {};
  }

  async loadQuizInfo(module: Module) {
    try {
      // Parse quiz settings
      const settings = this.parseModuleSettings(module) as QuizSettings;
      const mergedSettings = { ...this.getDefaultQuizSettings(), ...settings };
      this.quizSettings.set(mergedSettings);
      this.editQuizSettings = { ...mergedSettings };

      // Load quiz questions count
      const questions = await this.quizService.getQuizQuestions(module.id).toPromise();
      this.quizQuestionsCount.set(questions?.length || 0);
    } catch (error) {
      console.error('Error loading quiz info:', error);
    }
  }

  // Get default quiz settings
  getDefaultQuizSettings(): QuizSettings {
    return {
      // Time
      durationMinutes: 60,
      // Attempt
      maxAttempts: 1,
      gradingMethod: 'HIGHEST',
      // Questions
      questionSelectionMode: 'MANUAL',
      distributionMode: 'SAME_FOR_ALL',
      selectedQuestionIds: [],
      randomConfig: {
        fromChapterIds: [],
        easyCount: 0,
        mediumCount: 0,
        hardCount: 0
      },
      // Display
      shuffleQuestions: true,
      shuffleAnswers: true,
      oneQuestionPerPage: false,
      allowBackNavigation: true,
      showQuestionNumber: true,
      showPointsPerQuestion: false,
      // Review
      showCorrectAnswers: false,
      allowReview: true,
      showScoreImmediately: true,
      // Security
      requireFullscreen: false,
      detectTabSwitch: false,
      maxTabSwitchCount: 3,
      requireWebcam: false
    };
  }

  // Load chapters for question configuration
  async loadChapters() {
    const subjectId = this.course()?.subjectId;
    if (!subjectId) return;

    this.chaptersLoading.set(true);
    try {
      const chapters = await this.questionBankService.getChaptersBySubject(subjectId).toPromise();
      this.availableChapters.set(chapters || []);

      // Initialize selectedChapterIds from editQuizSettings
      if (this.editQuizSettings.randomConfig?.fromChapterIds) {
        this.selectedChapterIds = [...this.editQuizSettings.randomConfig.fromChapterIds];
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      this.chaptersLoading.set(false);
    }
  }

  // Toggle chapter selection
  toggleChapter(chapterId: number) {
    const index = this.selectedChapterIds.indexOf(chapterId);
    if (index > -1) {
      this.selectedChapterIds.splice(index, 1);
    } else {
      this.selectedChapterIds.push(chapterId);
    }
    // Update editQuizSettings
    if (!this.editQuizSettings.randomConfig) {
      this.editQuizSettings.randomConfig = { fromChapterIds: [], easyCount: 0, mediumCount: 0, hardCount: 0 };
    }
    this.editQuizSettings.randomConfig.fromChapterIds = [...this.selectedChapterIds];
  }

  isChapterSelected(chapterId: number): boolean {
    return this.selectedChapterIds.includes(chapterId);
  }

  // Calculate total questions from random config
  getTotalRandomQuestions(): number {
    const rc = this.editQuizSettings.randomConfig;
    if (!rc) return 0;
    return (rc.easyCount || 0) + (rc.mediumCount || 0) + (rc.hardCount || 0);
  }

  // Navigate to start quiz (for preview/testing)
  startQuiz() {
    if (this.moduleId() && this.courseId()) {
      // Navigate to student quiz page for testing
      this.router.navigate(['/student/courses', this.courseId(), 'modules', this.moduleId()]);
    }
  }

  // Get quiz setting display helpers
  getGradingMethodLabel(method: string | undefined): string {
    switch (method) {
      case 'HIGHEST': return 'Điểm cao nhất';
      case 'AVERAGE': return 'Điểm trung bình';
      case 'FIRST': return 'Lần làm đầu tiên';
      case 'LAST': return 'Lần làm cuối cùng';
      default: return 'Chưa cấu hình';
    }
  }

  getQuestionModeLabel(mode: string | undefined): string {
    switch (mode) {
      case 'MANUAL': return 'Chọn thủ công';
      case 'RANDOM': return 'Ngẫu nhiên từ ngân hàng';
      case 'MIXED': return 'Kết hợp';
      default: return 'Chưa cấu hình';
    }
  }

  // Preview quiz in a new page (teacher can see how the quiz looks for students)
  previewQuiz() {
    if (this.moduleId() && this.courseId()) {
      // Navigate to quiz preview page
      this.router.navigate(['/teacher/courses', this.courseId(), 'modules', this.moduleId(), 'preview']);
    }
  }

  setActiveTab(tab: 'config' | 'submissions') {
    this.activeTab.set(tab);
    if (tab === 'submissions' && this.submissions().length === 0) {
      this.loadSubmissions();
    }
  }

  async loadSubmissions() {
    if (!this.courseId() || !this.moduleId()) return;

    this.submissionsLoading.set(true);

    try {
      const moduleType = this.module()?.type;

      // Nếu là ASSIGNMENT, load từ SubmissionService
      if (moduleType === 'ASSIGNMENT') {
        await this.loadAssignmentSubmissions();
      } else {
        // Load từ GradeService cho các loại module khác (QUIZ, etc.)
        await this.loadGradeSubmissions();
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      this.submissionsLoading.set(false);
    }
  }

  async loadAssignmentSubmissions() {
    try {
      // Load cả 2 nguồn data song song
      const [assignmentSubmissions, gradesData] = await Promise.all([
        this.submissionService.getAllSubmissions(this.moduleId()!).toPromise(),
        this.gradeService.getCourseGrades(this.courseId()!).toPromise()
      ]);

      const moduleInfo = gradesData?.modules.find(m => m.id === this.moduleId());
      const maxScore = moduleInfo?.maxScore || 100;
      const moduleIdStr = this.moduleId()!.toString();

      // Tạo map từ studentId -> submission để lookup nhanh
      const submissionMap = new Map<number, AssignmentSubmission>();
      if (assignmentSubmissions) {
        assignmentSubmissions.forEach(sub => {
          submissionMap.set(sub.studentId, sub);
        });
      }

      // Tạo map từ studentId -> grade score từ gradesData
      const gradeMap = new Map<number, number | null>();
      if (gradesData?.students) {
        gradesData.students.forEach(student => {
          const gradeScore = student.grades[moduleIdStr];
          gradeMap.set(student.studentId, gradeScore ?? null);
        });
      }

      // Merge: lấy tất cả sinh viên enrolled, ghép với bài nộp (nếu có)
      const submissions: StudentSubmission[] = [];

      if (gradesData?.students) {
        gradesData.students.forEach(student => {
          const sub = submissionMap.get(student.studentId);
          const savedScore = gradeMap.get(student.studentId);

          if (sub) {
            // Sinh viên đã nộp bài - lấy điểm từ gradesData (CourseGrade), không từ submission
            const hasScore = savedScore !== null && savedScore !== undefined;
            submissions.push({
              studentId: sub.studentId,
              studentCode: sub.studentCode || student.studentCode,
              fullName: sub.studentName || student.fullName,
              email: student.email,
              enrollmentId: sub.enrollmentId,
              submittedAt: sub.submittedAt,
              score: savedScore ?? null,
              maxScore: sub.maxScore || maxScore,
              feedback: sub.feedback || null,
              gradedAt: sub.gradedAt || null,
              gradedBy: null,
              status: hasScore ? 'GRADED' : this.mapSubmissionStatus(sub.status, sub.isLate),
              fileUrl: sub.fileUrl,
              fileName: sub.fileName,
              fileType: sub.fileType,
              fileSize: sub.fileSize,
              studentNote: sub.studentNote,
              attemptNumber: sub.attemptNumber,
              isLate: sub.isLate
            });
          } else {
            // Sinh viên chưa nộp bài
            submissions.push({
              studentId: student.studentId,
              studentCode: student.studentCode,
              fullName: student.fullName,
              email: student.email,
              enrollmentId: 0,
              submittedAt: null,
              score: savedScore ?? null,
              maxScore: maxScore,
              feedback: null,
              gradedAt: null,
              gradedBy: null,
              status: 'NOT_SUBMITTED'
            });
          }
        });
      }

      this.submissions.set(submissions);
    } catch (error) {
      console.error('Error loading assignment submissions:', error);
      // Fallback to grade submissions
      await this.loadGradeSubmissions();
    }
  }

  mapSubmissionStatus(status: string, isLate?: boolean): StudentSubmission['status'] {
    if (isLate) return 'LATE';
    switch (status) {
      case 'SUBMITTED': return 'SUBMITTED';
      case 'GRADED': return 'GRADED';
      case 'RETURNED': return 'RETURNED';
      case 'RESUBMITTED': return 'RESUBMITTED';
      default: return 'NOT_SUBMITTED';
    }
  }

  async loadGradeSubmissions() {
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

  // Toggle instructions preview mode
  toggleInstructionsPreview() {
    this.instructionsPreviewMode.update(v => !v);
  }

  // Get current instructions content
  getInstructions(): string {
    const mod = this.module();
    if (!mod) return '';
    const settings = this.parseModuleSettings(mod);
    return settings.instructions || '';
  }

  async saveModuleSettings() {
    if (!this.module() || !this.courseId()) return;

    try {
      // Build settings object based on module type
      let settings: any = {};

      if (this.module()!.type === 'ASSIGNMENT') {
        settings = {
          dueDate: this.editDueDate || null,
          allowLateSubmission: this.editAllowLateSubmission,
          maxAttempts: this.editMaxAttempts,
          instructions: this.editInstructions || null
        };
      } else if (this.module()!.type === 'QUIZ') {
        settings = {
          ...this.editQuizSettings,
          instructions: this.editInstructions || null
        };
      } else if (this.module()!.type === 'VIDEO') {
        // VIDEO type can also have instructions
        settings = {
          instructions: this.editInstructions || null
        };
      } else if (this.module()!.type === 'RESOURCE') {
        // RESOURCE type can also have instructions
        settings = {
          instructions: this.editInstructions || null
        };
      }

      // Update module basic info + settings
      const updated = await this.courseService.updateModule(
        this.module()!.id,
        {
          title: this.editTitle,
          description: this.editDescription,
          resourceUrl: this.editResourceUrl,
          visible: this.editVisible,
          settings: Object.keys(settings).length > 0 ? settings : undefined
        } as any
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
          isShowInGradeTable: this.editIsShowInGradeTable,
          settings: settings
        } as any);
        this.isEditingSettings.set(false);

        // Update quiz settings signal for display
        if (this.module()!.type === 'QUIZ') {
          this.quizSettings.set({ ...this.editQuizSettings });
        }
      }
    } catch (error) {
      console.error('Error updating module:', error);
    }
  }

  cancelEditSettings() {
    this.isEditingSettings.set(false);
    if (this.module()) {
      this.initEditForm(this.module()!);
      // Reset editQuizSettings from quizSettings
      if (this.module()!.type === 'QUIZ') {
        this.editQuizSettings = { ...this.quizSettings() };
      }
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

  /**
   * Xem file bài nộp của sinh viên (mở trong tab mới)
   */
  viewSubmissionFile(submission: StudentSubmission) {
    if (!submission.fileUrl) return;
    // Sử dụng viewFileBlob để có authentication
    this.submissionService.viewFileBlob(submission.fileUrl).subscribe({
      error: (err) => console.error('Error viewing file:', err)
    });
  }

  /**
   * Download file bài nộp của sinh viên
   */
  downloadSubmissionFile(submission: StudentSubmission) {
    if (!submission.fileUrl) return;
    // Sử dụng downloadSubmissionFileBlob để có authentication
    this.submissionService.downloadSubmissionFileBlob(submission.fileUrl, submission.fileName).subscribe({
      error: (err) => console.error('Error downloading file:', err)
    });
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

  // Format date time for submission
  formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Get status badge variant
  getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'GRADED': return 'success';
      case 'SUBMITTED': return 'warning';
      case 'LATE': return 'danger';
      case 'RETURNED': return 'warning';
      case 'RESUBMITTED': return 'warning';
      default: return 'neutral';
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'NOT_SUBMITTED': 'Chưa nộp',
      'SUBMITTED': 'Đã nộp',
      'GRADED': 'Đã chấm',
      'LATE': 'Nộp trễ',
      'RETURNED': 'Trả lại',
      'RESUBMITTED': 'Nộp lại'
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
