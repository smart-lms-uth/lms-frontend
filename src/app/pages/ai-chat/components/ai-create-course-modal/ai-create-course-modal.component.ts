import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService, Semester, Subject, CourseStatus } from '../../../../services/course.service';
import { AuthService } from '../../../../services/auth.service';

export interface CreateCourseFromAIData {
  courseCode: string;
  subjectId: number;
  semesterId: number;
  instructorId: number;
  room: string;
  maxStudents: number;
  status: CourseStatus;
  courseName: string;
  courseDescription: string;
}

@Component({
  selector: 'app-ai-create-course-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tạo khóa học mới từ AI
          </h2>
          <button class="close-btn" (click)="onClose()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-section">
            <h3>Thông tin khóa học</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label>Mã khóa học <span class="required">*</span></label>
                <input type="text" [(ngModel)]="formData.courseCode" placeholder="VD: CS101-2026A" required>
              </div>
              
              <div class="form-group">
                <label>Phòng học</label>
                <input type="text" [(ngModel)]="formData.room" placeholder="VD: A101">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Môn học <span class="required">*</span></label>
                <select [(ngModel)]="formData.subjectId" required>
                  <option [ngValue]="0" disabled>-- Chọn môn học --</option>
                  <option *ngFor="let subject of subjects" [ngValue]="subject.id">
                    {{ subject.subjectCode }} - {{ subject.name }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Học kỳ <span class="required">*</span></label>
                <select [(ngModel)]="formData.semesterId" required>
                  <option [ngValue]="0" disabled>-- Chọn học kỳ --</option>
                  <option *ngFor="let semester of semesters" [ngValue]="semester.id">
                    {{ semester.displayName }} ({{ semester.startDate | date:'dd/MM/yyyy' }})
                  </option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Số sinh viên tối đa</label>
                <input type="number" [(ngModel)]="formData.maxStudents" min="1" max="500">
              </div>
              
              <div class="form-group">
                <label>Trạng thái</label>
                <select [(ngModel)]="formData.status">
                  <option value="PLANNED">Đang lên kế hoạch</option>
                  <option value="OPEN">Mở đăng ký</option>
                  <option value="IN_PROGRESS">Đang diễn ra</option>
                  <option value="CLOSED">Đã kết thúc</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="ai-preview-info" *ngIf="courseName">
            <h3>Nội dung từ AI</h3>
            <div class="preview-card">
              <div class="preview-name">{{ courseName }}</div>
              <div class="preview-desc" *ngIf="courseDescription">{{ courseDescription }}</div>
              <div class="preview-stats">
                <span><strong>{{ sectionsCount }}</strong> chương</span>
                <span><strong>{{ modulesCount }}</strong> bài học</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onClose()" [disabled]="isLoading">
            Hủy
          </button>
          <button class="btn btn-primary" (click)="onCreate()" [disabled]="!isValid() || isLoading">
            <div *ngIf="isLoading" class="spinner"></div>
            {{ isLoading ? 'Đang tạo...' : 'Tạo khóa học' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    
    .modal-content {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 16px 16px 0 0;
    }
    
    .modal-header h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 1.25rem;
    }
    
    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 24px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .modal-body {
      padding: 24px;
    }
    
    .form-section h3 {
      margin: 0 0 16px 0;
      font-size: 1rem;
      color: #374151;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
    }
    
    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    
    .required {
      color: #ef4444;
    }
    
    .form-group input,
    .form-group select {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .ai-preview-info {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    
    .ai-preview-info h3 {
      margin: 0 0 12px 0;
      font-size: 1rem;
      color: #374151;
    }
    
    .preview-card {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border-radius: 12px;
      padding: 16px;
    }
    
    .preview-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }
    
    .preview-desc {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 12px;
    }
    
    .preview-stats {
      display: flex;
      gap: 20px;
    }
    
    .preview-stats span {
      font-size: 0.875rem;
      color: #374151;
    }
    
    .preview-stats strong {
      color: #667eea;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 0 0 16px 16px;
    }
    
    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: #d1d5db;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AiCreateCourseModalComponent implements OnInit {
  @Input() courseName: string = '';
  @Input() courseDescription: string = '';
  @Input() sectionsCount: number = 0;
  @Input() modulesCount: number = 0;
  
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<CreateCourseFromAIData>();
  
  subjects: Subject[] = [];
  semesters: Semester[] = [];
  isLoading = false;
  
  formData: CreateCourseFromAIData = {
    courseCode: '',
    subjectId: 0,
    semesterId: 0,
    instructorId: 0,
    room: '',
    maxStudents: 50,
    status: 'PLANNED' as CourseStatus,
    courseName: '',
    courseDescription: ''
  };
  
  constructor(
    private courseService: CourseService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.loadData();
    this.formData.courseName = this.courseName;
    this.formData.courseDescription = this.courseDescription;
    
    // Auto-generate course code
    const now = new Date();
    const year = now.getFullYear();
    const semester = now.getMonth() < 6 ? 'A' : 'B';
    this.formData.courseCode = `AI${year}${semester}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Get current user as instructor
    const currentUser = this.authService.getCurrentUserSync();
    if (currentUser) {
      this.formData.instructorId = currentUser.id;
    }
  }
  
  private loadData(): void {
    // Load subjects
    this.courseService.getSubjects().subscribe({
      next: (subjects) => this.subjects = subjects,
      error: (err) => console.error('Error loading subjects:', err)
    });
    
    // Load semesters
    this.courseService.getSemesters().subscribe({
      next: (semesters) => this.semesters = semesters,
      error: (err) => console.error('Error loading semesters:', err)
    });
  }
  
  isValid(): boolean {
    return !!(
      this.formData.courseCode &&
      this.formData.subjectId > 0 &&
      this.formData.semesterId > 0
    );
  }
  
  onClose(): void {
    this.close.emit();
  }
  
  onCreate(): void {
    if (!this.isValid()) return;
    this.isLoading = true;
    this.create.emit(this.formData);
  }
  
  stopLoading(): void {
    this.isLoading = false;
  }
}
