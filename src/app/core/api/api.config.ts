/**
 * API Configuration - Centralized API endpoints
 * All services should use this config for consistency
 */
import { environment } from '../../../environments/environment';

export const API_CONFIG = {
  // Base URLs
  baseUrl: environment.apiUrl,
  courseUrl: environment.courseApiUrl,
  aiUrl: environment.aiApiUrl,

  // Auth endpoints
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },

  // User endpoints
  users: {
    profile: '/users/profile',
    profileStatus: '/users/profile/status',
    profileComplete: '/users/profile/complete',
    setPassword: '/users/profile/set-password',
    changePassword: '/users/profile/change-password',
    uploadAvatar: '/users/profile/avatar',
  },

  // Admin endpoints
  admin: {
    users: '/admin/users',
    userById: (id: number) => `/admin/users/${id}`,
    usersByRole: (role: string) => `/admin/users/role/${role}`,
    searchUsers: '/admin/users/search',
    statistics: '/admin/statistics',
    roles: '/admin/roles',
  },

  // Course endpoints (uses /api prefix)
  courses: {
    list: '/courses',
    byId: (id: number) => `/courses/${id}`,
    myCourses: '/courses/my-courses',
    create: '/courses',
    structure: (id: number) => `/course-structure/${id}`,
  },

  // Subject endpoints
  subjects: {
    list: '/subjects',
    active: '/subjects/active',
    byId: (id: number) => `/subjects/${id}`,
  },

  // Semester endpoints
  semesters: {
    list: '/semesters',
    active: '/semesters/active',
    byId: (id: number) => `/semesters/${id}`,
  },

  // Enrollment endpoints
  enrollments: {
    enroll: '/enrollments',
    myEnrollments: '/enrollments/my',
    byCourse: (courseId: number) => `/enrollments/course/${courseId}`,
  },

  // AI endpoints
  ai: {
    chat: '/chat',
    generateQuestions: '/generate-questions',
    subjects: '/subjects',
  },
} as const;

// Type helper for API response
export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
}

// Pagination response
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
