import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AdminService,
  DashboardStats,
  SystemHealth,
  SystemMetrics,
  ServiceStatus,
  DatabaseStats,
  ActivityLog,
  BackupInfo,
  BackupSchedule,
  OverviewStats
} from '../../../services/admin.service';
import { Semester, Subject, Course } from '../../../services/course.service';
import { MainLayoutComponent } from '../../../components/layout/main-layout/main-layout.component';

interface ScheduleConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  time: string;
  retentionDays: number;
  types: {
    postgres: boolean;
    redis: boolean;
    mongodb: boolean;
  };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MainLayoutComponent,
    FormsModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  loading = signal(true);
  activeTab = signal<'overview' | 'monitoring' | 'backup' | 'activity'>('overview');

  // Overview data
  semesters = signal<Semester[]>([]);
  subjects = signal<Subject[]>([]);
  courses = signal<Course[]>([]);
  currentSemester = signal<Semester | null>(null);
  openCourses = signal(0);

  // Monitoring data
  systemHealth = signal<SystemHealth | null>(null);
  systemMetrics = signal<SystemMetrics | null>(null);
  servicesStatus = signal<ServiceStatus[]>([]);
  databaseStats = signal<DatabaseStats | null>(null);

  // Backup data
  backups = signal<BackupInfo[]>([]);
  backupSchedule = signal<BackupSchedule | null>(null);
  creatingBackup = signal(false);

  // Schedule configuration
  editingSchedule = signal(false);
  savingSchedule = signal(false);
  scheduleConfig: ScheduleConfig = {
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    retentionDays: 30,
    types: {
      postgres: true,
      redis: true,
      mongodb: true
    }
  };

  // Activity data
  activityLogs = signal<ActivityLog[]>([]);
  activityLimit = 50;

  private refreshInterval: any;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  refreshAll() {
    this.loadData();
    if (this.activeTab() === 'monitoring') {
      this.loadMonitoringData();
    } else if (this.activeTab() === 'backup') {
      this.loadBackupData();
    } else if (this.activeTab() === 'activity') {
      this.loadActivityLogs();
    }
  }

  loadData() {
    this.loading.set(true);

    this.adminService.getSemesters().subscribe({
      next: (data) => {
        this.semesters.set(data);
        const current = data.find(s => s.isCurrent);
        if (current) {
          this.currentSemester.set(current);
        }
      }
    });

    this.adminService.getSubjects().subscribe({
      next: (data) => this.subjects.set(data)
    });

    this.adminService.getAllCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.openCourses.set(data.filter(c => c.status === 'OPEN').length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadMonitoringData() {
    this.adminService.getSystemHealth().subscribe({
      next: (data) => this.systemHealth.set(data),
      error: () => this.systemHealth.set(null)
    });

    this.adminService.getSystemMetrics().subscribe({
      next: (data) => this.systemMetrics.set(data),
      error: () => this.systemMetrics.set(null)
    });

    this.adminService.getServicesStatus().subscribe({
      next: (data) => this.servicesStatus.set(data),
      error: () => this.servicesStatus.set([])
    });

    this.adminService.getDatabaseStats().subscribe({
      next: (data) => this.databaseStats.set(data),
      error: () => this.databaseStats.set(null)
    });
  }

  loadBackupData() {
    this.adminService.getBackups().subscribe({
      next: (data) => this.backups.set(data),
      error: () => this.backups.set([])
    });

    this.adminService.getBackupSchedule().subscribe({
      next: (data) => {
        this.backupSchedule.set(data);
        // Sync local config with server data
        if (data) {
          this.scheduleConfig.enabled = data.enabled;
          this.scheduleConfig.retentionDays = data.retentionDays;
          if (data.types) {
            this.scheduleConfig.types.postgres = data.types.includes('postgres');
            this.scheduleConfig.types.redis = data.types.includes('redis');
            this.scheduleConfig.types.mongodb = data.types.includes('mongodb');
          }
        }
      },
      error: () => this.backupSchedule.set(null)
    });
  }

  loadActivityLogs() {
    this.adminService.getActivityLogs(this.activityLimit).subscribe({
      next: (data) => this.activityLogs.set(data),
      error: () => this.activityLogs.set([])
    });
  }

  createBackup(type: 'all' | 'postgres' | 'redis' | 'mongodb') {
    this.creatingBackup.set(true);
    this.adminService.createBackup({ type }).subscribe({
      next: () => {
        this.loadBackupData();
        this.creatingBackup.set(false);
        alert('Đã tạo bản sao lưu thành công!');
      },
      error: (err) => {
        this.creatingBackup.set(false);
        alert('Lỗi khi tạo sao lưu: ' + (err.error?.message || err.message));
      }
    });
  }

  restoreBackup(backup: BackupInfo) {
    if (!confirm(`Bạn có chắc muốn khôi phục từ backup ${backup.id}? Dữ liệu hiện tại sẽ bị ghi đè.`)) {
      return;
    }
    this.adminService.restoreBackup(backup.id).subscribe({
      next: () => alert('Khôi phục thành công!'),
      error: (err) => alert('Lỗi khôi phục: ' + (err.error?.message || err.message))
    });
  }

  deleteBackup(backup: BackupInfo) {
    if (!confirm(`Bạn có chắc muốn xóa backup ${backup.id}?`)) {
      return;
    }
    this.adminService.deleteBackup(backup.id).subscribe({
      next: () => this.loadBackupData(),
      error: (err) => alert('Lỗi xóa backup: ' + (err.error?.message || err.message))
    });
  }

  // Schedule configuration methods
  toggleEditSchedule() {
    this.editingSchedule.set(!this.editingSchedule());
  }

  toggleScheduleEnabled() {
    this.scheduleConfig.enabled = !this.scheduleConfig.enabled;
    this.saveScheduleConfig();
  }

  saveScheduleConfig() {
    this.savingSchedule.set(true);

    const types: string[] = [];
    if (this.scheduleConfig.types.postgres) types.push('postgres');
    if (this.scheduleConfig.types.redis) types.push('redis');
    if (this.scheduleConfig.types.mongodb) types.push('mongodb');

    const request = {
      enabled: this.scheduleConfig.enabled,
      frequency: this.scheduleConfig.frequency,
      time: this.scheduleConfig.time,
      retentionDays: this.scheduleConfig.retentionDays,
      types: types
    };

    this.adminService.updateBackupSchedule(request).subscribe({
      next: (data) => {
        this.backupSchedule.set(data);
        this.savingSchedule.set(false);
        this.editingSchedule.set(false);
        alert('Đã lưu cấu hình sao lưu!');
      },
      error: (err) => {
        this.savingSchedule.set(false);
        alert('Lỗi khi lưu cấu hình: ' + (err.error?.message || err.message));
      }
    });
  }

  getSelectedTypesCount(): number {
    let count = 0;
    if (this.scheduleConfig.types.postgres) count++;
    if (this.scheduleConfig.types.redis) count++;
    if (this.scheduleConfig.types.mongodb) count++;
    return count;
  }

  // Helper methods
  getCoursesInSemester(semesterId?: number): Course[] {
    if (!semesterId) return [];
    return this.courses().filter(c => c.semesterId === semesterId);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }

  formatBytes(bytes?: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'OPEN': 'open',
      'CLOSED': 'closed',
      'IN_PROGRESS': 'in-progress',
      'PLANNED': 'planned'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'OPEN': 'Đang mở',
      'CLOSED': 'Đã đóng',
      'IN_PROGRESS': 'Đang học',
      'PLANNED': 'Sắp mở'
    };
    return map[status] || status;
  }

  getHealthClass(status?: string): string {
    if (!status) return '';
    return status.toLowerCase();
  }

  getHealthLabel(status?: string): string {
    const map: Record<string, string> = {
      'HEALTHY': 'Hoạt động tốt',
      'WARNING': 'Cảnh báo',
      'CRITICAL': 'Nguy hiểm'
    };
    return map[status || ''] || status || '';
  }

  getHealthTimestamp(): string {
    return new Date().toLocaleString('vi-VN');
  }

  getCpuUsage(): number {
    const metrics = this.systemMetrics();
    if (!metrics?.cpu) return 0;
    // Calculate CPU usage as load average / processors * 100
    const loadAvg = metrics.cpu.systemLoadAverage;
    const processors = metrics.cpu.availableProcessors;
    return Math.min((loadAvg / processors) * 100, 100);
  }

  getGaugeColor(value: number): string {
    if (value < 50) return '#22c55e';
    if (value < 80) return '#f59e0b';
    return '#ef4444';
  }

  getGaugeDashArray(value: number): string {
    const maxLength = 126; // Approximate arc length
    const filled = (value / 100) * maxLength;
    return `${filled} ${maxLength}`;
  }

  getServiceIcon(name: string): string {
    const icons: Record<string, string> = {
      'PostgreSQL': 'storage',
      'Redis': 'flash_on',
      'RabbitMQ': 'pets',
      'MongoDB': 'eco',
      'User Service': 'person',
      'Course Service': 'menu_book',
      'Gateway': 'hub',
      'AI Service': 'smart_toy'
    };
    return icons[name] || 'settings';
  }

  getBackupTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'FULL': 'Toàn bộ',
      'POSTGRES': 'PostgreSQL',
      'PostgreSQL': 'PostgreSQL',
      'REDIS': 'Redis',
      'Redis': 'Redis',
      'MONGODB': 'MongoDB',
      'MongoDB': 'MongoDB'
    };
    return map[type] || type;
  }

  getBackupTypeIcon(type: string): string {
    const map: Record<string, string> = {
      'FULL': 'cloud_done',
      'POSTGRES': 'storage',
      'PostgreSQL': 'storage',
      'REDIS': 'flash_on',
      'Redis': 'flash_on',
      'MONGODB': 'eco',
      'MongoDB': 'eco'
    };
    return map[type] || 'backup';
  }

  getBackupStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'COMPLETED': 'Hoàn thành',
      'IN_PROGRESS': 'Đang chạy',
      'FAILED': 'Thất bại'
    };
    return map[status] || status;
  }

  getActivityIcon(action: string): string {
    const icons: Record<string, string> = {
      'ENROLLMENT': 'how_to_reg',
      'QUIZ_SUBMIT': 'quiz',
      'COURSE_CREATE': 'add_circle',
      'USER_LOGIN': 'login',
      'ASSIGNMENT_SUBMIT': 'upload_file',
      'GRADE_UPDATE': 'grade'
    };
    return icons[action] || 'info';
  }

  getActivityLabel(action: string): string {
    const labels: Record<string, string> = {
      'ENROLLMENT': 'đã đăng ký',
      'QUIZ_SUBMIT': 'đã nộp bài kiểm tra',
      'COURSE_CREATE': 'đã tạo khóa học',
      'USER_LOGIN': 'đã đăng nhập',
      'ASSIGNMENT_SUBMIT': 'đã nộp bài tập',
      'GRADE_UPDATE': 'đã cập nhật điểm'
    };
    return labels[action] || action;
  }

  getFrequencyLabel(frequency: string): string {
    const map: Record<string, string> = {
      'hourly': 'Mỗi giờ',
      'daily': 'Hàng ngày',
      'weekly': 'Hàng tuần'
    };
    return map[frequency] || frequency;
  }
}
