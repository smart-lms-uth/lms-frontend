import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'oauth2/callback',
    loadComponent: () => import('./pages/oauth-callback/oauth-callback.component').then(m => m.OauthCallbackComponent)
  },
  {
    path: 'profile-setup',
    loadComponent: () => import('./pages/profile-setup/profile-setup.component').then(m => m.ProfileSetupComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  // Teacher routes
  {
    path: 'teacher',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboardComponent)
      },
      {
        path: 'courses/create',
        loadComponent: () => import('./pages/teacher-course-form/teacher-course-form.component').then(m => m.TeacherCourseFormComponent)
      },
      {
        path: 'courses/:id',
        loadComponent: () => import('./pages/teacher-course-detail/teacher-course-detail.component').then(m => m.TeacherCourseDetailComponent)
      },
      {
        path: 'courses/:id/edit',
        loadComponent: () => import('./pages/teacher-course-form/teacher-course-form.component').then(m => m.TeacherCourseFormComponent)
      },
      {
        path: 'courses/:courseId/sections/:sectionId',
        loadComponent: () => import('./pages/teacher-section-detail/teacher-section-detail.component').then(m => m.TeacherSectionDetailComponent)
      },
      {
        path: 'courses/:courseId/sections/:sectionId/modules/:moduleId',
        loadComponent: () => import('./pages/teacher-module-detail/teacher-module-detail.component').then(m => m.TeacherModuleDetailComponent)
      },
      {
        path: 'question-bank',
        loadComponent: () => import('./pages/teacher-question-bank/teacher-question-bank').then(m => m.TeacherQuestionBankComponent)
      }
    ]
  },
  // Student routes
  {
    path: 'student',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'registration',
        loadComponent: () => import('./pages/course-registration/course-registration.component').then(m => m.CourseRegistrationComponent)
      },
      {
        path: 'courses/:id',
        loadComponent: () => import('./pages/student-course-detail/student-course-detail.component').then(m => m.StudentCourseDetailComponent)
      },
      {
        path: 'courses/:courseId/sections/:sectionId',
        loadComponent: () => import('./pages/student-section-detail/student-section-detail.component').then(m => m.StudentSectionDetailComponent)
      },
      {
        path: 'courses/:courseId/sections/:sectionId/modules/:moduleId',
        loadComponent: () => import('./pages/student-module-detail/student-module-detail.component').then(m => m.StudentModuleDetailComponent)
      },
      {
        path: 'courses/:courseId/sections/:sectionId/modules/:moduleId/quiz',
        loadComponent: () => import('./pages/student-quiz/student-quiz.component').then(m => m.StudentQuizComponent)
      }
    ]
  },
  // AI Chat
  {
    path: 'ai-chat',
    loadComponent: () => import('./pages/ai-chat/ai-chat.component').then(m => m.AiChatComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
