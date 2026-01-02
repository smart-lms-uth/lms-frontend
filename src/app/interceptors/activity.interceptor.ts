import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { ActivityService } from '../services/activity.service';

/**
 * Interceptor to track all API calls automatically
 */
@Injectable()
export class ActivityInterceptor implements HttpInterceptor {

  constructor(private activityService: ActivityService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip tracking for activity endpoints to prevent infinite loop
    if (request.url.includes('/activities')) {
      return next.handle(request);
    }

    const startTime = Date.now();
    
    return next.handle(request).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            const responseTime = Date.now() - startTime;
            this.activityService.trackApiCall(
              this.getEndpoint(request.url),
              request.method,
              event.status,
              responseTime
            );
          }
        },
        error: (error: HttpErrorResponse) => {
          const responseTime = Date.now() - startTime;
          this.activityService.trackApiCall(
            this.getEndpoint(request.url),
            request.method,
            error.status || 0,
            responseTime
          );
        }
      })
    );
  }

  private getEndpoint(url: string): string {
    // Remove base URL and keep only the path
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }
}
