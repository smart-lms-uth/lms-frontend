import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ModuleProgress {
  moduleId: number;
  courseId: number;
  studentId: number;
  isCompleted: boolean;
  completedAt: string | null;
  timeSpent: number; // in seconds
  lastAccessedAt: string;
}

export interface CourseProgress {
  courseId: number;
  studentId: number;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  lastAccessedAt: string;
}

export interface SectionProgress {
  sectionId: number;
  courseId: number;
  studentId: number;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
}

// Course base URL
const COURSE_API = environment.apiUrl.replace('/v1', '');

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  // Local storage key prefix
  private readonly PROGRESS_KEY = 'lms_module_progress';

  constructor(private http: HttpClient) {}

  /**
   * Lấy tiến độ của một module
   */
  getModuleProgress(moduleId: number, studentId: number): ModuleProgress | null {
    const key = `${this.PROGRESS_KEY}_${studentId}`;
    const progressData = localStorage.getItem(key);
    if (!progressData) return null;
    
    const allProgress: Record<string, ModuleProgress> = JSON.parse(progressData);
    return allProgress[moduleId.toString()] || null;
  }

  /**
   * Đánh dấu module hoàn thành (lưu local)
   */
  markModuleCompleted(moduleId: number, courseId: number, studentId: number): ModuleProgress {
    const key = `${this.PROGRESS_KEY}_${studentId}`;
    const progressData = localStorage.getItem(key);
    const allProgress: Record<string, ModuleProgress> = progressData ? JSON.parse(progressData) : {};
    
    const now = new Date().toISOString();
    const progress: ModuleProgress = {
      moduleId,
      courseId,
      studentId,
      isCompleted: true,
      completedAt: now,
      timeSpent: allProgress[moduleId.toString()]?.timeSpent || 0,
      lastAccessedAt: now
    };
    
    allProgress[moduleId.toString()] = progress;
    localStorage.setItem(key, JSON.stringify(allProgress));
    
    return progress;
  }

  /**
   * Cập nhật thời gian học
   */
  updateTimeSpent(moduleId: number, courseId: number, studentId: number, additionalSeconds: number): void {
    const key = `${this.PROGRESS_KEY}_${studentId}`;
    const progressData = localStorage.getItem(key);
    const allProgress: Record<string, ModuleProgress> = progressData ? JSON.parse(progressData) : {};
    
    const existing = allProgress[moduleId.toString()];
    const now = new Date().toISOString();
    
    allProgress[moduleId.toString()] = {
      moduleId,
      courseId,
      studentId,
      isCompleted: existing?.isCompleted || false,
      completedAt: existing?.completedAt || null,
      timeSpent: (existing?.timeSpent || 0) + additionalSeconds,
      lastAccessedAt: now
    };
    
    localStorage.setItem(key, JSON.stringify(allProgress));
  }

  /**
   * Lấy tiến độ của một khóa học
   */
  getCourseProgress(courseId: number, studentId: number, totalModules: number): CourseProgress {
    const key = `${this.PROGRESS_KEY}_${studentId}`;
    const progressData = localStorage.getItem(key);
    
    if (!progressData) {
      return {
        courseId,
        studentId,
        totalModules,
        completedModules: 0,
        progressPercent: 0,
        lastAccessedAt: new Date().toISOString()
      };
    }
    
    const allProgress: Record<string, ModuleProgress> = JSON.parse(progressData);
    const courseModules = Object.values(allProgress).filter(p => p.courseId === courseId);
    const completedModules = courseModules.filter(p => p.isCompleted).length;
    
    return {
      courseId,
      studentId,
      totalModules,
      completedModules,
      progressPercent: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      lastAccessedAt: courseModules.reduce((latest, p) => 
        p.lastAccessedAt > latest ? p.lastAccessedAt : latest, 
        new Date(0).toISOString()
      )
    };
  }

  /**
   * Lấy tiến độ của một section
   */
  getSectionProgress(sectionId: number, courseId: number, studentId: number, moduleIds: number[]): SectionProgress {
    const key = `${this.PROGRESS_KEY}_${studentId}`;
    const progressData = localStorage.getItem(key);
    
    const totalModules = moduleIds.length;
    
    if (!progressData) {
      return {
        sectionId,
        courseId,
        studentId,
        totalModules,
        completedModules: 0,
        progressPercent: 0
      };
    }
    
    const allProgress: Record<string, ModuleProgress> = JSON.parse(progressData);
    const completedModules = moduleIds.filter(id => allProgress[id.toString()]?.isCompleted).length;
    
    return {
      sectionId,
      courseId,
      studentId,
      totalModules,
      completedModules,
      progressPercent: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
    };
  }

  /**
   * Kiểm tra module đã hoàn thành chưa
   */
  isModuleCompleted(moduleId: number, studentId: number): boolean {
    const progress = this.getModuleProgress(moduleId, studentId);
    return progress?.isCompleted || false;
  }

  /**
   * Lấy tổng thời gian học của sinh viên
   */
  getTotalStudyTime(studentId: number): number {
    const key = `${this.PROGRESS_KEY}_${studentId}`;
    const progressData = localStorage.getItem(key);
    
    if (!progressData) return 0;
    
    const allProgress: Record<string, ModuleProgress> = JSON.parse(progressData);
    return Object.values(allProgress).reduce((total, p) => total + p.timeSpent, 0);
  }

  /**
   * Format thời gian học
   */
  formatStudyTime(seconds: number): string {
    if (seconds < 60) return `${seconds} giây`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}
