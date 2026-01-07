import { Component, OnInit, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService, CourseForCopy, CopyContentRequest, CopyContentResponse, Section } from '../../services/course.service';

@Component({
  selector: 'app-copy-content-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>
            <i class="icon-copy"></i>
            Copy nội dung từ lớp khác
          </h3>
          <button class="btn-close" (click)="close()">
            <i class="icon-x"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Chọn lớp nguồn -->
          @if (step() === 1) {
            <div class="step-content">
              <p class="step-description">
                Chọn lớp học phần để copy nội dung. Chỉ hiển thị các lớp cùng môn học mà bạn đã dạy.
              </p>

              @if (loading()) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <span>Đang tải danh sách lớp...</span>
                </div>
              } @else if (copyableCourses().length === 0) {
                <div class="empty-state">
                  <i class="icon-inbox"></i>
                  <p>Không tìm thấy lớp nào có thể copy.</p>
                  <small>Bạn cần có ít nhất một lớp khác cùng môn học.</small>
                </div>
              } @else {
                <div class="course-list">
                  @for (course of copyableCourses(); track course.id) {
                    <div 
                      class="course-item" 
                      [class.selected]="selectedCourseId() === course.id"
                      (click)="selectCourse(course.id)">
                      <div class="course-radio">
                        <input 
                          type="radio" 
                          [id]="'course-' + course.id"
                          name="sourceCourse"
                          [value]="course.id"
                          [checked]="selectedCourseId() === course.id"
                          (change)="selectCourse(course.id)">
                      </div>
                      <div class="course-info">
                        <div class="course-code">{{ course.courseCode }}</div>
                        <div class="course-semester">{{ course.semesterName }}</div>
                      </div>
                      <div class="course-stats">
                        <span class="stat">
                          <i class="icon-folder"></i>
                          {{ course.sectionCount }} chương
                        </span>
                        <span class="stat">
                          <i class="icon-file-text"></i>
                          {{ course.moduleCount }} bài
                        </span>
                      </div>
                      <span class="status-badge" [class]="course.status.toLowerCase()">
                        {{ getStatusLabel(course.status) }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Step 2: Cấu hình copy -->
          @if (step() === 2) {
            <div class="step-content">
              <div class="selected-course-info">
                <span class="label">Lớp nguồn:</span>
                <span class="value">{{ getSelectedCourse()?.courseCode }} - {{ getSelectedCourse()?.semesterName }}</span>
              </div>

              @if (sectionsLoading()) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <span>Đang tải danh sách chương...</span>
                </div>
              } @else {
                <div class="config-section">
                  <h4>Chọn chương cần copy</h4>
                  <div class="checkbox-group">
                    <label class="checkbox-item select-all">
                      <input 
                        type="checkbox" 
                        [checked]="isAllSectionsSelected()"
                        (change)="toggleAllSections($event)">
                      <span>Chọn tất cả ({{ sourceSections().length }} chương)</span>
                    </label>
                  </div>
                  <div class="sections-list">
                    @for (section of sourceSections(); track section.id) {
                      <label class="checkbox-item">
                        <input 
                          type="checkbox" 
                          [checked]="selectedSectionIds().includes(section.id)"
                          (change)="toggleSection(section.id)">
                        <span class="section-title">{{ section.title }}</span>
                        <span class="section-modules">{{ section.moduleCount || 0 }} bài</span>
                      </label>
                    }
                  </div>
                </div>

                <div class="config-section">
                  <h4>Tùy chọn</h4>
                  <div class="options-list">
                    <label class="checkbox-item">
                      <input type="checkbox" [(ngModel)]="copyQuizQuestions">
                      <span>Copy câu hỏi quiz (nếu có)</span>
                    </label>
                    <label class="checkbox-item">
                      <input type="checkbox" [(ngModel)]="keepVisibility">
                      <span>Giữ nguyên trạng thái hiển thị</span>
                    </label>
                    <label class="checkbox-item warning">
                      <input type="checkbox" [(ngModel)]="clearExisting">
                      <span>Xóa toàn bộ nội dung hiện có</span>
                      <small class="warning-text">⚠️ Hành động này không thể hoàn tác</small>
                    </label>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Step 3: Kết quả -->
          @if (step() === 3) {
            <div class="step-content">
              @if (copying()) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <span>Đang copy nội dung...</span>
                </div>
              } @else if (copyResult()) {
                <div class="result-state success">
                  <i class="icon-check-circle"></i>
                  <h4>Copy thành công!</h4>
                  <div class="result-stats">
                    <div class="stat-item">
                      <span class="stat-value">{{ copyResult()!.sectionsCopied }}</span>
                      <span class="stat-label">Chương</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ copyResult()!.modulesCopied }}</span>
                      <span class="stat-label">Bài học</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ copyResult()!.quizQuestionsCopied }}</span>
                      <span class="stat-label">Câu hỏi quiz</span>
                    </div>
                  </div>
                  <div class="copied-sections">
                    <h5>Chi tiết các chương đã copy:</h5>
                    @for (section of copyResult()!.copiedSections; track section.newId) {
                      <div class="copied-section-item">
                        <i class="icon-check"></i>
                        <span>{{ section.title }}</span>
                        <span class="module-count">({{ section.moduleCount }} bài)</span>
                      </div>
                    }
                  </div>
                </div>
              } @else if (copyError()) {
                <div class="result-state error">
                  <i class="icon-alert-circle"></i>
                  <h4>Có lỗi xảy ra!</h4>
                  <p>{{ copyError() }}</p>
                </div>
              }
            </div>
          }
        </div>

        <div class="modal-footer">
          @if (step() === 1) {
            <button class="btn btn-secondary" (click)="close()">Hủy</button>
            <button 
              class="btn btn-primary" 
              [disabled]="!selectedCourseId()" 
              (click)="nextStep()">
              Tiếp theo
              <i class="icon-arrow-right"></i>
            </button>
          } @else if (step() === 2) {
            <button class="btn btn-secondary" (click)="prevStep()">
              <i class="icon-arrow-left"></i>
              Quay lại
            </button>
            <button 
              class="btn btn-primary" 
              [disabled]="selectedSectionIds().length === 0 || sectionsLoading()" 
              (click)="performCopy()">
              <i class="icon-copy"></i>
              Copy {{ selectedSectionIds().length }} chương
            </button>
          } @else if (step() === 3) {
            @if (copyResult()) {
              <button class="btn btn-primary" (click)="close()">Hoàn tất</button>
            } @else if (copyError()) {
              <button class="btn btn-secondary" (click)="prevStep()">Thử lại</button>
              <button class="btn btn-primary" (click)="close()">Đóng</button>
            }
          }
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
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-container {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;

      h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .btn-close {
        background: none;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
        color: #6b7280;
        border-radius: 6px;

        &:hover {
          background: #f3f4f6;
          color: #111827;
        }
      }
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .step-description {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;

      i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      p {
        margin: 0.5rem 0;
      }
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .course-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .course-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #93c5fd;
        background: #eff6ff;
      }

      &.selected {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .course-radio input {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .course-info {
        flex: 1;

        .course-code {
          font-weight: 600;
          color: #111827;
        }

        .course-semester {
          font-size: 0.875rem;
          color: #6b7280;
        }
      }

      .course-stats {
        display: flex;
        gap: 1rem;

        .stat {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #6b7280;
        }
      }

      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;

        &.open { background: #d1fae5; color: #065f46; }
        &.closed { background: #e5e7eb; color: #374151; }
        &.in_progress { background: #fef3c7; color: #92400e; }
        &.planned { background: #dbeafe; color: #1e40af; }
      }
    }

    .selected-course-info {
      background: #f3f4f6;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;

      .label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-right: 0.5rem;
      }

      .value {
        font-weight: 600;
        color: #111827;
      }
    }

    .config-section {
      margin-bottom: 1.5rem;

      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
      }
    }

    .checkbox-group {
      margin-bottom: 0.5rem;
    }

    .sections-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.5rem;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background: #f9fafb;
      }

      &.select-all {
        font-weight: 500;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 0.5rem;
      }

      &.warning {
        flex-wrap: wrap;
      }

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .section-title {
        flex: 1;
        color: #111827;
      }

      .section-modules {
        font-size: 0.75rem;
        color: #6b7280;
      }

      .warning-text {
        width: 100%;
        margin-left: calc(16px + 0.75rem);
        font-size: 0.75rem;
        color: #dc2626;
      }
    }

    .options-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .result-state {
      text-align: center;
      padding: 2rem;

      i {
        font-size: 4rem;
        margin-bottom: 1rem;
      }

      &.success i { color: #10b981; }
      &.error i { color: #ef4444; }

      h4 {
        margin: 0 0 1rem;
        font-size: 1.25rem;
      }
    }

    .result-stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-bottom: 1.5rem;

      .stat-item {
        text-align: center;

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: #3b82f6;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }
      }
    }

    .copied-sections {
      text-align: left;
      background: #f9fafb;
      border-radius: 8px;
      padding: 1rem;

      h5 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        color: #374151;
      }

      .copied-section-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0;
        font-size: 0.875rem;

        i {
          font-size: 1rem;
          color: #10b981;
        }

        .module-count {
          color: #6b7280;
          margin-left: auto;
        }
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: #3b82f6;
      color: white;

      &:hover:not(:disabled) {
        background: #2563eb;
      }
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;

      &:hover:not(:disabled) {
        background: #e5e7eb;
      }
    }

    // Icon classes (using Unicode or you can use your icon library)
    .icon-copy::before { content: "⧉"; }
    .icon-x::before { content: "✕"; }
    .icon-inbox::before { content: "📥"; }
    .icon-folder::before { content: "📁"; }
    .icon-file-text::before { content: "📄"; }
    .icon-arrow-right::before { content: "→"; }
    .icon-arrow-left::before { content: "←"; }
    .icon-check-circle::before { content: "✓"; }
    .icon-check::before { content: "✓"; }
    .icon-alert-circle::before { content: "⚠"; }
  `]
})
export class CopyContentDialogComponent implements OnInit {
  @Input() courseId!: number;
  @Input() instructorId!: number;
  @Output() closed = new EventEmitter<boolean>();

  // State
  step = signal(1);
  loading = signal(false);
  sectionsLoading = signal(false);
  copying = signal(false);

  // Data
  copyableCourses = signal<CourseForCopy[]>([]);
  sourceSections = signal<Section[]>([]);
  selectedCourseId = signal<number | null>(null);
  selectedSectionIds = signal<number[]>([]);

  // Options
  copyQuizQuestions = true;
  keepVisibility = false;
  clearExisting = false;

  // Result
  copyResult = signal<CopyContentResponse | null>(null);
  copyError = signal<string | null>(null);

  constructor(private courseService: CourseService) {}

  ngOnInit() {
    this.loadCopyableCourses();
  }

  async loadCopyableCourses() {
    this.loading.set(true);
    try {
      const courses = await this.courseService.getCopyableCourses(this.courseId, this.instructorId).toPromise();
      this.copyableCourses.set(courses || []);
    } catch (error) {
      console.error('Error loading copyable courses:', error);
    } finally {
      this.loading.set(false);
    }
  }

  selectCourse(courseId: number) {
    this.selectedCourseId.set(courseId);
  }

  getSelectedCourse(): CourseForCopy | undefined {
    return this.copyableCourses().find(c => c.id === this.selectedCourseId());
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'OPEN': 'Đang mở',
      'CLOSED': 'Đã đóng',
      'IN_PROGRESS': 'Đang diễn ra',
      'PLANNED': 'Lên kế hoạch'
    };
    return labels[status] || status;
  }

  async nextStep() {
    if (this.step() === 1 && this.selectedCourseId()) {
      this.step.set(2);
      await this.loadSourceSections();
    }
  }

  prevStep() {
    if (this.step() > 1) {
      this.step.update(s => s - 1);
      this.copyError.set(null);
    }
  }

  async loadSourceSections() {
    this.sectionsLoading.set(true);
    try {
      const sections = await this.courseService.getSectionsByCourse(this.selectedCourseId()!).toPromise();
      this.sourceSections.set(sections || []);
      // Select all by default
      this.selectedSectionIds.set((sections || []).map(s => s.id));
    } catch (error) {
      console.error('Error loading source sections:', error);
    } finally {
      this.sectionsLoading.set(false);
    }
  }

  isAllSectionsSelected(): boolean {
    return this.selectedSectionIds().length === this.sourceSections().length;
  }

  toggleAllSections(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedSectionIds.set(this.sourceSections().map(s => s.id));
    } else {
      this.selectedSectionIds.set([]);
    }
  }

  toggleSection(sectionId: number) {
    this.selectedSectionIds.update(ids => {
      if (ids.includes(sectionId)) {
        return ids.filter(id => id !== sectionId);
      } else {
        return [...ids, sectionId];
      }
    });
  }

  async performCopy() {
    this.copying.set(true);
    this.copyError.set(null);
    this.step.set(3);

    try {
      const request: CopyContentRequest = {
        sourceCourseId: this.selectedCourseId()!,
        sectionIds: this.selectedSectionIds(),
        copyQuizQuestions: this.copyQuizQuestions,
        keepVisibility: this.keepVisibility,
        clearExisting: this.clearExisting
      };

      const result = await this.courseService.copyContent(this.courseId, request).toPromise();
      this.copyResult.set(result || null);
    } catch (error: any) {
      console.error('Error copying content:', error);
      this.copyError.set(error?.error?.message || 'Đã có lỗi xảy ra khi copy nội dung.');
    } finally {
      this.copying.set(false);
    }
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close() {
    this.closed.emit(!!this.copyResult());
  }
}
