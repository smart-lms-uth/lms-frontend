import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizService, QuizQuestion, StartQuizResponse, SubmissionResult, AnswerRequest, SubmissionSummary } from '../../services/quiz.service';
import { CourseService, Course, Section, Module } from '../../services/course.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent, BadgeComponent, BreadcrumbComponent, BreadcrumbItem } from '../../components/ui';

interface UserAnswer {
  questionId: number;
  selectedOptionId?: number;
  selectedOptionIds?: number[];
  textAnswer?: string;
}

@Component({
  selector: 'app-student-quiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    BreadcrumbComponent
  ],
  templateUrl: './student-quiz.component.html',
  styleUrls: ['./student-quiz.component.scss']
})
export class StudentQuizComponent implements OnInit, OnDestroy {
  // Loading states
  loading = signal(true);
  starting = signal(false);
  submitting = signal(false);
  
  // Course/Module info
  course = signal<Course | null>(null);
  section = signal<Section | null>(null);
  module = signal<Module | null>(null);
  
  courseId = signal<number | null>(null);
  sectionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  
  // Quiz states
  quizState = signal<'intro' | 'taking' | 'result'>('intro');
  
  // Quiz data
  submissionId = signal<number | null>(null);
  questions = signal<QuizQuestion[]>([]);
  timeLimit = signal<number>(0); // minutes
  attemptNumber = signal<number>(1);
  startedAt = signal<Date | null>(null);
  passingScore = signal<number>(50); // default 50%
  
  // Timer
  remainingSeconds = signal<number>(0);
  timerInterval: any = null;
  
  // Current question
  currentQuestionIndex = signal<number>(0);
  
  // User answers
  userAnswers = signal<Map<number, UserAnswer>>(new Map());
  
  // Submission history
  submissions = signal<SubmissionSummary[]>([]);
  
  // Result
  result = signal<SubmissionResult | null>(null);
  
  // Breadcrumb
  breadcrumbItems = signal<BreadcrumbItem[]>([]);
  
  // Computed values
  currentQuestion = computed(() => {
    const qs = this.questions();
    const idx = this.currentQuestionIndex();
    return qs[idx] || null;
  });
  
  totalQuestions = computed(() => this.questions().length);
  
  answeredCount = computed(() => {
    const answers = this.userAnswers();
    let count = 0;
    answers.forEach((answer) => {
      if (this.isAnswered(answer)) count++;
    });
    return count;
  });
  
  totalPoints = computed(() => {
    return this.questions().reduce((sum, q) => sum + q.point, 0);
  });
  
  formattedTime = computed(() => {
    const secs = this.remainingSeconds();
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  });
  
  isTimeWarning = computed(() => {
    const secs = this.remainingSeconds();
    return secs <= 300; // 5 minutes warning
  });
  
  isTimeCritical = computed(() => {
    const secs = this.remainingSeconds();
    return secs <= 60; // 1 minute critical
  });

  constructor(
    private quizService: QuizService,
    private courseService: CourseService,
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

  ngOnDestroy() {
    this.stopTimer();
  }

  async loadData() {
    this.loading.set(true);
    
    try {
      // Load course info
      const course = await this.courseService.getCourseById(this.courseId()!).toPromise();
      this.course.set(course || null);

      // Load section and module info
      const sections = await this.courseService.getSectionsByCourse(this.courseId()!).toPromise();
      if (sections) {
        const section = sections.find(s => s.id === this.sectionId());
        if (section) {
          const modules = await this.courseService.getModulesBySection(section.id).toPromise();
          section.modules = modules || [];
          this.section.set(section);
          
          const module = section.modules?.find(m => m.id === this.moduleId());
          if (module) {
            this.module.set(module);
          }
        }
      }
      
      // Update breadcrumb
      this.updateBreadcrumb();
      
      // Load submission history
      await this.loadSubmissions();
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadSubmissions() {
    try {
      const submissions = await this.quizService.getMySubmissions(this.moduleId()!).toPromise();
      this.submissions.set(submissions || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  }

  updateBreadcrumb() {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', link: '/dashboard' }
    ];
    
    if (this.course()) {
      items.push({
        label: this.course()!.subjectName,
        link: `/student/courses/${this.courseId()}`
      });
    }
    
    if (this.section()) {
      items.push({
        label: this.section()!.title,
        link: `/student/courses/${this.courseId()}/sections/${this.sectionId()}`
      });
    }
    
    if (this.module()) {
      items.push({
        label: this.module()!.title
      });
    }
    
    this.breadcrumbItems.set(items);
  }

  // ============ QUIZ ACTIONS ============

  async startQuiz() {
    if (this.starting()) return;
    
    this.starting.set(true);
    
    try {
      const response = await this.quizService.startQuiz(this.moduleId()!).toPromise();
      if (response) {
        this.submissionId.set(response.submissionId);
        this.questions.set(response.questions);
        this.timeLimit.set(response.timeLimit);
        this.attemptNumber.set(response.attemptNumber);
        this.startedAt.set(new Date(response.startedAt));
        
        // Initialize timer
        this.remainingSeconds.set(response.timeLimit * 60);
        this.startTimer();
        
        // Initialize user answers
        const answers = new Map<number, UserAnswer>();
        response.questions.forEach(q => {
          answers.set(q.questionId, {
            questionId: q.questionId,
            selectedOptionIds: []
          });
        });
        this.userAnswers.set(answers);
        
        // Switch to taking state
        this.quizState.set('taking');
        this.currentQuestionIndex.set(0);
      }
    } catch (error: any) {
      console.error('Error starting quiz:', error);
      alert(error?.error?.message || 'Không thể bắt đầu bài kiểm tra. Vui lòng thử lại.');
    } finally {
      this.starting.set(false);
    }
  }

  async submitQuiz() {
    if (this.submitting()) return;
    
    const unanswered = this.totalQuestions() - this.answeredCount();
    if (unanswered > 0) {
      const confirm = window.confirm(
        `Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài?`
      );
      if (!confirm) return;
    }
    
    this.submitting.set(true);
    this.stopTimer();
    
    try {
      const answers: AnswerRequest[] = [];
      this.userAnswers().forEach((answer, questionId) => {
        answers.push({
          questionId: questionId,
          selectedOptionId: answer.selectedOptionId,
          selectedOptionIds: answer.selectedOptionIds,
          textAnswer: answer.textAnswer
        });
      });
      
      const result = await this.quizService.submitQuiz(
        this.submissionId()!,
        { answers }
      ).toPromise();
      
      if (result) {
        this.result.set(result);
        this.quizState.set('result');
      }
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      alert(error?.error?.message || 'Không thể nộp bài. Vui lòng thử lại.');
    } finally {
      this.submitting.set(false);
    }
  }

  // ============ TIMER ============

  startTimer() {
    this.timerInterval = setInterval(() => {
      const remaining = this.remainingSeconds();
      if (remaining <= 0) {
        this.stopTimer();
        this.submitQuiz(); // Auto submit when time's up
      } else {
        this.remainingSeconds.set(remaining - 1);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ============ NAVIGATION ============

  goToQuestion(index: number) {
    if (index >= 0 && index < this.totalQuestions()) {
      this.currentQuestionIndex.set(index);
    }
  }

  nextQuestion() {
    const next = this.currentQuestionIndex() + 1;
    if (next < this.totalQuestions()) {
      this.currentQuestionIndex.set(next);
    }
  }

  prevQuestion() {
    const prev = this.currentQuestionIndex() - 1;
    if (prev >= 0) {
      this.currentQuestionIndex.set(prev);
    }
  }

  // ============ ANSWER HANDLING ============

  selectOption(questionId: number, optionId: number, questionType: string) {
    const answers = new Map(this.userAnswers());
    const current = answers.get(questionId) || { questionId, selectedOptionIds: [] };
    
    if (questionType === 'SINGLE') {
      current.selectedOptionId = optionId;
      current.selectedOptionIds = [optionId];
    } else if (questionType === 'MULTI') {
      const ids = current.selectedOptionIds || [];
      const index = ids.indexOf(optionId);
      if (index === -1) {
        ids.push(optionId);
      } else {
        ids.splice(index, 1);
      }
      current.selectedOptionIds = ids;
    }
    
    answers.set(questionId, current);
    this.userAnswers.set(answers);
    
    // Auto-save
    this.autoSaveAnswer(current);
  }

  updateTextAnswer(questionId: number, text: string) {
    const answers = new Map(this.userAnswers());
    const current = answers.get(questionId) || { questionId };
    current.textAnswer = text;
    answers.set(questionId, current);
    this.userAnswers.set(answers);
    
    // Auto-save (debounced in real app)
    this.autoSaveAnswer(current);
  }

  async autoSaveAnswer(answer: UserAnswer) {
    try {
      await this.quizService.saveAnswer(this.submissionId()!, {
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        selectedOptionIds: answer.selectedOptionIds,
        textAnswer: answer.textAnswer
      }).toPromise();
    } catch (error) {
      console.error('Error auto-saving answer:', error);
    }
  }

  isOptionSelected(questionId: number, optionId: number): boolean {
    const answer = this.userAnswers().get(questionId);
    if (!answer) return false;
    
    if (answer.selectedOptionId === optionId) return true;
    if (answer.selectedOptionIds?.includes(optionId)) return true;
    return false;
  }

  isAnswered(answer: UserAnswer): boolean {
    if (answer.selectedOptionId) return true;
    if (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) return true;
    if (answer.textAnswer && answer.textAnswer.trim().length > 0) return true;
    return false;
  }

  isQuestionAnswered(questionId: number): boolean {
    const answer = this.userAnswers().get(questionId);
    if (!answer) return false;
    return this.isAnswered(answer);
  }

  // ============ VIEW RESULT ============

  async viewResult(submissionId: number) {
    try {
      const result = await this.quizService.getSubmissionResult(submissionId).toPromise();
      if (result) {
        this.result.set(result);
        this.quizState.set('result');
      }
    } catch (error) {
      console.error('Error loading result:', error);
    }
  }

  retryQuiz() {
    this.quizState.set('intro');
    this.result.set(null);
    this.loadSubmissions();
  }

  goBack() {
    this.router.navigate([
      '/student/courses', this.courseId(),
      'sections', this.sectionId(),
      'modules', this.moduleId()
    ]);
  }

  // ============ HELPERS ============

  getScoreClass(percentage: number): string {
    if (percentage >= 80) return 'score--excellent';
    if (percentage >= 60) return 'score--good';
    if (percentage >= 40) return 'score--average';
    return 'score--poor';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'IN_PROGRESS': 'Đang làm',
      'SUBMITTED': 'Đã nộp',
      'GRADED': 'Đã chấm'
    };
    return labels[status] || status;
  }

  getStatusVariant(status: string): 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' {
    const variants: Record<string, any> = {
      'IN_PROGRESS': 'warning',
      'SUBMITTED': 'primary',
      'GRADED': 'success'
    };
    return variants[status] || 'secondary';
  }

  formatTimeSpent(seconds: number): string {
    return this.quizService.formatTimeSpent(seconds);
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
}
