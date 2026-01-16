import { Component, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { AiChatService, ChatMessage, ChatRequest, ChatContext } from '../../services/ai-chat.service';
import { CourseService, Section, CreateLivestreamRequest } from '../../services/course.service';
import { GoogleOAuthService } from '../../services/google-oauth.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../ui/toast/toast.service';
import { Subscription, filter } from 'rxjs';

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedLivestreamData {
  title: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  platform: string;
  preparation_tips?: string[];
}

interface CourseContextInfo {
  courseId: number;
  courseName: string;
  sectionId?: number;
  moduleId?: number;
  sections?: Section[];
}

interface DroppedContext {
  type: 'section' | 'module';
  id: number;
  title: string;
  sectionId?: number;
}

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss']
})
export class ChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  private router = inject(Router);
  private courseService = inject(CourseService);
  private toastService = inject(ToastService);
  private googleOAuthService = inject(GoogleOAuthService);
  private authService = inject(AuthService);

  isOpen = signal(false);
  isLoading = signal(false);
  hasUnread = signal(false);
  messages = signal<WidgetMessage[]>([]);
  currentCourse = signal<CourseContextInfo | null>(null);
  isDragOver = signal(false);
  droppedContext = signal<DroppedContext | null>(null);
  suggestedActions = signal<{ icon: string, text: string }[]>([]);
  inputMessage = '';

  private shouldScrollToBottom = false;
  private chatHistory: ChatMessage[] = [];
  private routerSubscription?: Subscription;
  private contextEventHandler = (e: Event) => this.handleContextEvent(e as CustomEvent);

  constructor(private aiChatService: AiChatService) { }

  ngOnInit() {
    this.loadMessages();
    this.detectCourseContext();
    this.detectSuggestedActions();
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.detectCourseContext();
      this.detectSuggestedActions();
    });

    window.addEventListener('chat-widget-context', this.contextEventHandler);
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    window.removeEventListener('chat-widget-context', this.contextEventHandler);
  }

  private handleContextEvent(event: CustomEvent<DroppedContext>) {
    if (event.detail) {
      this.droppedContext.set(event.detail);
      this.isOpen.set(true);
      setTimeout(() => this.messageInput?.nativeElement?.focus(), 100);
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private detectCourseContext() {
    const url = this.router.url;
    const courseMatch = url.match(/\/(teacher|student)\/courses\/(\d+)/);
    const sectionMatch = url.match(/\/sections\/(\d+)/);
    const moduleMatch = url.match(/\/modules\/(\d+)/);

    if (courseMatch) {
      const courseId = parseInt(courseMatch[2], 10);
      const currentContext = this.currentCourse();
      if (!currentContext || currentContext.courseId !== courseId) {
        this.courseService.getCourseById(courseId).subscribe({
          next: (course) => {
            this.courseService.getSectionsByCourse(courseId).subscribe({
              next: (sections) => {
                this.currentCourse.set({
                  courseId: course.id,
                  courseName: course.subjectName,
                  sectionId: sectionMatch ? parseInt(sectionMatch[1], 10) : undefined,
                  moduleId: moduleMatch ? parseInt(moduleMatch[1], 10) : undefined,
                  sections: sections
                });
              },
              error: () => {
                this.currentCourse.set({
                  courseId: course.id,
                  courseName: course.subjectName,
                  sectionId: sectionMatch ? parseInt(sectionMatch[1], 10) : undefined,
                  moduleId: moduleMatch ? parseInt(moduleMatch[1], 10) : undefined,
                  sections: []
                });
              }
            });
          },
          error: () => {
            this.currentCourse.set(null);
          }
        });
      } else if (currentContext) {
        this.currentCourse.set({
          ...currentContext,
          sectionId: sectionMatch ? parseInt(sectionMatch[1], 10) : undefined,
          moduleId: moduleMatch ? parseInt(moduleMatch[1], 10) : undefined
        });
      }
    } else {
      this.currentCourse.set(null);
    }
  }

  private detectSuggestedActions() {
    const url = this.router.url;
    const droppedCtx = this.droppedContext();

    // Nếu đang có dropped context, gợi ý actions cho context đó
    if (droppedCtx) {
      if (droppedCtx.type === 'module') {
        this.suggestedActions.set([
          { icon: '✏️', text: 'Cải thiện mô tả module này' },
          { icon: '📝', text: 'Tạo thêm câu hỏi quiz' },
          { icon: '📚', text: 'Thêm tài liệu tham khảo' },
          { icon: '🔄', text: 'Tạo bài tập tương tự' }
        ]);
      } else if (droppedCtx.type === 'section') {
        this.suggestedActions.set([
          { icon: '➕', text: 'Thêm module mới vào chương' },
          { icon: '📖', text: 'Tạo bài giảng từ AI' },
          { icon: '📊', text: 'Tạo quiz cho chương này' }
        ]);
      }
      return;
    }

    // Gợi ý dựa trên route hiện tại
    if (url.includes('/modules/') || url.includes('/module/')) {
      this.suggestedActions.set([
        { icon: '✏️', text: 'Cải thiện mô tả module' },
        { icon: '📝', text: 'Tạo thêm câu hỏi' },
        { icon: '📚', text: 'Thêm tài liệu tham khảo' }
      ]);
    } else if (url.includes('/grades')) {
      this.suggestedActions.set([
        { icon: '📊', text: 'Phân tích điểm lớp' },
        { icon: '🔍', text: 'Tìm sinh viên cần hỗ trợ' },
        { icon: '📋', text: 'Tạo báo cáo điểm' }
      ]);
    } else if (url.includes('/sections/')) {
      this.suggestedActions.set([
        { icon: '➕', text: 'Thêm bài giảng mới' },
        { icon: '📝', text: 'Tạo quiz từ AI' },
        { icon: '📖', text: 'Tạo bài tập từ AI' }
      ]);
    } else if (url.includes('/course/') || url.includes('/courses/')) {
      this.suggestedActions.set([
        { icon: '🎥', text: 'Tạo buổi học online' },
        { icon: '➕', text: 'Thêm chương mới' },
        { icon: '📖', text: 'Tạo nội dung từ AI' }
      ]);
    } else {
      this.suggestedActions.set([
        { icon: '💡', text: 'Tôi cần trợ giúp' },
        { icon: '📚', text: 'Hướng dẫn sử dụng' }
      ]);
    }
  }

  private loadMessages() {
    try {
      const saved = localStorage.getItem('chat-widget-messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.messages.set(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
        this.chatHistory = parsed.map((m: any) => ({
          role: m.role,
          content: m.content
        }));
      }
    } catch {
      // Silent fail
    }
  }

  private saveMessages() {
    try {
      localStorage.setItem('chat-widget-messages', JSON.stringify(this.messages()));
    } catch {
      // Silent fail
    }
  }

  toggleChat() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.hasUnread.set(false);
      setTimeout(() => {
        this.messageInput?.nativeElement?.focus();
        this.scrollToBottom();
      }, 100);
    }
  }

  // ===== Drag & Drop Methods =====
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const data = event.dataTransfer?.getData('application/json');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'section' || parsed.type === 'module') {
          this.droppedContext.set({
            type: parsed.type,
            id: parsed.id,
            title: parsed.title,
            sectionId: parsed.sectionId
          });
          this.toastService.info(`Đã thêm "${parsed.title}" làm ngữ cảnh`);
          setTimeout(() => this.messageInput?.nativeElement?.focus(), 100);
        }
      } catch {
        // Invalid drop data
      }
    }
  }

  clearDroppedContext() {
    this.droppedContext.set(null);
  }

  static setDropContext(context: DroppedContext) {
    window.dispatchEvent(new CustomEvent('chat-widget-context', { detail: context }));
  }

  async sendMessage() {
    const content = this.inputMessage.trim();
    if (!content || this.isLoading()) return;

    this.inputMessage = '';
    this.isLoading.set(true);
    this.shouldScrollToBottom = true;

    const droppedCtx = this.droppedContext();
    let finalContent = content;
    let displayContent = content;

    if (droppedCtx) {
      const contextPrefix = droppedCtx.type === 'section'
        ? `[Về chương "${droppedCtx.title}"] `
        : `[Về module "${droppedCtx.title}"] `;
      finalContent = contextPrefix + content;
      displayContent = `📌 *${droppedCtx.title}*\n${content}`;
      this.clearDroppedContext();
    }

    const userMessage: WidgetMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMessage]);
    this.chatHistory.push({ role: 'user', content: finalContent });

    try {
      const courseContext = this.currentCourse();
      const user = this.authService.getCurrentUserSync();
      const isTeacher = user?.role?.includes('TEACHER') || user?.role?.includes('ADMIN');

      if (isTeacher && courseContext) {
        const effectiveSectionId = droppedCtx?.type === 'section'
          ? droppedCtx.id
          : (droppedCtx?.sectionId || courseContext.sectionId || courseContext.sections?.[0]?.id);

        const section = courseContext.sections?.find(s => s.id === effectiveSectionId)
          || courseContext.sections?.[0];

        const mightNeedMeet = this.mightNeedGoogleMeet(finalContent);
        let googleAccessToken: string | undefined;

        if (mightNeedMeet) {
          try {
            this.messages.update(msgs => [...msgs, {
              id: (Date.now() + 0.5).toString(),
              role: 'assistant',
              content: '🔐 Đang yêu cầu quyền truy cập Google Calendar để tạo link Google Meet thật...',
              timestamp: new Date()
            }]);
            this.shouldScrollToBottom = true;

            googleAccessToken = await this.googleOAuthService.requestCalendarAccess();
            this.messages.update(msgs => msgs.slice(0, -1));
          } catch {
            this.messages.update(msgs => msgs.slice(0, -1));
          }
        }

        const response = await this.aiChatService.sendAgenticMessage(
          finalContent,
          'TEACHER',
          courseContext.courseName,
          courseContext.courseId,
          section?.id,
          section?.title,
          this.chatHistory.slice(-10),
          googleAccessToken
        ).toPromise();

        if (response?.success && response.data) {
          const { action, answer, action_result } = response.data;

          if (action === 'create_livestream' && action_result) {
            const aiMessage: WidgetMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: answer,
              timestamp: new Date()
            };
            this.messages.update(msgs => [...msgs, aiMessage]);
            this.chatHistory.push({ role: 'assistant', content: answer });
            this.shouldScrollToBottom = true;
            this.saveMessages();

            if (action_result.success) {
              this.toastService.success('Đã tạo buổi học online!');
            } else {
              this.toastService.warning('AI không thể tạo buổi học. Vui lòng thử lại.');
            }
            return;
          }

          if (['create_lecture', 'create_quiz', 'create_assignment'].includes(action) && action_result) {
            const aiMessage: WidgetMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: answer,
              timestamp: new Date()
            };
            this.messages.update(msgs => [...msgs, aiMessage]);
            this.chatHistory.push({ role: 'assistant', content: answer });
            this.shouldScrollToBottom = true;
            this.saveMessages();

            if (action_result.success) {
              this.toastService.success('Đã thêm nội dung mới vào khóa học!');
            } else {
              this.toastService.warning('AI không thể tạo nội dung. Vui lòng thử lại.');
            }
            return;
          }

          const aiMessage: WidgetMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: answer,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, aiMessage]);
          this.chatHistory.push({ role: 'assistant', content: answer });
          this.shouldScrollToBottom = true;
          this.saveMessages();
        } else {
          throw new Error(response?.message || 'AI response error');
        }
      } else {
        const context: ChatContext = {
          currentPage: this.router.url
        };

        if (courseContext) {
          context.courseId = courseContext.courseId;
          context.courseName = courseContext.courseName;
          context.sectionId = courseContext.sectionId;
          context.moduleId = courseContext.moduleId;
        }

        const request: ChatRequest = {
          message: content,
          history: this.chatHistory.slice(-10),
          context
        };

        const response = await this.aiChatService.sendMessage(request).toPromise();

        const aiContent = response?.data?.answer || response?.content || 'Xin lỗi, tôi không thể xử lý yêu cầu này.';
        const aiMessage: WidgetMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiContent,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, aiMessage]);
        this.chatHistory.push({ role: 'assistant', content: aiContent });
        this.shouldScrollToBottom = true;
        this.saveMessages();
      }
    } catch {
      const errorMessage: WidgetMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        timestamp: new Date()
      };
      this.messages.update(msgs => [...msgs, errorMessage]);
    } finally {
      this.isLoading.set(false);
    }
  }

  sendQuickMessage(message: string) {
    this.inputMessage = message;
    this.sendMessage();
  }

  clearChat() {
    this.messages.set([]);
    this.chatHistory = [];
    localStorage.removeItem('chat-widget-messages');
  }

  openCreateLivestream() {
    const course = this.currentCourse();
    if (!course) {
      this.toastService.warning('Vui lòng mở một khóa học trước');
      return;
    }

    if (!course.sections || course.sections.length === 0) {
      this.toastService.warning('Khóa học chưa có chương nào. Vui lòng tạo chương trước.');
      return;
    }

    const userMsg: WidgetMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: '🎥 Tạo buổi học online cho khóa học này',
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMsg]);

    const thinkingMsg: WidgetMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '🤖 Đang tạo buổi học online...\n\nAI đang phân tích khóa học và tạo nội dung phù hợp...',
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, thinkingMsg]);
    this.shouldScrollToBottom = true;

    this.isLoading.set(true);

    const sectionId = course.sectionId || course.sections[0].id;
    const sectionName = course.sections.find(s => s.id === sectionId)?.title || '';

    this.aiChatService.generateLivestream(
      course.courseName,
      sectionName,
      '',
      '',
      '',
      60,
      'google_meet'
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.createLivestreamFromAI(sectionId, response.data);
        } else {
          this.isLoading.set(false);
          this.messages.update(msgs => {
            const updated = [...msgs];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: '❌ Không thể tạo buổi học. AI gặp lỗi khi generate nội dung. Vui lòng thử lại.'
              };
            }
            return updated;
          });
          this.toastService.error('Không thể tạo buổi học từ AI');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.messages.update(msgs => {
          const updated = [...msgs];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: '❌ Không thể kết nối với AI. Vui lòng kiểm tra kết nối và thử lại.'
            };
          }
          return updated;
        });
        this.toastService.error('Lỗi kết nối với AI service');
      }
    });
  }

  private createLivestreamFromAI(sectionId: number, data: GeneratedLivestreamData) {
    const scheduledDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);
    const formattedDate = scheduledDateTime.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDateTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    this.messages.update(msgs => {
      const updated = [...msgs];
      const lastIdx = updated.length - 1;
      if (updated[lastIdx]?.role === 'assistant') {
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: '🔐 Đang yêu cầu quyền truy cập Google Calendar để tạo link Google Meet...\n\nVui lòng đăng nhập và cho phép truy cập trong popup.'
        };
      }
      return updated;
    });

    this.googleOAuthService.requestCalendarAccess().then(googleAccessToken => {
      this.proceedWithLivestreamCreation(sectionId, data, formattedDate, formattedTime, googleAccessToken);
    }).catch(() => {
      this.proceedWithLivestreamCreation(sectionId, data, formattedDate, formattedTime, undefined);
    });
  }

  private proceedWithLivestreamCreation(
    sectionId: number,
    data: GeneratedLivestreamData,
    formattedDate: string,
    formattedTime: string,
    googleAccessToken?: string
  ) {
    const request: CreateLivestreamRequest = {
      sectionId: sectionId,
      title: data.title,
      description: data.description || '',
      scheduledAt: `${data.scheduled_date}T${data.scheduled_time}:00`,
      duration: data.duration || 60,
      platform: (data.platform as 'google_meet' | 'zoom' | 'teams') || 'google_meet',
      googleAccessToken
    };

    this.courseService.createLivestreamModule(request).subscribe({
      next: (module) => {
        this.isLoading.set(false);

        const successContent = `✅ **Đã tạo buổi học online thành công!**\n\n` +
          `📚 **${module.title}**\n\n` +
          `${data.description || ''}\n\n` +
          `📅 **Lịch học:** ${formattedDate} lúc ${formattedTime}\n` +
          `⏱️ **Thời lượng:** ${module.duration} phút\n` +
          `📱 **Nền tảng:** ${this.getPlatformName(module.platform)}\n` +
          `🔗 **Link tham gia:** ${module.meetingUrl}\n\n` +
          (data.preparation_tips && data.preparation_tips.length > 0
            ? `📋 **Sinh viên cần chuẩn bị:**\n${data.preparation_tips.map(t => `• ${t}`).join('\n')}\n\n`
            : '') +
          `✨ Buổi học đã được thêm vào khóa học. Link Google Meet đã được tạo tự động!`;

        this.messages.update(msgs => {
          const updated = [...msgs];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: successContent
            };
          }
          return updated;
        });
        this.shouldScrollToBottom = true;
        this.saveMessages();

        this.toastService.success('Đã tạo buổi học online với Google Meet!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messages.update(msgs => {
          const updated = [...msgs];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: `❌ AI đã tạo nội dung nhưng không thể lưu vào khóa học.\n\nLỗi: ${err.message || 'Không xác định'}\n\nVui lòng thử lại sau.`
            };
          }
          return updated;
        });

        this.toastService.error('Không thể tạo buổi học. Vui lòng thử lại.');
      }
    });
  }

  private getPlatformName(platform: string): string {
    const platforms: Record<string, string> = {
      'google_meet': 'Google Meet',
      'google-meet': 'Google Meet',
      'zoom': 'Zoom',
      'teams': 'Microsoft Teams'
    };
    return platforms[platform] || 'Google Meet';
  }

  private mightNeedGoogleMeet(message: string): boolean {
    const keywords = [
      'tạo buổi học', 'tạo livestream', 'tạo live', 'học online', 'học trực tuyến',
      'google meet', 'tạo phòng họp', 'tạo meeting', 'buổi học online', 'lớp học online',
      'lên lịch', 'schedule', 'livestream', 'online class'
    ];

    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
