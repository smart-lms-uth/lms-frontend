import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveClassService, LiveClass, CreateLiveClassRequest, UpdateLiveClassRequest, LiveClassAttendance } from '../../../services/live-class.service';
import { BadgeComponent } from '../../ui';
import { EditModeService } from '../../../services/edit-mode.service';

// Form data type without required courseId (added when submitting)
interface LiveClassFormData {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  recordingEnabled: boolean;
  maxParticipants: number;
}

@Component({
  selector: 'app-live-class-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BadgeComponent
  ],
  templateUrl: './live-class-manager.component.html',
  styleUrls: ['./live-class-manager.component.scss']
})
export class LiveClassManagerComponent implements OnInit {
  @Input() courseId!: number;
  @Input() instructorId!: number;

  editModeService = inject(EditModeService);

  loading = signal(true);
  liveClasses = signal<LiveClass[]>([]);
  
  // Modal states
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showAttendanceModal = signal(false);
  
  // Form data (without courseId - added when submitting)
  formData = signal<LiveClassFormData>({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    recordingEnabled: false,
    maxParticipants: 100
  });
  
  editingLiveClass = signal<LiveClass | null>(null);
  viewingAttendance = signal<LiveClass | null>(null);
  attendanceList = signal<LiveClassAttendance[]>([]);
  attendanceLoading = signal(false);
  
  // Saving state
  saving = signal(false);
  
  // Stats
  upcomingCount = computed(() => 
    this.liveClasses().filter(lc => lc.status === 'SCHEDULED').length
  );
  
  liveCount = computed(() => 
    this.liveClasses().filter(lc => lc.status === 'LIVE').length
  );
  
  completedCount = computed(() => 
    this.liveClasses().filter(lc => lc.status === 'COMPLETED').length
  );
  
  // Filtered lists
  upcomingClasses = computed(() => 
    this.liveClasses()
      .filter(lc => lc.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  );
  
  liveNowClasses = computed(() => 
    this.liveClasses().filter(lc => lc.status === 'LIVE')
  );
  
  pastClasses = computed(() => 
    this.liveClasses()
      .filter(lc => lc.status === 'COMPLETED' || lc.status === 'CANCELLED')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
  );

  constructor(private liveClassService: LiveClassService) {}

  ngOnInit() {
    this.loadLiveClasses();
  }

  async loadLiveClasses() {
    this.loading.set(true);
    try {
      const response = await this.liveClassService.getLiveClassesByCourse(this.courseId).toPromise();
      this.liveClasses.set(response?.data?.content || []);
    } catch (error) {
      console.error('Error loading live classes:', error);
      this.liveClasses.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  // Modal handlers
  openCreateModal() {
    this.formData.set({
      title: '',
      description: '',
      scheduledAt: this.getDefaultDateTime(),
      duration: 60,
      recordingEnabled: false,
      maxParticipants: 100
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  openEditModal(liveClass: LiveClass) {
    this.editingLiveClass.set(liveClass);
    this.formData.set({
      title: liveClass.title,
      description: liveClass.description || '',
      scheduledAt: this.formatDateTimeForInput(liveClass.scheduledAt),
      duration: liveClass.duration,
      recordingEnabled: liveClass.recordingEnabled,
      maxParticipants: liveClass.maxParticipants
    });
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingLiveClass.set(null);
  }

  async openAttendanceModal(liveClass: LiveClass) {
    this.viewingAttendance.set(liveClass);
    this.showAttendanceModal.set(true);
    this.attendanceLoading.set(true);
    
    try {
      const response = await this.liveClassService.getAttendanceList(liveClass.id).toPromise();
      this.attendanceList.set(response?.data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
      this.attendanceList.set([]);
    } finally {
      this.attendanceLoading.set(false);
    }
  }

  closeAttendanceModal() {
    this.showAttendanceModal.set(false);
    this.viewingAttendance.set(null);
    this.attendanceList.set([]);
  }

  // Form handlers
  updateFormField(field: keyof LiveClassFormData, value: any) {
    this.formData.update(data => ({
      ...data,
      [field]: value
    }));
  }

  async createLiveClass() {
    const data = this.formData();
    if (!data.title.trim()) {
      alert('Vui lòng nhập tiêu đề buổi học!');
      return;
    }
    if (!data.scheduledAt) {
      alert('Vui lòng chọn thời gian!');
      return;
    }

    this.saving.set(true);
    try {
      const request: CreateLiveClassRequest = {
        courseId: this.courseId,
        ...data
      };
      const response = await this.liveClassService.createLiveClass(request).toPromise();
      if (response?.data) {
        this.liveClasses.update(classes => [...classes, response.data]);
      }
      this.closeCreateModal();
      alert('Tạo buổi học trực tuyến thành công!');
    } catch (error) {
      console.error('Error creating live class:', error);
      alert('Có lỗi xảy ra khi tạo buổi học!');
    } finally {
      this.saving.set(false);
    }
  }

  async updateLiveClass() {
    const editing = this.editingLiveClass();
    if (!editing) return;

    const data = this.formData();
    if (!data.title.trim()) {
      alert('Vui lòng nhập tiêu đề buổi học!');
      return;
    }

    this.saving.set(true);
    try {
      const updateData: UpdateLiveClassRequest = {
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        recordingEnabled: data.recordingEnabled,
        maxParticipants: data.maxParticipants
      };
      
      const response = await this.liveClassService.updateLiveClass(editing.id, updateData).toPromise();
      if (response?.data) {
        this.liveClasses.update(classes => 
          classes.map(lc => lc.id === editing.id ? response.data : lc)
        );
      }
      this.closeEditModal();
      alert('Cập nhật thành công!');
    } catch (error) {
      console.error('Error updating live class:', error);
      alert('Có lỗi xảy ra khi cập nhật!');
    } finally {
      this.saving.set(false);
    }
  }

  // Actions
  async startClass(liveClass: LiveClass) {
    if (confirm('Bắt đầu buổi học ngay bây giờ?')) {
      try {
        const response = await this.liveClassService.startLiveClass(liveClass.id).toPromise();
        if (response?.data) {
          this.liveClasses.update(classes => 
            classes.map(lc => lc.id === liveClass.id ? response.data : lc)
          );
          // Open Google Meet
          this.liveClassService.openMeetLink(response.data.meetLink);
        }
      } catch (error) {
        console.error('Error starting class:', error);
        alert('Có lỗi xảy ra!');
      }
    }
  }

  async endClass(liveClass: LiveClass) {
    if (confirm('Kết thúc buổi học?')) {
      try {
        const response = await this.liveClassService.endLiveClass(liveClass.id).toPromise();
        if (response?.data) {
          this.liveClasses.update(classes => 
            classes.map(lc => lc.id === liveClass.id ? response.data : lc)
          );
        }
        alert('Đã kết thúc buổi học!');
      } catch (error) {
        console.error('Error ending class:', error);
        alert('Có lỗi xảy ra!');
      }
    }
  }

  async cancelClass(liveClass: LiveClass) {
    if (confirm('Bạn có chắc chắn muốn hủy buổi học này?')) {
      try {
        const response = await this.liveClassService.cancelLiveClass(liveClass.id).toPromise();
        if (response?.data) {
          this.liveClasses.update(classes => 
            classes.map(lc => lc.id === liveClass.id ? response.data : lc)
          );
        }
        alert('Đã hủy buổi học!');
      } catch (error) {
        console.error('Error cancelling class:', error);
        alert('Có lỗi xảy ra!');
      }
    }
  }

  async deleteClass(liveClass: LiveClass) {
    if (confirm(`Bạn có chắc chắn muốn xóa buổi học "${liveClass.title}"?`)) {
      try {
        await this.liveClassService.deleteLiveClass(liveClass.id).toPromise();
        this.liveClasses.update(classes => classes.filter(lc => lc.id !== liveClass.id));
        alert('Đã xóa buổi học!');
      } catch (error) {
        console.error('Error deleting class:', error);
        alert('Có lỗi xảy ra!');
      }
    }
  }

  joinClass(liveClass: LiveClass) {
    this.liveClassService.openMeetLink(liveClass.meetLink);
  }

  copyMeetLink(liveClass: LiveClass) {
    navigator.clipboard.writeText(liveClass.meetLink).then(() => {
      alert('Đã sao chép link!');
    });
  }

  // Utility functions
  getDefaultDateTime(): string {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return this.formatDateTimeForInput(now.toISOString());
  }

  formatDateTimeForInput(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  }

  formatDateTime(dateStr: string): string {
    return this.liveClassService.formatDate(dateStr);
  }

  formatDuration(minutes: number): string {
    return this.liveClassService.formatDuration(minutes);
  }

  getStatusBadgeVariant(status: string): 'primary' | 'success' | 'secondary' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'SCHEDULED': return 'primary';
      case 'LIVE': return 'success';
      case 'COMPLETED': return 'secondary';
      case 'CANCELLED': return 'danger';
      default: return 'neutral';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'Đã lên lịch';
      case 'LIVE': return 'Đang diễn ra';
      case 'COMPLETED': return 'Đã kết thúc';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  }

  getTimeUntil(dateStr: string): string {
    const now = new Date();
    const target = new Date(dateStr);
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return 'Đã đến giờ';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Còn ${days} ngày`;
    }
    
    if (hours > 0) {
      return `Còn ${hours} giờ ${minutes} phút`;
    }
    
    return `Còn ${minutes} phút`;
  }
}
