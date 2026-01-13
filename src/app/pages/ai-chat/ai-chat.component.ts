import { Component, OnInit, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink, RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { AiChatService } from '../../services/ai-chat.service';
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';

// Import child components
import {
  AiChatPanelComponent,
  ChatMode,
  ChatMessage,
  SuggestedQuestion,
  FileUploadEvent
} from './components/ai-chat-panel/ai-chat-panel.component';
import {
  AiCoursePreviewComponent,
  CoursePreview,
  CoursePreviewModule,
  CoursePreviewSection
} from './components/ai-course-preview/ai-course-preview.component';
import {
  AiModuleConfigModalComponent,
  ModuleConfigContext
} from './components/ai-module-config-modal/ai-module-config-modal.component';
import {
  AiCreateCourseModalComponent,
  CreateCourseFromAIData
} from './components/ai-create-course-modal/ai-create-course-modal.component';

// Preview Tab Interface
export interface PreviewTab {
  id: string;
  type: 'course' | 'quiz' | 'lecture' | 'assignment' | 'chat';
  title: string;
  icon: string;
  data: any;
  messageId: string; // Link to chat message
  timestamp: Date;
}

// Chat Session Interface
export interface ChatSession {
  id: string;
  title: string;
  preview?: string;
  timestamp: Date;
  messageCount: number;
  mode: ChatMode;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MarkdownPipe,
    MarkdownModule,
    RouterModule,
    RouterLink,
    AiChatPanelComponent,
    AiCoursePreviewComponent,
    AiModuleConfigModalComponent,
    AiCreateCourseModalComponent
  ],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent implements OnInit {
  @ViewChild(AiChatPanelComponent) chatPanel!: AiChatPanelComponent;

  messages: ChatMessage[] = [];
  isLoading = false;
  isSaving = false;
  currentMode: ChatMode = 'chat';

  // Course Preview
  coursePreview: CoursePreview | null = null;

  // Module Configuration Modal
  showModuleConfig = false;
  moduleConfigContext: ModuleConfigContext | null = null;

  quizPreview: any = null;
  quizViewMode: 'preview' | 'code' = 'preview';
  lecturePreview: any = null;
  assignmentPreview: any = null;

  showHistorySidebar = true;
  chatSessions: ChatSession[] = [];
  currentSessionId: string | null = null;
  isLoadingHistory = false;

  previewTabs: PreviewTab[] = [];
  activeTabId: string | null = null;

  selectedFile: File | null = null;
  isUploadingFile = false;

  // Edit existing course mode
  editingCourseId: number | null = null;
  editingCourse: any = null;
  isLoadingCourse = false;

  // Create new course modal
  showCreateCourseModal = false;

  backLink = '/dashboard';

  constructor(
    private aiChatService: AiChatService,
    private courseService: CourseService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      const role = user?.role?.toUpperCase();
      if (role === 'TEACHER') this.backLink = '/teacher/dashboard';
      else if (role === 'ADMIN') this.backLink = '/admin/dashboard';
      else this.backLink = '/dashboard';
    });
    this.loadChatSessions();
    this.checkQueryParams();
  }

  private checkQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      const courseId = params['courseId'];

      if (mode === 'edit-course' && courseId) {
        this.editingCourseId = parseInt(courseId, 10);
        this.loadExistingCourse(this.editingCourseId);
      } else {
        this.startNewSession();
      }
    });
  }

  private loadExistingCourse(courseId: number): void {
    this.isLoadingCourse = true;
    this.currentMode = 'course';

    // Load course structure from course service
    this.courseService.getCourseStructure(courseId).subscribe({
      next: (response: any) => {
        this.editingCourse = response;

        // Convert to CoursePreview format
        this.coursePreview = this.convertToCoursePreview(response);

        // Add to preview tabs
        this.addPreviewTab('course', response.subjectName || 'Khóa học', this.coursePreview, 'initial');

        // Add welcome message for editing mode
        const welcomeMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: `🎓 **Đang chỉnh sửa khóa học: ${response.subjectName || response.courseCode}**

Khóa học hiện có **${response.sections?.length || 0} chương** và **${this.countModules(response)} bài học**.

Bạn có thể yêu cầu tôi chỉnh sửa, ví dụ:
- "Thêm 2 buổi về Machine Learning"
- "Đổi buổi 5 thành kiểm tra giữa kỳ"
- "Thêm quiz vào cuối mỗi chương"
- "Bỏ chương cuối cùng"

Hãy cho tôi biết bạn muốn thay đổi gì!`,
          timestamp: new Date()
        };
        this.messages = [welcomeMessage];

        this.isLoadingCourse = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading course:', error);
        this.isLoadingCourse = false;

        const errorMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: `❌ Không thể tải khóa học. Vui lòng thử lại sau.`,
          timestamp: new Date()
        };
        this.messages = [errorMessage];
        this.startNewSession();
        this.cdr.detectChanges();
      }
    });
  }

  private convertToCoursePreview(course: any): CoursePreview {
    return {
      name: course.subjectName || course.courseCode || 'Khóa học',
      description: course.subjectDescription || '',
      objectives: [],
      sections: (course.sections || []).map((section: any) => ({
        id: section.id, // Giữ lại ID để update
        title: section.title,
        description: section.description || '',
        modules: (section.modules || []).map((module: any) => ({
          id: module.id, // Giữ lại ID để update
          title: module.title,
          type: module.type || 'RESOURCE',
          description: module.description || '',
          assignmentInstructions: module.settings?.instructions || module.assignmentInstructions || ''
        })),
        collapsed: false
      }))
    };
  }

  private countModules(course: any): number {
    return (course.sections || []).reduce(
      (sum: number, s: any) => sum + (s.modules?.length || 0), 0
    );
  }

  loadChatSessions(): void {
    this.isLoadingHistory = true;
    const user = this.authService.getCurrentUserSync();
    const userId = user?.id?.toString() || 'anonymous';

    this.aiChatService.getChatSessions(userId).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.sessions) {
          this.chatSessions = response.data.sessions.map((s: any) => ({
            id: s.session_id || s.id,
            title: s.title || 'Cuộc hội thoại',
            preview: s.preview || s.last_message || '',
            timestamp: new Date(s.timestamp || s.created_at),
            messageCount: s.message_count || 0,
            mode: s.mode || 'chat'
          }));
        }
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  startNewSession(): void {
    this.currentSessionId = this.generateId();
    this.messages = [];
    this.clearAllPreviews();
    this.previewTabs = [];
    this.activeTabId = null;
    this.cdr.detectChanges();
  }

  loadSession(session: ChatSession): void {
    this.currentSessionId = session.id;
    this.isLoadingHistory = true;

    const user = this.authService.getCurrentUserSync();
    const userId = user?.id?.toString() || 'anonymous';

    this.aiChatService.getChatHistory(userId, session.id).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.history) {
          this.messages = response.data.history.map((m: any) => ({
            id: m.id || this.generateId(),
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            previewData: m.preview_data, // If message has associated preview
            previewType: m.preview_type
          }));

          // Rebuild preview tabs from messages with previews
          this.rebuildPreviewTabsFromMessages();
        }
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteSession(session: ChatSession, event: Event): void {
    event.stopPropagation();
    if (!confirm('Xóa cuộc hội thoại này?')) return;

    const user = this.authService.getCurrentUserSync();
    const userId = user?.id?.toString() || 'anonymous';

    this.aiChatService.clearChatHistory(userId, session.id).subscribe({
      next: () => {
        this.chatSessions = this.chatSessions.filter(s => s.id !== session.id);
        if (this.currentSessionId === session.id) {
          this.startNewSession();
        }
        this.cdr.detectChanges();
      }
    });
  }

  toggleHistorySidebar(): void {
    this.showHistorySidebar = !this.showHistorySidebar;
  }

  addPreviewTab(type: PreviewTab['type'], title: string, data: any, messageId: string): void {
    const icons = {
      course: '📚',
      quiz: '❓',
      lecture: '📝',
      assignment: '📋',
      chat: '💬'
    };

    const tab: PreviewTab = {
      id: this.generateId(),
      type,
      title: title.length > 30 ? title.substring(0, 30) + '...' : title,
      icon: icons[type],
      data,
      messageId,
      timestamp: new Date()
    };

    this.previewTabs.push(tab);
    this.activeTabId = tab.id;
    this.setActivePreviewFromTab(tab);
    this.cdr.detectChanges();
  }

  selectTab(tab: PreviewTab): void {
    this.activeTabId = tab.id;
    this.setActivePreviewFromTab(tab);
    this.cdr.detectChanges();
  }

  closeTab(tab: PreviewTab, event: Event): void {
    event.stopPropagation();
    const index = this.previewTabs.findIndex(t => t.id === tab.id);
    this.previewTabs = this.previewTabs.filter(t => t.id !== tab.id);

    if (this.activeTabId === tab.id) {
      // Select previous tab or clear
      if (this.previewTabs.length > 0) {
        const newIndex = Math.min(index, this.previewTabs.length - 1);
        this.selectTab(this.previewTabs[newIndex]);
      } else {
        this.activeTabId = null;
        this.clearAllPreviews();
      }
    }
    this.cdr.detectChanges();
  }

  private setActivePreviewFromTab(tab: PreviewTab): void {
    this.clearAllPreviews();
    switch (tab.type) {
      case 'course':
        this.coursePreview = tab.data;
        break;
      case 'quiz':
        this.quizPreview = tab.data;
        break;
      case 'lecture':
        this.lecturePreview = tab.data;
        break;
      case 'assignment':
        this.assignmentPreview = tab.data;
        break;
    }
  }

  private clearAllPreviews(): void {
    this.coursePreview = null;
    this.quizPreview = null;
    this.lecturePreview = null;
    this.assignmentPreview = null;
  }

  private rebuildPreviewTabsFromMessages(): void {
    this.previewTabs = [];
    this.messages.forEach(msg => {
      if ((msg as any).previewData && (msg as any).previewType) {
        this.addPreviewTab(
          (msg as any).previewType,
          this.getPreviewTitle((msg as any).previewData, (msg as any).previewType),
          (msg as any).previewData,
          msg.id
        );
      }
    });
  }

  private getPreviewTitle(data: any, type: string): string {
    switch (type) {
      case 'course':
        return data?.name || data?.course_name || 'Khóa học';
      case 'quiz':
        return data?.topic || 'Quiz';
      case 'lecture':
        return data?.title || data?.lecture_title || 'Bài giảng';
      case 'assignment':
        return data?.title || 'Bài tập';
      default:
        return 'Preview';
    }
  }

  // Preview button click from chat message
  onOpenPreview(message: ChatMessage): void {
    const msgAny = message as any;
    if (msgAny.previewData && msgAny.previewType) {
      // Check if tab already exists
      const existing = this.previewTabs.find(t => t.messageId === message.id);
      if (existing) {
        this.selectTab(existing);
      } else {
        this.addPreviewTab(
          msgAny.previewType,
          this.getPreviewTitle(msgAny.previewData, msgAny.previewType),
          msgAny.previewData,
          message.id
        );
      }
    }
  }

  hasPreview(message: ChatMessage): boolean {
    const msgAny = message as any;
    return !!(msgAny.previewData && msgAny.previewType);
  }

  getActiveTab(): PreviewTab | null {
    return this.previewTabs.find(t => t.id === this.activeTabId) || null;
  }

  onModeChange(mode: ChatMode): void {
    this.currentMode = mode;
    // Clear previews when changing mode
    if (mode !== 'course') this.coursePreview = null;
    if (mode !== 'quiz') this.quizPreview = null;
    if (mode !== 'lecture') this.lecturePreview = null;
    if (mode !== 'assignment') this.assignmentPreview = null;
  }

  onSendMessage(message: string): void {
    if (!message.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    this.messages = [...this.messages, userMessage, typingMessage];
    this.isLoading = true;
    this.scrollChatToBottom();
    this.cdr.detectChanges();

    // Call appropriate API based on mode
    switch (this.currentMode) {
      case 'course':
        this.coursePreview
          ? this.callModifyCourseAPI(message)
          : this.callCourseCreatorAPI(message);
        break;
      case 'quiz':
        this.quizPreview
          ? this.callModifyQuizAPI(message)
          : this.callQuizGeneratorAPI(message);
        break;
      case 'lecture':
        this.lecturePreview
          ? this.callModifyLectureAPI(message)
          : this.callLectureGeneratorAPI(message);
        break;
      case 'assignment':
        this.assignmentPreview
          ? this.callModifyAssignmentAPI(message)
          : this.callAssignmentGeneratorAPI(message);
        break;
      default:
        this.callChatAPI(message);
    }
  }

  onClearChat(): void {
    this.messages = [];
    this.clearAllPreviews();
    this.previewTabs = [];
    this.activeTabId = null;
  }

  onSendMessageWithFile(event: FileUploadEvent): void {
    if (this.isLoading) return;

    const { file, message } = event;

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: `📎 **${file.name}**\n\n${message}`,
      timestamp: new Date(),
      fileName: file.name
    };

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    this.messages = [...this.messages, userMessage, typingMessage];
    this.isLoading = true;
    this.isUploadingFile = true;
    this.scrollChatToBottom();
    this.cdr.detectChanges();

    this.aiChatService.chatWithFile(file, message, this.currentSessionId || undefined).subscribe({
      next: (response: any) => {
        this.messages = this.messages.filter(m => m.id !== 'typing');

        const responseContent = response.success
          ? (response.data?.answer || response.data?.response || response.message || 'Đã phân tích file.')
          : (response.message || 'Có lỗi khi phân tích file.');

        const aiMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date()
        };

        this.messages = [...this.messages, aiMessage];
        this.isLoading = false;
        this.isUploadingFile = false;
        this.scrollChatToBottom();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.messages = this.messages.filter(m => m.id !== 'typing');

        const errorMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: `❌ Lỗi: ${error.message || 'Không thể phân tích file'}`,
          timestamp: new Date()
        };

        this.messages = [...this.messages, errorMessage];
        this.isLoading = false;
        this.isUploadingFile = false;
        this.scrollChatToBottom();
        this.cdr.detectChanges();
      }
    });
  }

  onResetPreview(): void {
    // Only clear current active preview, keep tab
    if (this.activeTabId) {
      this.closeTab(this.previewTabs.find(t => t.id === this.activeTabId)!, new Event('click'));
    } else {
      this.clearAllPreviews();
    }
  }

  onSaveCourse(): void {
    if (!this.coursePreview || this.isSaving) return;
    this.isSaving = true;

    const savingMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: this.editingCourseId
        ? '⏳ Đang cập nhật khóa học...'
        : '⏳ Đang tạo khóa học...',
      timestamp: new Date()
    };
    this.messages = [...this.messages, savingMessage];
    this.cdr.detectChanges();

    if (this.editingCourseId) {
      // Update existing course
      this.saveCourseChanges(savingMessage.id);
    } else {
      // Create new course - need course selection flow
      this.showCreateCourseFlow(savingMessage.id);
    }
  }

  onCreateNewCourse(): void {
    if (!this.coursePreview || this.isSaving) return;
    // Always show modal for creating new course
    this.showCreateCourseModal = true;
    this.cdr.detectChanges();
  }

  private saveCourseChanges(savingMessageId: string): void {
    if (!this.coursePreview || !this.editingCourseId) return;

    // Convert preview back to sections/modules format for API
    // Gửi kèm ID để update thay vì tạo mới
    const updatePayload = {
      courseId: this.editingCourseId,
      aiPrompt: this.getLastUserMessage(),
      aiModel: 'gemini-2.0-flash',
      replaceExisting: false, // Không xóa, chỉ upsert
      course: {
        courseName: this.coursePreview.name,
        description: this.coursePreview.description,
        sections: this.coursePreview.sections.map((section, sIndex) => ({
          id: section.id, // ID để update section có sẵn
          title: section.title,
          description: section.description || '',
          orderIndex: sIndex,
          modules: section.modules.map((module, mIndex) => ({
            id: module.id, // ID để update module có sẵn
            title: module.title,
            type: module.type,
            description: module.description || '',
            orderIndex: mIndex,
            estimatedDuration: 30,
            instructions: module.assignmentInstructions || undefined,
            // Gửi quiz questions nếu là module QUIZ
            questions: module.type === 'QUIZ' && module.quizQuestions?.length
              ? module.quizQuestions.map((q: any) => ({
                content: q.content || q.question,
                type: q.type || 'SINGLE',
                level: q.level || 'MEDIUM',
                explanation: q.explanation || '',
                options: (q.options || q.answers || []).map((opt: any) => ({
                  content: opt.content || opt.text || opt,
                  isCorrect: opt.isCorrect || opt.is_correct || false
                }))
              }))
              : undefined
          }))
        }))
      }
    };

    this.courseService.importAiCourseStructure(updatePayload).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.messages = this.messages.filter(m => m.id !== savingMessageId);

        const created = response.data?.sectionsCreated || 0;
        const updated = response.data?.sectionsUpdated || 0;
        const modulesCreated = response.data?.modulesCreated || 0;
        const modulesUpdated = response.data?.modulesUpdated || 0;

        const successMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: `✅ Đã cập nhật khóa học thành công!
          
📊 **Kết quả:**
- Sections: ${created} mới, ${updated} cập nhật
- Modules: ${modulesCreated} mới, ${modulesUpdated} cập nhật

Bạn có thể tiếp tục chỉnh sửa hoặc [quay về khóa học](/teacher/courses/${this.editingCourseId}).`,
          timestamp: new Date()
        };
        this.messages = [...this.messages, successMessage];
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSaving = false;
        this.messages = this.messages.filter(m => m.id !== savingMessageId);

        const errorMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: `❌ Lỗi khi cập nhật: ${error.message || 'Vui lòng thử lại'}`,
          timestamp: new Date()
        };
        this.messages = [...this.messages, errorMessage];
        this.cdr.detectChanges();
      }
    });
  }

  private showCreateCourseFlow(savingMessageId: string): void {
    // Show create course modal
    this.isSaving = false;
    this.messages = this.messages.filter(m => m.id !== savingMessageId);
    this.showCreateCourseModal = true;
    this.cdr.detectChanges();
  }

  onCloseCreateCourseModal(): void {
    this.showCreateCourseModal = false;
  }

  onCreateCourseFromModal(data: CreateCourseFromAIData): void {
    if (!this.coursePreview) return;

    this.isSaving = true;

    // Step 1: Create the course
    const createRequest = {
      courseCode: data.courseCode,
      subjectId: data.subjectId,
      semesterId: data.semesterId,
      instructorId: data.instructorId,
      room: data.room,
      maxStudents: data.maxStudents,
      status: data.status
    };

    this.courseService.createCourse(createRequest).subscribe({
      next: (course: any) => {
        // Step 2: Import AI structure to the new course
        const importPayload = {
          courseId: course.id,
          aiPrompt: this.getLastUserMessage(),
          aiModel: 'gemini-2.5-flash-preview',
          replaceExisting: true,
          course: {
            courseName: this.coursePreview!.name,
            description: this.coursePreview!.description,
            sections: this.coursePreview!.sections.map((section, sIndex) => ({
              title: section.title,
              description: section.description || '',
              orderIndex: sIndex,
              modules: section.modules.map((module, mIndex) => ({
                title: module.title,
                type: module.type,
                description: module.description || '',
                orderIndex: mIndex,
                estimatedDuration: 30,
                instructions: module.assignmentInstructions || undefined,
                // Gửi quiz questions nếu là module QUIZ
                questions: module.type === 'QUIZ' && module.quizQuestions?.length
                  ? module.quizQuestions.map((q: any) => ({
                    content: q.content || q.question,
                    type: q.type || 'SINGLE',
                    level: q.level || 'MEDIUM',
                    explanation: q.explanation || '',
                    options: (q.options || q.answers || []).map((opt: any) => ({
                      content: opt.content || opt.text || opt,
                      isCorrect: opt.isCorrect || opt.is_correct || false
                    }))
                  }))
                  : undefined
              }))
            }))
          }
        };

        this.courseService.importAiCourseStructure(importPayload).subscribe({
          next: (response: any) => {
            this.isSaving = false;
            this.showCreateCourseModal = false;

            const successMessage: ChatMessage = {
              id: this.generateId(),
              role: 'assistant',
              content: `✅ **Đã tạo khóa học thành công!**

📚 **${this.coursePreview!.name}**
- Mã khóa học: \`${data.courseCode}\`
- Sections: ${response.data?.sectionsCreated || this.coursePreview!.sections.length} chương
- Modules: ${response.data?.modulesCreated || this.countTotalModules()} bài học

👉 [Xem khóa học](/teacher/courses/${course.id})`,
              timestamp: new Date()
            };
            this.messages = [...this.messages, successMessage];
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.handleCreateCourseError(error, 'import');
          }
        });
      },
      error: (error) => {
        this.handleCreateCourseError(error, 'create');
      }
    });
  }

  private handleCreateCourseError(error: any, step: string): void {
    this.isSaving = false;
    this.showCreateCourseModal = false;

    const errorMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: `❌ Lỗi khi ${step === 'create' ? 'tạo' : 'import nội dung'} khóa học: ${error.message || error.error?.message || 'Vui lòng thử lại'}`,
      timestamp: new Date()
    };
    this.messages = [...this.messages, errorMessage];
    this.cdr.detectChanges();
  }

  countTotalModules(): number {
    if (!this.coursePreview) return 0;
    return this.coursePreview.sections.reduce((total, section) => total + section.modules.length, 0);
  }

  private getLastUserMessage(): string {
    const userMessages = this.messages.filter(m => m.role === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
  }

  onOpenModuleConfig(event: { sectionIndex: number; moduleIndex: number }): void {
    if (!this.coursePreview) return;

    const module = this.coursePreview.sections[event.sectionIndex].modules[event.moduleIndex];
    this.moduleConfigContext = {
      sectionIndex: event.sectionIndex,
      moduleIndex: event.moduleIndex,
      module: { ...module }
    };
    this.showModuleConfig = true;
  }

  onCloseModuleConfig(): void {
    this.showModuleConfig = false;
    this.moduleConfigContext = null;
  }

  onSaveModuleConfig(context: ModuleConfigContext): void {
    if (!this.coursePreview) return;

    this.coursePreview.sections[context.sectionIndex].modules[context.moduleIndex] = context.module;
    this.showModuleConfig = false;
    this.moduleConfigContext = null;
    this.cdr.detectChanges();
  }

  private parseCoursePrompt(prompt: string): { subjectName: string; description: string; numSections: number } {
    // Gửi nguyên prompt cho AI tự phân tích
    // AI sẽ tự trích xuất tên khóa học và số buổi từ prompt

    console.log(`📚 Sending prompt to AI for analysis: "${prompt}"`);

    return {
      subjectName: prompt, // Gửi nguyên prompt, AI sẽ tự extract tên
      description: prompt, // Full prompt for AI to understand context
      numSections: 5       // Default, AI sẽ tự parse từ prompt
    };
  }

  /**
   * Parse prompt để extract thông tin quiz
   */
  private parseQuizPrompt(prompt: string): { topic: string; numQuestions: number; difficulty: string } {
    // Extract số câu hỏi
    // Patterns: "50 câu", "50 câu hỏi", "50 câu hỏi trắc nghiệm", "50 questions"
    const questionPatterns = [
      /(\d+)\s*câu\s*(?:hỏi)?(?:\s*trắc\s*nghiệm)?/i,  // 50 câu hỏi trắc nghiệm
      /(\d+)\s*questions?/i,                            // 50 questions
      /tạo\s*(\d+)\s*câu/i,                             // tạo 50 câu
    ];

    let numQuestions = 10; // default
    for (const pattern of questionPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        console.log(`🔍 Quiz pattern matched: "${match[0]}" => ${num} questions`);
        if (!isNaN(num) && num >= 1 && num <= 100) {
          numQuestions = num;
          break;
        }
      }
    }

    // Extract độ khó
    let difficulty = 'MEDIUM';
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('dễ') || lowerPrompt.includes('easy') || lowerPrompt.includes('cơ bản')) {
      difficulty = 'EASY';
    } else if (lowerPrompt.includes('khó') || lowerPrompt.includes('hard') || lowerPrompt.includes('nâng cao')) {
      difficulty = 'HARD';
    }

    console.log(`❓ Parsed quiz: numQuestions=${numQuestions}, difficulty=${difficulty}`);

    return {
      topic: prompt, // Full prompt as topic for AI to understand context
      numQuestions,
      difficulty
    };
  }

  private callChatAPI(question: string): void {
    this.aiChatService.chat(question).subscribe({
      next: (response: any) => this.handleChatResponse(response),
      error: (error) => this.handleAPIError(error)
    });
  }

  private callCourseCreatorAPI(question: string): void {
    // Parse prompt để extract thông tin
    const parsed = this.parseCoursePrompt(question);
    console.log('📚 Parsed course prompt:', parsed);

    this.aiChatService.generateCourse(parsed.subjectName, parsed.description, parsed.numSections).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const messageId = this.generateId();
          let previewData = null;

          if (response.success && response.data) {
            const courseData = response.data;
            previewData = {
              name: courseData.courseName || courseData.course_name || courseData.subject_name || parsed.subjectName,
              description: courseData.description || '',
              objectives: courseData.learning_objectives || courseData.objectives || [],
              sections: (courseData.sections || []).map((s: any) => ({
                title: s.title || s.section_title,
                description: s.description || '',
                collapsed: false,
                modules: (s.modules || s.lectures || []).map((m: any) => ({
                  title: m.title || m.lecture_title || m.module_title,
                  type: this.mapModuleType(m.type || m.module_type || 'TEXT'),
                  description: m.description || ''
                }))
              }))
            };
          }

          const assistantMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: response.message || `Đã tạo cấu trúc khóa học với ${parsed.numSections} buổi. Bạn có thể xem và chỉnh sửa ở bên phải.`,
            timestamp: new Date(),
            ...(previewData && { previewData, previewType: 'course' })
          } as any;

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (previewData) {
            this.coursePreview = previewData;
            this.addPreviewTab('course', previewData.name || 'Khóa học', previewData, messageId);
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private callQuizGeneratorAPI(question: string): void {
    // Parse prompt để extract thông tin
    const parsed = this.parseQuizPrompt(question);
    console.log('❓ Parsed quiz prompt:', parsed);

    this.aiChatService.generateQuiz(parsed.topic, parsed.topic, parsed.numQuestions, parsed.difficulty).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const messageId = this.generateId();
          let previewData = null;

          if (response.success && response.data) {
            previewData = response.data;
          }

          const assistantMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: response.message || `Đã tạo ${parsed.numQuestions} câu hỏi quiz.`,
            timestamp: new Date(),
            ...(previewData && { previewData, previewType: 'quiz' })
          } as any;

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (previewData) {
            this.quizPreview = previewData;
            this.addPreviewTab('quiz', previewData.topic || 'Quiz', previewData, messageId);
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private callLectureGeneratorAPI(question: string): void {
    this.aiChatService.generateLecture(question).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const messageId = this.generateId();
          let previewData = null;

          if (response.success && response.data) {
            previewData = response.data;
          }

          const assistantMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: response.message || 'Đã tạo nội dung bài giảng.',
            timestamp: new Date(),
            ...(previewData && { previewData, previewType: 'lecture' })
          } as any;

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (previewData) {
            this.lecturePreview = previewData;
            this.addPreviewTab('lecture', previewData.title || previewData.lecture_title || 'Bài giảng', previewData, messageId);
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private callAssignmentGeneratorAPI(question: string): void {
    this.aiChatService.generateAssignment(question).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const messageId = this.generateId();
          let previewData = null;

          if (response.success && response.data) {
            previewData = response.data;
          }

          const assistantMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: response.message || 'Đã tạo đề bài tập.',
            timestamp: new Date(),
            ...(previewData && { previewData, previewType: 'assignment' })
          } as any;

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (previewData) {
            this.assignmentPreview = previewData;
            this.addPreviewTab('assignment', previewData.title || 'Bài tập', previewData, messageId);
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private callModifyCourseAPI(request: string): void {
    // CRITICAL: Gửi ID để AI biết section/module nào đang sửa
    const currentCourse = {
      course_name: this.coursePreview?.name,
      description: this.coursePreview?.description,
      learning_objectives: this.coursePreview?.objectives,
      sections: this.coursePreview?.sections?.map(s => ({
        id: s.id, // ⚠️ QUAN TRỌNG: Giữ lại ID để update đúng
        title: s.title,
        description: s.description,
        modules: s.modules?.map(m => ({
          id: m.id, // ⚠️ QUAN TRỌNG: Giữ lại ID để update đúng
          title: m.title,
          type: m.type,
          description: m.description,
          assignmentInstructions: m.assignmentInstructions
        }))
      }))
    };

    this.aiChatService.modifyCourse(request, currentCourse).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: response.message || 'Đã cập nhật khóa học theo yêu cầu.',
            timestamp: new Date()
          };

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (response.success && response.data) {
            const courseData = response.data;
            const oldSections = this.coursePreview?.sections || [];

            // Parse sections từ response, cố gắng match ID với sections cũ
            const newSections = (courseData.sections || []).map((s: any, sIndex: number) => {
              // Tìm section cũ có cùng ID hoặc cùng vị trí
              const matchedOldSection = s.id
                ? oldSections.find(old => old.id === s.id)
                : oldSections[sIndex];

              const oldModules = matchedOldSection?.modules || [];

              return {
                id: s.id || matchedOldSection?.id, // Giữ ID nếu có
                title: s.title || s.section_title,
                description: s.description || '',
                collapsed: false,
                modules: (s.modules || s.lectures || []).map((m: any, mIndex: number) => {
                  // Tìm module cũ có cùng ID hoặc cùng vị trí
                  const matchedOldModule = m.id
                    ? oldModules.find((old: any) => old.id === m.id)
                    : oldModules[mIndex];

                  return {
                    id: m.id || matchedOldModule?.id, // Giữ ID nếu có
                    title: m.title || m.lecture_title || m.module_title,
                    type: this.mapModuleType(m.type || m.module_type || 'TEXT'),
                    description: m.description || '',
                    assignmentInstructions: m.instructions || m.assignmentInstructions || matchedOldModule?.assignmentInstructions || '',
                    quizQuestions: m.questions || matchedOldModule?.quizQuestions
                  };
                })
              };
            });

            this.coursePreview = {
              name: courseData.course_name || this.coursePreview?.name || '',
              description: courseData.description || this.coursePreview?.description || '',
              objectives: courseData.learning_objectives || this.coursePreview?.objectives || [],
              sections: newSections
            };
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private callModifyQuizAPI(request: string): void {
    this.aiChatService.modifyQuiz(request, this.quizPreview).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: response.message || 'Đã cập nhật quiz theo yêu cầu.',
            timestamp: new Date()
          };

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (response.success && response.data) {
            this.quizPreview = response.data;
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private callModifyLectureAPI(request: string): void {
    this.aiChatService.modifyLecture(request, this.lecturePreview).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: response.message || 'Đã cập nhật bài giảng theo yêu cầu.',
            timestamp: new Date()
          };

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (response.success && response.data) {
            this.lecturePreview = response.data;
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private callModifyAssignmentAPI(request: string): void {
    this.aiChatService.modifyAssignment(request, this.assignmentPreview).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: response.message || 'Đã cập nhật bài tập theo yêu cầu.',
            timestamp: new Date()
          };

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;

          if (response.success && response.data) {
            this.assignmentPreview = response.data;
          }

          this.scrollChatToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (error) => this.handleAPIError(error)
    });
  }

  private handleChatResponse(response: any): void {
    this.ngZone.run(() => {
      this.messages = this.messages.filter(m => m.id !== 'typing');

      const content = response.success
        ? (response.data?.answer || response.data?.response || response.message || 'Đây là phản hồi từ AI.')
        : (response.message || 'Xin lỗi, đã có lỗi xảy ra.');

      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: content,
        timestamp: new Date()
      };

      this.messages = [...this.messages, assistantMessage];
      this.isLoading = false;
      this.scrollChatToBottom();
      this.cdr.detectChanges();
    });
  }

  private handleAPIError(error: any): void {
    console.error('[AI Chat] Error:', error);

    this.ngZone.run(() => {
      this.messages = this.messages.filter(m => m.id !== 'typing');

      // Detect rate limit error
      let errorContent = 'Xin lỗi, đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.';

      const errorStr = JSON.stringify(error).toLowerCase();
      if (error?.status === 429 || errorStr.includes('429') || errorStr.includes('rate') || errorStr.includes('quota')) {
        errorContent = '⚠️ **API đang bị giới hạn (rate limit)**\n\nBạn đã gửi quá nhiều yêu cầu. Vui lòng đợi **1-2 phút** rồi thử lại.\n\n💡 *Mẹo: Nếu dùng bản miễn phí của Gemini, giới hạn là ~15 request/phút.*';
      } else if (error?.error?.message) {
        errorContent = `❌ Lỗi: ${error.error.message}`;
      }

      const errorMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };

      this.messages = [...this.messages, errorMessage];
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  isCorrectAnswer(question: any, option: any, optionIndex: number): boolean {
    if (question.correctAnswer !== undefined) {
      if (typeof question.correctAnswer === 'number') {
        return question.correctAnswer === optionIndex;
      }
      return question.correctAnswer === option || question.correctAnswer === option.text;
    }
    if (question.correct_answer !== undefined) {
      if (typeof question.correct_answer === 'number') {
        return question.correct_answer === optionIndex;
      }
      return question.correct_answer === option || question.correct_answer === option.text;
    }
    if (option.isCorrect !== undefined) return option.isCorrect;
    if (option.is_correct !== undefined) return option.is_correct;
    return false;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  toggleQuizViewMode(): void {
    this.quizViewMode = this.quizViewMode === 'preview' ? 'code' : 'preview';
  }

  copyQuiz(): void {
    if (!this.quizPreview) return;
    navigator.clipboard.writeText(JSON.stringify(this.quizPreview, null, 2));
  }

  copyLecture(): void {
    if (!this.lecturePreview) return;
    navigator.clipboard.writeText(JSON.stringify(this.lecturePreview, null, 2));
  }

  copyAssignment(): void {
    if (!this.assignmentPreview) return;
    navigator.clipboard.writeText(JSON.stringify(this.assignmentPreview, null, 2));
  }

  private mapModuleType(type: string): 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' {
    const typeMap: { [key: string]: 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' } = {
      'video': 'VIDEO', 'VIDEO': 'VIDEO',
      'document': 'DOCUMENT', 'DOCUMENT': 'DOCUMENT', 'pdf': 'DOCUMENT',
      'quiz': 'QUIZ', 'QUIZ': 'QUIZ',
      'assignment': 'ASSIGNMENT', 'ASSIGNMENT': 'ASSIGNMENT',
      'text': 'TEXT', 'TEXT': 'TEXT', 'lecture': 'TEXT'
    };
    return typeMap[type] || 'TEXT';
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      if (this.chatPanel) {
        this.chatPanel.scrollToBottom();
      }
    }, 100);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
