import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { AiChatService, ChatMessage as ApiChatMessage, ChatRequest, ChatContext, SectionInfo, ModuleInfo } from '../../services/ai-chat.service';
import { CourseService, Course, Semester, Section } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  functionCalls?: any[];
}

interface SuggestedQuestion {
  icon: string;
  text: string;
}

// Group courses by semester for display
interface SemesterGroup {
  semester: Semester;
  courses: Course[];
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MarkdownPipe],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  inputMessage = '';
  isLoading = false;
  private shouldScroll = false;
  
  // Course selector
  showCourseModal = false;
  myCourses: Course[] = [];
  semesters: Semester[] = [];
  semesterGroups: SemesterGroup[] = [];
  selectedSemesterId: number | null = null;
  selectedCourse: Course | null = null;
  courseSections: SectionInfo[] = []; // Sections with modules for context
  isLoadingCourses = false;
  courseSearchText = '';
  
  suggestedQuestions: SuggestedQuestion[] = [
    { icon: '📚', text: 'Tạo section mới cho khóa học' },
    { icon: '💡', text: 'Thêm module video vào section' },
    { icon: '🔧', text: 'Tạo câu hỏi trắc nghiệm' },
    { icon: '📝', text: 'Xem danh sách sections của khóa học' }
  ];

  constructor(
    private aiChatService: AiChatService,
    private courseService: CourseService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadChatHistory();
    this.loadMyCourses();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  loadChatHistory(): void {
    // For now, start with empty chat
  }

  // ==================== Course Selector Methods ====================

  loadMyCourses(): void {
    const user = this.authService.getCurrentUserSync();
    if (!user) return;

    this.isLoadingCourses = true;
    
    // Load semesters first
    this.courseService.getSemesters().subscribe({
      next: (semesters) => {
        this.semesters = semesters.sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        
        // Set current semester as default filter
        const currentSemester = semesters.find(s => s.isCurrent);
        if (currentSemester) {
          this.selectedSemesterId = currentSemester.id;
        }
      }
    });

    // Load courses by instructor
    this.courseService.getCoursesByInstructor(user.id).subscribe({
      next: (courses) => {
        this.myCourses = courses;
        this.groupCoursesBySemester();
        this.isLoadingCourses = false;
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.isLoadingCourses = false;
      }
    });
  }

  groupCoursesBySemester(): void {
    const groups = new Map<number, SemesterGroup>();
    
    for (const course of this.myCourses) {
      if (!groups.has(course.semesterId)) {
        const semester = this.semesters.find(s => s.id === course.semesterId);
        if (semester) {
          groups.set(course.semesterId, {
            semester,
            courses: []
          });
        }
      }
      groups.get(course.semesterId)?.courses.push(course);
    }

    // Sort by semester start date (newest first)
    this.semesterGroups = Array.from(groups.values())
      .sort((a, b) => 
        new Date(b.semester.startDate).getTime() - new Date(a.semester.startDate).getTime()
      );
  }

  openCourseSelector(): void {
    this.showCourseModal = true;
    this.courseSearchText = '';
  }

  closeCourseSelector(): void {
    this.showCourseModal = false;
  }

  selectCourse(course: Course): void {
    this.selectedCourse = course;
    this.showCourseModal = false;
    this.courseSections = []; // Reset sections
    
    // Load sections with modules for this course
    this.loadCourseSections(course.id);
    
    // Add system message about context change
    if (this.messages.length > 0) {
      const contextMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: `📚 Đã chuyển ngữ cảnh sang khóa học: **${course.subjectName}** (${course.courseCode})`,
        timestamp: new Date()
      };
      this.messages.push(contextMessage);
    }
  }

  /**
   * Load all sections with modules for the selected course
   * This data will be sent in context to help AI lookup IDs
   */
  loadCourseSections(courseId: number): void {
    this.courseService.getSectionsByCourse(courseId).subscribe({
      next: (sections) => {
        if (sections.length === 0) {
          this.courseSections = [];
          return;
        }
        
        // Load modules for each section in parallel
        const sectionRequests = sections.map(section => 
          this.courseService.getSectionWithModules(section.id).pipe(
            catchError(() => of({ ...section, modules: [] })) // Fallback if error
          )
        );
        
        forkJoin(sectionRequests).subscribe({
          next: (sectionsWithModules) => {
            // Convert to compact format for context
            this.courseSections = sectionsWithModules.map(section => ({
              id: section.id,
              title: section.title,
              modules: section.modules?.map(module => ({
                id: module.id,
                title: module.title,
                type: module.type
              })) || []
            }));
            console.log('[AI Chat] Loaded course structure with modules:', this.courseSections);
          },
          error: (err) => {
            console.error('[AI Chat] Error loading section modules:', err);
            // Fallback: use sections without modules
            this.courseSections = sections.map(s => ({ id: s.id, title: s.title, modules: [] }));
          }
        });
      },
      error: (err) => {
        console.error('[AI Chat] Error loading sections:', err);
        this.courseSections = [];
      }
    });
  }

  clearCourseSelection(): void {
    this.selectedCourse = null;
    this.courseSections = [];
  }

  get filteredCourses(): Course[] {
    let courses = this.myCourses;
    
    // Filter by semester
    if (this.selectedSemesterId) {
      courses = courses.filter(c => c.semesterId === this.selectedSemesterId);
    }
    
    // Filter by search text
    if (this.courseSearchText.trim()) {
      const search = this.courseSearchText.toLowerCase();
      courses = courses.filter(c => 
        c.courseCode.toLowerCase().includes(search) ||
        c.subjectName.toLowerCase().includes(search) ||
        c.subjectCode?.toLowerCase().includes(search)
      );
    }
    
    return courses;
  }

  // ==================== Chat Methods ====================

  sendMessage(): void {
    if (!this.inputMessage.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: this.inputMessage.trim(),
      timestamp: new Date()
    };

    const question = this.inputMessage;
    this.inputMessage = '';
    this.isLoading = true;

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    // Use immutable array pattern for better change detection
    this.messages = [...this.messages, userMessage, typingMessage];
    this.shouldScroll = true;
    this.cdr.detectChanges();

    // Call real AI API
    this.callAIService(question);
  }

  callAIService(question: string): void {
    // Build history from recent messages (last 10)
    const history: ApiChatMessage[] = this.messages
      .filter(m => m.id !== 'typing')
      .slice(-10)
      .map(m => ({
        role: m.role,
        content: m.content
      }));

    // Build context with selected course and its sections/modules
    const context: ChatContext | undefined = this.selectedCourse ? {
      courseId: this.selectedCourse.id,
      courseName: this.selectedCourse.subjectName,
      sections: this.courseSections // Include full course structure for AI lookup
    } : undefined;

    const request: ChatRequest = {
      message: question,
      history: history.slice(0, -1), // Exclude the last user message
      context
    };

    console.log('[AI Chat] Sending request:', JSON.stringify(request, null, 2));

    this.aiChatService.sendMessage(request).subscribe({
      next: (response) => {
        console.log('[AI Chat] Response received:', response);
        
        // Run inside NgZone to ensure change detection
        this.ngZone.run(() => {
          // Remove typing indicator
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: response.content || '',
            timestamp: new Date(),
            functionCalls: response.functionCalls
          };

          this.messages = [...this.messages, assistantMessage];
          this.isLoading = false;
          this.shouldScroll = true;
          
          // Force change detection
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('[AI Chat] Error:', error);
        
        this.ngZone.run(() => {
          // Remove typing indicator
          this.messages = this.messages.filter(m => m.id !== 'typing');

          const errorMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
            timestamp: new Date()
          };

          this.messages = [...this.messages, errorMessage];
          this.isLoading = false;
          
          // Force change detection
          this.cdr.detectChanges();
        });
      }
    });
  }

  askSuggestedQuestion(question: string): void {
    this.inputMessage = question;
    this.sendMessage();
  }

  clearChat(): void {
    this.messages = [];
  }

  copyMessage(content: string): void {
    navigator.clipboard.writeText(content);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  // TrackBy function for ngFor optimization
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
}
