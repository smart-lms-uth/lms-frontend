import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  QuestionBankService, 
  Question, 
  QuestionRequest,
  QuestionType, 
  QuestionLevel, 
  QuestionBankStats,
  Subject,
  Chapter,
  QuestionOption,
  XmlPreviewResponse
} from '../../services/question-bank.service';
import { AuthService } from '../../services/auth.service';
import { MainLayoutComponent } from '../../components/layout/main-layout/main-layout.component';
import { CardComponent } from '../../components/ui/card/card.component';
import { BadgeComponent } from '../../components/ui/badge/badge.component';
import { BreadcrumbComponent } from '../../components/ui/breadcrumb/breadcrumb.component';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-teacher-question-bank',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MainLayoutComponent,
    CardComponent,
    BadgeComponent,
    BreadcrumbComponent
  ],
  templateUrl: './teacher-question-bank.html',
  styleUrl: './teacher-question-bank.scss'
})
export class TeacherQuestionBankComponent implements OnInit {
  private nav = inject(NavigationService);
  
  // State
  loading = signal(false);
  subjects = signal<Subject[]>([]);
  chapters = signal<Chapter[]>([]);
  questions = signal<Question[]>([]);
  stats = signal<QuestionBankStats | null>(null);
  
  // Selected values
  selectedSubjectId = signal<number | null>(null);
  selectedChapterId = signal<number | null>(null);
  selectedType = signal<QuestionType | null>(null);
  selectedLevel = signal<QuestionLevel | null>(null);
  searchKeyword = signal('');
  
  // Modal state
  showQuestionModal = signal(false);
  editingQuestion = signal<Question | null>(null);
  
  // Form fields
  formContent = '';
  formType: QuestionType = 'SINGLE';
  formLevel: QuestionLevel = 'MEDIUM';
  formChapterId: number | null = null;
  formExplanation = '';
  formImageUrl = '';
  formOptions: { content: string; isCorrect: boolean }[] = [
    { content: '', isCorrect: true },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false }
  ];
  
  // Delete confirmation
  showDeleteConfirm = signal(false);
  questionToDelete = signal<Question | null>(null);
  
  // XML Import state
  showXmlImportModal = signal(false);
  xmlFile = signal<File | null>(null);
  xmlPreviewData = signal<XmlPreviewResponse | null>(null);
  xmlImportLoading = signal(false);
  xmlImportError = signal<string | null>(null);
  
  // Computed
  selectedSubject = computed(() => {
    const id = this.selectedSubjectId();
    return this.subjects().find(s => s.id === id) || null;
  });
  
  filteredQuestions = computed(() => {
    let result = this.questions();
    const keyword = this.searchKeyword().toLowerCase();
    
    if (keyword) {
      result = result.filter(q => 
        q.content.toLowerCase().includes(keyword) ||
        q.options.some(o => o.content.toLowerCase().includes(keyword))
      );
    }
    
    return result;
  });

  constructor(
    private questionBankService: QuestionBankService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSubjects();
  }

  async loadSubjects() {
    this.loading.set(true);
    try {
      const subjects = await this.questionBankService.getActiveSubjects().toPromise();
      this.subjects.set(subjects || []);
      
      // Auto-select first subject if available
      if (subjects && subjects.length > 0) {
        this.selectSubject(subjects[0].id);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async selectSubject(subjectId: number) {
    this.selectedSubjectId.set(subjectId);
    this.selectedChapterId.set(null);
    this.loading.set(true);
    
    try {
      // Load chapters and questions in parallel
      const [chapters, questions, stats] = await Promise.all([
        this.questionBankService.getChaptersBySubject(subjectId).toPromise(),
        this.questionBankService.getQuestions(subjectId).toPromise(),
        this.questionBankService.getStats(subjectId).toPromise()
      ]);
      
      this.chapters.set(chapters || []);
      this.questions.set(questions || []);
      this.stats.set(stats || null);
    } catch (error) {
      console.error('Error loading subject data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilters() {
    const subjectId = this.selectedSubjectId();
    if (!subjectId) return;
    
    this.loading.set(true);
    try {
      const questions = await this.questionBankService.getQuestions(
        subjectId,
        this.selectedChapterId() || undefined,
        this.selectedType() || undefined,
        this.selectedLevel() || undefined
      ).toPromise();
      
      this.questions.set(questions || []);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      this.loading.set(false);
    }
  }

  clearFilters() {
    this.selectedChapterId.set(null);
    this.selectedType.set(null);
    this.selectedLevel.set(null);
    this.searchKeyword.set('');
    this.applyFilters();
  }

  // Modal functions
  openCreateModal() {
    this.editingQuestion.set(null);
    this.resetForm();
    this.showQuestionModal.set(true);
  }

  openEditModal(question: Question) {
    this.editingQuestion.set(question);
    this.formContent = question.content;
    this.formType = question.type;
    this.formLevel = question.level;
    this.formChapterId = question.chapterId || null;
    this.formExplanation = question.explanation || '';
    this.formImageUrl = question.imageUrl || '';
    this.formOptions = question.options.map(o => ({
      content: o.content,
      isCorrect: o.isCorrect
    }));
    
    // Ensure at least 4 options
    while (this.formOptions.length < 4) {
      this.formOptions.push({ content: '', isCorrect: false });
    }
    
    this.showQuestionModal.set(true);
  }

  closeModal() {
    this.showQuestionModal.set(false);
    this.editingQuestion.set(null);
    this.resetForm();
  }

  resetForm() {
    this.formContent = '';
    this.formType = 'SINGLE';
    this.formLevel = 'MEDIUM';
    this.formChapterId = null;
    this.formExplanation = '';
    this.formImageUrl = '';
    this.formOptions = [
      { content: '', isCorrect: true },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false }
    ];
  }

  addOption() {
    this.formOptions.push({ content: '', isCorrect: false });
  }

  removeOption(index: number) {
    if (this.formOptions.length > 2) {
      this.formOptions.splice(index, 1);
    }
  }

  setCorrectOption(index: number) {
    if (this.formType === 'SINGLE') {
      // For single choice, only one option can be correct
      this.formOptions.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    } else {
      // For multi choice, toggle the option
      this.formOptions[index].isCorrect = !this.formOptions[index].isCorrect;
    }
  }

  async saveQuestion() {
    const subjectId = this.selectedSubjectId();
    if (!subjectId || !this.formContent.trim()) return;
    
    // Validate options
    const validOptions = this.formOptions.filter(o => o.content.trim());
    if (validOptions.length < 2) {
      alert('Cần ít nhất 2 đáp án');
      return;
    }
    
    if (!validOptions.some(o => o.isCorrect)) {
      alert('Cần chọn ít nhất 1 đáp án đúng');
      return;
    }
    
    const request: QuestionRequest = {
      content: this.formContent,
      type: this.formType,
      level: this.formLevel,
      chapterId: this.formChapterId || undefined,
      explanation: this.formExplanation || undefined,
      imageUrl: this.formImageUrl || undefined,
      options: validOptions.map((o, i) => ({
        content: o.content,
        isCorrect: o.isCorrect,
        orderIndex: i
      }))
    };
    
    try {
      const editing = this.editingQuestion();
      if (editing) {
        await this.questionBankService.updateQuestion(subjectId, editing.id, request).toPromise();
      } else {
        await this.questionBankService.createQuestion(subjectId, request).toPromise();
      }
      
      this.closeModal();
      this.applyFilters();
      
      // Refresh stats
      const stats = await this.questionBankService.getStats(subjectId).toPromise();
      this.stats.set(stats || null);
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Lỗi khi lưu câu hỏi');
    }
  }

  // Delete functions
  confirmDelete(question: Question) {
    this.questionToDelete.set(question);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.questionToDelete.set(null);
    this.showDeleteConfirm.set(false);
  }

  async deleteQuestion() {
    const question = this.questionToDelete();
    const subjectId = this.selectedSubjectId();
    if (!question || !subjectId) return;
    
    try {
      await this.questionBankService.deleteQuestion(subjectId, question.id).toPromise();
      this.cancelDelete();
      this.applyFilters();
      
      // Refresh stats
      const stats = await this.questionBankService.getStats(subjectId).toPromise();
      this.stats.set(stats || null);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Lỗi khi xóa câu hỏi');
    }
  }

  // Helper methods
  getTypeLabel(type: QuestionType): string {
    return this.questionBankService.getTypeLabel(type);
  }

  getLevelLabel(level: QuestionLevel): string {
    return this.questionBankService.getLevelLabel(level);
  }

  getLevelClass(level: QuestionLevel): string {
    return this.questionBankService.getLevelClass(level);
  }

  getBreadcrumbs() {
    return [
      { label: 'Trang chủ', link: this.nav.getDashboardUrl() },
      { label: 'Ngân hàng câu hỏi', link: '' }
    ];
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
  }

  trackByQuestion(index: number, question: Question): number {
    return question.id;
  }

  trackByOption(index: number): number {
    return index;
  }

  // ============ XML Import Functions ============
  
  openXmlImportModal() {
    this.xmlFile.set(null);
    this.xmlPreviewData.set(null);
    this.xmlImportError.set(null);
    this.showXmlImportModal.set(true);
  }

  closeXmlImportModal() {
    this.showXmlImportModal.set(false);
    this.xmlFile.set(null);
    this.xmlPreviewData.set(null);
    this.xmlImportError.set(null);
  }

  onXmlFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.name.endsWith('.xml')) {
        this.xmlFile.set(file);
        this.xmlImportError.set(null);
        this.previewXmlFile();
      } else {
        this.xmlImportError.set('Vui lòng chọn file XML');
        this.xmlFile.set(null);
      }
    }
  }

  async previewXmlFile() {
    const file = this.xmlFile();
    const subjectId = this.selectedSubjectId();
    if (!file || !subjectId) return;
    
    this.xmlImportLoading.set(true);
    this.xmlImportError.set(null);
    
    try {
      const result = await this.questionBankService.previewXmlImport(subjectId, file).toPromise();
      this.xmlPreviewData.set(result || null);
      
      if (result && !result.valid && result.validationErrors.length > 0) {
        this.xmlImportError.set(result.validationErrors.join('\n'));
      }
    } catch (error: any) {
      console.error('Error previewing XML:', error);
      this.xmlImportError.set(error.error?.message || 'Lỗi khi đọc file XML');
      this.xmlPreviewData.set(null);
    } finally {
      this.xmlImportLoading.set(false);
    }
  }

  async confirmXmlImport() {
    const file = this.xmlFile();
    const subjectId = this.selectedSubjectId();
    if (!file || !subjectId) return;
    
    this.xmlImportLoading.set(true);
    
    try {
      const result = await this.questionBankService.importXmlQuestions(subjectId, file).toPromise();
      
      if (result) {
        alert(`Import thành công!\n- Tổng: ${result.total}\n- Thành công: ${result.success}\n- Thất bại: ${result.failed}`);
        
        if (result.errors && result.errors.length > 0) {
          console.warn('Import errors:', result.errors);
        }
      }
      
      this.closeXmlImportModal();
      this.applyFilters();
      
      // Refresh stats
      const stats = await this.questionBankService.getStats(subjectId).toPromise();
      this.stats.set(stats || null);
    } catch (error: any) {
      console.error('Error importing XML:', error);
      this.xmlImportError.set(error.error?.message || 'Lỗi khi import file XML');
    } finally {
      this.xmlImportLoading.set(false);
    }
  }

  async downloadXmlTemplate() {
    const subjectId = this.selectedSubjectId();
    if (!subjectId) return;
    
    try {
      const template = await this.questionBankService.getXmlTemplate(subjectId).toPromise();
      if (template) {
        const blob = new Blob([template], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_template.xml';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Lỗi khi tải template');
    }
  }
}
