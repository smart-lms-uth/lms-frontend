import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { CourseService, Course, Section, Module, QuizSettings, GradingMethod, QuestionSelectionMode, ExamDistributionMode, RandomQuestionConfig } from '../../services/course.service';
import { QuestionBankService, Chapter, Question } from '../../services/question-bank.service';
import { QuizService, QuizQuestion, AnswerRequest, RandomQuestionsRequest, AddQuestionsRequest } from '../../services/quiz.service';
import { AiService, GeneratedQuizQuestion } from '../../services/ai.service';
import { ActivityService } from '../../services/activity.service';
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
  newModuleResourceUrl: string = '';
  newModuleVisible: boolean = true;
  // Grade fields
  newModuleMaxScore: number | null = null;
  newModuleScoreWeight: number | null = null;
  newModuleGradeType: 'PROCESS' | 'FINAL' | null = null;
  newModuleIsShowInGradeTable: boolean = true;

  // ========== QUIZ SETTINGS ==========
  quizSettings: QuizSettings = this.getDefaultQuizSettings();

  // UI state for quiz settings tabs
  activeQuizTab: 'time' | 'attempt' | 'questions' | 'display' | 'review' | 'security' = 'time';

  // ========== QUESTION SELECTION STATE ==========
  availableChapters = signal<Chapter[]>([]);
  availableQuestions = signal<Question[]>([]);
  questionsLoading = signal(false);
  chaptersLoading = signal(false);
  selectedChapterIds: number[] = [];
  selectedQuestionIds: number[] = [];
  // Group questions by chapter for display
  questionsByChapter = signal<Map<number, Question[]>>(new Map());

  // ========== QUIZ PREVIEW STATE ==========
  showQuizPreview = signal(false);
  previewModule = signal<Module | null>(null);
  previewQuestions = signal<QuizQuestion[]>([]);
  previewLoading = signal(false);
  previewAnswers: Map<number, AnswerRequest> = new Map();
  previewCurrentQuestion = signal(0);
  previewShowResult = signal(false);

  // ========== AI QUIZ GENERATION STATE ==========
  showAiQuizModal = signal(false);
  aiQuizLoading = signal(false);
  aiQuizTopic: string = '';
  aiQuizNumQuestions: number = 10;
  aiQuizDifficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
  aiGeneratedQuestions = signal<GeneratedQuizQuestion[]>([]);
  aiSelectedQuestions: Set<number> = new Set();
  aiSavingToBank = signal(false);

  editModeService = inject(EditModeService);
  private questionBankService = inject(QuestionBankService);
  private quizService = inject(QuizService);
  private aiService = inject(AiService);
  private sanitizer = inject(DomSanitizer);

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private activityService: ActivityService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

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

          // Track section view activity
          this.activityService.trackSectionView(
            this.sectionId()!.toString(),
            currentSection.title || 'Chương',
            this.courseId()!.toString()
          );
        }
      }
    } catch {
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
    // Nếu không phải edit mode và là Quiz, hiển thị preview
    if (!this.editModeService.editMode() && module.type === 'QUIZ') {
      this.openQuizPreview(module);
      return;
    }
    this.router.navigate(['/teacher/courses', this.courseId(), 'sections', this.sectionId(), 'modules', module.id]);
  }

  // ========== QUIZ PREVIEW METHODS ==========

  async openQuizPreview(module: Module) {
    this.previewModule.set(module);
    this.showQuizPreview.set(true);
    this.previewLoading.set(true);
    this.previewAnswers.clear();
    this.previewCurrentQuestion.set(0);
    this.previewShowResult.set(false);

    try {
      const questions = await this.quizService.getQuizQuestions(module.id).toPromise();
      this.previewQuestions.set(questions || []);
    } catch {
      this.previewQuestions.set([]);
    } finally {
      this.previewLoading.set(false);
    }
  }

  closeQuizPreview() {
    this.showQuizPreview.set(false);
    this.previewModule.set(null);
    this.previewQuestions.set([]);
    this.previewAnswers.clear();
    this.previewShowResult.set(false);
  }

  selectPreviewAnswer(questionId: number, optionId: number, isMulti: boolean = false) {
    if (this.previewShowResult()) return;

    const existing = this.previewAnswers.get(questionId);

    if (isMulti) {
      // Multi-choice: toggle selection
      const currentIds = existing?.selectedOptionIds || [];
      const index = currentIds.indexOf(optionId);
      if (index > -1) {
        currentIds.splice(index, 1);
      } else {
        currentIds.push(optionId);
      }
      this.previewAnswers.set(questionId, { questionId, selectedOptionIds: [...currentIds] });
    } else {
      // Single choice: replace
      this.previewAnswers.set(questionId, { questionId, selectedOptionId: optionId });
    }
  }

  setPreviewFillAnswer(questionId: number, text: string) {
    if (this.previewShowResult()) return;
    this.previewAnswers.set(questionId, { questionId, textAnswer: text });
  }

  isPreviewOptionSelected(questionId: number, optionId: number): boolean {
    const answer = this.previewAnswers.get(questionId);
    if (!answer) return false;
    if (answer.selectedOptionId === optionId) return true;
    if (answer.selectedOptionIds?.includes(optionId)) return true;
    return false;
  }

  getPreviewFillAnswer(questionId: number): string {
    return this.previewAnswers.get(questionId)?.textAnswer || '';
  }

  goToPreviewQuestion(index: number) {
    if (index >= 0 && index < this.previewQuestions().length) {
      this.previewCurrentQuestion.set(index);
    }
  }

  submitPreviewQuiz() {
    this.previewShowResult.set(true);
  }

  resetPreviewQuiz() {
    this.previewAnswers.clear();
    this.previewCurrentQuestion.set(0);
    this.previewShowResult.set(false);
  }

  calculatePreviewScore(): { correct: number; total: number; score: number; maxScore: number } {
    let correct = 0;
    let score = 0;
    let maxScore = 0;

    this.previewQuestions().forEach(qq => {
      const answer = this.previewAnswers.get(qq.question.id);
      maxScore += qq.point;

      if (qq.question.type === 'SINGLE') {
        const correctOption = qq.question.options.find(o => o.isCorrect);
        if (correctOption && answer?.selectedOptionId === correctOption.id) {
          correct++;
          score += qq.point;
        }
      } else if (qq.question.type === 'MULTI') {
        const correctIds = qq.question.options.filter(o => o.isCorrect).map(o => o.id);
        const selectedIds = answer?.selectedOptionIds || [];
        if (correctIds.length === selectedIds.length &&
          correctIds.every(id => selectedIds.includes(id))) {
          correct++;
          score += qq.point;
        }
      } else if (qq.question.type === 'FILL') {
        // For fill, just check if answered (actual check needs BE logic)
        if (answer?.textAnswer) {
          // Simple check - could be improved
          correct++;
          score += qq.point;
        }
      }
    });

    return { correct, total: this.previewQuestions().length, score, maxScore };
  }

  isPreviewAnswerCorrect(questionId: number, optionId: number): boolean | null {
    if (!this.previewShowResult()) return null;
    const qq = this.previewQuestions().find(q => q.question.id === questionId);
    if (!qq) return null;
    return qq.question.options.find(o => o.id === optionId)?.isCorrect || false;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
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
  }

  async toggleVisibility() {
    if (!this.section()) return;

    try {
      await this.courseService.toggleSectionVisibility(this.sectionId()!).toPromise();
      await this.loadData();
    } catch {
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
    this.newModuleResourceUrl = module.resourceUrl || '';
    this.newModuleVisible = module.visible;
    // Grade fields
    this.newModuleMaxScore = module.maxScore ?? null;
    this.newModuleScoreWeight = module.scoreWeight ?? null;
    this.newModuleGradeType = module.gradeType ?? null;
    this.newModuleIsShowInGradeTable = module.isShowInGradeTable ?? true;
    // Quiz settings
    if (module.type === 'QUIZ' && module.settings) {
      this.quizSettings = { ...this.getDefaultQuizSettings(), ...module.settings };
    } else {
      this.quizSettings = this.getDefaultQuizSettings();
    }
    this.activeQuizTab = 'time';
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
    this.newModuleResourceUrl = '';
    this.newModuleVisible = true;
    // Grade fields
    this.newModuleMaxScore = null;
    this.newModuleScoreWeight = null;
    this.newModuleGradeType = null;
    this.newModuleIsShowInGradeTable = true;
    // Quiz settings
    this.quizSettings = this.getDefaultQuizSettings();
    this.activeQuizTab = 'time';
    // Question selection state
    this.selectedChapterIds = [];
    this.selectedQuestionIds = [];
    this.editingModule.set(null);
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

  // Check if current module type can have grades
  isGradeableType(): boolean {
    return this.newModuleType === 'ASSIGNMENT' || this.newModuleType === 'QUIZ';
  }

  // Check if quiz type
  isQuizType(): boolean {
    return this.newModuleType === 'QUIZ';
  }

  // Switch quiz settings tab
  setQuizTab(tab: 'time' | 'attempt' | 'questions' | 'display' | 'review' | 'security') {
    this.activeQuizTab = tab;
    // Load chapters and questions when switching to questions tab
    if (tab === 'questions' && this.course()?.subjectId) {
      this.loadChaptersAndQuestions();
    }
  }

  // ========== QUESTION SELECTION METHODS ==========

  async loadChaptersAndQuestions() {
    const subjectId = this.course()?.subjectId;
    if (!subjectId) return;

    this.chaptersLoading.set(true);
    this.questionsLoading.set(true);

    try {
      // Load chapters
      const chapters = await this.questionBankService.getChaptersBySubject(subjectId).toPromise();
      this.availableChapters.set(chapters || []);

      // Load all questions for the subject
      const questions = await this.questionBankService.getQuestions(subjectId).toPromise();
      this.availableQuestions.set(questions || []);

      // Group questions by chapter
      this.groupQuestionsByChapter(questions || []);
    } catch {
    } finally {
      this.chaptersLoading.set(false);
      this.questionsLoading.set(false);
    }
  }

  groupQuestionsByChapter(questions: Question[]) {
    const grouped = new Map<number, Question[]>();
    // Group for questions with chapters
    questions.forEach(q => {
      const chapterId = q.chapterId || 0; // 0 for questions without chapter
      if (!grouped.has(chapterId)) {
        grouped.set(chapterId, []);
      }
      grouped.get(chapterId)!.push(q);
    });
    this.questionsByChapter.set(grouped);
  }

  // Toggle chapter selection for random mode
  toggleChapterSelection(chapterId: number) {
    const index = this.selectedChapterIds.indexOf(chapterId);
    if (index > -1) {
      this.selectedChapterIds.splice(index, 1);
    } else {
      this.selectedChapterIds.push(chapterId);
    }
    // Update randomConfig
    if (!this.quizSettings.randomConfig) {
      this.quizSettings.randomConfig = {};
    }
    this.quizSettings.randomConfig.fromChapterIds = [...this.selectedChapterIds];
  }

  isChapterSelected(chapterId: number): boolean {
    return this.selectedChapterIds.includes(chapterId);
  }

  // Toggle question selection for manual mode
  toggleQuestionSelection(questionId: number) {
    const index = this.selectedQuestionIds.indexOf(questionId);
    if (index > -1) {
      this.selectedQuestionIds.splice(index, 1);
    } else {
      this.selectedQuestionIds.push(questionId);
    }
    // Update settings
    this.quizSettings.selectedQuestionIds = [...this.selectedQuestionIds];
  }

  isQuestionSelected(questionId: number): boolean {
    return this.selectedQuestionIds.includes(questionId);
  }

  // Get questions for a specific chapter
  getQuestionsForChapter(chapterId: number): Question[] {
    return this.questionsByChapter().get(chapterId) || [];
  }

  // Get total count based on random config
  getRandomTotalCount(): number {
    const config = this.quizSettings.randomConfig;
    if (!config) return 0;
    return (config.easyCount || 0) + (config.mediumCount || 0) + (config.hardCount || 0);
  }

  // Init random config if not exists
  initRandomConfig() {
    if (!this.quizSettings.randomConfig) {
      this.quizSettings.randomConfig = {
        fromChapterIds: [],
        easyCount: 0,
        mediumCount: 0,
        hardCount: 0
      };
    }
  }

  // Get question level badge class
  getLevelBadgeClass(level: string): string {
    switch (level) {
      case 'EASY': return 'badge--easy';
      case 'MEDIUM': return 'badge--medium';
      case 'HARD': return 'badge--hard';
      default: return '';
    }
  }

  // Get question level display name
  getLevelDisplayName(level: string): string {
    switch (level) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'TB';
      case 'HARD': return 'Khó';
      default: return level;
    }
  }

  // ========== AI QUIZ GENERATION METHODS ==========

  openAiQuizModal() {
    this.showAiQuizModal.set(true);
    this.aiQuizTopic = '';
    this.aiQuizNumQuestions = 10;
    this.aiQuizDifficulty = 'MEDIUM';
    this.aiGeneratedQuestions.set([]);
    this.aiSelectedQuestions.clear();
  }

  closeAiQuizModal() {
    this.showAiQuizModal.set(false);
    this.aiGeneratedQuestions.set([]);
    this.aiSelectedQuestions.clear();
  }

  async generateQuestionsWithAi() {
    if (!this.aiQuizTopic.trim()) {
      alert('Vui lòng nhập chủ đề câu hỏi!');
      return;
    }

    this.aiQuizLoading.set(true);
    this.aiGeneratedQuestions.set([]);
    this.aiSelectedQuestions.clear();

    try {
      const response = await this.aiService.generateQuizQuestions({
        topic: this.aiQuizTopic.trim(),
        subjectName: this.course()?.subjectName || 'Môn học',
        numQuestions: this.aiQuizNumQuestions,
        difficulty: this.aiQuizDifficulty
      }).toPromise();

      if (response?.success && response.data?.questions) {
        this.aiGeneratedQuestions.set(response.data.questions);
        // Select all questions by default
        response.data.questions.forEach((_, index) => {
          this.aiSelectedQuestions.add(index);
        });
      } else {
        alert('Không thể tạo câu hỏi. Vui lòng thử lại!');
      }
    } catch (error) {
      console.error('Error generating AI questions:', error);
      alert('Có lỗi xảy ra khi tạo câu hỏi với AI!');
    } finally {
      this.aiQuizLoading.set(false);
    }
  }

  toggleAiQuestionSelection(index: number) {
    if (this.aiSelectedQuestions.has(index)) {
      this.aiSelectedQuestions.delete(index);
    } else {
      this.aiSelectedQuestions.add(index);
    }
  }

  isAiQuestionSelected(index: number): boolean {
    return this.aiSelectedQuestions.has(index);
  }

  selectAllAiQuestions() {
    this.aiGeneratedQuestions().forEach((_, index) => {
      this.aiSelectedQuestions.add(index);
    });
  }

  deselectAllAiQuestions() {
    this.aiSelectedQuestions.clear();
  }

  async saveAiQuestionsToBank() {
    if (this.aiSelectedQuestions.size === 0) {
      alert('Vui lòng chọn ít nhất một câu hỏi!');
      return;
    }

    const subjectId = this.course()?.subjectId;
    if (!subjectId) {
      alert('Không tìm thấy thông tin môn học!');
      return;
    }

    this.aiSavingToBank.set(true);

    try {
      const selectedQuestions = this.aiGeneratedQuestions()
        .filter((_, index) => this.aiSelectedQuestions.has(index));

      let savedCount = 0;
      for (const q of selectedQuestions) {
        try {
          const questionData = {
            content: q.content,
            type: q.type,
            level: q.level,
            options: q.options.map((opt, idx) => ({
              content: opt.content,
              isCorrect: opt.isCorrect,
              orderIndex: idx + 1
            }))
          };

          await this.questionBankService.createQuestion(subjectId, questionData).toPromise();
          savedCount++;
        } catch (e) {
          console.error('Error saving question:', e);
        }
      }

      alert(`Đã lưu ${savedCount}/${selectedQuestions.length} câu hỏi vào ngân hàng đề!`);

      // Reload questions list
      await this.loadChaptersAndQuestions();

      this.closeAiQuizModal();
    } catch (error) {
      console.error('Error saving questions:', error);
      alert('Có lỗi xảy ra khi lưu câu hỏi!');
    } finally {
      this.aiSavingToBank.set(false);
    }
  }

  async addAiQuestionsDirectlyToQuiz() {
    if (this.aiSelectedQuestions.size === 0) {
      alert('Vui lòng chọn ít nhất một câu hỏi!');
      return;
    }

    // First save to bank, then will be available for selection
    await this.saveAiQuestionsToBank();
  }

  async addQuizQuestions(moduleId: number) {
    try {
      const mode = this.quizSettings.questionSelectionMode;

      if (mode === 'RANDOM' || mode === 'MIXED') {
        const config = this.quizSettings.randomConfig;

        if (config && (config.easyCount || config.mediumCount || config.hardCount)) {
          const request = {
            fromChapterIds: config.fromChapterIds,
            easyCount: config.easyCount || 0,
            mediumCount: config.mediumCount || 0,
            hardCount: config.hardCount || 0,
            pointPerQuestion: 1.0
          };

          await this.quizService.addRandomQuestionsToQuiz(moduleId, request).toPromise();
        }
      }

      if (mode === 'MANUAL' || mode === 'MIXED') {
        if (this.selectedQuestionIds.length > 0) {
          const questions = this.selectedQuestionIds.map((qId, index) => ({
            questionId: qId,
            point: 1.0,
            orderIndex: index + 1
          }));

          await this.quizService.addQuestionsToQuiz(moduleId, { questions }).toPromise();
        }
      }
    } catch {
    }
  }

  async saveModule() {
    if (!this.newModuleTitle.trim()) return;

    try {
      const moduleData: any = {
        title: this.newModuleTitle.trim(),
        description: this.newModuleDescription.trim(),
        type: this.newModuleType,
        resourceUrl: this.newModuleResourceUrl.trim() || undefined,
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

      // Add quiz settings if it's a quiz
      if (this.isQuizType()) {
        moduleData.settings = this.quizSettings;
      }

      let savedModule: Module | undefined;

      if (this.editingModule()) {
        savedModule = await this.courseService.updateModule(this.editingModule()!.id, moduleData).toPromise();
      } else {
        savedModule = await this.courseService.createModule(this.sectionId()!, moduleData).toPromise();
      }

      if (savedModule && this.isQuizType()) {
        await this.addQuizQuestions(savedModule.id);
      }

      this.closeModuleModal();
      await this.loadData();
    } catch {
      alert('Có lỗi xảy ra khi lưu module!');
    }
  }

  async deleteModule(module: Module) {
    if (confirm(`Bạn có chắc chắn muốn xóa module "${module.title}"?`)) {
      try {
        await this.courseService.deleteModule(module.id).toPromise();
        await this.loadData();
      } catch {
        alert('Có lỗi xảy ra khi xóa module!');
      }
    }
  }

  async toggleModuleVisibility(module: Module) {
    try {
      await this.courseService.toggleModuleVisibility(module.id).toPromise();
      await this.loadData();
    } catch {
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

      alert('Đã lưu thứ tự thành công!');
    } catch {
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
