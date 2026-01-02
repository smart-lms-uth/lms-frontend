import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ActivityService } from './activity.service';

/**
 * Global error handler to track JavaScript errors
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    // Get ActivityService lazily to avoid circular dependency
    const activityService = this.injector.get(ActivityService);
    
    // Track the error
    const errorMessage = error.message || error.toString();
    const errorStack = error.stack || '';
    
    activityService.trackError(errorMessage, errorStack);

    // Log to console in development
    console.error('Application Error:', error);
  }
}
