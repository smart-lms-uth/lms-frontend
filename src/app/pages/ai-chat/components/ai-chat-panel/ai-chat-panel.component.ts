import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MarkdownPipe } from '../../../../pipes/markdown.pipe';

export type ChatMode = 'chat' | 'course' | 'quiz' | 'lecture' | 'assignment';

export interface ChatModeOption {
  id: ChatMode;
  icon: string;
  label: string;
  description: string;
  placeholder: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  previewData?: any;
  previewType?: string;
  fileName?: string;
}

export interface SuggestedQuestion {
  icon: string;
  text: string;
  mode?: ChatMode;
}

export interface FileUploadEvent {
  file: File;
  message: string;
}

@Component({
  selector: 'app-ai-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MarkdownPipe],
  templateUrl: './ai-chat-panel.component.html',
  styleUrl: './ai-chat-panel.component.scss'
})
export class AiChatPanelComponent {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef;

  @Input() messages: ChatMessage[] = [];
  @Input() isLoading = false;
  @Input() currentMode: ChatMode = 'chat';
  
  @Output() sendMessage = new EventEmitter<string>();
  @Output() sendMessageWithFile = new EventEmitter<FileUploadEvent>();
  @Output() modeChange = new EventEmitter<ChatMode>();
  @Output() clearChat = new EventEmitter<void>();
  @Output() suggestedQuestionClick = new EventEmitter<SuggestedQuestion>();
  @Output() openPreview = new EventEmitter<ChatMessage>();

  inputMessage = '';
  selectedFile: File | null = null;
  
  readonly allowedFileTypes = [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ];
  readonly maxFileSize = 100 * 1024 * 1024;

  modeOptions: ChatModeOption[] = [
    { id: 'chat', icon: '💬', label: 'Chat', description: 'Trò chuyện tự do với AI', placeholder: 'Nhập câu hỏi của bạn...' },
    { id: 'course', icon: '📚', label: 'Tạo khóa học', description: 'AI tạo cấu trúc khóa học', placeholder: 'Mô tả khóa học bạn muốn tạo...' },
    { id: 'quiz', icon: '❓', label: 'Tạo Quiz', description: 'AI sinh câu hỏi trắc nghiệm', placeholder: 'Nhập chủ đề và số câu hỏi...' },
    { id: 'lecture', icon: '📝', label: 'Tạo bài giảng', description: 'AI soạn nội dung bài giảng', placeholder: 'Nhập tiêu đề và nội dung bài giảng...' },
    { id: 'assignment', icon: '📋', label: 'Tạo bài tập', description: 'AI tạo đề bài assignment', placeholder: 'Mô tả yêu cầu bài tập...' }
  ];

  suggestedQuestions: SuggestedQuestion[] = [
    { icon: '📚', text: 'Tạo khóa học Lập trình Python cơ bản', mode: 'course' },
    { icon: '❓', text: 'Tạo 10 câu hỏi về JavaScript cơ bản', mode: 'quiz' },
    { icon: '📝', text: 'Soạn bài giảng về OOP trong Java', mode: 'lecture' },
    { icon: '📋', text: 'Tạo bài tập thực hành SQL', mode: 'assignment' },
    { icon: '💬', text: 'Giải thích khái niệm RESTful API', mode: 'chat' }
  ];

  selectMode(mode: ChatMode): void {
    this.modeChange.emit(mode);
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  getCurrentPlaceholder(): string {
    const mode = this.modeOptions.find(m => m.id === this.currentMode);
    return mode?.placeholder || 'Nhập tin nhắn...';
  }

  getCurrentModeLabel(): string {
    const mode = this.modeOptions.find(m => m.id === this.currentMode);
    return mode?.label || 'Chat';
  }

  onSendMessage(): void {
    if ((!this.inputMessage.trim() && !this.selectedFile) || this.isLoading) return;
    
    if (this.selectedFile) {
      this.sendMessageWithFile.emit({
        file: this.selectedFile,
        message: this.inputMessage.trim() || 'Phân tích file này'
      });
      this.selectedFile = null;
    } else {
      this.sendMessage.emit(this.inputMessage.trim());
    }
    this.inputMessage = '';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  askSuggestedQuestion(question: SuggestedQuestion): void {
    if (question.mode) {
      this.modeChange.emit(question.mode);
    }
    this.inputMessage = question.text;
    setTimeout(() => this.onSendMessage(), 100);
  }

  onClearChat(): void {
    this.clearChat.emit();
  }

  onOpenPreview(message: ChatMessage): void {
    this.openPreview.emit(message);
  }

  hasPreview(message: ChatMessage): boolean {
    return !!(message.previewData && message.previewType);
  }

  getPreviewIcon(type: string): string {
    const icons: { [key: string]: string } = {
      course: '📚',
      quiz: '❓',
      lecture: '📝',
      assignment: '📋'
    };
    return icons[type] || '👁';
  }

  getPreviewLabel(type: string): string {
    const labels: { [key: string]: string } = {
      course: 'Xem khóa học',
      quiz: 'Xem quiz',
      lecture: 'Xem bài giảng',
      assignment: 'Xem bài tập'
    };
    return labels[type] || 'Xem preview';
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (!this.allowedFileTypes.includes(file.type)) {
        alert('File không được hỗ trợ. Chỉ hỗ trợ: PDF, TXT, Images (JPEG/PNG/GIF/WebP), Audio (MP3/WAV), Video (MP4/MOV/WebM)');
        return;
      }
      
      if (file.size > this.maxFileSize) {
        alert('File quá lớn. Giới hạn 100MB.');
        return;
      }
      
      this.selectedFile = file;
    }
    input.value = '';
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
  }

  getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    return 'file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
