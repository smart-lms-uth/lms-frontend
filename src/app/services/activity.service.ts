import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type ActivityType = 
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_RESET'
  | 'PAGE_VIEW' | 'PAGE_LEAVE'
  | 'BUTTON_CLICK' | 'LINK_CLICK' | 'FORM_SUBMIT' | 'FORM_ERROR'
  | 'API_REQUEST' | 'API_ERROR'
  | 'PROFILE_VIEW' | 'PROFILE_UPDATE' | 'AVATAR_UPLOAD'
  | 'SEARCH' | 'FILTER' | 'SORT'
  | 'CONTENT_VIEW' | 'CONTENT_DOWNLOAD' | 'CONTENT_UPLOAD'
  | 'SESSION_START' | 'SESSION_END' | 'SESSION_TIMEOUT'
  | 'ERROR' | 'CRASH' | 'CUSTOM'
  // Learning activities
  | 'COURSE_VIEW' | 'COURSE_ENROLL' | 'COURSE_COMPLETE'
  | 'SECTION_VIEW' | 'SECTION_COMPLETE'
  | 'LESSON_VIEW' | 'LESSON_COMPLETE'
  | 'QUIZ_START' | 'QUIZ_SUBMIT' | 'QUIZ_COMPLETE'
  | 'ASSIGNMENT_VIEW' | 'ASSIGNMENT_SUBMIT' | 'ASSIGNMENT_COMPLETE'
  | 'VIDEO_PLAY' | 'VIDEO_PAUSE' | 'VIDEO_COMPLETE';

export interface ActivityData {
  sessionId?: string;
  activityType: ActivityType;
  action?: string;
  pageUrl?: string;
  pageTitle?: string;
  elementId?: string;
  elementText?: string;
  apiEndpoint?: string;
  httpMethod?: string;
  responseStatus?: number;
  responseTimeMs?: number;
  metadata?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  screenWidth?: number;
  screenHeight?: number;
  durationMs?: number;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService implements OnDestroy {
  private readonly API_URL = environment.apiUrl;
  private readonly SESSION_KEY = 'lms_session_id';
  private readonly BUFFER_KEY = 'lms_activity_buffer';
  private readonly BUFFER_SIZE = 10; // Send when buffer reaches this size
  private readonly FLUSH_INTERVAL = 30000; // Flush every 30 seconds

  private sessionId: string;
  private activityBuffer: ActivityData[] = [];
  private flushTimer: any;
  private routerSubscription: Subscription | null = null;
  private pageEnterTime: number = 0;
  private currentPageUrl: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    this.sessionId = this.getOrCreateSessionId();
    this.loadBufferFromStorage();
    this.startFlushTimer();
    // Chỉ track các hoạt động quan trọng, không auto track page view/leave
  }

  ngOnDestroy(): void {
    this.flush();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Track any activity
   */
  track(activityType: ActivityType, data: Partial<ActivityData> = {}): void {
    const activity: ActivityData = {
      sessionId: this.sessionId,
      activityType,
      pageUrl: data.pageUrl || window.location.href,
      pageTitle: data.pageTitle || document.title,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timestamp: new Date().toISOString(),
      ...data
    };

    this.activityBuffer.push(activity);
    this.saveBufferToStorage();

    // Flush if buffer is full
    if (this.activityBuffer.length >= this.BUFFER_SIZE) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageUrl?: string, pageTitle?: string): void {
    this.pageEnterTime = Date.now();
    this.currentPageUrl = pageUrl || window.location.href;
    
    this.track('PAGE_VIEW', {
      pageUrl: this.currentPageUrl,
      pageTitle: pageTitle || document.title
    });
  }

  /**
   * Track page leave with duration
   */
  trackPageLeave(): void {
    if (this.pageEnterTime && this.currentPageUrl) {
      const duration = Date.now() - this.pageEnterTime;
      this.track('PAGE_LEAVE', {
        pageUrl: this.currentPageUrl,
        durationMs: duration
      });
    }
  }

  /**
   * Track button click
   */
  trackClick(elementId: string, elementText?: string, metadata?: any): void {
    this.track('BUTTON_CLICK', {
      elementId,
      elementText: elementText?.substring(0, 200),
      metadata: metadata ? JSON.stringify(metadata) : undefined
    });
  }

  /**
   * Track link click
   */
  trackLinkClick(href: string, text?: string): void {
    this.track('LINK_CLICK', {
      elementId: href,
      elementText: text?.substring(0, 200)
    });
  }

  /**
   * Track form submission
   */
  trackFormSubmit(formId: string, success: boolean = true): void {
    this.track(success ? 'FORM_SUBMIT' : 'FORM_ERROR', {
      elementId: formId
    });
  }

  /**
   * Track API call - chỉ track lỗi API, không track request thành công
   */
  trackApiCall(
    endpoint: string, 
    method: string, 
    status: number, 
    responseTimeMs: number
  ): void {
    // Don't track activity API calls to prevent infinite loop
    if (endpoint.includes('/activities')) {
      return;
    }

    // Chỉ track lỗi API (status >= 400)
    if (status >= 400) {
      this.track('API_ERROR', {
        apiEndpoint: endpoint,
        httpMethod: method,
        responseStatus: status,
        responseTimeMs
      });
    }
  }

  /**
   * Track search
   */
  trackSearch(query: string, resultsCount?: number): void {
    this.track('SEARCH', {
      action: query.substring(0, 200),
      metadata: resultsCount !== undefined ? JSON.stringify({ resultsCount }) : undefined
    });
  }

  // ========== LEARNING ACTIVITY TRACKING ==========

  /**
   * Track course view
   */
  trackCourseView(courseId: string, courseName: string): void {
    this.track('COURSE_VIEW', {
      action: `Xem khóa học: ${courseName}`,
      metadata: JSON.stringify({ courseId, courseName })
    });
  }

  /**
   * Track course enrollment
   */
  trackCourseEnroll(courseId: string, courseName: string): void {
    this.track('COURSE_ENROLL', {
      action: `Đăng ký khóa học: ${courseName}`,
      metadata: JSON.stringify({ courseId, courseName })
    });
  }

  /**
   * Track section view
   */
  trackSectionView(sectionId: string, sectionName: string, courseId: string): void {
    this.track('SECTION_VIEW', {
      action: `Xem phần: ${sectionName}`,
      metadata: JSON.stringify({ sectionId, sectionName, courseId })
    });
  }

  /**
   * Track lesson view
   */
  trackLessonView(lessonId: string, lessonName: string, courseId: string): void {
    this.track('LESSON_VIEW', {
      action: `Xem bài học: ${lessonName}`,
      metadata: JSON.stringify({ lessonId, lessonName, courseId })
    });
  }

  /**
   * Track quiz start
   */
  trackQuizStart(quizId: string, quizName: string, courseId: string): void {
    this.track('QUIZ_START', {
      action: `Bắt đầu quiz: ${quizName}`,
      metadata: JSON.stringify({ quizId, quizName, courseId })
    });
  }

  /**
   * Track quiz submission
   */
  trackQuizSubmit(quizId: string, quizName: string, score?: number, maxScore?: number): void {
    this.track('QUIZ_SUBMIT', {
      action: `Nộp quiz: ${quizName}`,
      metadata: JSON.stringify({ quizId, quizName, score, maxScore })
    });
  }

  /**
   * Track assignment view
   */
  trackAssignmentView(assignmentId: string, assignmentName: string, courseId: string): void {
    this.track('ASSIGNMENT_VIEW', {
      action: `Xem bài tập: ${assignmentName}`,
      metadata: JSON.stringify({ assignmentId, assignmentName, courseId })
    });
  }

  /**
   * Track assignment submission
   */
  trackAssignmentSubmit(assignmentId: string, assignmentName: string): void {
    this.track('ASSIGNMENT_SUBMIT', {
      action: `Nộp bài tập: ${assignmentName}`,
      metadata: JSON.stringify({ assignmentId, assignmentName })
    });
  }

  /**
   * Track video play
   */
  trackVideoPlay(videoId: string, videoName: string, currentTime?: number): void {
    this.track('VIDEO_PLAY', {
      action: `Xem video: ${videoName}`,
      metadata: JSON.stringify({ videoId, videoName, currentTime })
    });
  }

  /**
   * Track video complete
   */
  trackVideoComplete(videoId: string, videoName: string, durationMs: number): void {
    this.track('VIDEO_COMPLETE', {
      action: `Xem xong video: ${videoName}`,
      durationMs,
      metadata: JSON.stringify({ videoId, videoName })
    });
  }

  /**
   * Track login
   */
  trackLogin(method: string = 'standard'): void {
    this.track('LOGIN', {
      action: method,
      metadata: JSON.stringify({ method })
    });
  }

  /**
   * Track logout
   */
  trackLogout(): void {
    this.track('LOGOUT');
    this.flush(); // Immediately send on logout
  }

  /**
   * Track error
   */
  trackError(error: string, stack?: string): void {
    this.track('ERROR', {
      action: error.substring(0, 200),
      metadata: stack ? JSON.stringify({ stack: stack.substring(0, 1000) }) : undefined
    });
  }

  /**
   * Track custom event
   */
  trackCustom(action: string, metadata?: any): void {
    this.track('CUSTOM', {
      action,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    });
  }

  /**
   * Flush buffer to server
   */
  flush(): void {
    if (this.activityBuffer.length === 0) {
      return;
    }

    const activitiesToSend = [...this.activityBuffer];
    this.activityBuffer = [];
    this.clearBufferFromStorage();

    this.http.post(`${this.API_URL}/activities/batch`, activitiesToSend)
      .subscribe({
        next: () => {
          console.debug(`Sent ${activitiesToSend.length} activities`);
        },
        error: (error) => {
          console.error('Failed to send activities:', error);
          // Re-add failed activities to buffer
          this.activityBuffer = [...activitiesToSend, ...this.activityBuffer];
          this.saveBufferToStorage();
        }
      });
  }

  // Private methods

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private loadBufferFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.BUFFER_KEY);
      if (stored) {
        this.activityBuffer = JSON.parse(stored);
      }
    } catch (e) {
      this.activityBuffer = [];
    }
  }

  private saveBufferToStorage(): void {
    try {
      localStorage.setItem(this.BUFFER_KEY, JSON.stringify(this.activityBuffer));
    } catch (e) {
      // Storage full, flush immediately
      this.flush();
    }
  }

  private clearBufferFromStorage(): void {
    localStorage.removeItem(this.BUFFER_KEY);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  private setupRouterTracking(): void {
    // Disabled - không auto track page view/leave
    // Nếu cần track page cụ thể, gọi trackPageView() thủ công
  }

  private setupPageLeaveTracking(): void {
    // Chỉ flush data khi user rời trang, không track session end
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private trackSessionStart(): void {
    // Disabled - không track session start tự động
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Other';
  }

  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
  }
}
