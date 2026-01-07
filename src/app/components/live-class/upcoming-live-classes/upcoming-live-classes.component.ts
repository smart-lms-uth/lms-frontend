import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LiveClassService, LiveClass } from '../../../services/live-class.service';
import { AuthService } from '../../../services/auth.service';
import { BadgeComponent } from '../../ui';

@Component({
  selector: 'app-upcoming-live-classes',
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent
  ],
  templateUrl: './upcoming-live-classes.component.html',
  styleUrls: ['./upcoming-live-classes.component.scss']
})
export class UpcomingLiveClassesComponent implements OnInit {
  loading = signal(true);
  upcomingClasses = signal<LiveClass[]>([]);
  liveNowClasses = signal<LiveClass[]>([]);
  isTeacher = signal(false);

  constructor(
    private liveClassService: LiveClassService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUserSync();
    this.isTeacher.set(user?.role === 'TEACHER' || user?.role === 'ADMIN');
    this.loadUpcomingClasses();
  }

  async loadUpcomingClasses() {
    this.loading.set(true);
    try {
      let classes: LiveClass[] = [];
      
      if (this.isTeacher()) {
        const response = await this.liveClassService.getUpcomingForInstructor().toPromise();
        classes = response?.data || [];
      } else {
        const response = await this.liveClassService.getUpcomingForStudent().toPromise();
        classes = response?.data || [];
      }
      
      // Separate live now and upcoming
      this.liveNowClasses.set(classes.filter(lc => lc.status === 'LIVE'));
      this.upcomingClasses.set(
        classes
          .filter(lc => lc.status === 'SCHEDULED')
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .slice(0, 3) // Show only next 3
      );
    } catch (error) {
      console.error('Error loading upcoming classes:', error);
      this.upcomingClasses.set([]);
      this.liveNowClasses.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  joinClass(liveClass: LiveClass) {
    this.liveClassService.openMeetLink(liveClass.meetLink);
  }

  goToCourse(liveClass: LiveClass) {
    const basePath = this.isTeacher() ? '/teacher/courses' : '/student/courses';
    this.router.navigate([basePath, liveClass.courseId], {
      queryParams: { tab: 'liveclass' }
    });
  }

  formatDateTime(dateStr: string): string {
    return this.liveClassService.formatDate(dateStr);
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
      return `${days} ngày`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}p`;
    }
    
    return `${minutes} phút`;
  }

  canJoin(liveClass: LiveClass): boolean {
    if (liveClass.status === 'LIVE') return true;
    if (liveClass.status !== 'SCHEDULED') return false;
    
    const now = new Date();
    const scheduledTime = new Date(liveClass.scheduledAt);
    const diffMinutes = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);
    
    return diffMinutes <= 15;
  }
}
