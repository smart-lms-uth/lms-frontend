import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveClassService, LiveClass } from '../../../services/live-class.service';
import { BadgeComponent } from '../../ui';

@Component({
  selector: 'app-student-live-class',
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent
  ],
  templateUrl: './student-live-class.component.html',
  styleUrls: ['./student-live-class.component.scss']
})
export class StudentLiveClassComponent implements OnInit {
  @Input() courseId!: number;
  @Input() studentId!: number;

  loading = signal(true);
  liveClasses = signal<LiveClass[]>([]);
  joinedClasses = signal<Set<number>>(new Set());
  
  // Filtered lists
  liveNow = computed(() => 
    this.liveClasses().filter(lc => lc.status === 'LIVE')
  );
  
  upcoming = computed(() => 
    this.liveClasses()
      .filter(lc => lc.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  );
  
  past = computed(() => 
    this.liveClasses()
      .filter(lc => lc.status === 'COMPLETED')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 5) // Show only recent 5
  );

  constructor(private liveClassService: LiveClassService) {}

  ngOnInit() {
    this.loadLiveClasses();
  }

  async loadLiveClasses() {
    this.loading.set(true);
    try {
      const response = await this.liveClassService.getLiveClassesByCourse(this.courseId).toPromise();
      const classes = response?.data?.content || [];
      this.liveClasses.set(classes);
      
      // Check which classes student has joined
      for (const lc of classes) {
        if (lc.status === 'LIVE' || lc.status === 'COMPLETED') {
          try {
            const joinedResponse = await this.liveClassService.hasJoined(lc.id).toPromise();
            if (joinedResponse?.data?.joined) {
              this.joinedClasses.update(set => {
                set.add(lc.id);
                return new Set(set);
              });
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    } catch (error) {
      console.error('Error loading live classes:', error);
      this.liveClasses.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async joinClass(liveClass: LiveClass) {
    try {
      await this.liveClassService.joinLiveClass(liveClass.id).toPromise();
      this.joinedClasses.update(set => {
        set.add(liveClass.id);
        return new Set(set);
      });
      // Update attendee count
      this.liveClasses.update(classes => 
        classes.map(lc => 
          lc.id === liveClass.id 
            ? { ...lc, attendeeCount: lc.attendeeCount + 1 }
            : lc
        )
      );
      // Open Google Meet
      this.liveClassService.openMeetLink(liveClass.meetLink);
    } catch (error) {
      console.error('Error joining class:', error);
      alert('Có lỗi xảy ra khi tham gia lớp học!');
    }
  }

  openMeetLink(liveClass: LiveClass) {
    this.liveClassService.openMeetLink(liveClass.meetLink);
  }

  isJoined(liveClass: LiveClass): boolean {
    return this.joinedClasses().has(liveClass.id);
  }

  formatDateTime(dateStr: string): string {
    return this.liveClassService.formatDate(dateStr);
  }

  formatDuration(minutes: number): string {
    return this.liveClassService.formatDuration(minutes);
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
      return `Còn ${hours}h ${minutes}p`;
    }
    
    return `Còn ${minutes} phút`;
  }

  canJoin(liveClass: LiveClass): boolean {
    if (liveClass.status === 'LIVE') return true;
    if (liveClass.status !== 'SCHEDULED') return false;
    
    const now = new Date();
    const scheduledTime = new Date(liveClass.scheduledAt);
    const diffMinutes = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);
    
    // Can join 15 minutes before scheduled time
    return diffMinutes <= 15;
  }
}
